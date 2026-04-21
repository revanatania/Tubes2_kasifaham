// http handler untuk API backend, termasuk traversal dengan SSE streaming dan LCA query.
package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"tubes2/backend/internal/models"
	"tubes2/backend/internal/parser"
	"tubes2/backend/internal/scraper"
	"tubes2/backend/internal/traversal"
)

var (
	domCache   *domCacheEntry // simpan hasil parse DOM terakhir untuk LCA query
	domCacheMu sync.RWMutex
)

type domCacheEntry struct {
	root     *models.Node
	allNodes []*models.Node
	lcaTable *traversal.LCATable
}


func HealthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// endpoint mirip dengan /api/traverse tapi tanpa traversal, parse HTML dan return DOM tree.
func ParseHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.TraverseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	rawHTML, err := resolveHTML(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	root, allNodes, err := parser.Parse(rawHTML)
	if err != nil || root == nil {
		http.Error(w, "gagal parse HTML: "+safeErr(err), http.StatusUnprocessableEntity)
		return
	}

	// Simpan ke cache untuk LCA
	lcaTable := traversal.BuildLCA(allNodes)
	domCacheMu.Lock()
	domCache = &domCacheEntry{root: root, allNodes: allNodes, lcaTable: lcaTable}
	domCacheMu.Unlock()

	maxDepth := parser.MaxDepth(root)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"tree":      root,
		"nodeCount": len(allNodes),
		"maxDepth":  maxDepth,
	})
}

func TraverseHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	//setup SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no") 

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	// parse request body
	var req models.TraverseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendSSEEvent(w, flusher, "error", "invalid request: "+err.Error())
		return
	}

	// validasi input
	req.Algorithm = strings.ToUpper(strings.TrimSpace(req.Algorithm))
	if req.Algorithm != "BFS" && req.Algorithm != "DFS" {
		sendSSEEvent(w, flusher, "error", "algorithm harus BFS atau DFS")
		return
	}
	if strings.TrimSpace(req.Selector) == "" {
		sendSSEEvent(w, flusher, "error", "selector tidak boleh kosong")
		return
	}

	// ambil HTML dari rawHtml atau URL
	rawHTML, err := resolveHTML(req)
	if err != nil {
		sendSSEEvent(w, flusher, "error", err.Error())
		return
	}

	// parse HTML menjadi DOM tree
	root, allNodes, err := parser.Parse(rawHTML)
	if err != nil || root == nil {
		sendSSEEvent(w, flusher, "error", "gagal parse HTML: "+safeErr(err))
		return
	}

	// Simpan ke cache untuk /api/lca
	lcaTable := traversal.BuildLCA(allNodes)
	domCacheMu.Lock()
	domCache = &domCacheEntry{root: root, allNodes: allNodes, lcaTable: lcaTable}
	domCacheMu.Unlock()

	maxDepth := parser.MaxDepth(root)

	// Kirim DOM tree ke frontend dulu agar bisa dirender
	sendSSEEvent(w, flusher, "tree", map[string]interface{}{
		"tree":      root,
		"nodeCount": len(allNodes),
		"maxDepth":  maxDepth,
	})

	// mulai traversal dan stream setiap step
	start := time.Now()

	var sseMu sync.Mutex
	callback := func(step models.TraversalStep) {
		sseMu.Lock()
		defer sseMu.Unlock()
		sendSSEEvent(w, flusher, "step", step)
	}

	var matched []*models.Node
	var steps []models.TraversalStep
	var totalVisited int

	switch req.Algorithm {
	case "BFS":
		matched, steps, totalVisited = traversal.BFS(root, req.Selector, req.Limit, callback)
	case "DFS":
		matched, steps, totalVisited = traversal.DFS(root, req.Selector, req.Limit, callback)
	}

	elapsed := time.Since(start).Seconds() * 1000 // dalam ms

	// kirim hasil akhir
	result := models.TraversalResult{
		Algorithm:    req.Algorithm,
		Selector:     req.Selector,
		MatchedNodes: matched,
		TotalVisited: totalVisited,
		ElapsedMs:    elapsed,
		MaxDepth:     maxDepth,
		Steps:        steps,
		TreeJSON:     root,
	}
	sendSSEEvent(w, flusher, "result", result)

	// stream selesai
	fmt.Fprintf(w, "event: done\ndata: {}\n\n")
	flusher.Flush()
}

func LCAHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	domCacheMu.RLock()
	cache := domCache
	domCacheMu.RUnlock()

	if cache == nil || cache.lcaTable == nil {
		http.Error(w, "DOM belum di-parse. Panggil /api/traverse atau /api/parse terlebih dahulu.", http.StatusBadRequest)
		return
	}

	var req models.LCARequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	result := cache.lcaTable.QueryLCA(req.NodeIDA, req.NodeIDB)
	if result == nil {
		http.Error(w, "node tidak ditemukan atau tidak memiliki LCA", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func resolveHTML(req models.TraverseRequest) (string, error) {
	if strings.TrimSpace(req.RawHTML) != "" {
		return req.RawHTML, nil
	}
	if strings.TrimSpace(req.URL) == "" {
		return "", fmt.Errorf("URL atau rawHtml harus diisi")
	}
	html, err := scraper.Fetch(req.URL)
	if err != nil {
		return "", fmt.Errorf("gagal scraping URL: %w", err)
	}
	return html, nil
}

func sendSSEEvent(w http.ResponseWriter, f http.Flusher, eventType string, payload interface{}) {
	event := models.SSEEvent{Type: eventType, Payload: payload}
	data, err := json.Marshal(event)
	if err != nil {
		log.Printf("SSE marshal error: %v", err)
		return
	}
	fmt.Fprintf(w, "data: %s\n\n", data)
	f.Flush()
}

func safeErr(err error) string {
	if err == nil {
		return "unknown error"
	}
	return err.Error()
}
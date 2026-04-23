package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/rs/cors"
	"tubes2/backend/internal/handler"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/api/health", handler.HealthHandler)
	mux.HandleFunc("/api/parse", handler.ParseHandler)
	mux.HandleFunc("/api/traverse", handler.TraverseHandler)
	mux.HandleFunc("/api/lca", handler.LCAHandler)

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: false,
	})

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%s", port),
		Handler: c.Handler(mux),
	}

	log.Printf("Backend server berjalan di http://localhost:%s", port)
	log.Printf("Endpoints tersedia:")
	log.Printf("  GET  /api/health")
	log.Printf("  POST /api/parse")
	log.Printf("  POST /api/traverse  (SSE streaming)")
	log.Printf("  POST /api/lca       (LCA Binary Lifting)")

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}
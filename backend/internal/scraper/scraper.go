package scraper

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	defaultTimeout = 15 * time.Second
	maxBodyBytes   = 10 * 1024 * 1024
)

var httpClient = &http.Client{
	Timeout: defaultTimeout,
}

// ambil HTML dari url dan mengembalikan as string.
func Fetch(rawURL string) (string, error) {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return "", fmt.Errorf("URL tidak boleh kosong")
	}
	if !strings.HasPrefix(rawURL, "http://") && !strings.HasPrefix(rawURL, "https://") {
		rawURL = "https://" + rawURL
	}
	parsed, err := url.ParseRequestURI(rawURL)
	if err != nil {
		return "", fmt.Errorf("URL tidak valid: %w", err)
	}
	if parsed.Host == "" {
		return "", fmt.Errorf("URL tidak valid: host kosong")
	}

	req, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return "", fmt.Errorf("gagal membuat request: %w", err)
	}

	req.Header.Set("User-Agent",
		"Mozilla/5.0 (compatible; DOMTraversalBot/1.0; +https://github.com/tubes2)")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("gagal mengambil URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 400 {
		return "", fmt.Errorf("server mengembalikan status %d", resp.StatusCode)
	}

	limitedReader := io.LimitReader(resp.Body, maxBodyBytes)
	body, err := io.ReadAll(limitedReader)
	if err != nil {
		return "", fmt.Errorf("gagal membaca response body: %w", err)
	}

	return string(body), nil
}
// File: api/test.go
package handler

import (
	"fmt"
	"log"
	"net/http"
	"time"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	// This log message is the most important part for our test.
	log.Println("--- Go test handler was successfully executed! ---")

	currentTime := time.Now().Format(time.RFC1123)
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "Hello from the Go Test API! The time is %s", currentTime)
}

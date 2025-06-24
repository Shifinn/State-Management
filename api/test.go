// File: api/test.go
package handler

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	app *gin.Engine
)

func init() {
	app = gin.New()
	r := app.Group("/api")
	myRoute(r)
}

func Handlers(w http.ResponseWriter, r *http.Request) {
	app.ServeHTTP(w, r)
	// This log message is the most important part for our test.
	log.Println("--- Go test handler was successfully executed! ---")

	currentTime := time.Now().Format(time.RFC1123)
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "Hello from the Go Test API! The time is %s", currentTime)
}

func myRoute(r *gin.RouterGroup) {
	r.GET("/test", func(c *gin.Context) {
		c.String(http.StatusOK, "Hello from the Go Test API!")
	})
}

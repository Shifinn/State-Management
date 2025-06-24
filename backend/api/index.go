package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	// For sending emails
	"github.com/gin-gonic/gin"
	// PostgreSQL driver specific features
	"github.com/lib/pq"
)

// Database connection details
// const (
// 	user     = "postgres.jdujcnoojlthzezlgebw"
// 	password = "Kx6rdWWKpSztKN3P"
// 	host     = "aws-0-ap-southeast-1.pooler.supabase.com"
// 	port     = 5432
// 	dbName   = "postgres"
// )

// const (
// 	user     = "postgres"
// 	password = "12345678"
// 	host     = "localhost"
// 	port     = 5432
// 	dbName   = "gudang_garam"
// )

// User represents a user for authentication purposes.
type User struct {
	UserName string `json:"user_name"`     // User's login name (JSON tag: snake_case for DB compatibility)
	Password string `json:"user_password"` // User's password (JSON tag: snake_case for DB compatibility)
}

// StateCount holds the number of requests in a specific state.
type StateCount struct {
	StateID   int    `json:"state_id"`   // Unique ID of the state (JSON tag: snake_case)
	StateName string `json:"state_name"` // Name of the state (JSON tag: snake_case)
	Todo      int    `json:"todo"`       // Number of requests currently in this state (JSON tag: snake_case)
	Done      int    `json:"done"`       // Number of requests that have passed through this state (JSON tag: snake_case)
}

// NewRequest represents the data for creating a new request.
type NewRequest struct {
	RequestTitle        string    `json:"request_title"`         // Title of the request (JSON tag: snake_case)
	UserID              int       `json:"user_id"`               // ID of the user submitting the request (JSON tag: snake_case)
	RequesterName       string    `json:"requester_name"`        // Name of the person requesting analysis (JSON tag: snake_case)
	AnalysisPurpose     string    `json:"analysis_purpose"`      // Purpose of the analysis (JSON tag: snake_case)
	RequestedFinishDate time.Time `json:"requested_finish_date"` // Desired completion date (JSON tag: snake_case)
	PicRequest          string    `json:"pic_request"`           // Person in charge for the request (JSON tag: snake_case)
	Urgent              bool      `json:"urgent"`                // Indicates if the request is urgent
	RequirementType     int       `json:"requirement_type"`      // Type of requirement (e.g., 1 for docx, 2 for excel) (JSON tag: snake_case)
	Answers             []string  `json:"answers"`               // Array of answers to dynamic questions
	DocxAttachment      []byte    `json:"docx_attachment"`       // Byte content of DOCX attachment (JSON tag: snake_case)
	DocxFilename        string    `json:"docx_filename"`         // Original filename of DOCX attachment (JSON tag: snake_case)
	ExcelAttachment     []byte    `json:"excel_attachment"`      // Byte content of Excel attachment (JSON tag: snake_case)
	ExcelFilename       string    `json:"excel_filename"`        // Original filename of Excel attachment (JSON tag: snake_case)
	Remark              string    `json:"remark"`                // Additional remarks for the request
}

// UpdateState represents data for changing a request's state.
type UpdateState struct {
	RequestID int    `json:"request_id"` // ID of the request to update (JSON tag: snake_case)
	UserID    int    `json:"user_id"`    // ID of the user performing the update (JSON tag: snake_case)
	Comment   string `json:"comment"`    // Optional comment for the state change
}

// EmailRecipient holds user and state information for sending emails.
type EmailRecipient struct {
	UserName     string `json:"user_name"` // Recipient's name (JSON tag: snake_case)
	Email        string `json:"email"`
	RequestState string `json:"request_state"` // Current state of the request (JSON tag: snake_case)
}

// Global variables for database connection, mailer, and upload directory.
// var (
//
//	db              *sql.DB           = openDB()                                                                                     // Database connection
//	mail            *gomail.Dialer    = gomail.NewDialer("smtp.gmail.com", 587, "testinggomail222@gmail.com", "hqsq twwx ilao jvik") // Email dialer
//	dialed          gomail.SendCloser = startDial()                                                                                  // Mailer sender closer
//	uploadDirectory string            = ".\\files"                                                                                   // Base directory for file uploads
//
// )
var db *sql.DB = openDB()
var app *gin.Engine

func init() {
	app = gin.New()
	r := app.Group("/api")
	myRoute(r)
}

func myRoute(router *gin.RouterGroup) {
	router.GET("/admin", func(c *gin.Context) {
		c.String(http.StatusOK, "Hello from admin route!")
	})
	router.GET("/stateSpecificData", getStateSpecificData)
	router.GET("/userRequestsData", getUserCurrentRequests)
	router.GET("/todoData", getTodoData)
	router.GET("/completeRequestData", getCompleteRequestData)
	router.GET("/stateCountData", getStateCount)
	router.GET("/fullStateHistoryData", getFullStateHistoryData)
	router.GET("/questionData", getQuestionData)
	router.GET("/login", checkUserCredentials)
	router.GET("/answerData", getAnswerForRequest)
	router.GET("/getOldestRequestTime", getOldestRequest)
	router.GET("/getAttachmentFile", getAttachmentFile)
	router.GET("/getFilenames", getFilenames)
	router.GET("/getStateThreshold", getStateThreshold)
	router.POST("/newRequest", postNewRequest)
	// router.POST("/postReminderEmail", postReminderEmail)
	// router.POST("/postReminderEmailToRole", postReminderEmailToRole)
	router.PUT("/upgradeState", putUpgradeState)
	router.PUT("/degradeState", putDegradeState)
}

// --- Vercel's Main Handler ---
// This function is the entry point for ALL API requests.
func Handler(w http.ResponseWriter, r *http.Request) {
	app.ServeHTTP(w, r) // Let Gin handle the request
}

// func main() {
// 	// Ensure database connection is closed when the application exits.
// 	defer db.Close()

// 	// Initialize Gin router for HTTP handling.
// 	router := gin.Default()

// 	// CORS middleware configuration to allow cross-origin requests.
// 	router.Use(func(c *gin.Context) {
// 		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
// 		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
// 		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
// 		if c.Request.Method == "OPTIONS" {
// 			c.AbortWithStatus(204) // Handle preflight requests
// 			return
// 		}
// 		c.Next() // Continue to the next handler
// 	})

// 	// Define API routes and their corresponding handlers.
// 	router.GET("/stateSpecificData", getStateSpecificData)
// 	router.GET("/userRequestsData", getUserCurrentRequests)
// 	router.GET("/todoData", getTodoData)
// 	router.GET("/completeRequestData", getCompleteRequestData)
// 	router.GET("/stateCountData", getStateCount)
// 	router.GET("/fullStateHistoryData", getFullStateHistoryData)
// 	router.GET("/questionData", getQuestionData)
// 	router.GET("/login", checkUserCredentials)
// 	router.GET("/answerData", getAnswerForRequest)
// 	router.GET("/getOldestRequestTime", getOldestRequest)
// 	router.GET("/getAttachmentFile", getAttachmentFile)
// 	router.GET("/getFilenames", getFilenames)
// 	router.GET("/getStateThreshold", getStateThreshold)
// 	router.POST("/newRequest", postNewRequest)
// 	// router.POST("/postReminderEmail", postReminderEmail)
// 	// router.POST("/postReminderEmailToRole", postReminderEmailToRole)
// 	router.PUT("/upgradeState", putUpgradeState)
// 	router.PUT("/degradeState", putDegradeState)

// 	// Run the server on port 9090.
// 	router.Run("Localhost:9090")
// }

// openDB initializes and returns a new PostgreSQL database connection.
// func openDB() *sql.DB {
// 	// psqlconn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=require", host, port, user, password, dbName)
// 	psqlconn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable", host, port, user, password, dbName)
// 	db, err := sql.Open("postgres", psqlconn)
// 	if err != nil {
// 		fmt.Println("Error opening database: ", err)
// 		return nil
// 	}
// 	return db
// }

func openDB() *sql.DB {
	// Reads the database URL from an environment variable set in Vercel.
	databaseUrl := os.Getenv("DATABASE_URL")
	if databaseUrl == "" {
		// This is a fallback for easy local testing if the variable isn't set.
		databaseUrl = "postgres://postgres:12345678@localhost:5432/gudang_garam?sslmode=disable"
		log.Println("INFO: DATABASE_URL not set, using local fallback.")
	}

	db, err := sql.Open("postgres", databaseUrl)
	if err != nil {
		log.Fatalf("FATAL: Error opening database: %v", err)
	}
	if err = db.Ping(); err != nil {
		log.Fatalf("FATAL: Error pinging database: %v", err)
	}
	log.Println("INFO: Database connection successful.")
	return db
}

// // startDial attempts to connect to the SMTP server for sending emails.
// // func startDial() gomail.SendCloser {
// // 	dialed, err := mail.Dial()
// // 	if err != nil {
// // 		log.Fatalf("Failed to connect to SMTP server: %v", err) // Fatal error if connection fails
// // 	}
// // 	return dialed
// // }

// checkErr logs a database error and sends an HTTP response with the specified error type.
func checkErr(c *gin.Context, errType int, err error, errMsg string) {
	if err != nil {
		println("Error: " + err.Error()) // Log error for debugging
		if errType == http.StatusInternalServerError {
			c.JSON(http.StatusInternalServerError, gin.H{"error": errMsg})
		} else if errType == http.StatusBadRequest {
			c.JSON(http.StatusBadRequest, gin.H{"error": errMsg})
		}
	}
}

// checkEmpty validates if a required query parameter is empty.
func checkEmpty(c *gin.Context, str string) {
	if str == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing query parameters"})
		c.Abort() // Stop further processing
		return
	}
}

// checkUserCredentials handles user login by verifying credentials against the database.
func checkUserCredentials(c *gin.Context) {
	var newUser User
	var data string // Stores the result (e.g., user ID) from the database

	// Retrieve user name and password from query parameters (expecting snake_case for user_name, literal for password)
	newUser.UserName = c.Query("user_name")
	newUser.Password = c.Query("password")
	println("UserName = " + newUser.UserName + " Password = " + newUser.Password)

	// Call a database function to get user ID by credentials
	query := `SELECT get_user_id_by_credentials($1, $2)`
	if err := db.QueryRow(query, newUser.UserName, newUser.Password).Scan(&data); err != nil {
		checkErr(c, http.StatusBadRequest, err, "Failed to get user ID") // Use http.StatusBadRequest for client-side input errors
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// getStateSpecificData retrieves and sends state-specific request data based on date range.
func getStateSpecificData(c *gin.Context) {
	var data string
	// Retrieve state ID and date range from query parameters (expecting snake_case)
	stateIDInput := c.Query("state_id")
	startDateInput := c.Query("start_date")
	endDateInput := c.Query("end_date")

	checkEmpty(c, stateIDInput)
	checkEmpty(c, startDateInput)
	checkEmpty(c, endDateInput)

	// Call a database function to get state-specific data
	query := `SELECT get_state_specific_data($1, $2, $3)`
	if err := db.QueryRow(query, stateIDInput, startDateInput, endDateInput).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get state data") // Use InternalServerError for DB errors
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// getUserCurrentRequests retrieves and sends a user's current requests.
func getUserCurrentRequests(c *gin.Context) {
	var data string
	// Retrieve user ID from query parameters (expecting snake_case)
	userIDInput := c.Query("user_id")

	checkEmpty(c, userIDInput)

	// Call a database function to get user's current requests
	query := `SELECT get_user_request_data($1)`
	if err := db.QueryRow(query, userIDInput).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get user requests") // Use InternalServerError for DB errors
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// getTodoData retrieves and sends to-do requests based on user role.
func getTodoData(c *gin.Context) {
	var data string
	// Retrieve role ID from query parameters (expecting snake_case)
	userRoleInput := c.Query("role_id")

	checkEmpty(c, userRoleInput)

	// Call a database function to get to-do data
	query := `SELECT get_todo_data($1)`
	if err := db.QueryRow(query, userRoleInput).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get todo data") // Use InternalServerError for DB errors
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// getCompleteRequestData retrieves and sends complete details for a specific request.
func getCompleteRequestData(c *gin.Context) {
	var data string
	// Retrieve request ID from query parameters (expecting snake_case)
	requestIDInput := c.Query("request_id")

	checkEmpty(c, requestIDInput)

	// Call a database function to get complete request data
	query := `SELECT get_complete_data_of_request($1)`
	if err := db.QueryRow(query, requestIDInput).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get complete data of request") // Use InternalServerError for DB errors
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// getStateCount retrieves and calculates state-wise request counts within a date range.
func getStateCount(c *gin.Context) {
	var data string
	var count []StateCount
	var sqlNullString sql.NullString // Handles potential NULL results from DB

	// Initialize result with all possible states and zero counts.
	result := []StateCount{
		{StateID: 1, StateName: "SUBMITTED", Todo: 0, Done: 0},
		{StateID: 2, StateName: "VALIDATED", Todo: 0, Done: 0},
		{StateID: 3, StateName: "IN PROGRESS", Todo: 0, Done: 0},
		{StateID: 4, StateName: "WAITING FOR REVIEW", Todo: 0, Done: 0},
		{StateID: 5, StateName: "DONE", Todo: 0, Done: 0},
		{StateID: -1, StateName: "TOTAL", Todo: 0, Done: 0}, // Placeholder for total counts
	}

	// Retrieve date range from query parameters (expecting snake_case)
	startDateInput := c.Query("start_date")
	checkEmpty(c, startDateInput)
	endDateInput := c.Query("end_date")
	checkEmpty(c, endDateInput)

	// Call a database function to get state counts
	query := `SELECT get_state_count($1, $2)`
	if err := db.QueryRow(query, startDateInput, endDateInput).Scan(&sqlNullString); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get state count") // Use InternalServerError for DB errors
		return
	}

	// If no data is returned from the DB, send the initialized result.
	if !sqlNullString.Valid {
		c.IndentedJSON(http.StatusOK, result)
		return
	}

	data = sqlNullString.String // Extract string value

	// Unmarshal JSON data into the 'count' slice.
	if err := json.Unmarshal([]byte(data), &count); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to unmarshal count data") // Use InternalServerError for unmarshal errors
		return
	}

	// Populate 'Todo' counts in the result slice by matching state IDs.
	for _, item := range count {
		if idx := item.StateID - 1; idx >= 0 && idx < len(result) {
			result[idx].Todo = item.Todo
		}
	}

	// Calculate 'Done' counts by summing 'Todo' counts of subsequent states.
	for i := 0; i < len(result)-2; i++ {
		for j := i + 1; j < len(result)-1; j++ {
			result[i].Done += result[j].Todo
		}
		result[5].Todo += result[i].Todo // Accumulate total 'Todo' requests
	}

	// Final adjustments for "DONE" and "TOTAL" states.
	result[4].Done = result[4].Todo
	result[5].Done = result[4].Todo
	result[4].Todo = 0

	c.IndentedJSON(http.StatusOK, result)
}

// getFullStateHistoryData retrieves and sends the full state history for a specific request.
func getFullStateHistoryData(c *gin.Context) {
	var data string
	// Retrieve request ID from query parameters (expecting snake_case)
	requestIDInput := c.Query("request_id")

	checkEmpty(c, requestIDInput)

	// Call a database function to get full state history
	query := `SELECT get_full_state_history($1)`
	if err := db.QueryRow(query, requestIDInput).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get full state history") // Use InternalServerError for DB errors
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// getQuestionData retrieves and sends questions based on a specific requirement type.
func getQuestionData(c *gin.Context) {
	var data string
	// Retrieve requirement type from query parameters (expecting snake_case)
	requirementTypeInput := c.Query("requirement_type")

	checkEmpty(c, requirementTypeInput)

	// Call a database function to get questions
	query := `SELECT get_questions($1)`
	if err := db.QueryRow(query, requirementTypeInput).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get questions") // Use InternalServerError for DB errors
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// getAnswerForRequest retrieves and sends answers for a specific request.
func getAnswerForRequest(c *gin.Context) {
	var data string
	// Retrieve request ID from query parameters (expecting snake_case)
	requestIDInput := c.Query("request_id")

	checkEmpty(c, requestIDInput)

	// Call a database function to get request requirement answers
	query := `SELECT get_request_requirement_answer($1)`
	if err := db.QueryRow(query, requestIDInput).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get request answers") // Use InternalServerError for DB errors
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// getOldestRequest retrieves and sends the timestamp of the oldest request.
func getOldestRequest(c *gin.Context) {
	var data time.Time

	// Call a database function to get the oldest request timestamp
	query := `SELECT get_oldest_request()`
	if err := db.QueryRow(query).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get oldest request") // Use InternalServerError for DB errors
		return
	}

	c.JSON(http.StatusOK, data)
}

// getAttachmentFile retrieves and sends a specified attachment (DOCX/Excel/PDF) for a request.
func getAttachmentFile(c *gin.Context) {
	var data []byte // Stores the file content
	var attachmentType int

	// Retrieve request ID and filename from query parameters (expecting snake_case)
	requestIDInput := c.Query("request_id")
	filenameInput := c.Query("filename")

	checkEmpty(c, requestIDInput)
	checkEmpty(c, filenameInput)

	var contentType string
	// Determine content type and attachment type based on file extension.
	switch {
	case strings.HasSuffix(filenameInput, ".docx"):
		contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
		attachmentType = 1
	case strings.HasSuffix(filenameInput, ".pdf"):
		contentType = "application/pdf"
		attachmentType = 1
	case strings.HasSuffix(filenameInput, ".xls"), strings.HasSuffix(filenameInput, ".xlsx"):
		contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		attachmentType = 2
	default:
		contentType = "application/octet-stream" // Default for unknown types
	}

	// Call a database function to get the attachment data (binary content or path).
	query := `SELECT get_attachment_filepath($1, $2)`
	if err := db.QueryRow(query, requestIDInput, attachmentType).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get attachment") // Use InternalServerError for DB errors
		return
	}

	// Set headers for file download and serve the file data.
	file, err := os.Open(string(data)) // Convert byte slice to string for file path
	if err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to open attachment file") // Use InternalServerError for file opening errors
		return
	}

	defer file.Close()
	fileContent, err := os.ReadFile(string(data))

	if err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to read attachment file") // Use InternalServerError for file reading errors
		return
	}

	c.Header("Content-Disposition", "attachment; filename="+strconv.Quote(filenameInput))
	c.Data(http.StatusOK, contentType, fileContent)
}

// getFilenames retrieves and sends filenames associated with a request.
func getFilenames(c *gin.Context) {
	var data string
	// Retrieve request ID from query parameters (expecting snake_case)
	requestIDInput := c.Query("request_id")

	checkEmpty(c, requestIDInput)

	// Call a database function to get filenames.
	query := `SELECT get_filenames($1)`
	if err := db.QueryRow(query, requestIDInput).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get filename") // Use InternalServerError for DB errors
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// getStateThreshold retrieves and sends the state threshold data.
func getStateThreshold(c *gin.Context) {
	var data string
	// Call a database function to get the state threshold.
	if err := db.QueryRow(`SELECT get_state_threshold()`).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get state threshold") // Use InternalServerError for DB errors
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// postNewRequest handles the creation of a new request, including file uploads.
func postNewRequest(c *gin.Context) {
	var nr NewRequest
	var requestID string
	// var docxFilePath string
	// var excelFilePath string

	// Parse string fields from form data (expecting snake_case from frontend).
	nr.RequestTitle = c.PostForm("request_title")
	nr.RequesterName = c.PostForm("requester_name")
	nr.AnalysisPurpose = c.PostForm("analysis_purpose")
	nr.PicRequest = c.PostForm("pic_request")
	nr.Remark = c.PostForm("remark")
	nr.DocxFilename = c.PostForm("docx_filename")
	nr.ExcelFilename = c.PostForm("excel_filename")

	// Convert numeric and boolean fields from string to their respective types.
	nr.UserID, _ = strconv.Atoi(c.PostForm("user_id"))
	nr.RequirementType, _ = strconv.Atoi(c.PostForm("requirement_type"))
	nr.Urgent, _ = strconv.ParseBool(c.PostForm("urgent"))

	// Parse the requested finish date string into a time.Time object.
	dateStr := c.PostForm("requested_finish_date")
	nr.RequestedFinishDate, _ = time.Parse(time.RFC3339, dateStr)

	// Parse answers (expected as a JSON array string) into a Go slice.
	if answersJSON := c.PostForm("answers"); answersJSON != "" {
		if err := json.Unmarshal([]byte(answersJSON), &nr.Answers); err != nil {
			checkErr(c, http.StatusBadRequest, err, "Invalid answers format") // Use http.StatusBadRequest for malformed input
			return
		}
	}

	// Call a database function to create a new request and retrieve its ID.
	query := `SELECT create_new_request($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
	if err := db.QueryRow(query,
		nr.RequestTitle, nr.UserID, nr.RequesterName, nr.AnalysisPurpose,
		nr.RequestedFinishDate, nr.PicRequest, nr.Urgent,
		nr.RequirementType, pq.Array(nr.Answers), nr.Remark,
	).Scan(&requestID); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get request ID after creation") // Use InternalServerError for DB errors
		return
	}

	// // Create a dedicated directory for the new request's files.
	// requestDirectory := filepath.Join(uploadDirectory, "Request"+requestID)
	// if err := os.MkdirAll(requestDirectory, 0755); err != nil {
	// 	log.Printf("Error creating directory: %v", err)
	// 	checkErr(c, http.StatusInternalServerError, err, "Could not create storage directory") // Use InternalServerError for file system errors
	// 	return
	// }

	// // Process DOCX file attachment if present.
	// if file, err := c.FormFile("docx_attachment"); err == nil { // Expecting snake_case form field
	// 	safeFilename := filepath.Base(nr.DocxFilename) // Sanitize filename
	// 	if safeFilename == "" || safeFilename == "." {
	// 		checkErr(c, http.StatusBadRequest, fmt.Errorf("invalid docx filename"), "Invalid docx filename provided") // Use http.StatusBadRequest for bad input
	// 		return
	// 	}
	// 	docxFilePath = filepath.Join(requestDirectory, safeFilename) // Assign to function-scoped variable
	// 	if err := c.SaveUploadedFile(file, docxFilePath); err != nil {
	// 		checkErr(c, http.StatusInternalServerError, err, "Unable to save docx file") // Use InternalServerError for file saving errors
	// 		return
	// 	}
	// } else if err != http.ErrMissingFile { // If file is not missing, but some other error occurred
	// 	checkErr(c, http.StatusInternalServerError, err, "Error processing docx attachment") // Catch other potential file upload errors
	// 	return
	// }

	// // Process EXCEL file attachment if present.
	// if file, err := c.FormFile("excel_attachment"); err == nil { // Expecting snake_case form field
	// 	safeFilename := filepath.Base(nr.ExcelFilename) // Sanitize filename
	// 	if safeFilename == "" || safeFilename == "." {
	// 		checkErr(c, http.StatusBadRequest, fmt.Errorf("invalid excel filename"), "Invalid excel filename provided") // Use http.StatusBadRequest for bad input
	// 		return
	// 	}
	// 	excelFilePath = filepath.Join(requestDirectory, safeFilename) // Assign to function-scoped variable
	// 	if err := c.SaveUploadedFile(file, excelFilePath); err != nil {
	// 		checkErr(c, http.StatusInternalServerError, err, "Unable to save excel file") // Use InternalServerError for file saving errors
	// 		return
	// 	}
	// } else if err != http.ErrMissingFile { // If file is not missing, but some other error occurred
	// 	checkErr(c, http.StatusInternalServerError, err, "Error processing excel attachment") // Catch other potential file upload errors
	// 	return
	// }

	// // Convert request ID to integer for database storage.
	// requestIDInt, err := strconv.Atoi(requestID)
	// if err != nil {
	// 	checkErr(c, http.StatusInternalServerError, err, "Unable to convert request ID to integer") // Use InternalServerError for conversion errors
	// 	return
	// }
	// println("docxFilePath = " + docxFilePath + " excelFilePath = " + excelFilePath)

	// // Store attachment file paths in the database.
	// queryAttachment := `CALL store_attachments($1, $2, $3, $4, $5);`
	// if _, err = db.Exec(queryAttachment, requestIDInt, docxFilePath, nr.DocxFilename, excelFilePath, nr.ExcelFilename); err != nil {
	// 	checkErr(c, http.StatusInternalServerError, err, "Unable to store attachments filepath to db") // Use InternalServerError for DB errors
	// 	return
	// }

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Request submitted.",
	})
}

// postReminderEmail sends a reminder email to a single recipient.
// func postReminderEmail(c *gin.Context) {
// 	var recipient EmailRecipient
// 	if err := c.BindJSON(&recipient); err != nil {
// 		checkErr(c, http.StatusBadRequest, err, "Invalid input") // Use http.StatusBadRequest for malformed JSON
// 		return
// 	}
// 	sendReminderEmail(c, []string{recipient.Email}, recipient.RequestState)
// }

// // postReminderEmailToRole sends a reminder email to all users of a specific role.
// func postReminderEmailToRole(c *gin.Context) {
// 	// Retrieve role ID and state name from query parameters (expecting snake_case).
// 	roleIDInput := c.Query("role_id")
// 	checkEmpty(c, roleIDInput)

// 	stateNameInput := c.Query("state_name")
// 	checkEmpty(c, stateNameInput)

// 	var recipientsJSON string
// 	// Call a database function to get emails for the specified role.
// 	query := `SELECT get_role_emails($1)`
// 	if err := db.QueryRow(query, roleIDInput).Scan(&recipientsJSON); err != nil {
// 		checkErr(c, http.StatusInternalServerError, err, "Failed to get role emails") // Use InternalServerError for DB errors
// 		return
// 	}

// 	// Unmarshal JSON string of recipients into a Go slice.
// 	var recipients []EmailRecipient
// 	if err := json.Unmarshal([]byte(recipientsJSON), &recipients); err != nil {
// 		checkErr(c, http.StatusInternalServerError, err, "Failed to unmarshal role emails") // Use InternalServerError for unmarshal errors
// 		return
// 	}

// 	// Collect all email addresses.
// 	var emails []string
// 	for _, r := range recipients {
// 		emails = append(emails, r.Email)
// 	}

// 	sendReminderEmail(c, emails, stateNameInput)
// 	c.JSON(http.StatusOK, gin.H{"message": "Reminder successfully sent"})
// }

// // sendReminderEmail constructs and sends a reminder email.
// func sendReminderEmail(c *gin.Context, emails []string, state string) {
// 	m := gomail.NewMessage()
// 	m.SetHeader("From", "testinggomail222@gmail.com")
// 	m.SetHeader("To", emails...)
// 	m.SetHeader("Subject", "StateManager request")

// 	// HTML body of the email.
// 	body := fmt.Sprintf(`Selamat pagi Bapak/Ibu,<br><br>
// 			Email ini dikirim secara otomatis untuk memberitahukan bahwa terdapat request yang telah memasuki status %s.<br><br>
// 			Mohon dapat dilakukan tindak lanjut terhadap request tersebut.<br><br>
// 			Terima kasih atas perhatian dan kerja samanya.<br><br>
// 			Salam,<br>StateManager`, state)

// 	m.SetBody("text/html", body)

// 	// Send the email and log any errors.
// 	if err := gomail.Send(dialed, m); err != nil {
// 		log.Printf("Send error: %v", err)
// 		checkErr(c, http.StatusInternalServerError, err, "Could not send email to "+strings.Join(emails, ", ")) // Use InternalServerError for email sending errors
// 	} else {
// 		println("Email sent successfully to " + strings.Join(emails, ", "))
// 	}
// }

// putUpgradeState handles upgrading the state of a request.
func putUpgradeState(c *gin.Context) {
	var us UpdateState
	// Bind JSON request body to UpdateState struct.
	if err := c.BindJSON(&us); err != nil {
		checkErr(c, http.StatusBadRequest, err, "Failed to bind update state JSON") // Use http.StatusBadRequest for malformed JSON
		return
	}

	println("requestID = " + fmt.Sprint(us.RequestID) + " userID: " + fmt.Sprint(us.UserID))

	// Call the appropriate database procedure to upgrade the state.
	if us.Comment == "" {
		query := `CALL upgrade_state($1, $2)` // Without comment
		if _, err := db.Exec(query, us.RequestID, us.UserID); err != nil {
			checkErr(c, http.StatusInternalServerError, err, "Failed to upgrade state") // Use InternalServerError for DB errors
			return
		}
	} else {
		query := `CALL upgrade_state($1, $2, $3)` // With comment
		if _, err := db.Exec(query, us.RequestID, us.UserID, us.Comment); err != nil {
			checkErr(c, http.StatusInternalServerError, err, "Failed to upgrade state") // Use InternalServerError for DB errors
			return
		}
	}

	c.IndentedJSON(http.StatusOK, gin.H{"message": "State updated successfully"})
}

// putDegradeState handles degrading the state of a request.
func putDegradeState(c *gin.Context) {
	var us UpdateState
	// Bind JSON request body to UpdateState struct.
	if err := c.BindJSON(&us); err != nil {
		checkErr(c, http.StatusBadRequest, err, "Failed to bind update data JSON") // Use http.StatusBadRequest for malformed JSON
		return
	}

	// Call a database procedure to downgrade the state (requires a comment).
	query := `CALL degrade_state($1, $2, $3)`
	if _, err := db.Exec(query, us.RequestID, us.UserID, us.Comment); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to degrade state") // Use InternalServerError for DB errors
		return
	}
	c.IndentedJSON(http.StatusOK, gin.H{"message": "State downgraded successfully"})
}

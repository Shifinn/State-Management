package handler

// package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/jackc/pgx/v5/stdlib"
	vercel_blob "github.com/rpdg/vercel_blob"
	"gopkg.in/gomail.v2"
)

// User represents a user for authentication purposes.
type User struct {
	UserName string `json:"userName"`
	Password string `json:"password"`
}

// StateCount holds the number of requests in a specific state.
type StateCount struct {
	StateID   int    `json:"stateId"`
	StateName string `json:"stateName"`
	Todo      int    `json:"todo"`
	Done      int    `json:"done"`
}

// NewRequest represents the data for creating a new request.
type NewRequest struct {
	RequestTitle        string    `json:"requestTitle"`
	UserID              int       `json:"userId"`
	RequesterName       string    `json:"requesterName"`
	AnalysisPurpose     string    `json:"analysisPurpose"`
	RequestedFinishDate time.Time `json:"requestedFinishDate"`
	PicRequest          string    `json:"picRequest"`
	Urgent              bool      `json:"urgent"`
	RequirementType     int       `json:"requirementType"`
	Answers             []string  `json:"answers"`
	DocxAttachment      []byte    `json:"docxAttachment"`
	DocxFilename        string    `json:"docxFilename"`
	ExcelAttachment     []byte    `json:"excelAttachment"`
	ExcelFilename       string    `json:"excelFilename"`
	Remark              string    `json:"remark"`
}

// UpdateState represents data for changing a request's state.
type UpdateState struct {
	RequestId int    `json:"requestId"`
	UserID    int    `json:"userId"`
	Comment   string `json:"comment"`
}

// EmailRecipient holds user and state information for sending emails.
type EmailRecipient struct {
	UserName     string `json:"userName"`
	Email        string `json:"email"`
	RequestState string `json:"requestState"`
}

type StateData struct {
	StateName string `json:"stateName"`
	StateId   int    `json:"stateId"`
}

// Global variables for the database connection and the Gin engine.
var (
	db  *sql.DB
	app *gin.Engine
)

// init is a special Go function that runs once when the package is initialized.
// For a Vercel serverless function, this serves as the cold-start entry point.
func init() {
	// Establish the database connection pool.
	db = openDB()
	// Create a new Gin router with default middleware.
	app = gin.Default()

	// Configure CORS (Cross-Origin Resource Sharing) middleware to allow requests from specified frontend origins.
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"https://state-management-1.vercel.app", "http://localhost:4200"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	app.Use(cors.New(config))

	// Group all routes under the "/api" prefix for versioning and organization.
	apiGroup := app.Group("/api")
	// Register all application-specific routes.
	registerRoutes(apiGroup)
}

// registerRoutes defines all the API endpoints for the application.
func registerRoutes(router *gin.RouterGroup) {
	// Authentication
	router.POST("/login", checkUserCredentials)

	// Request data
	router.GET("/stateSpecificData", getStateSpecificData)
	router.GET("/userRequestsData", getUserCurrentRequests)
	router.GET("/todoData", getTodoData)
	router.GET("/completeRequestDataBundle", getCompleteRequestDataBundle)

	// Analytics and other data
	router.GET("/stateCountData", getStateCount)
	router.GET("/getOldestRequestTime", getOldestRequest)
	router.GET("/getAttachmentFile", getAttachmentFile)
	router.GET("/getStateThreshold", getStateThreshold)
	router.GET("/questionData", getQuestionData)
	// router.GET("/fullStateHistoryData", getFullStateHistoryData)

	// Request management
	router.POST("/newRequest", postNewRequest)
	router.PUT("/upgradeState", putUpgradeState)
	router.PUT("/degradeState", putDegradeState)
	router.PUT("/dropRequest", dropRequest)

	// Email sending
	router.POST("/postReminderEmail", postReminderEmail)
}

// Handler is the entry point for Vercel Serverless Functions.
func Handler(w http.ResponseWriter, r *http.Request) {
	app.ServeHTTP(w, r)
}

// // main is the entry point for local development. It is ignored by Vercel.
// func main() {
// 	if err := godotenv.Load(); err != nil {
// 		log.Println("Error loading .env file")
// 	}
// 	port := "9090"
// 	log.Printf("INFO: Starting local server on http://localhost:%s\n", port)
// 	http.ListenAndServe(":"+port, http.HandlerFunc(Handler))
// }

// openDB establishes a connection to the PostgreSQL database.
// It uses the DATABASE_URL environment variable for establishing the connection
func openDB() *sql.DB {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		// Fallback for local development if the environment variable is not set.
		databaseURL = "postgres://postgres:12345678@localhost:5432/gudang_garam?sslmode=disable"
		log.Println("INFO: DATABASE_URL not set, using local fallback.")
	}

	// Open a connection using the pgx driver.
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		// If the connection string is invalid, the application cannot run.
		log.Fatalf("FATAL: Error opening database: %v", err)
	}
	// Ping the database to verify that the connection is alive.
	if err = db.Ping(); err != nil {
		// If the database is unreachable, the application cannot run.
		log.Fatalf("FATAL: Error pinging database: %v", err)
	}
	log.Println("INFO: Database connection successful.")
	return db
}

// checkErr is a centralized error handling utility.
// It logs the technical error for debugging and sends a standardized, user-friendly
// JSON error response to the client, preventing further execution.
func checkErr(c *gin.Context, errType int, err error, errMsg string) {
	if err != nil {
		log.Printf("ERROR: %v", err) // Log the detailed error for server-side debugging.
		// Send a JSON response with the appropriate HTTP status code.
		if errType == http.StatusInternalServerError {
			c.JSON(http.StatusInternalServerError, gin.H{"error": errMsg})
		} else if errType == http.StatusBadRequest {
			c.JSON(http.StatusBadRequest, gin.H{"error": errMsg})
		}
		c.Abort() // Stop processing the request.
	}
}

// checkEmpty validates that a required query parameter is not empty.
// This prevents nil pointer errors and ensures handlers receive necessary data.
func checkEmpty(c *gin.Context, str string) {
	if str == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing query parameters"})
		c.Abort() // Stop processing if a required parameter is missing.
	}
}

// checkUserCredentials handles the POST /login endpoint.
// It binds the incoming JSON to a User struct and calls the database function
// to verify the credentials.
func checkUserCredentials(c *gin.Context) {
	var newUser User
	var data string
	// Attempt to bind the request body to the User struct.
	if err := c.BindJSON(&newUser); err != nil {
		checkErr(c, http.StatusBadRequest, err, "Invalid input")
		return
	}
	log.Printf("INFO: Login attempt for user: %s", newUser.UserName)

	// Call the corresponding database function to authenticate the user.
	query := `SELECT get_user_id_by_credentials($1, $2)`
	if err := db.QueryRow(query, newUser.UserName, newUser.Password).Scan(&data); err != nil {
		checkErr(c, http.StatusBadRequest, err, "Failed to get user ID")
		return
	}
	// Return the raw JSON data from the database directly to the client.
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// getStateSpecificData handles the GET /stateSpecificData endpoint.
// It retrieves requests filtered by a specific state and date range.
func getStateSpecificData(c *gin.Context) {
	var data sql.NullString
	// Extract query parameters from the request URL.
	stateIdInput := c.Query("stateId")
	startDateInput := c.Query("startDate")
	endDateInput := c.Query("endDate")

	// Validate that all required parameters are present.
	checkEmpty(c, stateIdInput)
	checkEmpty(c, startDateInput)
	checkEmpty(c, endDateInput)

	// Execute the database function to fetch the data.
	query := `SELECT get_state_specific_data($1, $2, $3)`
	if err := db.QueryRow(query, stateIdInput, startDateInput, endDateInput).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get state data")
		return
	}
	// If the database returns NULL, send an empty JSON array.
	if !data.Valid {
		c.Data(http.StatusOK, "application/json", []byte("[]"))
		return
	}
	// Otherwise, send the retrieved JSON data.
	c.Data(http.StatusOK, "application/json", []byte(data.String))
}

// getUserCurrentRequests handles the GET /userRequestsData endpoint.
// It fetches all requests submitted by a specific user.
func getUserCurrentRequests(c *gin.Context) {
	var data sql.NullString
	userIdInput := c.Query("userId")
	checkEmpty(c, userIdInput)

	query := `SELECT get_user_request_data($1)`
	if err := db.QueryRow(query, userIdInput).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get user requests")
		return
	}
	if !data.Valid {
		c.Data(http.StatusOK, "application/json", []byte("[]"))
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data.String))
}

// getTodoData handles the GET /todoData endpoint.
// It retrieves a list of actionable requests for a specific user role.
func getTodoData(c *gin.Context) {
	var data sql.NullString
	userRoleInput := c.Query("roleId")
	checkEmpty(c, userRoleInput)

	query := `SELECT get_todo_data($1)`
	if err := db.QueryRow(query, userRoleInput).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get todo data")
		return
	}
	if !data.Valid {
		c.Data(http.StatusOK, "application/json", []byte("[]"))
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data.String))
}

// getCompleteRequestDataBundle handles the GET /completeRequestDataBundle endpoint.
// It fetches a comprehensive dataset for a single request, including nested data.
func getCompleteRequestDataBundle(c *gin.Context) {
	var data sql.NullString
	requestIdInput := c.Query("requestId")
	checkEmpty(c, requestIdInput)

	query := `SELECT get_complete_data_of_request_bundle($1)`
	if err := db.QueryRow(query, requestIdInput).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get complete data of request")
		return
	}
	// If no request is found, return an empty JSON object.
	if !data.Valid {
		c.Data(http.StatusOK, "application/json", []byte("{}"))
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data.String))
}

// getStateCount handles the GET /stateCountData endpoint.
// It fetches raw counts from the DB and then processes them to calculate
// "To-do" and "Done" metrics for a dashboard view.
func getStateCount(c *gin.Context) {
	var data string
	var count []StateCount
	var sqlNullString sql.NullString

	// Initialize a template result slice to ensure all states are represented, even if they have zero requests.
	result := []StateCount{
		{StateID: 1, StateName: "SUBMITTED", Todo: 0, Done: 0},
		{StateID: 2, StateName: "VALIDATED", Todo: 0, Done: 0},
		{StateID: 3, StateName: "IN PROGRESS", Todo: 0, Done: 0},
		{StateID: 4, StateName: "WAITING FOR REVIEW", Todo: 0, Done: 0},
		{StateID: 5, StateName: "DONE", Todo: 0, Done: 0},
		{StateID: -1, StateName: "TOTAL", Todo: 0, Done: 0},
	}

	startDateInput := c.Query("startDate")
	checkEmpty(c, startDateInput)
	endDateInput := c.Query("endDate")
	checkEmpty(c, endDateInput)

	// Fetch the raw counts of "To-do" items per state.
	query := `SELECT get_state_count($1, $2)`
	if err := db.QueryRow(query, startDateInput, endDateInput).Scan(&sqlNullString); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get state count")
		return
	}

	// If the database returns no data, return the initialized zero-value result.
	if !sqlNullString.Valid {
		c.IndentedJSON(http.StatusOK, result)
		return
	}
	data = sqlNullString.String

	// Unmarshal the JSON data from the database into the count slice.
	if err := json.Unmarshal([]byte(data), &count); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to unmarshal count data")
		return
	}

	// Populate the "Todo" counts from the database result into the template.
	for _, item := range count {
		if idx := item.StateID - 1; idx >= 0 && idx < len(result) {
			result[idx].Todo = item.Todo
		}
	}

	// Calculate the "Done" count for each state. "Done" for a state includes all
	// "To-do" items in subsequent states.
	for i := 0; i < len(result)-2; i++ {
		for j := i + 1; j < len(result)-1; j++ {
			result[i].Done += result[j].Todo
		}
		result[5].Todo += result[i].Todo // Accumulate total "To-do" items.
	}

	// Final adjustments for the "DONE" and "TOTAL" states.
	result[4].Done = result[4].Todo // "Done" for the final state is its own "To-do" count.
	result[5].Done = result[4].Todo // Total "Done" is the count of items in the final state.
	result[4].Todo = 0              // The final state has no "To-do" items by definition.

	c.IndentedJSON(http.StatusOK, result)
}

// getOldestRequest handles the GET /getOldestRequestTime endpoint.
// It finds the creation timestamp of the very first request in the system.
func getOldestRequest(c *gin.Context) {
	var data time.Time

	query := `SELECT get_oldest_request()`
	if err := db.QueryRow(query).Scan(&data); err != nil {
		log.Printf("Failed to get oldest request, err: %v", err)
		data = time.Now()
		// checkErr(c, http.StatusInternalServerError, err, "Failed to get oldest request")
		// return
	}
	c.JSON(http.StatusOK, data)
}

// getAttachmentFile handles the GET /getAttachmentFile endpoint.
// It retrieves a public URL for a requested file from the database.
func getAttachmentFile(c *gin.Context) {
	requestIdInput := c.Query("requestId")
	filenameInput := c.Query("filename")
	checkEmpty(c, requestIdInput)

	// Determine the attachment type ID based on the file extension.
	var attachmentType int
	if strings.HasSuffix(filenameInput, ".docx") || strings.HasSuffix(filenameInput, ".pdf") {
		attachmentType = 1
	} else {
		attachmentType = 2
	}

	var fileURL string
	query := `SELECT get_attachment_filepath($1, $2)`
	// Scan the result directly into the fileURL string.
	if err := db.QueryRow(query, requestIdInput, attachmentType).Scan(&fileURL); err != nil {
		if err == sql.ErrNoRows {
			checkErr(c, http.StatusNotFound, err, "Attachment not found")
			return
		}
		checkErr(c, http.StatusInternalServerError, err, "Failed to get attachment URL")
		return
	}
	// Return the URL in a JSON object.
	c.JSON(http.StatusOK, gin.H{
		"url": fileURL,
	})
}

// getStateThreshold handles the GET /getStateThreshold endpoint.
// It fetches configured time thresholds for each workflow state.
func getStateThreshold(c *gin.Context) {
	var data sql.NullString
	if err := db.QueryRow(`SELECT get_state_threshold()`).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get state threshold")
		return
	}
	if !data.Valid {
		c.Data(http.StatusOK, "application/json", []byte("[]"))
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data.String))
}

// getQuestionData handles the GET /questionData endpoint.
// It retrieves the set of questions for a given requirement form type.
func getQuestionData(c *gin.Context) {
	var data sql.NullString
	requirementTypeInput := c.Query("requirementType")
	checkEmpty(c, requirementTypeInput)

	query := `SELECT get_questions($1)`
	if err := db.QueryRow(query, requirementTypeInput).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get questions")
		return
	}
	if !data.Valid {
		c.Data(http.StatusOK, "application/json", []byte("[]"))
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data.String))
}

// postNewRequest handles the POST /newRequest endpoint.
// It parses multipart form data, creates a new request in the database,
// uploads any attached files, and stores their URLs.
func postNewRequest(c *gin.Context) {
	var newReq NewRequest
	var requestId string
	var docxFilePath string
	var excelFilePath string

	// Manually parse form fields into the NewRequest struct.
	newReq.RequestTitle = c.PostForm("requestTitle")
	newReq.RequesterName = c.PostForm("requesterName")
	newReq.AnalysisPurpose = c.PostForm("analysisPurpose")
	newReq.PicRequest = c.PostForm("picRequest")
	newReq.Remark = c.PostForm("remark")
	newReq.DocxFilename = c.PostForm("docxFilename")
	newReq.ExcelFilename = c.PostForm("excelFilename")

	// Handle integer conversion for UserID
	if userId, err := strconv.Atoi(c.PostForm("userId")); err != nil {
		checkErr(c, http.StatusBadRequest, err, "Invalid format for userId")
		return
	} else {
		newReq.UserID = userId
	}

	// Handle integer conversion for RequirementType
	if reqType, err := strconv.Atoi(c.PostForm("requirementType")); err != nil {
		checkErr(c, http.StatusBadRequest, err, "Invalid format for requirementType")
		return
	} else {
		newReq.RequirementType = reqType
	}

	// Handle boolean conversion for Urgent
	if urgent, err := strconv.ParseBool(c.PostForm("urgent")); err != nil {
		checkErr(c, http.StatusBadRequest, err, "Invalid format for urgent flag")
		return
	} else {
		newReq.Urgent = urgent
	}

	// Handle date parsing for RequestedFinishDate
	if finishDate, err := time.Parse(time.RFC3339, c.PostForm("requestedFinishDate")); err != nil {
		checkErr(c, http.StatusBadRequest, err, "Invalid date format for requestedFinishDate, use RFC3339")
		return
	} else {
		newReq.RequestedFinishDate = finishDate
	}
	// Answers are sent as a JSON string and must be unmarshaled.
	if answersJSON := c.PostForm("answers"); answersJSON != "" {
		if err := json.Unmarshal([]byte(answersJSON), &newReq.Answers); err != nil {
			checkErr(c, http.StatusBadRequest, err, "Invalid answers format")
			return
		}
	}

	// Call the database function to create the request and return its new ID.
	query := `SELECT create_new_request($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
	if err := db.QueryRow(query,
		newReq.RequestTitle, newReq.UserID, newReq.RequesterName, newReq.AnalysisPurpose, newReq.RequestedFinishDate, newReq.PicRequest, newReq.Urgent, newReq.RequirementType, newReq.Answers, newReq.Remark,
	).Scan(&requestId); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get request ID after creation")
		return
	}

	// Upload attached files to Vercel Blob storage.
	docxFilePath = uploadFile(c, "docxAttachment", newReq.DocxFilename, requestId)
	excelFilePath = uploadFile(c, "excelAttachment", newReq.ExcelFilename, requestId)

	requestIdInt, err := strconv.Atoi(requestId)
	if err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Unable to convert request ID to integer")
		return
	}

	// Call the database procedure to store the URLs of the uploaded attachments.
	queryAttachment := `CALL store_attachments($1, $2, $3, $4, $5);`
	if _, err = db.Exec(queryAttachment, requestIdInt, docxFilePath, newReq.DocxFilename, excelFilePath, newReq.ExcelFilename); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Unable to store attachments filepath to db")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Request successfully submitted."})
}

// uploadFile is a helper function to handle file uploads to Vercel Blob storage.
// It reads a file from the form, creates a unique path, and uploads it.
func uploadFile(c *gin.Context, formFileName string, filename string, requestId string) string {
	vercelCli := vercel_blob.NewVercelBlobClient()
	// Check if the file is present in the form.
	if file, err := c.FormFile(formFileName); err == nil {
		safeFilename := filepath.Base(filename)
		if safeFilename == "" || safeFilename == "." {
			checkErr(c, http.StatusBadRequest, fmt.Errorf("invalid filename"), "Invalid filename provided")
			return ""
		}
		// Create a unique path to avoid collisions.
		path := fmt.Sprintf("attachment - request%s - %s", requestId, safeFilename)

		openedFile, err := file.Open()
		if err != nil {
			checkErr(c, http.StatusInternalServerError, err, "failed to open uploaded file")
			return ""
		}
		defer openedFile.Close()

		// Upload the file to Vercel Blob storage.
		result, err := vercelCli.Put(path, openedFile, vercel_blob.PutCommandOptions{})
		if err != nil {
			checkErr(c, http.StatusInternalServerError, err, "failed to upload file to Vercel Blob")
			return ""
		}
		// Return the public URL of the uploaded file.
		return result.URL
	} else if err != http.ErrMissingFile {
		// Handle errors other than a missing file.
		checkErr(c, http.StatusInternalServerError, err, "Error processing attachment")
		return ""
	}
	// Return an empty string if no file was provided.
	return ""
}

// putUpgradeState handles the PUT /upgradeState endpoint.
// It advances a request's state and triggers an email notification to the next responsible role.
func putUpgradeState(c *gin.Context) {
	var updateData UpdateState
	var sqlNullString sql.NullString
	if err := c.BindJSON(&updateData); err != nil {
		checkErr(c, http.StatusBadRequest, err, "Failed to bind update state JSON")
		return
	}
	log.Printf("INFO: Upgrading state for requestId %d by userId %d", updateData.RequestId, updateData.UserID)

	// Call the appropriate database function based on whether a comment was provided.
	if updateData.Comment == "" {
		query := `SELECT upgrade_state($1, $2)`
		if err := db.QueryRow(query, updateData.RequestId, updateData.UserID).Scan(&sqlNullString); err != nil {
			checkErr(c, http.StatusInternalServerError, err, "Failed to upgrade state")
			return
		}
	} else {
		query := `SELECT upgrade_state($1, $2, $3)`
		if err := db.QueryRow(query, updateData.RequestId, updateData.UserID, updateData.Comment).Scan(&sqlNullString); err != nil {
			checkErr(c, http.StatusInternalServerError, err, "Failed to upgrade state")
			return
		}
	}
	log.Printf("State successfully updated")

	var state StateData
	var targetRole string
	if err := json.Unmarshal([]byte(sqlNullString.String), &state); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to unmarshal state data")
		return
	}

	// Determine the next role to notify based on the new state ID.
	if state.StateId == 2 || state.StateId == 3 {
		targetRole = "2" // Worker role
	} else if state.StateId == 4 {
		targetRole = "3" // Validator role
	} else if state.StateId == 5 {
		targetRole = "last state" // No one to notify
	} else {
		targetRole = "invalid update"
	}

	// Send the notification email.
	var message string
	if targetRole == "invalid update" {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"message": "State updated successfully, but email unsuccessfully sent"})
	} else if targetRole == "last state" {
		c.IndentedJSON(http.StatusOK, gin.H{"message": "State updated successfully"})
	} else {
		message = sendReminderEmailToRole(c, targetRole, state.StateName)
		if message == "" {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{"message": "State updated successfully, but email unsuccessfully sent"})
			return
		}
		c.IndentedJSON(http.StatusOK, gin.H{"message": "State updated successfully, " + message})
	}
}

// putDegradeState handles the PUT /degradeState endpoint.
// It reverts a request's state and notifies the appropriate role.
func putDegradeState(c *gin.Context) {
	var updateData UpdateState
	var sqlNullString sql.NullString
	if err := c.BindJSON(&updateData); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to bind update data JSON")
		return
	}

	query := `SELECT degrade_state($1, $2, $3)`
	if err := db.QueryRow(query, updateData.RequestId, updateData.UserID, updateData.Comment).Scan(&sqlNullString); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to degrade state")
		return
	}
	log.Printf("State successfully updated")

	var state StateData
	var targetRole string
	if err := json.Unmarshal([]byte(sqlNullString.String), &state); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to unmarshal state data")
		return
	}

	// Determine which role to notify that the request has been sent back.
	if state.StateId == 3 {
		targetRole = "2" // Worker role
	} else {
		targetRole = "invalid update"
	}

	var message string
	if targetRole == "invalid update" {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"message": "State updated successfully, but email unsuccessfully sent"})
	} else {
		// Use a custom email body for degrade actions.
		var body = fmt.Sprintf(`Selamat pagi Bapak/Ibu,<br><br>
            Email ini dikirim secara otomatis untuk memberitahukan bahwa terdapat request yang belum mencukupi kebutuhan dan telah memasuki status %s kembali.<br><br>
            Mohon dapat dilakukan tindak lanjut terhadap request tersebut.<br><br>
            Terima kasih atas perhatian dan kerja samanya.<br><br>
            Salam,<br>StateManager`, state.StateName)
		message = sendReminderEmailToRole(c, targetRole, state.StateName, body)
		if message == "" {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{"message": "State updated successfully, but email unsuccessfully sent"})
			return
		}
		c.IndentedJSON(http.StatusOK, gin.H{"message": "State updated successfully, " + message})
	}
}

// dropRequest handles the PUT /dropRequest endpoint.
// It permanently drops a request from the active workflow.
func dropRequest(c *gin.Context) {
	var updateData UpdateState
	if err := c.BindJSON(&updateData); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to bind update data JSON")
		return
	}

	// Call the database procedure to drop the request.
	query := `CALL drop_request($1, $2, $3)`
	if _, err := db.Exec(query, updateData.RequestId, updateData.UserID, updateData.Comment); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to drop request")
		return
	}
}

// postReminderEmail handles the POST /postReminderEmail endpoint.
// It sends a reminder email to a single, specified recipient.
func postReminderEmail(c *gin.Context) {
	var recipient EmailRecipient
	if err := c.BindJSON(&recipient); err != nil {
		checkErr(c, http.StatusBadRequest, err, "Invalid input")
		return
	}
	sendReminderEmail([]string{recipient.Email}, recipient.RequestState)
	c.JSON(http.StatusOK, gin.H{"message": "Reminder email dispatched."})
}

// sendReminderEmailToRole is a helper function that fetches emails for a role and dispatches the reminder.
func sendReminderEmailToRole(c *gin.Context, roleIDInput string, stateNameInput string, body ...string) string {
	var recipientsJSON sql.NullString
	// Fetch the list of recipients from the database.
	query := `SELECT get_role_emails($1)`
	if err := db.QueryRow(query, roleIDInput).Scan(&recipientsJSON); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get role emails")
		return ""
	}
	if !recipientsJSON.Valid {
		return "No recipients found for this role."
	}

	var recipients []EmailRecipient
	if err := json.Unmarshal([]byte(recipientsJSON.String), &recipients); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to unmarshal role emails")
		return ""
	}

	// Extract email addresses into a simple slice of strings.
	var emails []string
	for _, r := range recipients {
		emails = append(emails, r.Email)
	}

	// Send the email, using a custom body if provided.
	var message string
	if len(body) > 0 && body[0] != "" {
		message = sendReminderEmail(emails, stateNameInput, body...)
	} else {
		message = sendReminderEmail(emails, stateNameInput)
	}
	return message
}

// sendReminderEmail constructs and sends an email using the gomail package.
// It uses hardcoded SMTP credentials for demonstration purposes.
func sendReminderEmail(emails []string, state string, body ...string) string {
	// In a real application, these should be loaded securely from environment variables.
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	if smtpUser == "" || smtpPass == "" {
		log.Println("ERROR: SMTP credentials not set, cannot send email.")
		return ""
	}

	// Configure the SMTP dialer.
	mailer := gomail.NewDialer("smtp.gmail.com", 587, smtpUser, smtpPass)
	msg := gomail.NewMessage()
	msg.SetHeader("From", smtpUser)
	msg.SetHeader("To", emails...)
	msg.SetHeader("Subject", "StateManager Request")

	// Use a custom email body if provided, otherwise use the default template.
	emailBody := ""
	if len(body) > 0 && body[0] != "" {
		emailBody = body[0]
	} else {
		emailBody = fmt.Sprintf(`Selamat pagi Bapak/Ibu,<br><br>
            Email ini dikirim secara otomatis untuk memberitahukan bahwa terdapat request yang telah memasuki status %s.<br><br>
            Mohon dapat dilakukan tindak lanjut terhadap request tersebut.<br><br>
            Terima kasih atas perhatian dan kerja samanya.<br><br>
            Salam,<br>StateManager`, state)
	}
	msg.SetBody("text/html", emailBody)

	// Dial the SMTP server and send the email.
	if err := mailer.DialAndSend(msg); err != nil {
		log.Printf("ERROR: Could not send email to %s. Reason: %v", strings.Join(emails, ", "), err)
		return ""
	} else {
		message := "Email sent successfully to " + strings.Join(emails, ", ")
		log.Printf("%s", message)
		return message
	}
}

// The package must be 'handler' to be recognized by Vercel as a serverless function.
package handler

// package main

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

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"github.com/rpdg/vercel_blob"
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
	RequestID int    `json:"requestId"`
	UserID    int    `json:"userId"`
	Comment   string `json:"comment"`
}

// EmailRecipient holds user and state information for sending emails.
type EmailRecipient struct {
	UserName     string `json:"userName"`
	Email        string `json:"email"`
	RequestState string `json:"requestState"`
}

// Global variables for the database connection and the Gin engine.
var (
	db              *sql.DB
	app             *gin.Engine
	uploadDirectory string = ".\\files" // Base directory for file uploads (for local dev)
)

// init runs once when the serverless function starts, setting up the router.
func init() {
	db = openDB() // Initialize the database connection
	app = gin.Default()

	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"https://state-management-1.vercel.app", "http://localhost:4200"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	app.Use(cors.New(config))

	apiGroup := app.Group("/api")
	registerRoutes(apiGroup)
}

// registerRoutes defines all the API endpoints for the application.
func registerRoutes(router *gin.RouterGroup) {
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
	router.POST("/postReminderEmail", postReminderEmail)
	router.POST("/postReminderEmailToRole", postReminderEmailToRole)
	router.PUT("/upgradeState", putUpgradeState)
	router.PUT("/degradeState", putDegradeState)
}

// Handler is the entry point for Vercel Serverless Functions.
func Handler(w http.ResponseWriter, r *http.Request) {
	app.ServeHTTP(w, r)
}

// main is the entry point for local development. It is ignored by Vercel.
// func main() {
// 	port := "9090"
// 	log.Printf("INFO: Starting local server on http://localhost:%s\n", port)
// 	http.ListenAndServe(":"+port, http.HandlerFunc(Handler))
// }

// openDB initializes and returns a new PostgreSQL database connection pool.
func openDB() *sql.DB {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://postgres:12345678@localhost:5432/gudang_garam?sslmode=disable"
		log.Println("INFO: DATABASE_URL not set, using local fallback.")
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("FATAL: Error opening database: %v", err)
	}
	if err = db.Ping(); err != nil {
		log.Fatalf("FATAL: Error pinging database: %v", err)
	}
	log.Println("INFO: Database connection successful.")
	return db
}

// checkErr logs an error and sends an appropriate HTTP response.
func checkErr(c *gin.Context, errType int, err error, errMsg string) {
	if err != nil {
		log.Printf("ERROR: %v", err)
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
		c.Abort()
	}
}

// checkUserCredentials handles user login by verifying credentials against the database.
func checkUserCredentials(c *gin.Context) {
	var newUser User
	var data string

	newUser.UserName = c.Query("userName")
	newUser.Password = c.Query("password")
	log.Printf("INFO: Login attempt for user: %s", newUser.UserName)

	query := `SELECT get_user_id_by_credentials($1, $2)`
	if err := db.QueryRow(query, newUser.UserName, newUser.Password).Scan(&data); err != nil {
		checkErr(c, http.StatusBadRequest, err, "Failed to get user ID")
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// getStateSpecificData retrieves and sends state-specific request data based on date range.
func getStateSpecificData(c *gin.Context) {
	var data sql.NullString
	stateIdInput := c.Query("stateId")
	startDateInput := c.Query("startDate")
	endDateInput := c.Query("endDate")

	checkEmpty(c, stateIdInput)
	checkEmpty(c, startDateInput)
	checkEmpty(c, endDateInput)

	query := `SELECT get_state_specific_data($1, $2, $3)`
	if err := db.QueryRow(query, stateIdInput, startDateInput, endDateInput).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get state data")
		return
	}
	if !data.Valid {
		c.Data(http.StatusOK, "application/json", []byte("[]"))
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data.String))
}

// getUserCurrentRequests retrieves and sends a user's current requests.
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

// getTodoData retrieves and sends to-do requests based on user role.
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

// getCompleteRequestData retrieves and sends complete details for a specific request.
func getCompleteRequestData(c *gin.Context) {
	var data sql.NullString
	requestIdInput := c.Query("requestId")

	checkEmpty(c, requestIdInput)

	query := `SELECT get_complete_data_of_request($1)`
	if err := db.QueryRow(query, requestIdInput).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get complete data of request")
		return
	}
	if !data.Valid {
		c.Data(http.StatusOK, "application/json", []byte("{}"))
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data.String))
}

// getStateCount retrieves and calculates state-wise request counts within a date range.
func getStateCount(c *gin.Context) {
	var data string
	var count []StateCount
	var sqlNullString sql.NullString

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

	query := `SELECT get_state_count($1, $2)`
	if err := db.QueryRow(query, startDateInput, endDateInput).Scan(&sqlNullString); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get state count")
		return
	}

	if !sqlNullString.Valid {
		c.IndentedJSON(http.StatusOK, result)
		return
	}
	data = sqlNullString.String

	if err := json.Unmarshal([]byte(data), &count); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to unmarshal count data")
		return
	}

	for _, item := range count {
		if idx := item.StateID - 1; idx >= 0 && idx < len(result) {
			result[idx].Todo = item.Todo
		}
	}

	for i := 0; i < len(result)-2; i++ {
		for j := i + 1; j < len(result)-1; j++ {
			result[i].Done += result[j].Todo
		}
		result[5].Todo += result[i].Todo
	}

	result[4].Done = result[4].Todo
	result[5].Done = result[4].Todo
	result[4].Todo = 0

	c.IndentedJSON(http.StatusOK, result)
}

// getFullStateHistoryData retrieves and sends the full state history for a specific request.
func getFullStateHistoryData(c *gin.Context) {
	var data sql.NullString
	requestIDInput := c.Query("requestId")

	checkEmpty(c, requestIDInput)

	query := `SELECT get_full_state_history($1)`
	if err := db.QueryRow(query, requestIDInput).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get full state history")
		return
	}
	if !data.Valid {
		c.Data(http.StatusOK, "application/json", []byte("[]"))
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data.String))
}

// getQuestionData retrieves and sends questions based on a specific requirement type.
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

// getAnswerForRequest retrieves and sends answers for a specific request.
func getAnswerForRequest(c *gin.Context) {
	var data sql.NullString
	requestIDInput := c.Query("requestId")

	checkEmpty(c, requestIDInput)

	query := `SELECT get_request_requirement_answer($1)`
	if err := db.QueryRow(query, requestIDInput).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get request answers")
		return
	}
	if !data.Valid {
		c.Data(http.StatusOK, "application/json", []byte("[]"))
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data.String))
}

// getOldestRequest retrieves and sends the timestamp of the oldest request.
func getOldestRequest(c *gin.Context) {
	var data time.Time

	query := `SELECT get_oldest_request()`
	if err := db.QueryRow(query).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get oldest request")
		return
	}
	c.JSON(http.StatusOK, data)
}

// getAttachmentFile retrieves and sends a specified attachment. Note: Relies on local filesystem.
func getAttachmentFile(c *gin.Context) {
	var data []byte
	var attachmentType int

	requestIDInput := c.Query("requestId")
	filenameInput := c.Query("filename")

	checkEmpty(c, requestIDInput)
	checkEmpty(c, filenameInput)

	var contentType string
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
		contentType = "application/octet-stream"
	}

	query := `SELECT get_attachment_filepath($1, $2)`
	if err := db.QueryRow(query, requestIDInput, attachmentType).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get attachment")
		return
	}

	file, err := os.Open(string(data))
	if err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to open attachment file")
		return
	}
	defer file.Close()

	fileContent, err := os.ReadFile(string(data))
	if err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to read attachment file")
		return
	}

	c.Header("Content-Disposition", "attachment; filename="+strconv.Quote(filenameInput))
	c.Data(http.StatusOK, contentType, fileContent)
}

// getFilenames retrieves and sends filenames associated with a request.
func getFilenames(c *gin.Context) {
	var data sql.NullString
	requestIDInput := c.Query("requestId")
	checkEmpty(c, requestIDInput)

	query := `SELECT get_filenames($1)`
	if err := db.QueryRow(query, requestIDInput).Scan(&data); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get filename")
		return
	}
	if !data.Valid {
		c.Data(http.StatusOK, "application/json", []byte("[]"))
		return
	}
	c.Data(http.StatusOK, "application/json", []byte(data.String))
}

// getStateThreshold retrieves and sends the state threshold data.
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

// postNewRequest handles the creation of a new request, including file uploads.
func postNewRequest(c *gin.Context) {
	log.Println("enter new req func")
	var newReq NewRequest
	var requestID string
	var docxFilePath string
	// var excelFilePath string

	newReq.RequestTitle = c.PostForm("requestTitle")
	newReq.RequesterName = c.PostForm("requesterName")
	newReq.AnalysisPurpose = c.PostForm("analysisPurpose")
	newReq.PicRequest = c.PostForm("picRequest")
	newReq.Remark = c.PostForm("remark")
	newReq.DocxFilename = c.PostForm("docxFilename")
	newReq.ExcelFilename = c.PostForm("excelFilename")

	newReq.UserID, _ = strconv.Atoi(c.PostForm("userId"))
	newReq.RequirementType, _ = strconv.Atoi(c.PostForm("requirementType"))
	newReq.Urgent, _ = strconv.ParseBool(c.PostForm("urgent"))

	dateStr := c.PostForm("requestedFinishDate")
	newReq.RequestedFinishDate, _ = time.Parse(time.RFC3339, dateStr)

	if answersJSON := c.PostForm("answers"); answersJSON != "" {
		if err := json.Unmarshal([]byte(answersJSON), &newReq.Answers); err != nil {
			checkErr(c, http.StatusBadRequest, err, "Invalid answers format")
			return
		}
	}

	query := `SELECT ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
	if false {
		if err := db.QueryRow(query,
			newReq.RequestTitle, newReq.UserID, newReq.RequesterName, newReq.AnalysisPurpose,
			newReq.RequestedFinishDate, newReq.PicRequest, newReq.Urgent,
			newReq.RequirementType, pq.Array(newReq.Answers), newReq.Remark,
		).Scan(&requestID); err != nil {
			checkErr(c, http.StatusInternalServerError, err, "Failed to get request ID after creation")
			// return
		}
	}
	client := vercel_blob.NewVercelBlobClient()
	// 4. Handle DOCX Upload using the requestID as a key/folder
	if docxFileHeader, err := c.FormFile("docxAttachment"); err != nil {
		log.Println("enter after get docs")
		file, _ := docxFileHeader.Open()
		defer file.Close()

		// *** THIS IS THE KEY ***
		// Construct a unique pathname that acts as the key.
		// Format: attachments/request_[ID]/[original_filename]
		pathname := fmt.Sprintf("attachments/request_%s/%s", requestID, docxFileHeader.Filename)
		log.Printf("Uploading to pathname: %s", pathname)

		blobResult, err := client.Put(pathname, file, vercel_blob.PutCommandOptions{})
		if err != nil {
			checkErr(c, http.StatusInternalServerError, err, "Unable to upload docx file")
			return
		}
		docxFilePath = blobResult.URL
		newReq.DocxFilename = docxFileHeader.Filename
	}
	log.Println("docxfile: " + docxFilePath)
	// This file logic will only work in a local environment, not on Vercel.
	// requestDirectory := filepath.Join(uploadDirectory, "Request"+requestID)
	// if err := os.MkdirAll(requestDirectory, 0755); err != nil {
	// 	log.Printf("Error creating directory: %v", err)
	// 	checkErr(c, http.StatusInternalServerError, err, "Could not create storage directory")
	// 	return
	// }

	// if file, err := c.FormFile("docxAttachment"); err == nil {
	// 	safeFilename := filepath.Base(newReq.DocxFilename)
	// 	if safeFilename == "" || safeFilename == "." {
	// 		checkErr(c, http.StatusBadRequest, fmt.Errorf("invalid docx filename"), "Invalid docx filename provided")
	// 		return
	// 	}
	// 	docxFilePath = filepath.Join(requestDirectory, safeFilename)
	// 	if err := c.SaveUploadedFile(file, docxFilePath); err != nil {
	// 		checkErr(c, http.StatusInternalServerError, err, "Unable to save docx file")
	// 		return
	// 	}
	// } else if err != http.ErrMissingFile {
	// 	checkErr(c, http.StatusInternalServerError, err, "Error processing docx attachment")
	// 	return
	// }

	// if file, err := c.FormFile("excelAttachment"); err == nil {
	// 	safeFilename := filepath.Base(newReq.ExcelFilename)
	// 	if safeFilename == "" || safeFilename == "." {
	// 		checkErr(c, http.StatusBadRequest, fmt.Errorf("invalid excel filename"), "Invalid excel filename provided")
	// 		return
	// 	}
	// 	excelFilePath = filepath.Join(requestDirectory, safeFilename)
	// 	if err := c.SaveUploadedFile(file, excelFilePath); err != nil {
	// 		checkErr(c, http.StatusInternalServerError, err, "Unable to save excel file")
	// 		return
	// 	}
	// } else if err != http.ErrMissingFile {
	// 	checkErr(c, http.StatusInternalServerError, err, "Error processing excel attachment")
	// 	return
	// }

	// requestIDInt, err := strconv.Atoi(requestID)
	// if err != nil {
	// 	checkErr(c, http.StatusInternalServerError, err, "Unable to convert request ID to integer")
	// 	return
	// }
	// log.Printf("docxFilePath = %s, excelFilePath = %s", docxFilePath, excelFilePath)

	// queryAttachment := `CALL store_attachments($1, $2, $3, $4, $5);`
	// if _, err = db.Exec(queryAttachment, requestIDInt, docxFilePath, newReq.DocxFilename, excelFilePath, newReq.ExcelFilename); err != nil {
	// 	checkErr(c, http.StatusInternalServerError, err, "Unable to store attachments filepath to db")
	// 	return
	// }

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Request submitted.",
	})
}

// postReminderEmail sends a reminder email to a single recipient.
func postReminderEmail(c *gin.Context) {
	var recipient EmailRecipient
	if err := c.BindJSON(&recipient); err != nil {
		checkErr(c, http.StatusBadRequest, err, "Invalid input")
		return
	}
	go sendReminderEmail(c.Copy(), []string{recipient.Email}, recipient.RequestState)
	c.JSON(http.StatusOK, gin.H{"message": "Reminder email dispatched."})
}

// postReminderEmailToRole sends a reminder email to all users of a specific role.
func postReminderEmailToRole(c *gin.Context) {
	roleIDInput := c.Query("roleId")
	checkEmpty(c, roleIDInput)

	stateNameInput := c.Query("stateName")
	checkEmpty(c, stateNameInput)

	var recipientsJSON sql.NullString
	query := `SELECT get_role_emails($1)`
	if err := db.QueryRow(query, roleIDInput).Scan(&recipientsJSON); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to get role emails")
		return
	}
	if !recipientsJSON.Valid {
		c.JSON(http.StatusOK, gin.H{"message": "No recipients found for this role."})
		return
	}

	var recipients []EmailRecipient
	if err := json.Unmarshal([]byte(recipientsJSON.String), &recipients); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to unmarshal role emails")
		return
	}

	var emails []string
	for _, r := range recipients {
		emails = append(emails, r.Email)
	}

	go sendReminderEmail(c.Copy(), emails, stateNameInput)
	c.JSON(http.StatusOK, gin.H{"message": "Reminder successfully dispatched to role."})
}

// sendReminderEmail constructs and sends a reminder email asynchronously.
func sendReminderEmail(c *gin.Context, emails []string, state string) {
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	if smtpUser == "" || smtpPass == "" {
		log.Println("ERROR: SMTP credentials not set, cannot send email.")
		return
	}

	mailer := gomail.NewDialer("smtp.gmail.com", 587, smtpUser, smtpPass)
	msg := gomail.NewMessage()
	msg.SetHeader("From", smtpUser)
	msg.SetHeader("To", emails...)
	msg.SetHeader("Subject", "StateManager Request")

	body := fmt.Sprintf(`Selamat pagi Bapak/Ibu,<br><br>
			Email ini dikirim secara otomatis untuk memberitahukan bahwa terdapat request yang telah memasuki status %s.<br><br>
			Mohon dapat dilakukan tindak lanjut terhadap request tersebut.<br><br>
			Terima kasih atas perhatian dan kerja samanya.<br><br>
			Salam,<br>StateManager`, state)
	msg.SetBody("text/html", body)

	if err := mailer.DialAndSend(msg); err != nil {
		log.Printf("ERROR: Could not send email to %s. Reason: %v", strings.Join(emails, ", "), err)
	} else {
		log.Printf("INFO: Email sent successfully to %s", strings.Join(emails, ", "))
	}
}

// putUpgradeState handles upgrading the state of a request.
func putUpgradeState(c *gin.Context) {
	var updateData UpdateState
	if err := c.BindJSON(&updateData); err != nil {
		checkErr(c, http.StatusBadRequest, err, "Failed to bind update state JSON")
		return
	}

	log.Printf("INFO: Upgrading state for requestId %d by userId %d", updateData.RequestID, updateData.UserID)

	if updateData.Comment == "" {
		query := `CALL upgrade_state($1, $2)`
		if _, err := db.Exec(query, updateData.RequestID, updateData.UserID); err != nil {
			checkErr(c, http.StatusInternalServerError, err, "Failed to upgrade state")
			return
		}
	} else {
		query := `CALL upgrade_state($1, $2, $3)`
		if _, err := db.Exec(query, updateData.RequestID, updateData.UserID, updateData.Comment); err != nil {
			checkErr(c, http.StatusInternalServerError, err, "Failed to upgrade state")
			return
		}
	}

	c.IndentedJSON(http.StatusOK, gin.H{"message": "State updated successfully"})
}

// putDegradeState handles degrading the state of a request.
func putDegradeState(c *gin.Context) {
	var updateData UpdateState
	if err := c.BindJSON(&updateData); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to bind update data JSON")
		return
	}

	query := `CALL degrade_state($1, $2, $3)`
	if _, err := db.Exec(query, updateData.RequestID, updateData.UserID, updateData.Comment); err != nil {
		checkErr(c, http.StatusInternalServerError, err, "Failed to degrade state")
		return
	}
	c.IndentedJSON(http.StatusOK, gin.H{"message": "State downgraded successfully"})
}

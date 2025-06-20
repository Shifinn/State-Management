package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"gopkg.in/gomail.v2"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

// Database connection details
const (
	host     = "localhost"
	port     = 5432
	user     = "postgres"
	password = "12345678"
	db_name  = "gudang_garam"
)

// User struct for user authentication
type User struct {
	User_name     string `json:"user_name"`
	User_password string `json:"user_password"`
}

// StateCount struct to hold state-wise request counts
type StateCount struct {
	State_id   int    `json:"state_id"`
	State_name string `json:"state_name"`
	Todo       int    `json:"todo"`
	Done       int    `json:"done"`
}

// NewRequest struct for creating a new request
type NewRequest struct {
	Request_title         string    `json:"request_title"`
	User_id               int       `json:"user_id"`
	Requester_name        string    `json:"requester_name"`
	Analysis_purpose      string    `json:"analysis_purpose"`
	Requested_finish_date time.Time `json:"requested_finish_date"`
	Pic_request           string    `json:"pic_request"`
	Urgent                bool      `json:"urgent"`
	Requirement_type      int       `json:"requirement_type"`
	Answers               []string  `json:"answers"`
	Docx_attachment       []byte    `json:"docx_attachment"`
	Docx_filename         string    `json:"docx_filename"`
	Excel_attachment      []byte    `json:"excel_attachment"`
	Excel_filename        string    `json:"Excelfilename"`
	Remark                string    `json:"remark"`
}

// UpdateState struct for updating a request's state
type UpdateState struct {
	Request_id int    `json:"request_id"`
	User_id    int    `json:"user_id"`
	Comment    string `json:"comment"`
}

type EmailRecipient struct {
	User_name     string `json:"user_name"`
	Email         string `json:"email"`
	Request_state string `json:"request_state"`
}

// Database connection initialized at program start
var db *sql.DB = openDB()
var mail = gomail.NewDialer("smtp.gmail.com", 587, "testinggomail222@gmail.com", "hqsq twwx ilao jvik")
var dialed = startDial()

func main() {
	// Close the database connection when the program exits
	defer db.Close()

	// Initialize Gin router
	router := gin.Default()

	// CORS middleware configuration
	router.Use(func(c *gin.Context) {
		// Allow requests from any origin
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		// Allow specific headers
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		// Allow specific HTTP methods
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		// Handle preflight requests
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204) // No Content
			return
		}
		c.Next() // Continue to the next middleware/handler
	})

	// Define API routes and their corresponding handlers
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
	router.Run("Localhost:9090") // Run the server on port 9090
}

// openDB initializes and returns a new PostgreSQL database connection.
// It constructs the connection string and attempts to open the database.
// If an error occurs during connection, it prints the error and returns nil.
func openDB() *sql.DB {
	psqlconn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable", host, port, user, password, db_name)
	db, err := sql.Open("postgres", psqlconn)
	if err != nil {
		fmt.Println("Error opening database: ", err)
		return nil
	}
	return db
}

func startDial() gomail.SendCloser {
	dialed, err := mail.Dial()
	if err != nil {
		log.Fatalf("Failed to connect to SMTP server: %v", err)
	}
	return dialed
}

// checkErr checks for a database error and sends a BadRequest response if an error exists.
// It's a utility function to streamline error handling across handlers.
func checkErr(c *gin.Context, err error, err_msg string) {
	if err != nil {
		println("error:" + err.Error()) // Print the error to the console for debugging
		c.JSON(http.StatusBadRequest, gin.H{"error": err_msg})
		c.Abort() // Abort the request to prevent further processing
	}
}

// checkEmpty checks if a string is empty and sends a BadRequest response if it is.
// Used for validating required query parameters.
func checkEmpty(c *gin.Context, str string) {
	if str == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing query parameters"})
		c.Abort() // Abort the request
		return
	}
}

// checkUserCredentials handles user login, verifying credentials against the database.
// It retrieves user_name and password from query parameters, executes a stored procedure
// to get the user ID, and returns it as JSON.
func checkUserCredentials(c *gin.Context) {
	var new_user User
	var data string // To store the result from the database
	new_user.User_name = c.Query("user_name")
	new_user.User_password = c.Query("password")

	// Call a stored procedure in the database to get user ID by credentials
	query := `SELECT get_user_id_by_credentials($1, $2)`
	err := db.QueryRow(query, new_user.User_name, new_user.User_password).Scan(&data)
	checkErr(c, err, "failed to get user id") // Handle any database errors
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// getStateSpecificData retrieves and sends state-specific request data.
// It expects state_id, start_date, and end_date as query parameters,
// then calls a database function to fetch the relevant data.
func getStateSpecificData(c *gin.Context) {
	var data string
	state_id_input := c.Query("state_id")
	start_date_input := c.Query("start_date")
	end_date_input := c.Query("end_date")

	// Validate required query parameters
	checkEmpty(c, state_id_input)
	checkEmpty(c, start_date_input)
	checkEmpty(c, end_date_input)

	// Call a database function to get state-specific data
	query := `SELECT get_state_specific_data($1, $2, $3)`
	err := db.QueryRow(query, state_id_input, start_date_input, end_date_input).Scan(&data)
	checkErr(c, err, "Failed to get state data")
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// getUserCurrentRequests retrieves and sends a user's current requests.
// It requires a user_id as a query parameter and fetches data from the database.
func getUserCurrentRequests(c *gin.Context) {
	var data string
	user_id_input := c.Query("user_id")

	// Validate required query parameter
	checkEmpty(c, user_id_input)

	// Call a database function to get user's current requests
	query := `SELECT get_user_request_data($1)`
	err := db.QueryRow(query, user_id_input).Scan(&data)
	checkErr(c, err, "Failed to get user requests")
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// getTodoData retrieves and sends to-do data based on user role.
// It expects a role_id as a query parameter.
func getTodoData(c *gin.Context) {
	var data string
	user_role_input := c.Query("role_id")

	// Validate required query parameter
	checkEmpty(c, user_role_input)

	// Call a database function to get to-do data
	query := `SELECT get_todo_data($1)`
	err := db.QueryRow(query, user_role_input).Scan(&data)
	checkErr(c, err, "Failed to get todo data")
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// getCompleteRequestData retrieves and sends complete data for a specific request.
// It requires a request_id as a query parameter.
func getCompleteRequestData(c *gin.Context) {
	var data string
	request_id_input := c.Query("request_id")

	// Validate required query parameter
	checkEmpty(c, request_id_input)

	// Call a database function to get complete request data
	query := `SELECT get_complete_data_of_request($1)`
	err := db.QueryRow(query, request_id_input).Scan(&data)
	checkErr(c, err, "Failed to get complete data of request")
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// getStateCount retrieves and sends state-wise counts of requests.
// It initializes a slice of StateCount structs with predefined states,
// queries the database for actual counts within a date range,
// and then calculates "Done" counts by summing "Todo" counts of subsequent states.
func getStateCount(c *gin.Context) {
	var data string
	var count []StateCount           // To unmarshal database result
	var sqlNullString sql.NullString // To handle potential null results from database

	// Initialize result with predefined state IDs and names, and zero counts.
	// This ensures all states are present in the final output, even if they have no requests.
	result := []StateCount{
		{State_id: 1, State_name: "SUBMITTED", Todo: 0, Done: 0},
		{State_id: 2, State_name: "VALIDATED", Todo: 0, Done: 0},
		{State_id: 3, State_name: "IN PROGRESS", Todo: 0, Done: 0},
		{State_id: 4, State_name: "WAITING FOR REVIEW", Todo: 0, Done: 0},
		{State_id: 5, State_name: "DONE", Todo: 0, Done: 0},
		{State_id: -1, State_name: "TOTAL", Todo: 0, Done: 0}, // Placeholder for total counts
	}

	start_date_input := c.Query("start_date")
	checkEmpty(c, start_date_input)
	end_date_input := c.Query("end_date")
	checkEmpty(c, end_date_input)

	// Call a database function to get state counts within the specified date range
	query := `SELECT get_state_count($1, $2)`
	err := db.QueryRow(query, start_date_input, end_date_input).Scan(&sqlNullString)
	checkErr(c, err, "Failed to get state count")

	// If the database query returns a NULL, it means no data for the given range.
	// In this case, return the initialized result with all counts as zero.
	if !sqlNullString.Valid {
		c.IndentedJSON(http.StatusOK, result)
		return
	}

	data = sqlNullString.String // Extract string value if not null

	// Unmarshal JSON data from the database into the 'count' slice
	err = json.Unmarshal([]byte(data), &count)
	checkErr(c, err, "failed to mashal count")

	// Populate the 'Todo' values in the 'result' slice by matching 'state_id'
	// The state_id from the database is 1-indexed, so we convert it to 0-indexed for array access.
	for _, item := range count {
		if idx := item.State_id - 1; idx >= 0 && idx < len(result) {
			result[idx].Todo = item.Todo
		}
	}

	// Calculate 'Done' counts: For each state, 'Done' represents the sum of 'Todo' counts
	// for all subsequent states, including itself if it's the final 'Done' state.
	// The loop runs up to 'len(result)-2' to exclude the last two (DONE and TOTAL)
	// from accumulating 'Done' counts from states that come after them.
	for i := 0; i < len(result)-2; i++ {
		for j := i + 1; j < len(result)-1; j++ {
			result[i].Done += result[j].Todo // Sum up 'Todo' of all subsequent states
		}
		result[5].Todo += result[i].Todo // Accumulate total 'Todo' requests
	}

	// Final adjustment for the "DONE" state and "TOTAL"
	// The "DONE" state's 'Done' count is its own 'Todo' count, as no states come after it.
	result[4].Done = result[4].Todo
	// The "TOTAL" 'Done' count is the same as the "DONE" state's 'Todo' count.
	result[5].Done = result[4].Todo
	// Once processed, the "DONE" state's 'Todo' count is set to 0 as it's effectively "Done".
	result[4].Todo = 0

	c.IndentedJSON(http.StatusOK, result)
}

// getFullStateHistoryData retrieves and sends the full state history for a request.
// It requires a request_id as a query parameter.
func getFullStateHistoryData(c *gin.Context) {
	var data string
	request_id_input := c.Query("request_id")

	// Validate required query parameter
	checkEmpty(c, request_id_input)

	// Call a database function to get full state history
	query := `SELECT get_full_state_history($1)`
	err := db.QueryRow(query, request_id_input).Scan(&data)
	checkErr(c, err, "Failed to get full state history")
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// getQuestionData retrieves and sends questions based on requirement type.
// It requires a requirement_type as a query parameter.
func getQuestionData(c *gin.Context) {
	var data string
	requirement_type_input := c.Query("requirement_type")

	// Validate required query parameter
	checkEmpty(c, requirement_type_input)

	// Call a database function to get questions
	query := `SELECT get_questions($1)`
	err := db.QueryRow(query, requirement_type_input).Scan(&data)
	checkErr(c, err, "Failed to get questions")
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// getAnswerForRequest retrieves and sends answers for a specific request.
// It requires a request_id as a query parameter.
func getAnswerForRequest(c *gin.Context) {
	var data string
	request_id_input := c.Query("request_id")

	// Validate required query parameter
	checkEmpty(c, request_id_input)

	// Call a database function to get request requirement answers
	query := `SELECT get_request_requirement_answer($1)`
	err := db.QueryRow(query, request_id_input).Scan(&data)
	checkErr(c, err, "Failed to get request answers")
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// getOldestRequest retrieves and sends the timestamp of the oldest request.
func getOldestRequest(c *gin.Context) {
	var data time.Time

	// Call a database function to get the oldest request timestamp
	query := `SELECT get_oldest_request()`
	err := db.QueryRow(query).Scan(&data)
	checkErr(c, err, "Failed to get oldest request")

	c.JSON(http.StatusOK, data)
}

// getAttachment retrieves and sends a specified attachment (docx or excel) for a request.
// It expects request_id, attachment_type, and filename as query parameters.
// It also sets the correct Content-Type and Content-Disposition headers for file download.
func getAttachmentFile(c *gin.Context) {
	var data []byte // To store the file content
	var attachment_type int
	// Get query parameters
	request_id_input := c.Query("request_id")
	// attachment_typeInput := c.Query("attachment_type")
	filename_input := c.Query("filename")

	// Validate required query parameters
	checkEmpty(c, request_id_input)
	// checkEmpty(c, attachment_typeInput)
	checkEmpty(c, filename_input)

	// Call a database function to get the attachment data

	// Determine content type based on file extension for proper serving
	var content_type string
	switch {
	case strings.HasSuffix(filename_input, ".docx"):
		content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
		attachment_type = 1
	case strings.HasSuffix(filename_input, ".pdf"):
		content_type = "application/pdf"
		attachment_type = 1
	case strings.HasSuffix(filename_input, ".xls"), strings.HasSuffix(filename_input, ".xlsx"):
		content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		attachment_type = 2
	default:
		content_type = "application/octet-stream" // Default for unknown types
	}

	query := `SELECT get_attachment($1, $2)`
	err := db.QueryRow(query, request_id_input, attachment_type).Scan(&data)
	checkErr(c, err, "Failed to get attachment")

	// Set Content-Disposition header to prompt download with the original filename
	c.Header("Content-Disposition", "attachment; filename="+strconv.Quote(filename_input))
	// Serve the file data with the determined content type
	c.Data(http.StatusOK, content_type, data)
}

// getFilenames retrieves and sends filenames associated with a request.
// for fetching filenames.
func getFilenames(c *gin.Context) {
	var data string
	request_id_input := c.Query("request_id")

	// Validate required query parameter
	checkEmpty(c, request_id_input)

	// Call a database function to get filenames.
	// The query `get_questions($1)` might be a placeholder or incorrect.
	query := `SELECT get_filenames($1)`
	err := db.QueryRow(query, request_id_input).Scan(&data)
	checkErr(c, err, "Failed to get filename")
	c.Data(http.StatusOK, "application/json", []byte(data))
}

func getStateThreshold(c *gin.Context) {
	var data string
	err := db.QueryRow(`SELECT get_state_threshold()`).Scan(&data)
	checkErr(c, err, "Failed to get state threshold")
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// postNewRequest handles the creation of a new request in the database.
// It processes form data, including file attachments, and then calls a stored procedure
// to insert the new request details into the database.
func postNewRequest(c *gin.Context) {
	var nr NewRequest

	// Parse simple string fields from form data
	nr.Request_title = c.PostForm("request_title")
	nr.Requester_name = c.PostForm("requester_name")
	nr.Analysis_purpose = c.PostForm("analysis_purpose")
	nr.Pic_request = c.PostForm("pic_request")
	nr.Remark = c.PostForm("remark")
	nr.Docx_filename = c.PostForm("docx_filename")
	nr.Excel_filename = c.PostForm("excel_filename")

	// Convert numeric fields from string to their respective types
	nr.User_id, _ = strconv.Atoi(c.PostForm("user_id"))
	nr.Requirement_type, _ = strconv.Atoi(c.PostForm("requirement_type"))
	nr.Urgent, _ = strconv.ParseBool(c.PostForm("urgent"))

	// Parse the requested finish date string into a time.Time object
	dateStr := c.PostForm("requested_finish_date")
	nr.Requested_finish_date, _ = time.Parse(time.RFC3339, dateStr)

	// Parse answers which are expected as a JSON array string
	if err := json.Unmarshal([]byte(c.PostForm("answers")), &nr.Answers); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid answers"})
		return
	}

	// Read DOCX file attachment if present
	if file, err := c.FormFile("docx_attachment"); err == nil {
		f, _ := file.Open()                   // Open the uploaded file
		defer f.Close()                       // Ensure the file is closed
		nr.Docx_attachment, _ = io.ReadAll(f) // Read file content into byte slice
	}

	// Read EXCEL file attachment if present
	if file, err := c.FormFile("excel_attachment"); err == nil {
		f, _ := file.Open()
		defer f.Close()
		nr.Excel_attachment, _ = io.ReadAll(f)
	}

	// Print NewRequest details for debugging purposes
	// fmt.Printf("NewRequest: {\n")
	// fmt.Printf("   Request_title: %s\n", nr.Request_title)
	// fmt.Printf("   User_id: %d\n", nr.User_id)
	// fmt.Printf("   Requester_name: %s\n", nr.Requester_name)
	// fmt.Printf("   Analysis_purpose: %s\n", nr.Analysis_purpose)
	// fmt.Printf("   Requested_finish_date: %s\n", nr.Requested_finish_date.Format(time.RFC3339))
	// fmt.Printf("   Pic_request: %s\n", nr.Pic_request)
	// fmt.Printf("   Urgent: %t\n", nr.Urgent)
	// fmt.Printf("   Requirement_type: %d\n", nr.Requirement_type)
	// fmt.Printf("   Answers: %v\n", nr.Answers)
	// fmt.Printf("   Docx_filename: %s\n", nr.Docx_filename)
	// fmt.Printf("   Excel_filename: %s\n", nr.Excel_filename)
	// fmt.Printf("   Remark: %s\n", nr.Remark)
	// fmt.Printf("}\n")

	// Call a stored procedure to create a new request in the database
	// pq.Array is used to pass the Go slice `nr.Answers` as a PostgreSQL array.
	query := `CALL create_new_request($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`
	_, err := db.Exec(query, nr.Request_title, nr.User_id, nr.Requester_name, nr.Analysis_purpose, nr.Requested_finish_date, nr.Pic_request, nr.Urgent, nr.Requirement_type, pq.Array(nr.Answers), nr.Docx_attachment, nr.Docx_filename, nr.Excel_attachment, nr.Excel_filename, nr.Remark)
	checkErr(c, err, "Failed to create new request") // Handle any database execution errors
}
func postReminderEmail(c *gin.Context) {
	var recipient EmailRecipient
	if err := c.BindJSON(&recipient); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}
	// c.JSON(http.StatusOK, gin.H{"message": "Sending reminder..."})
	sendReminderEmail(c, recipient)
}

func postReminderEmailToRole(c *gin.Context) {
	role_id_input := c.Query("role_id")
	checkEmpty(c, role_id_input)

	state_name_input := c.Query("state_name")
	checkEmpty(c, state_name_input)

	// Call the function and retrieve the JSON array of recipients
	var recipientsJSON string
	query := `SELECT get_role_emails($1)`
	err := db.QueryRow(query, role_id_input).Scan(&recipientsJSON)
	checkErr(c, err, "Failed to get role emails")

	// Unmarshal JSON into Go slice
	var recipients []EmailRecipient
	err2 := json.Unmarshal([]byte(recipientsJSON), &recipients)
	checkErr(c, err2, "Failed to marshal role emails")
	// Send email to each recipient
	for _, r := range recipients {
		println(r.User_name)
		r.Request_state = state_name_input
		sendReminderEmail(c, r)
	}

	c.JSON(http.StatusOK, gin.H{"message": "reminder succefully sent"})
}

func sendReminderEmail(c *gin.Context, recipient EmailRecipient) {

	m := gomail.NewMessage()
	m.SetHeader("From", "testinggomail222@gmail.com")
	m.SetHeader("To", recipient.Email)
	m.SetHeader("Subject", "StateManager request")

	body := fmt.Sprintf(`Selamat pagi Bapak/Ibu %s,<br><br>
			Email ini dikirim secara otomatis untuk memberitahukan bahwa terdapat request yang telah memasuki status %s.<br><br>
			Mohon dapat dilakukan tindak lanjut terhadap request tersebut.<br><br>
			Terima kasih atas perhatian dan kerja samanya.<br><br>
			Salam,<br>StateManager`, recipient.User_name, recipient.Request_state)

	m.SetBody("text/html", body)

	if err := gomail.Send(dialed, m); err != nil {
		log.Printf("Send error: %v", err)
	} else {
		println("Email sent successfully to " + recipient.Email)
	}
}

// func sendRequestDoneEmail(user_id_input int, c *gin.Context) {
// 	var recipient EmailRecipient
// 	query := `SELECT get_Email($1)`
// 	err := db.QueryRow(query, user_id_input).Scan(&recipient)
// 	checkErr(c, err)

// 	m := gomail.NewMessage()
// 	m.SetHeader("From", "testinggomail222@gmail.com")
// 	m.SetHeader("To", recipient.Email)
// 	m.SetHeader("Subject", "StateManager request")

// 	body := fmt.Sprintf(`Selamat pagi Bapak/Ibu %s,<br><br>
// 			Email ini dikirim secara otomatis untuk memberitahukan bahwa request yang telah memasuki status <b>%s</b> melalui sistem kami.<br><br>
// 			Mohon dapat dilakukan tindak lanjut terhadap request tersebut.<br><br>
// 			Terima kasih atas perhatian dan kerja samanya.<br><br>
// 			Salam,<br><b>StateManager</b>`, recipient.User_name, recipient.Request_state)

// 	m.SetBody("text/html", body)

// 	if err := gomail.Send(dialed, m); err != nil {
// 		log.Printf("Send error: %v", err)
// 	}
// }

// putUpgradeState handles upgrading the state of a request.
// It expects a JSON body containing request_id, user_id, and an optional comment.
// It calls a stored procedure to advance the request's state and record the change.
func putUpgradeState(c *gin.Context) {
	var us UpdateState
	err := c.BindJSON(&us)                               // Bind JSON request body to UpdateState struct
	checkErr(c, err, "Failed to bind update state JSON") // Handle JSON binding errors

	println("req_id = " + fmt.Sprint(us.Request_id) + " user_id: " + fmt.Sprint(us.User_id))

	// Call the appropriate stored procedure based on whether a comment is provided
	if us.Comment == "" {
		query := `CALL upgrade_state($1, $2)`
		_, err = db.Exec(query, us.Request_id, us.User_id)
		checkErr(c, err, "Failed to upgrade state")
	} else {
		query := `CALL upgrade_state($1, $2, $3)`
		_, err = db.Exec(query, us.Request_id, us.User_id, us.Comment)
		checkErr(c, err, "Failed to upgrade state")
	}

	c.IndentedJSON(http.StatusOK, gin.H{"message": "State updated successfully"})
}

//if sending email when done
// func putUpgradeState(c *gin.Context) {
// 	var us UpdateState
// 	var done string
// 	err := c.BindJSON(&us) // Bind JSON request body to UpdateState struct
// 	checkErr(c, err)       // Handle JSON binding errors

// 	println("req_id = " + fmt.Sprint(us.Request_id) + " user_id: " + fmt.Sprint(us.User_id))

// 	// Call the appropriate stored procedure based on whether a comment is provided
// 	if us.Comment == "" {
// 		query := `SELECT upgrade_state($1, $2)`
// 		err := db.QueryRow(query, us.Request_id, us.User_id).Scan(&done)
// 		checkErr(c, err)
// 	} else {
// 		query := `SELECT upgrade_state($1, $2, $3)`
// 		err := db.QueryRow(query, us.Request_id, us.User_id, us.Comment).Scan(&done)
// 		checkErr(c, err)
// 	}

// 	if done == "DONE" {

// 	}

// 	c.IndentedJSON(http.StatusOK, gin.H{"message": "State updated successfully"})
// }

// putDegradeState handles degrading the state of a request.
// It expects a JSON body containing request_id, user_id, and a comment.
// It calls a stored procedure to revert the request's state and record the change.
func putDegradeState(c *gin.Context) {
	var us UpdateState
	err := c.BindJSON(&us)                             // Bind JSON request body to UpdateState struct
	checkErr(c, err, "Failed to bin update data JSON") // Handle JSON binding errors

	// Call a stored procedure to downgrade the state, requiring a comment
	query := `CALL degrade_state($1, $2, $3)`
	_, err = db.Exec(query, us.Request_id, us.User_id, us.Comment)
	checkErr(c, err, "Failed to degrade state")
	c.IndentedJSON(http.StatusOK, gin.H{"message": "State downgraded successfully"})
}

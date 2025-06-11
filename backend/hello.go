package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

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
	Remark                string    `json:"remark"`
}

type UpdateState struct {
	Request_id int    `json:"request_id"`
	User_id    int    `json:"user_id"`
	Comment    string `json:"comment"`
}

// Database connection
// This will be initialized when the program starts
var db *sql.DB = openDB()

func main() {
	// Close the database connection when the program ends
	defer db.Close()

	// Initialize Gin router
	router := gin.Default()

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Set up routes
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
	router.POST("/newRequest", postNewRequest)
	router.PUT("/upgradeState", putUpgradeState)
	router.PUT("/degradeState", putDegradeState)
	router.Run("Localhost:9090")
}

// OpenDB initializes the database connection
// It returns a pointer to the sql.DB object
// If there is an error, it prints the error and returns nil
func openDB() *sql.DB {
	psqlconn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable", host, port, user, password, db_name)

	db, err := sql.Open("postgres", psqlconn)
	if err != nil {
		fmt.Println("Error opening database: ", err)
		return nil
	}
	return db
}

// Checks for errors and sends a error response if an error occurs and aborts the request
func checkErr(c *gin.Context, err error) {
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		c.Abort()
	}
}

// Checks if a string is empty and sends a error response and aborts if it is
func checkEmpty(c *gin.Context, str string) {
	if str == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing query parameters"})
		c.Abort()
		return
	}
}

// Handles GET requests to the /user endpoint
// func getUser(c *gin.Context) {
// 	c.IndentedJSON(http.StatusOK, users[0])
// }

// Handles POST requests to the /login endpoint
// Checks the user credentials against the database and returns the user ID if valid
func checkUserCredentials(c *gin.Context) {
	var newUser User
	var data string
	newUser.User_name = c.Query("user_name")
	newUser.User_password = c.Query("password")

	querry := `SELECT get_user_id_by_credentials($1, $2)`
	err2 := db.QueryRow(querry, newUser.User_name, newUser.User_password).Scan(&data)
	checkErr(c, err2)
	print(err2)
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// Handles GET requests to the /stateSpecificData endpoint
// Retrieves state-specific data based on the provided range and state ID
// if state id is 1, it only sends data for the state with id 1, etc.
// The range can be 1(week), 2(month), 3(quarter), or 4(year)
func getStateSpecificData(c *gin.Context) {
	var data string

	// Validate input
	stateIdInput := c.Query("state_id")
	checkEmpty(c, stateIdInput)
	startDateInput := c.Query("start_date")
	checkEmpty(c, startDateInput)
	endDateInput := c.Query("end_date")
	checkEmpty(c, endDateInput)

	// Query database
	query := `SELECT get_state_specific_data($1, $2, $3)`
	err := db.QueryRow(query, stateIdInput, startDateInput, endDateInput).Scan(&data)
	checkErr(c, err)
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// Handles GET requests to the /userCurrentRequests endpoint
// Retrieves the current requests for a user based on the provided user ID
func getUserCurrentRequests(c *gin.Context) {
	var data string
	userIdInput := c.Query("user_id")

	checkEmpty(c, userIdInput)

	query := `SELECT get_user_request_data($1)`
	err := db.QueryRow(query, userIdInput).Scan(&data)
	checkErr(c, err)
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// Handles GET requests to the /toDoData endpoint
// Retrieves to-do data based on the provided user role (only shows newest state)
func getTodoData(c *gin.Context) {
	var data string
	userRoleInput := c.Query("role_id")

	checkEmpty(c, userRoleInput)

	query := `SELECT get_todo_data($1)`
	err := db.QueryRow(query, userRoleInput).Scan(&data)
	checkErr(c, err)
	c.Data(http.StatusOK, "application/json", []byte(data))
}

// Handles GET requests to the /completeRequestData endpoint
// Retrieves complete request data based on the provided request ID
func getCompleteRequestData(c *gin.Context) {
	var data string
	requestIdInput := c.Query("request_id")

	checkEmpty(c, requestIdInput)

	query := `SELECT get_complete_data_of_request($1)`
	err := db.QueryRow(query, requestIdInput).Scan(&data)
	checkErr(c, err)
	c.Data(http.StatusOK, "application/json", []byte(data))
}

func getStateCount(c *gin.Context) {
	var data string
	var count []StateCount
	var sqlNullString sql.NullString
	// var result []StateCount

	// Predefined state IDs 1 to 5 mapped to index 0 to 4
	result := []StateCount{
		{State_id: 1, State_name: "SUBMITTED", Todo: 0, Done: 0},
		{State_id: 2, State_name: "VERIFIED", Todo: 0, Done: 0},
		{State_id: 3, State_name: "IN PROGRESS", Todo: 0, Done: 0},
		{State_id: 4, State_name: "WAITING FOR REVIEW", Todo: 0, Done: 0},
		{State_id: 5, State_name: "DONE", Todo: 0, Done: 0},
		{State_name: "TOTAL", Todo: 0, Done: 0},
	}

	// Get and validate range input
	startDateInput := c.Query("start_date")
	checkEmpty(c, startDateInput)
	endDateInput := c.Query("end_date")
	checkEmpty(c, endDateInput)

	// Query database
	query := `SELECT get_state_count($1, $2)`
	err := db.QueryRow(query, startDateInput, endDateInput).Scan(&sqlNullString)
	checkErr(c, err)

	// Return empty counts if result is null
	if !sqlNullString.Valid {
		c.IndentedJSON(http.StatusOK, result)
		return
	}

	data = sqlNullString.String

	// Parse JSON from query result
	err = json.Unmarshal([]byte(data), &count)
	checkErr(c, err)

	// Fill the todo values by matching state_id to index (state_id - 1)
	for _, item := range count {
		if idx := item.State_id - 1; idx >= 0 && idx < len(result) {
			result[idx].Todo = item.Todo
		}
	}

	// Calculate DONEs in reverse
	for i := 0; i < len(result)-2; i++ {
		for j := i + 1; j < len(result)-1; j++ {
			result[i].Done += result[j].Todo
		}
		result[5].Todo += result[i].Todo
	}

	// Final adjustment for last state
	result[4].Done = result[4].Todo
	result[5].Done = result[4].Todo
	result[4].Todo = 0

	c.IndentedJSON(http.StatusOK, result)
}

func getFullStateHistoryData(c *gin.Context) {
	var data string
	requestIdInput := c.Query("request_id")

	checkEmpty(c, requestIdInput)

	query := `SELECT get_full_state_history($1)`
	err := db.QueryRow(query, requestIdInput).Scan(&data)
	checkErr(c, err)
	c.Data(http.StatusOK, "application/json", []byte(data))
}

func getQuestionData(c *gin.Context) {
	var data string
	requirementTypeInput := c.Query("requirement_type")

	checkEmpty(c, requirementTypeInput)

	query := `SELECT get_questions($1)`
	err := db.QueryRow(query, requirementTypeInput).Scan(&data)
	checkErr(c, err)
	c.Data(http.StatusOK, "application/json", []byte(data))
}

func getAnswerForRequest(c *gin.Context) {
	var data string
	requestIdInput := c.Query("request_id")

	checkEmpty(c, requestIdInput)

	query := `SELECT get_request_requirement_answer($1)`
	err := db.QueryRow(query, requestIdInput).Scan(&data)
	checkErr(c, err)
	c.Data(http.StatusOK, "application/json", []byte(data))
}

func getOldestRequest(c *gin.Context) {
	var data time.Time

	query := `SELECT get_oldest_request()`
	err := db.QueryRow(query).Scan(&data)
	checkErr(c, err)

	c.JSON(200, data)
}

// handles POST requests to the /newRequest endpoint and creates a new request in the database
func postNewRequest(c *gin.Context) {
	var nr NewRequest
	err1 := c.BindJSON(&nr)
	checkErr(c, err1)
	querry := `CALL create_new_request($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
	_, err2 := db.Exec(querry, nr.Request_title, nr.User_id, nr.Requester_name, nr.Analysis_purpose, nr.Requested_finish_date, nr.Pic_request, nr.Urgent, nr.Requirement_type, pq.Array(nr.Answers), nr.Remark)
	checkErr(c, err2)
}

// Handles PUT requests to the /upgradeState endpoint
// Moves the state of the request to the next state
// It updates the state of the current state and makes a new entry on the state history
func putUpgradeState(c *gin.Context) {
	var us UpdateState
	err1 := c.BindJSON(&us)
	checkErr(c, err1)
	println("req_id = " + fmt.Sprint(us.Request_id) + " user_id: " + fmt.Sprint(us.User_id))
	if us.Comment == "" {
		querry := `CALL upgrade_state($1, $2)`
		_, err2 := db.Exec(querry, us.Request_id, us.User_id)
		checkErr(c, err2)
	} else {
		querry := `CALL upgrade_state($1, $2, $3)`
		_, err2 := db.Exec(querry, us.Request_id, us.User_id, us.Comment)
		checkErr(c, err2)
	}

	c.IndentedJSON(http.StatusOK, gin.H{"message": "State updated successfully"})
}

// Handles PUT requests to the /degradeState endpoint
// Moves the state of the request to the previous state
// It updates the state of the current state and deletes the last entry on the state history
func putDegradeState(c *gin.Context) {
	var us UpdateState
	err1 := c.BindJSON(&us)
	checkErr(c, err1)
	querry := `CALL degrade_state($1, $2, $3)`
	_, err2 := db.Exec(querry, us.Request_id, us.User_id, us.Comment)
	checkErr(c, err2)
	c.IndentedJSON(http.StatusOK, gin.H{"message": "State downgraded successfully"})
}

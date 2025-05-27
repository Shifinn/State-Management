package main

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
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

// NewRequest struct for creating a new request
type NewRequest struct {
	Request_title         string `json:"request_title"`
	User_id               int    `json:"user_id"`
	Requester_name        string `json:"requester_name"`
	Analysis_purpose      string `json:"analysis_purpose"`
	Requested_finish_date string `json:"requested_finish_date"`
	Pic_request           string `json:"pic_request"`
	Urgent                bool   `json:"urgent"`
	Requirement_type      int    `json:"requirement_type"`
	Required_data         string `json:"required_data"`
}

// DataView struct for displaying request data
type DataView struct {
	Request_id    int    `json:"request_id"`
	Request_title string `json:"request_title"`
	User_id       int    `json:"user_id"`
	User_name     string `json:"user_name"`
	State_name    string `json:"state_name"`
	Date_start    string `json:"date_start"`
	Date_end      string `json:"date_end"`
	Completed     bool   `json:"completed"`
}

type UpdateState struct {
	Request_id int    `json:"request_id"`
	Comment    string `json:"comment"`
}

// Sample user data
var users = []User{
	{User_name: "Barry", User_password: "1234"},
	{User_name: "Kilian", User_password: "1234"},
	{User_name: "Potter", User_password: "1234"},
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
	router.GET("/user", getUser)
	router.GET("/stateSpecificData", getStateSpecificData)
	router.GET("/userRequestsData", getUserCurrentRequests)
	router.GET("/toDoData", getToDoData)
	router.GET("/completeRequestData", getCompleteRequestData)
	router.POST("/login", checkUserCredentials)
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
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
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
func getUser(c *gin.Context) {
	c.IndentedJSON(http.StatusOK, users[0])
}

// Handles POST requests to the /login endpoint
// Checks the user credentials against the database and returns the user ID if valid
func checkUserCredentials(c *gin.Context) {
	print("ok 0")
	var newUser User
	var userID int
	err1 := c.BindJSON(&newUser)
	checkErr(c, err1)
	print(err1)
	querry := `SELECT get_user_id_by_credentials($1, $2)`
	err2 := db.QueryRow(querry, newUser.User_name, newUser.User_password).Scan(&userID)
	checkErr(c, err2)
	print(err2)
	c.IndentedJSON(http.StatusCreated, userID)
}

// Handles GET requests to the /stateSpecificData endpoint
// Retrieves state-specific data based on the provided range and state ID
// if state id is 1, it only sends data for the state with id 1, etc.
// The range can be 1(week), 2(month), 3(quarter), or 4(year)
func getStateSpecificData(c *gin.Context) {
	var data string
	rangeInput := c.Query("range")
	stateNameIDInput := c.Query("state")

	// Validate input
	if rangeInput == "" || stateNameIDInput == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing query parameters"})
		return
	}

	query := `SELECT get_state_specific_data($1, $2)`

	err := db.QueryRow(query, rangeInput, stateNameIDInput).Scan(&data)
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
func getToDoData(c *gin.Context) {
	var data string
	userRoleInput := c.Query("user_role")

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

// // registerUser handles POST requests to the /user endpoint
// // It registers a new user in the database
// func registerUser(c *gin.Context) {
// 	var newUser User
// 	err1 := c.BindJSON(&newUser)
// 	checkErr(c, err1)
// 	command := fmt.Sprintf(`CALL insert_data('%s', '%s', 1)`, newUser.User_name, newUser.User_password)
// 	_, e := db.Exec(command)
// 	checkErr(c, e)
// }

// handles POST requests to the /newRequest endpoint and creates a new request in the database
func postNewRequest(c *gin.Context) {
	var nr NewRequest
	err1 := c.BindJSON(&nr)
	checkErr(c, err1)
	querry := `CALL create_new_request($1, $2, $3, $4, $5, $6, $7, $8, $9)`
	_, err2 := db.Exec(querry, nr.Request_title, nr.User_id, nr.Requester_name, nr.Analysis_purpose, nr.Requested_finish_date, nr.Pic_request, nr.Urgent, nr.Requirement_type, nr.Required_data)
	checkErr(c, err2)
}

// Handles PUT requests to the /upgradeState endpoint
// Moves the state of the request to the next state
// It updates the state of the current state and makes a new entry on the state history
func putUpgradeState(c *gin.Context) {
	var us UpdateState
	err1 := c.BindJSON(&us)
	checkErr(c, err1)
	querry := `CALL upgrade_state($1, $2)`
	_, err2 := db.Exec(querry, us.Request_id, us.Comment)
	checkErr(c, err2)
	c.IndentedJSON(http.StatusOK, gin.H{"message": "State updated successfully"})
}

// Handles PUT requests to the /degradeState endpoint
// Moves the state of the request to the previous state
// It updates the state of the current state and deletes the last entry on the state history
func putDegradeState(c *gin.Context) {
	var us UpdateState
	err1 := c.BindJSON(&us)
	checkErr(c, err1)
	querry := `CALL degrade_state($1, $2)`
	_, err2 := db.Exec(querry, us.Request_id, us.Comment)
	checkErr(c, err2)
	c.IndentedJSON(http.StatusOK, gin.H{"message": "State downgraded successfully"})
}

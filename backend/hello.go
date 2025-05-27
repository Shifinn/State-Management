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

// User struct to represent user data
// JSON tags are used for serialization/deserialization
type User struct {
	User_name     string `json:"user_name"`
	User_password string `json:"user_password"`
}


type NewRequest struct {
	Request_title         string `json:"request_title"`
	User_id               int    `json:"user_id"`
	Requester_name        string `json:"requester_name"`
	Analysis_purpose      string `json:"analysis_purpose"`
	Requested_finish_date string `json:"requested_finish_date"`
	Pic_request           string `json:"pic_request"`
	Urgent                bool   `json:"urgent"`
	Requirement_type      string `json:"requirement_type"`
	Required_data         string `json:"required_data"`
}

type DataView struct {
	Request_id     	int    `json:"request_id"`
	Request_title  	string `json:"request_title"`
	User_name		string `json:"user_name"`
	State_name     	string `json:"state_name"`
	Date_start    	string `json:"date_start"`
	Date_end 		string `json:"date_end"`
	Completed      	bool   `json:"completed"`
}



type UpdateState struct {
	Request_id 	int    `json:"request_id"`
	New_state	string `json:"new_state"`
	State_name	string `json:"state_name"`
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
	router.GET("/getAllUser", getAllUserDataFromTable)
	router.POST("/login", checkUserCredentials)
	router.Run("Localhost:9090")

}

// openDB initializes the database connection
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

// getUser handles GET requests to the /user endpoint
func getUser(c *gin.Context) {
	c.IndentedJSON(http.StatusOK, users[0])
}

// checkUserCredentials handles POST requests to the /login endpoint
// It checks the user credentials against the database and returns the user ID if valid
func checkUserCredentials(c *gin.Context) {
	print("ok 0")
	var newUser User
	var userID int
	err1 := c.BindJSON(&newUser)
	checkErr(c, err1)
	print(err1)
	command := fmt.Sprintf(`SELECT get_user_id_by_credentials('%s', '%s')`, newUser.User_name, newUser.User_password)

	err2 := db.QueryRow(command).Scan(&userID)
	checkErr(c, err2)
	print(err2)
	c.IndentedJSON(http.StatusCreated, userID)
}

// registerUser handles POST requests to the /user endpoint
// It registers a new user in the database
func registerUser(c *gin.Context) {
	var newUser User
	err1 := c.BindJSON(&newUser)
	checkErr(c, err1)
	command := fmt.Sprintf(`CALL insert_data('%s', '%s', 1)`, newUser.User_name, newUser.User_password)
	_, e := db.Exec(command)
	checkErr(c, e)
}

func getAllDataFromTable(c *gin.Context, tableName string) []User {
	var users []User
	command := fmt.Sprintf(`SELECT get_all('%s')`, tableName)

	err := db.QueryRow(command).Scan(&users)
	checkErr(c, err)
	return users
}

func getAllUserDataFromTable(c *gin.Context) {
	getAllDataFromTable(c, "user_data")
}

// checkErr checks for errors and sends a JSON response if an error occurs
// It also aborts the request
func checkErr(c *gin.Context, err error) {
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		c.Abort()
	}
}

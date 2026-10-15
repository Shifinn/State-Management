# State Management

State Management is a request-tracking application for data-processing work. It is split into:

- **Frontend:** an Angular application that authenticates users, displays requests, collects new request details, and provides role-based request management views.
- **Backend:** a Go API that reads and updates request data, serves request details and attachments, and sends workflow reminder emails.

## Frontend

The frontend is in [`angular/`](./angular). It manages the request workflow from the browser. The application stores the authenticated user's returned information locally and uses the user's role to decide which page to open and which navigation options to show.

The detailed request-processing behavior is implemented in the Angular components and services.

### Pages

#### Login

The Login page:

- Accepts a username and password.
- Validates that both fields are filled before sending the request.
- Calls the backend login endpoint.
- Shows a validation message for missing fields and an error message when the credentials are rejected.
- Redirects users after a successful login according to their role:
  - Role `1` opens the Dashboard.
  - Roles `2` and `3` open the Todo page.

#### Dashboard

The Dashboard is the request list for the logged-in base user. It can:

- Load and display requests submitted by the current user.
- Show each request's title, identifier, request date, data type, current state, and duration.
- Open the request details dialog from a request card.
- Open the New Request dialog.
- Refresh the request list after a new request is submitted.
- Refresh the displayed data periodically through the frontend's refresh service.

#### New Request dialog

The New Request dialog is opened from the Dashboard. It can:

- Collect the request title, analysis purpose, requested completion date, PIC, urgency, requirement type, remarks, and requirement-specific answers.
- Load questions based on the selected requirement type.
- Accept optional DOCX and Excel attachments.
- Validate required answers and attachment size limits.
- Show upload progress while the request is being submitted.
- Report success or failure after the upload.

The request is submitted as multipart form data so the text fields, answers, and attachments can be sent together.

#### Todo

The Todo page is the work queue for roles that process requests. It can:

- Display requests grouped by `TODO`, `IN PROGRESS`, and `DONE`.
- Filter the visible requests by requirement type:
  - All
  - FFRA
  - Dataset with an added column
  - New dataset
- Open a request's full details.
- Show a reminder indicator when a request has remained in a state longer than the configured threshold.
- Refresh the queue after a request action changes its data.

#### Progress

The Progress page provides a period-based summary of request states. It can:

- Select a reporting period using the period picker.
- Change the period granularity, such as week, month, quarter, or year, where available.
- Show counts for requests that are still in progress and requests that are done for each state.
- Select a state summary card to reveal the matching request list.
- Hide the detailed list by selecting the active summary card again.
- Refresh the counts and details when the selected period changes.

### Shared frontend features

The authenticated layout includes:

- Role-based navigation for the available pages.
- A user information pop-up showing the logged-in user's name and email.
- A logout action that clears the stored user data and service state before returning to Login.
- Request details dialogs that show request metadata, question answers, remarks, rejection reasons, and available attachments.
- Attachment download actions.
- Role-aware request actions, including approval, rejection, and state changes where the current user's role permits them.

## Frontend tech stack

- Angular 19.2
- TypeScript 5.7
- Angular Material 19.2
- Angular CDK 19.2
- RxJS 7.8
- `@vercel/blob`
- Karma and Jasmine for unit testing
- Vercel deployment

## Backend

The backend is in [`backend/api/`](./backend/api). It is a Go application built with Gin and organized as a Vercel serverless function. The API groups its routes and connects to PostgreSQL.

The backend also configures CORS for the deployed frontend and local Angular development. Local development can use the commented HTTP server entry point, while deployment uses the exported `Handler` function.

## What the API provides

### Authentication

- Checks username and password credentials.
- Returns the user's ID, username, email, and role information used by the frontend to establish a session.

### Requests

- Lists requests submitted by a user.
- Provides the request queue for processing roles.
- Creates new data-processing requests.
- Retrieves complete request details, including questions, answers, remarks, and attachment filenames.
- Retrieves the questions associated with a requirement type.

### Request workflow

- Retrieves requests for a selected workflow state and date range.
- Advances a request to the next workflow state.
- Moves a request back to an earlier state.
- Drops or rejects a request from further processing.

### Progress and state data

- Provides request counts by state for a selected date range.
- Provides the oldest request time used by the frontend's timing logic.
- Provides state-duration thresholds used to identify requests that need reminders.

### Attachments

- Accepts optional DOCX and Excel attachments when a new request is created.
- Returns download URLs for request attachments.

### Email notifications

- Sends a reminder email to a specific user.
- Sends a reminder email to users in a selected role.

## Backend Tech stack

- Go 1.24.3
- Gin 1.10
- PostgreSQL
- `pgx` PostgreSQL driver
- `godotenv` for environment loading
- `gin-contrib/cors`
- Vercel Serverless Functions

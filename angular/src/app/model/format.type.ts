// The time granularities for filtering and displaying data.
// Used in the PeriodPicker component and service.
export type PeriodGranularity = "YEAR" | "QUARTER" | "MONTH" | "WEEK" | "NAN";

// The category for request states,
// Used for filtering and UI elements within todo and progress page.
export type StateStatus = "TOTAL" | "DONE" | "TODO" | "NAN";

// The data of the authenticated user that will be stored to local.
// Used for session management, logic, and user info.
export type User = {
	userId: string;
	userName: string;
	email: string;
	roleId: string;
};

// A simplified representation of a request.
// Used within todo and user's dashboard request cards (for the information displayed)
export type SimpleData = {
	requestId: number;
	requestTitle: string;
	stateNameId: number;
	stateName: string;
	userName: string;
	requestDate: Date;
	requirementTypeId: number;
	dataTypeName: string;
	dateStart: Date;
	stateComment: string;
};

// A representation of a request in a specific state.
// Used used to show state filtered request cards in progress page
export type StateInfoData = {
	requestId: number;
	requestTitle: string;
	requestDate: Date;
	dataTypeName: string;
	currentState: number;
	currentStateName: string;
	stateNameId: number;
	stateName: string;
	dateStart: Date;
	dateEnd: Date | null;
	startedBy: string;
	endedBy: string | null;
	completed: boolean;
};

// The complete data of a request.
// It is used for showing data within the more details dialog.
export type CompleteData = {
	requestId: number;
	requestTitle: string;
	userId: number;
	requesterName: string;
	analysisPurpose: string;
	requestedCompletedDate: Date;
	picSubmitter: string;
	urgent: boolean;
	requestDate: Date;
	userName: string;
	stateName: string;
	dataTypeName: string;
	remark: string | null;
	stateComment: string | null;
	questions: Question[]; // Nested array of questions and answers.
	filenames: AttachmentFilename[]; // Nested array of attached filenames.
};

// Represents a question of a requirement type.
// Used as an array of questions to store the requirement questions related to the data type requested.
// Used as a part of CompleteData above (shown in more details).
export type Question = {
	requirementQuestionId: number;
	requirementQuestion: string;
	answer: string;
};

// Represents the data for an attachment of a request.
// Used as an array to store the path and name of an attachment.
// Used as a part of CompleteData above (shown in more details).
export type AttachmentFilename = {
	attachmentTypeId: number;
	attachmentFilename: string;
};

// The data of a new request.
// This type holds all ddata related to making a new request,
// it is submitted as a form to the api to submit a new request
export type NewRequest = {
	requestTitle: string;
	userId: number;
	requesterName: string;
	analysisPurpose: string;
	requestedFinishDate: Date | null;
	picRequest: string;
	urgent: boolean | null;
	requirementType: number | null;
	answers: string[] | null;
	remark: string | null;
	docxAttachment: File | null;
	docxFilename: string | null;
	excelAttachment: File | null;
	excelFilename: string | null;
};

// Defines the payload for changing a request's state (upgrade or drop).
// Stores the nescessary data used to change a request's state.
// Used within more details.
export type UpdateState = {
	requestId: number;
	userId: number;
	comment: string;
};

// The todo and done count data for a state.
// This is udes within the progress page to store the information of the state counts.
export type StatusInfo = {
	stateId: number;
	stateName: string;
	todo: number;
	done: number;
};

// Represents a selectable time period.
// This is used to define the date ranges available within periodPicker for filtering data on the progress page.
export type TimePeriod = {
	label: string;
	fullLabel: string;
	year: number;
	startDate: Date;
	endDate: Date;
	periodType: PeriodGranularity;
};

// A type to cache the user's last clicked progress card section.
// This is used to help maintain the "active" visual state of a filter in the UI,
// then showing the relevant cardStateData (request card for the progress page)
export type CachedProgressCardMemory = {
	type: StateStatus;
	stateId: number;
};

// Data of selected the state of the period picker pop-up menu.
// To remembers which year or month the user was viewing in the pop-up
export type CachedPeriodPickerMemory = {
	type: string;
	year: number;
	month: number;
};

// The time threshold of a specific state (for warning)
// This is used in an array, then used to determine if a request
// has been in a state for too long, triggering a visual warning on its card.
export type StateThreshold = {
	stateNameId: number;
	stateThresholdHour: number;
};

// A type to hold a time duration in days and hours.
// It is used as a return type for helper functions that calculate time.
// Differences for display purposes (e.g., "2 days 5 hours ago").
// Then the output is used todisplay information of the duration of a request/state.
export type Duration = {
	day: number;
	hour: number;
};

// A type for the email notification to a specific user
// Used on more details when rejecting a request
export type EmailRecipient = {
	userId: number;
	comment: string;
};

// A type for the email notification to every user in a role
// Used on more details when upgrading a request state
export type EmailRoleRecipient = {
	roleId: number;
	stateName: string;
};

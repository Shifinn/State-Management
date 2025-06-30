export type PeriodGranularity = "YEAR" | "QUARTER" | "MONTH" | "WEEK" | "NAN";
export type StateStatus = "TOTAL" | "DONE" | "TODO" | "NAN";

export type User = {
	userId: string;
	userName: string;
	email: string;
	roleId: string;
};

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

export type StateInfoData = {
	requestId: number;
	requestTitle: string;
	requestDate: Date;
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
	questions: Question[];
	filenames: AttachmentFilename[];
};

export type Question = {
	requirementQuestionId: number;
	requirementQuestion: string;
	answer: string;
};

export type AttachmentFilename = {
	attachmentTypeId: number;
	attachmentFilename: string;
};

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

export type UpdateState = {
	requestId: number;
	userId: number;
	comment: string;
};

export type StatusInfo = {
	stateId: number;
	stateName: string;
	todo: number;
	done: number;
};

export type TimePeriod = {
	label: string;
	fullLabel: string;
	year: number;
	startDate: Date;
	endDate: Date;
	periodType: PeriodGranularity;
};

export type CachedProgrestCardMemory = {
	type: StateStatus;
	stateId: number;
};

export type CachedPeriodPickerMemory = {
	type: string;
	year: number;
	month: number;
};

export type StateThreshold = {
	stateNameId: number;
	stateThresholdHour: number;
};

export type Duration = {
	day: number;
	hour: number;
};

export type RequestType = {
	requirementTypeId: number;
	dataTypeName: string;
};

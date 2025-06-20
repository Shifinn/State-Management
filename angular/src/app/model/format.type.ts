export type PeriodGranularity = "YEAR" | "QUARTER" | "MONTH" | "WEEK" | "NAN";
export type StateStatus = "TOTAL" | "DONE" | "TODO" | "NAN";

export type User = {
	user_id: string;
	user_name: string;
	email: string;
	role_id: string;
};

export type SimpleData = {
	request_id: number;
	request_title: string;
	state_name_id: number;
	state_name: string;
	user_name: string;
	request_date: Date;
	requirement_type_id: number;
	data_type_name: string;
	date_start: Date;
	state_comment: string;
};

export type StateInfoData = {
	request_id: number;
	request_title: string;
	request_date: Date;
	current_state: number;
	current_state_name: string;
	state_name_id: number;
	state_name: string;
	date_start: Date;
	date_end: Date | null;
	started_by: string;
	ended_by: string | null;
	completed: boolean;
};

export type CompleteData = {
	request_id: number;
	request_title: string;
	user_id: number;
	requester_name: string;
	analysis_purpose: string;
	requested_completed_date: Date;
	pic_submitter: string;
	urgent: boolean;
	request_date: Date;
	user_name: string;
	state_name: string;
	data_type_name: string;
	remark: string | null;
	state_comment: string | null;
};

export type NewRequest = {
	request_title: string;
	user_id: number;
	requester_name: string;
	analysis_purpose: string;
	requested_finish_date: Date | null;
	pic_request: string;
	urgent: boolean | null;
	requirement_type: number | null;
	answers: string[] | null;
	remark: string | null;
	docx_attachment: File | null;
	docx_filename: string | null;
	excel_attachment: File | null;
	excel_filename: string | null;
};

export type Question = {
	requirement_question_id: number;
	requirement_question: string;
	answer: string;
};

export type AttachmentFilename = {
	attachment_type_id: number;
	attachment_filename: string;
};

export type UpdateState = {
	request_id: number;
	user_id: number;
	comment: string;
};

export type StatusInfo = {
	state_id: number;
	state_name: string;
	todo: number;
	done: number;
};

export type TimePeriod = {
	label: string;
	full_label: string;
	year: number;
	start_date: Date;
	end_date: Date;
	period_type: PeriodGranularity;
};

export type CachedProgrestCardMemory = {
	type: StateStatus;
	state_id: number;
};

export type CachedPeriodPickerMemory = {
	type: string;
	year: number;
	month: number;
};

export type StateThreshold = {
	state_name_id: number;
	state_threshold_hour: number;
};

export type Duration = {
	day: number;
	hour: number;
};

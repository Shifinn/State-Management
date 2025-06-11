export type PeriodGranularity = "YEAR" | "QUARTER" | "MONTH" | "WEEK";

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
  date_start: Date;
  state_comment: string;
};

export type StateInfoData = {
  request_id: number;
  request_title: string;

  state_name: string;
  date_start: string;
  date_end: string | null;
  started_by: number;
  ended_by: number | null;
  completed: boolean;
};
export type CompleteData = {
  request_id: number;
  request_title: string;
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
};

export type Question = {
  requirement_question_id: number;
  requirement_question: string;
  answer: string;
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
  year: number;
  start_date: Date;
  end_date: Date;
  period_type: "YEAR" | "QUARTER" | "MONTH" | "WEEK";
};

export type ProgressCardOutput = {
  type: string,
  state_id: number
}

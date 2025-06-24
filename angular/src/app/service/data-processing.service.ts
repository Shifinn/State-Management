import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Router } from "@angular/router";
import type {
	CompleteData,
	User,
	SimpleData,
	Question,
	NewRequest,
	UpdateState,
	StatusInfo,
	TimePeriod,
	StateInfoData,
	StateStatus,
	PeriodGranularity,
	AttachmentFilename,
	StateThreshold,
	Duration,
} from "../model/format.type";
import { map, type Observable, of } from "rxjs";
import { Time } from "@angular/common";

@Injectable({
	providedIn: "root",
})
export class DataProcessingService {
	http = inject(HttpClient); //enables the use of HTTP client calls for the application
	router = inject(Router); // enables navigation using the Router
	host = "http://localhost:9090";
	// host = "/api";

	storeUserInfo(u: User) {
		localStorage.setItem("userId", u.user_id);
		localStorage.setItem("userName", u.user_name);
		localStorage.setItem("userEmail", u.email);
		localStorage.setItem("userRole", u.role_id);
	}

	getUserId(): string {
		return this.returnIfNotNull(localStorage.getItem("userId"));
	}

	getUserName(): string {
		return this.returnIfNotNull(localStorage.getItem("userName"));
	}

	getUserEmail(): string {
		return this.returnIfNotNull(localStorage.getItem("userEmail"));
	}

	getUserRole(): string {
		return this.returnIfNotNull(localStorage.getItem("userRole"));
	}

	returnIfNotNull(input: string | null): string {
		if (input === null || input === undefined) {
			return "";
		}
		return input;
	}

	getUserRequest(user_id_input: string): Observable<SimpleData[]> {
		const url = `${this.host}/userRequestsData?user_id=${user_id_input}`;
		return this.http.get<SimpleData[]>(url);
	}

	getTodoData(): Observable<SimpleData[]> {
		const role_id = this.getUserRole();
		if (role_id === "2" || role_id === "3") {
			const url = `${this.host}/todoData?role_id=${role_id}`;
			return this.http.get<SimpleData[]>(url);
		}
		return of([]);
	}

	separateTodo(input: SimpleData[]): SimpleData[] {
		if (this.getUserRole() === "3") {
			return input.filter(
				(x) => x.state_name_id === 1 || x.state_name_id === 4,
			);
		}

		if (this.getUserRole() === "2") {
			return input.filter((x) => x.state_name_id === 2);
		}

		return [];
	}

	separateInProgress(input: SimpleData[]): SimpleData[] {
		if (this.getUserRole() === "2") {
			return input.filter(
				(x) => x.state_name_id === 3 || x.state_name_id === 4,
			);
		}
		if (this.getUserRole() === "3") {
			return input.filter(
				(x) => x.state_name_id === 2 || x.state_name_id === 3,
			);
		}

		if (this.getUserRole() === "2") {
			return input.filter((x) => x.state_name_id === 5);
		}

		return [];
	}

	separateDone(input: SimpleData[]): SimpleData[] {
		return input.filter((x) => x.state_name_id === 5);
	}

	getStateSpecificData(
		state_id_input: number,
		start_date: string,
		end_date: string,
	) {
		const url = `${this.host}/stateSpecificData?state_id=${state_id_input}&start_date=${start_date}&end_date=${end_date}`;
		return this.http.get<StateInfoData[]>(url);
	}

	separateBasedOnCompletion(
		completion_type: StateStatus,
		origin_state_data: StateInfoData[],
	): StateInfoData[] {
		let complete = false;
		if (completion_type === "DONE") complete = true;

		return origin_state_data.filter((x) => x.completed === complete);
	}

	getCompleteData(request_id_input: number): Observable<CompleteData> {
		const url = `${this.host}/completeRequestData?request_id=${request_id_input}`;
		return this.http.get<CompleteData>(url);
	}

	getRequirementQuestion(requirement_type_input: number) {
		const url = `${this.host}/questionData?requirement_type=${requirement_type_input}`;
		return this.http.get<Question[]>(url);
	}

	getAnswer(request_id_input: number) {
		const url = `${this.host}/answerData?request_id=${request_id_input}`;
		return this.http.get<Question[]>(url);
	}

	getStateCount(start_date: string, end_date: string) {
		const url = `${this.host}/stateCountData?start_date=${start_date}&end_date=${end_date}`;
		return this.http.get<StatusInfo[]>(url);
	}

	getOldestRequestTime() {
		const url = `${this.host}/getOldestRequestTime`;
		return this.http.get<Date>(url);
	}

	getAttachmentFilename(request_id_input: number) {
		const url = `${this.host}/getFilenames?request_id=${request_id_input}`;
		return this.http.get<AttachmentFilename[]>(url);
	}

	getAttachmentFileDownload(
		request_id_input: number,
		attachment_file_name: string,
	): void {
		const url = `${this.host}/getAttachmentFile?request_id=${request_id_input}&filename=${attachment_file_name}`;
		this.http.get(url, { responseType: "blob" }).subscribe((blob) => {
			const downloadLink = document.createElement("a");
			const objectUrl = URL.createObjectURL(blob);
			downloadLink.href = objectUrl;
			downloadLink.download = attachment_file_name;
			downloadLink.click();
			URL.revokeObjectURL(objectUrl);
		});
	}

	getStateThreshold() {
		const url = `${this.host}/getStateThreshold`;
		return this.http.get<StateThreshold[]>(url);
	}

	postNewRequest(request: NewRequest) {
		const url = `${this.host}/newRequest`;
		const formData = new FormData();

		formData.append("request_title", request.request_title);
		formData.append("user_id", request.user_id.toString());
		formData.append("requester_name", request.requester_name);
		formData.append("analysis_purpose", request.analysis_purpose);
		formData.append(
			"requested_finish_date",
			request.requested_finish_date
				? request.requested_finish_date.toISOString()
				: "",
		);
		formData.append("pic_request", request.pic_request);
		formData.append("urgent", String(request.urgent));
		formData.append("requirement_type", String(request.requirement_type));
		formData.append("remark", request.remark ?? "");
		formData.append("docx_filename", request.docx_filename ?? "");
		formData.append("excel_filename", request.excel_filename ?? "");

		// Answers as JSON string array
		formData.append("answers", JSON.stringify(request.answers));

		// Append files
		if (request.docx_attachment)
			formData.append("docx_attachment", request.docx_attachment);

		if (request.excel_attachment)
			formData.append("excel_attachment", request.excel_attachment);

		return this.http.post(url, formData);
	}

	upgradeState(state_update_data: UpdateState) {
		const url = `${this.host}/upgradeState`;
		return this.http.put(url, state_update_data);
	}

	degradeState(state_update_data: UpdateState) {
		const url = `${this.host}/degradeState`;
		return this.http.put(url, state_update_data);
	}

	getTimeDifferenceInHour(date_ref: Date): number {
		return Math.abs(Date.now() - new Date(date_ref).getTime()) / 3600000;
	}

	getTimeDifferenceInDay(date_ref: Date): number {
		return Math.abs(Date.now() - new Date(date_ref).getTime()) / 86400000;
	}

	getTimeDifferenceInDayAndHour(date_ref: Date): Duration {
		const hours = this.getTimeDifferenceInHour(date_ref);
		const days = Math.floor(hours / 24);
		const remaining_hours = hours % 24;
		return {
			day: days,
			hour: remaining_hours,
		};
	}

	getAvailablePeriods(
		period_type: PeriodGranularity,
	): Observable<Array<TimePeriod>> {
		return this.getOldestRequestTime().pipe(
			map((result) => {
				const oldest_request = new Date(result);
				const oldest_year = oldest_request.getFullYear();
				const today = new Date();
				const current_year = today.getFullYear();
				const options: Array<TimePeriod> = [];

				for (let year = oldest_year; year <= current_year; year++) {
					const start_of_year = new Date(year, 0, 1);
					const end_of_year = new Date(year, 11, 31);
					switch (period_type) {
						case "YEAR":
							options.push({
								label: `${year}`,
								full_label: `${year}`,
								year,
								start_date: start_of_year,
								end_date: end_of_year,
								period_type,
							});
							break;

						case "QUARTER":
							for (let q = 1; q <= 4; q++) {
								const start_date = new Date(year, q * 3 - 3, 1);
								if (start_date > today) {
									break;
								}
								const end_date = new Date(year, q * 3, 0);
								if (q !== 1) {
									start_date.setDate(
										start_date.getDate() + this.getStartDateOffset(start_date),
									);
								}

								if (q !== 4) {
									end_date.setDate(
										end_date.getDate() + this.getEndDateOffset(end_date),
									);
								}
								options.push({
									label: `Q${q}`,
									full_label: `Q${q} ${year}`,
									year,
									start_date,
									end_date,
									period_type,
								});
							}
							break;

						case "MONTH":
							for (let m = 0; m < 12; m++) {
								const monthName = new Date(year, m, 1).toLocaleString(
									"default",
									{ month: "long" },
								);
								const start_date = new Date(year, m, 1);
								if (start_date > today) break;
								const end_date = new Date(year, m + 1, 0);

								if (m !== 0) {
									start_date.setDate(
										start_date.getDate() + this.getStartDateOffset(start_date),
									);
								}

								if (m !== 11) {
									end_date.setDate(
										end_date.getDate() + this.getEndDateOffset(end_date),
									);
								}

								options.push({
									label: `${monthName}`,
									full_label: `${monthName} ${year}`,
									year,
									start_date,
									end_date,
									period_type,
								});
							}
							break;

						case "WEEK":
							for (let m = 0; m < 12; m++) {
								const monthName = new Date(year, m, 1).toLocaleString(
									"default",
									{ month: "long" },
								);
								const start_of_month = new Date(year, m, 1);
								const end_of_month = new Date(year, m + 1, 0);

								// Start from the Monday on or before the first day of the month
								const start_date = new Date(start_of_month);

								start_date.setDate(
									start_date.getDate() + this.getStartDateOffset(start_date),
								);

								let week = 1;
								while (start_date <= end_of_month) {
									if (start_date > today) break;

									const end_date = new Date(start_date);
									end_date.setDate(end_date.getDate() + 7);

									if (end_date > end_of_month && end_date.getUTCDate() >= 4) {
										break;
									}

									// Count how many days fall into current month

									options.push({
										label: `Week ${week}`,
										full_label: `Week ${week} ${monthName} ${year}`,
										year,
										start_date: new Date(start_date),
										end_date: new Date(end_date),
										period_type,
									});
									week++;

									// Move to next week
									start_date.setDate(start_date.getDate() + 7);
								}
							}
							break;
					}
				}
				for (const a of options) {
					console.log(a);
				}
				return options;
			}),
		);
	}

	getStartDateOffset(start_date: Date): number {
		const dayOfWeek = start_date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
		let offset: number;

		if (dayOfWeek >= 5 || dayOfWeek === 0) {
			// Friday (5), Saturday (6), Sunday (0): move forward to next Monday
			offset = (8 - dayOfWeek) % 7;
		} else {
			// Monday (1) to Thursday (4): move back to this week's Monday
			offset = -((dayOfWeek + 6) % 7);
		}
		return offset;
	}

	getEndDateOffset(end_date: Date): number {
		const dayOfWeek = end_date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
		let offset: number;

		if (dayOfWeek >= 5 || dayOfWeek === 0) {
			// Friday (5), Saturday (6), Sunday (0): move forward to next Monday
			offset = (8 - dayOfWeek) % 7 || 7; // Sunday becomes +1, others up to +3
		} else {
			// Monday (1) to Thursday (4): move back to previous Monday
			offset = -((dayOfWeek + 6) % 7); // Monday => 0, Tuesday => -1, etc.
		}

		return offset;
	}
}

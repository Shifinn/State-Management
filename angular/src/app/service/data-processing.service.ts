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
import { put } from "@vercel/blob";

@Injectable({
	providedIn: "root",
})
export class DataProcessingService {
	http = inject(HttpClient);
	router = inject(Router);
	// Use a relative path for the API host to work in both local and deployed environments.
	host = "https://state-management-api.vercel.app/api";
	// host = "http://localhost:9090/api";

	storeUserInfo(u: User) {
		localStorage.setItem("userId", u.userId);
		localStorage.setItem("userName", u.userName);
		localStorage.setItem("userEmail", u.email);
		localStorage.setItem("userRole", u.roleId);
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

	async storeFileToBlob(path: string, file: File) {
		const { url } = await put(path, file, {
			access: "public",
		});
		console.log(`the url:${url}`);
	}

	getUserRequest(userIdInput: string): Observable<SimpleData[]> {
		const url = `${this.host}/userRequestsData?userId=${userIdInput}`;
		return this.http.get<SimpleData[]>(url);
	}

	getTodoData(): Observable<SimpleData[]> {
		const roleId = this.getUserRole();
		if (roleId === "2" || roleId === "3") {
			const url = `${this.host}/todoData?roleId=${roleId}`;
			return this.http.get<SimpleData[]>(url);
		}
		return of([]);
	}

	separateTodo(input: SimpleData[]): SimpleData[] {
		if (this.getUserRole() === "3") {
			return input.filter((x) => x.stateNameId === 1 || x.stateNameId === 4);
		}

		if (this.getUserRole() === "2") {
			return input.filter((x) => x.stateNameId === 2);
		}

		return [];
	}

	separateInProgress(input: SimpleData[]): SimpleData[] {
		if (this.getUserRole() === "2") {
			return input.filter((x) => x.stateNameId === 3 || x.stateNameId === 4);
		}
		if (this.getUserRole() === "3") {
			return input.filter((x) => x.stateNameId === 2 || x.stateNameId === 3);
		}

		if (this.getUserRole() === "2") {
			return input.filter((x) => x.stateNameId === 5);
		}

		return [];
	}

	separateDone(input: SimpleData[]): SimpleData[] {
		return input.filter((x) => x.stateNameId === 5);
	}

	getStateSpecificData(
		stateIdInput: number,
		startDate: string,
		endDate: string,
	) {
		const url = `${this.host}/stateSpecificData?stateId=${stateIdInput}&startDate=${startDate}&endDate=${endDate}`;
		return this.http.get<StateInfoData[]>(url);
	}

	separateBasedOnCompletion(
		completionType: StateStatus,
		originStateData: StateInfoData[],
	): StateInfoData[] {
		let complete = false;
		if (completionType === "DONE") complete = true;

		return originStateData.filter((x) => x.completed === complete);
	}

	getCompleteData(requestIdInput: number): Observable<CompleteData> {
		const url = `${this.host}/completeRequestData?requestId=${requestIdInput}`;
		return this.http.get<CompleteData>(url);
	}

	getRequirementQuestion(requirementTypeInput: number) {
		const url = `${this.host}/questionData?requirementType=${requirementTypeInput}`;
		return this.http.get<Question[]>(url);
	}

	getAnswer(requestIdInput: number) {
		const url = `${this.host}/answerData?requestId=${requestIdInput}`;
		return this.http.get<Question[]>(url);
	}

	getStateCount(startDate: string, endDate: string) {
		const url = `${this.host}/stateCountData?startDate=${startDate}&endDate=${endDate}`;
		return this.http.get<StatusInfo[]>(url);
	}

	getOldestRequestTime() {
		const url = `${this.host}/getOldestRequestTime`;
		return this.http.get<Date>(url);
	}

	getAttachmentFilename(requestIdInput: number) {
		const url = `${this.host}/getFilenames?requestId=${requestIdInput}`;
		return this.http.get<AttachmentFilename[]>(url);
	}

	getAttachmentFileDownload(
		requestIdInput: number,
		attachmentFileName: string,
	): void {
		const url = `${this.host}/getAttachmentFile?requestId=${requestIdInput}&filename=${attachmentFileName}`;
		this.http.get(url, { responseType: "blob" }).subscribe((blob) => {
			const downloadLink = document.createElement("a");
			const objectUrl = URL.createObjectURL(blob);
			downloadLink.href = objectUrl;
			downloadLink.download = attachmentFileName;
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

		formData.append("requestTitle", request.requestTitle);
		formData.append("userId", request.userId.toString());
		formData.append("requesterName", request.requesterName);
		formData.append("analysisPurpose", request.analysisPurpose);
		formData.append(
			"requestedFinishDate",
			request.requestedFinishDate
				? request.requestedFinishDate.toISOString()
				: "",
		);
		formData.append("picRequest", request.picRequest);
		formData.append("urgent", String(request.urgent));
		formData.append("requirementType", String(request.requirementType));
		formData.append("remark", request.remark ?? "");
		formData.append("docxFilename", request.docxFilename ?? "");
		formData.append("excelFilename", request.excelFilename ?? "");
		formData.append("answers", JSON.stringify(request.answers));

		if (request.docxAttachment)
			formData.append("docxAttachment", request.docxAttachment);
		if (request.excelAttachment)
			formData.append("excelAttachment", request.excelAttachment);

		return this.http.post(url, formData);
	}

	upgradeState(stateUpdateData: UpdateState) {
		const url = `${this.host}/upgradeState`;
		return this.http.put(url, stateUpdateData);
	}

	degradeState(stateUpdateData: UpdateState) {
		const url = `${this.host}/degradeState`;
		return this.http.put(url, stateUpdateData);
	}

	getTimeDifferenceInHour(dateRef: Date): number {
		return Math.abs(Date.now() - new Date(dateRef).getTime()) / 3600000;
	}

	getTimeDifferenceInDay(dateRef: Date): number {
		return Math.abs(Date.now() - new Date(dateRef).getTime()) / 86400000;
	}

	getTimeDifferenceInDayAndHour(dateRef: Date): Duration {
		const hours = this.getTimeDifferenceInHour(dateRef);
		const days = Math.floor(hours / 24);
		const remainingHours = hours % 24;
		return {
			day: days,
			hour: remainingHours,
		};
	}

	getOldestPeriodTimeFromMemory(): Observable<Date> {
		const oldestTimeStr = localStorage.getItem("oldestTime");
		const oldestTimeSavedAtStr = localStorage.getItem("oldestTimeSavedAt");
		if (oldestTimeStr && oldestTimeSavedAtStr) {
			const savedAt = new Date(oldestTimeSavedAtStr).getTime();
			const now = Date.now();
			const oneHourMs = 60 * 60 * 1000;
			if (now - savedAt < oneHourMs) {
				return of(new Date(oldestTimeStr));
			}
		}
		return this.getOldestRequestTime().pipe(
			map((result) => {
				const resultDate = new Date(result);
				localStorage.setItem("oldestTime", resultDate.toISOString());
				localStorage.setItem("oldestTimeSavedAt", new Date().toISOString());
				return resultDate;
			}),
		);
	}

	getAvailablePeriods(
		periodType: PeriodGranularity,
	): Observable<Array<TimePeriod>> {
		return this.getOldestPeriodTimeFromMemory().pipe(
			map((result) => {
				const oldestRequest = new Date(result);
				const oldestYear = oldestRequest.getFullYear();
				const today = new Date();
				const currentYear = today.getFullYear();
				const options: Array<TimePeriod> = [];

				for (let year = oldestYear; year <= currentYear; year++) {
					const startOfYear = new Date(year, 0, 1);
					const endOfYear = new Date(year, 11, 31);
					switch (periodType) {
						case "YEAR":
							options.push({
								label: `${year}`,
								fullLabel: `${year}`,
								year,
								startDate: startOfYear,
								endDate: endOfYear,
								periodType,
							});
							break;

						case "QUARTER":
							for (let q = 1; q <= 4; q++) {
								const startDate = new Date(year, q * 3 - 3, 1);
								if (startDate > today) {
									break;
								}
								const endDate = new Date(year, q * 3, 0);
								if (q !== 1) {
									startDate.setDate(
										startDate.getDate() + this.getStartDateOffset(startDate),
									);
								}
								if (q !== 4) {
									endDate.setDate(
										endDate.getDate() + this.getEndDateOffset(endDate),
									);
								}
								options.push({
									label: `Q${q}`,
									fullLabel: `Q${q} ${year}`,
									year,
									startDate,
									endDate,
									periodType,
								});
							}
							break;

						case "MONTH":
							for (let m = 0; m < 12; m++) {
								const monthName = new Date(year, m, 1).toLocaleString(
									"default",
									{ month: "long" },
								);
								const startDate = new Date(year, m, 1);
								if (startDate > today) break;
								const endDate = new Date(year, m + 1, 0);

								if (m !== 0) {
									startDate.setDate(
										startDate.getDate() + this.getStartDateOffset(startDate),
									);
								}
								if (m !== 11) {
									endDate.setDate(
										endDate.getDate() + this.getEndDateOffset(endDate),
									);
								}
								options.push({
									label: `${monthName}`,
									fullLabel: `${monthName} ${year}`,
									year,
									startDate,
									endDate,
									periodType,
								});
							}
							break;

						case "WEEK":
							for (let m = 0; m < 12; m++) {
								const monthName = new Date(year, m, 1).toLocaleString(
									"default",
									{ month: "long" },
								);
								const startOfMonth = new Date(year, m, 1);
								const endOfMonth = new Date(year, m + 1, 0);
								const startDate = new Date(startOfMonth);
								startDate.setDate(
									startDate.getDate() + this.getStartDateOffset(startDate),
								);

								let week = 1;
								while (startDate <= endOfMonth) {
									if (startDate > today) break;
									const endDate = new Date(startDate);
									endDate.setDate(endDate.getDate() + 7);
									if (endDate > endOfMonth && endDate.getUTCDate() >= 4) {
										break;
									}
									options.push({
										label: `Week ${week}`,
										fullLabel: `Week ${week} ${monthName} ${year}`,
										year,
										startDate: new Date(startDate),
										endDate: new Date(endDate),
										periodType,
									});
									week++;
									startDate.setDate(startDate.getDate() + 7);
								}
							}
							break;
					}
				}
				return options;
			}),
		);
	}

	getStartDateOffset(startDate: Date): number {
		const dayOfWeek = startDate.getDay();
		let offset: number;

		if (dayOfWeek >= 5 || dayOfWeek === 0) {
			offset = (8 - dayOfWeek) % 7;
		} else {
			offset = -((dayOfWeek + 6) % 7);
		}
		return offset;
	}

	getEndDateOffset(endDate: Date): number {
		const dayOfWeek = endDate.getDay();
		let offset: number;

		if (dayOfWeek >= 5 || dayOfWeek === 0) {
			offset = (8 - dayOfWeek) % 7 || 7;
		} else {
			offset = -((dayOfWeek + 6) % 7);
		}
		return offset;
	}
}

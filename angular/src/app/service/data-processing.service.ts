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
	StateThreshold,
	Duration,
} from "../model/format.type";
import { map, type Observable, of, shareReplay } from "rxjs";

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

	rerouteHome() {
		if (
			this.router.url.includes("/home/(home:dashboard)") &&
			Number(this.getUserRole()) > 1
		) {
			this.router.navigate(["/home", { outlets: { home: "todo" } }]);
		} else if (
			(this.router.url.includes("/home/(home:todo)") ||
				this.router.url.includes("/home/(home:progress)")) &&
			Number(this.getUserRole()) === 1
		) {
			this.router.navigate(["/home", { outlets: { home: "dashboard" } }]);
		}
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
		const url = `${this.host}/completeRequestDataBundle?requestId=${requestIdInput}`;
		return this.http.get<CompleteData>(url);
	}

	getRequirementQuestion(requirementTypeInput: number) {
		const url = `${this.host}/questionData?requirementType=${requirementTypeInput}`;
		return this.http.get<Question[]>(url);
	}

	getStateCount(startDate: string, endDate: string) {
		const url = `${this.host}/stateCountData?startDate=${startDate}&endDate=${endDate}`;
		return this.http.get<StatusInfo[]>(url);
	}

	getAttachmentFileDownload(
		requestIdInput: number,
		attachmentFileName: string,
	) {
		const url = `${this.host}/getAttachmentFile?requestId=${requestIdInput}&filename=${attachmentFileName}`;
		this.http.get<{ url: string }>(url).subscribe((result) => {
			this.http.get(result.url, { responseType: "blob" }).subscribe((blob) => {
				const tempUrl = window.URL.createObjectURL(blob);

				const downloadLink = document.createElement("a");
				downloadLink.href = tempUrl;
				downloadLink.download = attachmentFileName;

				downloadLink.click();

				window.URL.revokeObjectURL(tempUrl);
			});
		});
	}

	getStateThreshold() {
		const url = `${this.host}/getStateThreshold`;
		const cacheStr = localStorage.getItem("stateThreshold");
		const cacheSavedAtStr = localStorage.getItem("stateThresholdSavedAt");

		if (
			cacheStr &&
			cacheSavedAtStr &&
			Date.now() - new Date(cacheSavedAtStr).getTime() < 60 * 60 * 1000
		) {
			return of(JSON.parse(cacheStr) as StateThreshold[]);
		}

		return this.http.get<StateThreshold[]>(url).pipe(
			map((result) => {
				localStorage.setItem("stateThreshold", JSON.stringify(result));
				localStorage.setItem("stateThresholdSavedAt", new Date().toISOString());
				return result;
			}),
		);
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

		// return this.http.post(url, formData);
		return this.http.post(url, formData, {
			reportProgress: true,
			observe: "events",
		});
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

	getOldestRequestTime() {
		const url = `${this.host}/getOldestRequestTime`;
		return this.http.get<Date>(url);
	}
}

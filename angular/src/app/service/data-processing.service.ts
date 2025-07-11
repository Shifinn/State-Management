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
	StateInfoData,
	StateStatus,
	StateThreshold,
	Duration,
} from "../model/format.type";
import { map, type Observable, of } from "rxjs";

@Injectable({
	providedIn: "root",
})
export class DataProcessingService {
	// Inject HttpClient to enable api calling.
	http = inject(HttpClient);
	// Inject Router to handle routing.
	router = inject(Router);
	// The base URL for the backend API.
	// host = "https://state-management-api.vercel.app/api";
	host = "http://localhost:9090/api";

	// Stores user information in localStorage after a successful login.
	storeUserInfo(u: User) {
		localStorage.setItem("userId", u.userId);
		localStorage.setItem("userName", u.userName);
		localStorage.setItem("userEmail", u.email);
		localStorage.setItem("userRole", u.roleId);
	}

	// Retrieves the current user's ID from localStorage.
	getUserId(): string {
		return this.returnIfNotNull(localStorage.getItem("userId"));
	}

	// Retrieves the current user's name from localStorage.
	getUserName(): string {
		return this.returnIfNotNull(localStorage.getItem("userName"));
	}

	// Retrieves the current user's email from localStorage.
	getUserEmail(): string {
		return this.returnIfNotNull(localStorage.getItem("userEmail"));
	}

	// Retrieves the current user's role ID from localStorage.
	getUserRole(): string {
		return this.returnIfNotNull(localStorage.getItem("userRole"));
	}

	clearUserData() {
		localStorage.setItem("userId", "0");
		localStorage.setItem("userName", "");
		localStorage.setItem("userEmail", "");
		localStorage.setItem("userRole", "");
	}

	// A private utility to handle null values from localStorage, returning an empty string instead.
	private returnIfNotNull(input: string | null): string {
		if (input === null || input === undefined) {
			return "";
		}
		return input;
	}

	// Enforces role-based routing rules, redirecting users to the appropriate page if they
	// land on a view they are not supposed to see.
	rerouteHome() {
		// If a worker or validator (role > 1) is on the dashboard, redirect them to their todo list.
		if (
			this.router.url.includes("/home/(home:dashboard)") &&
			Number(this.getUserRole()) > 1
		) {
			this.router.navigate(["/home", { outlets: { home: "todo" } }]);
		}
		// If a base user (role === 1) tries to access admin pages, redirect them to their dashboard.
		else if (
			(this.router.url.includes("/home/(home:todo)") ||
				this.router.url.includes("/home/(home:progress)")) &&
			Number(this.getUserRole()) === 1
		) {
			this.router.navigate(["/home", { outlets: { home: "dashboard" } }]);
		}
	}

	// Fetches all existing requests submitted by a specific user.
	// Used for user request display in dashboard page
	getUserRequest(userIdInput: string): Observable<SimpleData[]> {
		const url = `${this.host}/userRequestsData?userId=${userIdInput}`;
		return this.http.get<SimpleData[]>(url);
	}

	// Fetches a list of todo items based on the current user's role.
	// Used for todo display in todo page
	getTodoData(): Observable<SimpleData[]> {
		const roleId = this.getUserRole();
		// This API call is only valid for specific roles (e.g., workers and validators).
		if (roleId === "2" || roleId === "3") {
			const url = `${this.host}/todoData?roleId=${roleId}`;
			return this.http.get<SimpleData[]>(url);
		}
		// For other roles, return an empty array immediately without making an API call.
		return of([]);
	}

	// Fetches request data filtered by a specific state and date range.
	// Used for state specific request display in progress page
	getStateSpecificData(
		stateIdInput: number,
		startDate: string,
		endDate: string,
	) {
		const url = `${this.host}/stateSpecificData?stateId=${stateIdInput}&startDate=${startDate}&endDate=${endDate}`;
		return this.http.get<StateInfoData[]>(url);
	}

	// Fetches the complete, detailed data for a single request, including nested questions and file data (name and path).
	// Used for detailed data display of a single request within more details
	getCompleteData(requestIdInput: number): Observable<CompleteData> {
		const url = `${this.host}/completeRequestDataBundle?requestId=${requestIdInput}`;
		return this.http.get<CompleteData>(url);
	}

	// Fetches the set of questions for a specific requirement form type.
	// Used for modular questions within the new request dialog
	getRequirementQuestion(requirementTypeInput: number) {
		const url = `${this.host}/questionData?requirementType=${requirementTypeInput}`;
		return this.http.get<Question[]>(url);
	}

	// Fetches the count of requests in each state for a given date range.
	// Used to display state count data within the progress page
	getStateCount(startDate: string, endDate: string) {
		const url = `${this.host}/stateCountData?startDate=${startDate}&endDate=${endDate}`;
		return this.http.get<StatusInfo[]>(url);
	}

	// Handles the process of downloading a file.
	// Used when downloading files within the more details dialog
	getAttachmentFileDownload(
		requestIdInput: number,
		attachmentFileName: string,
	) {
		// Fetch the secure download URL from the backend.
		const url = `${this.host}/getAttachmentFile?requestId=${requestIdInput}&filename=${attachmentFileName}`;
		this.http.get<{ url: string }>(url).subscribe((result) => {
			// Use the fetched URL to download the file blob directly from cloud storage.
			this.http.get(result.url, { responseType: "blob" }).subscribe((blob) => {
				// Create a temporary URL for the downloaded blob.
				const tempUrl = window.URL.createObjectURL(blob);
				// Create a hidden anchor element to programmatically trigger the download.
				const downloadLink = document.createElement("a");
				downloadLink.href = tempUrl;
				// Set the file name. to original.
				downloadLink.download = attachmentFileName;
				// Simulate a click on the link to open the browser's "Save As" dialog.
				downloadLink.click();
				// Clean up the temporary URL to free up memory.
				window.URL.revokeObjectURL(tempUrl);
			});
		});
	}

	// Fetches the time thresholds for each state.
	// Used to trigger warnings on todo request cards
	getStateThreshold() {
		const url = `${this.host}/getStateThreshold`;
		const cacheStr = localStorage.getItem("stateThreshold");
		const cacheSavedAtStr = localStorage.getItem("stateThresholdSavedAt");

		// Check if a valid, non-expired cache exists in localStorage.
		if (
			cacheStr &&
			cacheSavedAtStr &&
			Date.now() - new Date(cacheSavedAtStr).getTime() < 60 * 60 * 1000 // 1 hour in milliseconds
		) {
			// If so, return the cached data as an Observable immediately.
			return of(JSON.parse(cacheStr) as StateThreshold[]);
		}

		// If no valid cache exists, fetch the data from the API.
		return this.http.get<StateThreshold[]>(url).pipe(
			map((result) => {
				// Store the new data and the current timestamp in localStorage for future requests.
				localStorage.setItem("stateThreshold", JSON.stringify(result));
				localStorage.setItem("stateThresholdSavedAt", new Date().toISOString());
				return result;
			}),
		);
	}

	// Submits a new request, including file attachments, to the backend.
	// Used for submiting files in the new request dialog within base user's dashboard page
	postNewRequest(request: NewRequest) {
		const url = `${this.host}/newRequest`;
		// FormData is used to construct a payload suitable for multipart/form-data requests,
		// which is necessary for including files.
		const formData = new FormData();

		// Append all text-based form fields to the FormData object.
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
		// The request string array must be stringified to be sent in FormData.
		formData.append("answers", JSON.stringify(request.answers));

		// Append file data only if a file has been attached.
		if (request.docxAttachment)
			formData.append("docxAttachment", request.docxAttachment);
		if (request.excelAttachment)
			formData.append("excelAttachment", request.excelAttachment);

		// Make the POST request with options to observe progress events.
		return this.http.post(url, formData, {
			reportProgress: true, // Tells HttpClient to emit upload progress events.
			observe: "events", // Tells HttpClient to emit all events, not just the final response body.
		});
	}

	// Sends a request to upgrade a request's state.
	// Used within the more details dialog if it ise triggered within the todo page.
	upgradeState(stateUpdateData: UpdateState) {
		const url = `${this.host}/upgradeState`;
		return this.http.put(url, stateUpdateData);
	}

	// Sends a request to degrade a request's state.
	// Used within the more details dialog if it ise triggered within the todo page.
	degradeState(stateUpdateData: UpdateState) {
		const url = `${this.host}/degradeState`;
		return this.http.put(url, stateUpdateData);
	}

	// Sends a request to permanently drop a request (not going to be processed anymore).
	dropRequest(stateUpdateData: UpdateState) {
		const url = `${this.host}/dropRequest`;
		return this.http.put(url, stateUpdateData);
	}

	// Calculates the time difference in total hours.
	getTimeDifferenceInHour(dateRef: Date): number {
		return Math.abs(Date.now() - new Date(dateRef).getTime()) / 3600000;
	}

	// Calculates the time difference in total days.
	getTimeDifferenceInDay(dateRef: Date): number {
		return Math.abs(Date.now() - new Date(dateRef).getTime()) / 86400000;
	}

	// Calculates the time difference and returns it as a structured object of days and remaining hours.
	// Used within the request card to display time since request started
	// and warnings when state duration has exceeded threshold
	getTimeDifferenceInDayAndHour(dateRef: Date): Duration {
		const hours = this.getTimeDifferenceInHour(dateRef);
		const days = Math.floor(hours / 24);
		const remainingHours = hours % 24;
		return {
			day: days,
			hour: remainingHours,
		};
	}

	// Fetches the startDate timestamp of the very first request in the system.
	getOldestRequestTime() {
		const url = `${this.host}/getOldestRequestTime`;
		return this.http.get<Date>(url);
	}
}

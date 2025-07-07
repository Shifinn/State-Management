import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import type { User } from "../model/format.type";
import { DataProcessingService } from "./data-processing.service";
import { Observable } from "rxjs";
import { TodoPageService } from "./todo-page.service";
import { PeriodPickerService } from "./period-picker.service";
import { ProgressPageService } from "./progress-page.service";
@Injectable({
	providedIn: "root",
})
export class LoginService {
	http = inject(HttpClient); //enables the use of HTTP client calls for the application
	router = inject(Router); // enables navigation using the Router
	// Inject necessary sevices (to reset for next login)
	dataService = inject(DataProcessingService);
	todoService = inject(TodoPageService);
	progressService = inject(ProgressPageService);
	periodPickerService = inject(PeriodPickerService);
	host = "https://state-management-api.vercel.app/api";
	// host = "http://localhost:9090/api";

	// Handles the process of user login
	login(username: string, password: string): Observable<boolean> {
		const url = `${this.host}/login`;
		const body = {
			// Remove blank spaces after the user's username
			userName: username.toLowerCase().replace(/(\S)\s+/g, "$1"),
			password: password,
		};
		// calls the login api call using the dataService
		return new Observable<boolean>((observer) => {
			this.http.post<User>(url, body).subscribe({
				next: (response: User) => {
					// Set defaut as false
					let success = false;
					// If login successfull, user data would be returned
					if (Number(response.userId) > 0) {
						// Set success to true
						success = true;
						// Store all user data to local using dataService's storeUserInfo()
						this.dataService.storeUserInfo(response);
						// When user is > 1 (2 [Worker], 3 [Validator])
						if (Number(response.roleId) > 1) {
							// Go to todo page
							this.router.navigate(["/home", { outlets: { home: "todo" } }]);
						} else {
							// else,if role == 1, then go to dashboard page
							this.router.navigate(["/home"]);
						}
					}

					// To signal that the login has succeded
					observer.next(success);
					observer.complete();
				},
				error: () => {
					// To signal that the login has failed
					observer.next(false);
					observer.complete();
				},
			});
		});
	}

	// Clears all relevant data and return to login page
	logOut() {
		this.dataService.clearUserData();
		this.periodPickerService.resetService();
		this.todoService.resetService();
		this.progressService.resetService();
		this.router.navigate([""]);
	}
}

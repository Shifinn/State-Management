import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import type { User } from "../model/format.type";
import { DataProcessingService } from "./data-processing.service";

@Injectable({
	providedIn: "root",
})
export class LoginService {
	http = inject(HttpClient); //enables the use of HTTP client calls for the application
	router = inject(Router); // enables navigation using the Router
	data_service = inject(DataProcessingService);

	login(username: string, password: string): void {
		const url = `http://localhost:9090/login?user_name=${username}&password=${password}`; // Ensure http, not just Localhost

		this.http.get<User>(url).subscribe((response: User) => {
			console.log(
				"from service, userId:",
				response.user_id,
				"",
				response.role_id,
			);

			if (response.user_id !== "0") {
				this.data_service.storeUserInfo(response);
				this.router.navigate(["/home"]);
			}
		});
	}

	logOut() {
		localStorage.setItem("userId", "0");
		localStorage.setItem("userName", "");
		localStorage.setItem("userEmail", "");
		localStorage.setItem("userRole", "");
		this.router.navigate([""]);
	}
}

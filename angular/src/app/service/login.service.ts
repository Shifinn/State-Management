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
	// host = "http://localhost:9090";
	host = "https://state-management-api.vercel.app/api";

	login(username: string, password: string): void {
		const url = `${this.host}/login?user_name=${username.toLowerCase().replace(/(\S)\s+/g, "$1")}&password=${password}`;

		this.http.get<User>(url).subscribe((response: User) => {
			console.log(
				"from service, userId:",
				response.user_id,
				"",
				response.role_id,
			);

			if (response.user_id !== "0") {
				this.data_service.storeUserInfo(response);
				if (Number(response.role_id) > 1) {
					this.router.navigate(["/home", { outlets: { home: "todo" } }]);
				} else {
					this.router.navigate(["/home"]);
				}
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

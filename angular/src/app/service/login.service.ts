import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import type { User } from "../model/format.type";
import { DataProcessingService } from "./data-processing.service";
import { Observable } from "rxjs";
@Injectable({
	providedIn: "root",
})
export class LoginService {
	http = inject(HttpClient); //enables the use of HTTP client calls for the application
	router = inject(Router); // enables navigation using the Router
	dataService = inject(DataProcessingService);
	// host = "http://localhost:9090/api";
	host = "https://state-management-api.vercel.app/api";

	login(username: string, password: string): Observable<boolean> {
		const url = `${this.host}/login?userName=${username.toLowerCase().replace(/(\S)\s+/g, "$1")}&password=${password}`;
		return new Observable<boolean>((observer) => {
			this.http.get<User>(url).subscribe({
				next: (response: User) => {
					let success = false;
					console.log(`role id: ${response.roleId}`);
					if (Number(response.userId) > 0) {
						success = true;
						this.dataService.storeUserInfo(response);

						if (Number(response.roleId) > 1) {
							this.router.navigate(["/home", { outlets: { home: "todo" } }]);
						} else {
							this.router.navigate(["/home"]);
						}
					}
					observer.next(success);
					observer.complete();
				},
				error: () => {
					observer.next(false);
					observer.complete();
				},
			});
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

import { Component, inject, NgModule, ViewChild } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { Router } from "@angular/router";
import { LoginService } from "../../service/login.service";
import { DataProcessingService } from "../../service/data-processing.service";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";

import { FormsModule, type NgForm } from "@angular/forms";

@Component({
	selector: "app-login-page",
	imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule
],
	templateUrl: "./login-page.component.html",
	styleUrl: "./login-page.component.css",
})
export class LoginPageComponent {
	// Injecting the LoginService to handle login logic
	login_service = inject(LoginService);
	// Injecting DataProcessingService to handle API calls
	data_service = inject(DataProcessingService);
	// Injecting the Router to handle navigation
	router = inject(Router);

	// variable to hold user's input box values
	loginData = {
		username: "",
		password: "",
	};

	// On init check if there is already data regarding user (previously logged in),
	// if role is more than 1 (2 or 3) it would direcly go to the todo page
	// else go  to dashboard
	ngOnInit(): void {
		if (Number(this.data_service.getUserId()) > 0) {
			console.log(Number(this.data_service.getUserRole()));
			if (Number(this.data_service.getUserRole()) > 1) {
				console.log("should move");
				this.router.navigate(["/home", { outlets: { home: "todo" } }]);
			}
			this.router.navigate(["/home"]);
		}
	}

	// Function to handle login when the button is clicked

	checkLogin(form: NgForm) {
		// checks if all fields are filled, if not, return, triggers erros on each box
		if (form.invalid) {
			return;
		}

		// Otherwise, proceed with login
		const { username, password } = this.loginData;
		this.login_service.login(username, password);
	}
}

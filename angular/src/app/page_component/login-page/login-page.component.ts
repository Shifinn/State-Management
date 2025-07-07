import { Component, inject, NgModule, signal, ViewChild } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { Router } from "@angular/router";
import { LoginService } from "../../service/login.service";
import { DataProcessingService } from "../../service/data-processing.service";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { CommonModule } from "@angular/common";
import { FormsModule, type NgForm } from "@angular/forms";

@Component({
	selector: "app-login-page",
	standalone: true,
	imports: [
		MatButtonModule,
		MatFormFieldModule,
		MatInputModule,
		CommonModule,
		FormsModule,
	],
	templateUrl: "./login-page.component.html",
	styleUrl: "./login-page.component.css",
})
export class LoginPageComponent {
	// Injects necessary services
	loginService = inject(LoginService);
	data_service = inject(DataProcessingService);
	// Injects Router to handle routing
	router = inject(Router);
	// Signal to display messages on UI that the login has failed
	loginFail = signal<boolean>(false);

	// variable to hold user's input box values
	loginData = {
		username: "",
		password: "",
	};

	// On init check if there is already data regarding user (previously logged in),
	// if role is more than 1 (2 or 3) it would direcly go to the todo page
	// else go  to dashboard
	ngOnInit(): void {
		// Checks if there is already data regarding user (previously logged in)
		if (Number(this.data_service.getUserId()) > 0) {
			// If role is more than 1 (2 [worker] or 3 [validator]) it would directly go to the todo page
			if (Number(this.data_service.getUserRole()) > 1) {
				this.router.navigate(["/home", { outlets: { home: "todo" } }]);
			}
			// if role = 1 then go to dashboard
			this.router.navigate(["/home"]);
		}
	}

	// Function to handle login when the button is clicked
	checkLogin(form: NgForm) {
		// checks if all fields are filled, if not, return, triggers errors on each box
		if (form.invalid) {
			return;
		}

		// Otherwise, proceed with login, calls a function from loginService
		// to execute an api call for login, if falsy, set call function to set loginFail to true
		const { username, password } = this.loginData;
		this.loginService.login(username, password).subscribe((result) => {
			if (!result) {
				this.setLoginFail();
			}
		});
	}

	//Set loginFail to true
	setLoginFail() {
		this.loginFail.set(true);
	}
}

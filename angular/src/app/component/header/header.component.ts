import { Component, signal, inject, HostListener } from "@angular/core";
import { RouterLink } from "@angular/router";
import { LoginService } from "../../service/login.service";
import { DataProcessingService } from "../../service/data-processing.service";
import { PopUpUserInfoComponent } from "../pop-up-user-info/pop-up-user-info.component";
import { MatIconModule } from "@angular/material/icon";

@Component({
	selector: "app-header",
	standalone: true,
	imports: [RouterLink, PopUpUserInfoComponent, MatIconModule],
	templateUrl: "./header.component.html",
	styleUrl: "./header.component.css",
})
export class HeaderComponent {
	// Injects necessary services.
	loginService = inject(LoginService);
	dataService = inject(DataProcessingService);
	// user's name and role for the user info popUp.
	userName = signal(this.dataService.getUserName());
	userRole = signal<string>(this.dataService.getUserRole());
	// Visibility of the user info popUp.
	isUserInfoVisible = signal<boolean>(false);
	// Width of the window.
	innerWidth = signal<number>(window.innerWidth);

	// This listens for the browser's 'resize' event on the window object and updates accordingly.
	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.innerWidth.set(window.innerWidth);
	}

	// Change visibility of the user info popUp.
	toggleUserInfoVisibility(input: boolean) {
		this.isUserInfoVisible.set(input);
	}

	// Calls the logout method from the service
	logOut() {
		this.loginService.logOut();
	}
}

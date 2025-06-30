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
	loginService = inject(LoginService);
	dataService = inject(DataProcessingService);
	userName = signal(this.dataService.getUserName());
	userRole = signal<string>("1");
	isUserInfoVisible = signal<boolean>(false);
	innerWidth = signal<number>(window.innerWidth);

	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.innerWidth.set(window.innerWidth);
	}

	toggleUserInfoVisibility(input: boolean) {
		this.isUserInfoVisible.set(input);
	}

	logOut() {
		this.loginService.logOut(); // Call the logout method from the service
	}
}

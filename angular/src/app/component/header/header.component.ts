import { Component, signal, inject, HostListener } from "@angular/core";
import { RouterLink } from "@angular/router";
import { LoginService } from "../../service/login.service";
import { DataProcessingService } from "../../service/data-processing.service";
import { PopUpUserInfoComponent } from "../pop-up-user-info/pop-up-user-info.component";
import { MatIconModule } from "@angular/material/icon";

@Component({
	selector: "app-header",
	imports: [RouterLink, PopUpUserInfoComponent, MatIconModule],
	templateUrl: "./header.component.html",
	styleUrl: "./header.component.css",
})
export class HeaderComponent {
	login_service = inject(LoginService);
	data_service = inject(DataProcessingService);
	user_name = signal(Number(this.data_service.getUserName())); // Signal to track the ID
	user_role = signal<string>("1");
	is_user_info_visible = signal<boolean>(false);
	inner_width = signal<number>(9999);

	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.inner_width.set(window.innerWidth);
	}

	ngOnInit() {
		this.user_role.set(this.data_service.getUserRole());
	}

	toggleUserInfoVisibility(input: boolean) {
		this.is_user_info_visible.set(input);
	}

	logOut() {
		this.login_service.logOut(); // Call the logout method from the servic
	}
}

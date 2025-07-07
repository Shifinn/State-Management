import {
	Component,
	ElementRef,
	EventEmitter,
	HostListener,
	inject,
	Output,
	output,
} from "@angular/core";
import { DataProcessingService } from "../../service/data-processing.service";
import { LoginService } from "../../service/login.service";

@Component({
	selector: "app-pop-up-user-info",
	imports: [],
	templateUrl: "./pop-up-user-info.component.html",
	styleUrl: "./pop-up-user-info.component.css",
})
export class PopUpUserInfoComponent {
	//Inject necessary services
	dataService = inject(DataProcessingService);
	loginService = inject(LoginService);
	//Inject ElementRef, used to check for click outside of pop-up
	eref = inject(ElementRef);
	// Output to signal pop-up close (not visible)
	@Output() user_data_visible = new EventEmitter<boolean>();

	//Calls log out on login service on logout button press
	logOut() {
		this.loginService.logOut();
	}

	//On outside click close the pop-up
	@HostListener("document:click", ["$event"])
	onOutsideClick(event: MouseEvent) {
		if (!this.eref.nativeElement.contains(event.target)) {
			this.user_data_visible.emit(false);
		}
	}
}

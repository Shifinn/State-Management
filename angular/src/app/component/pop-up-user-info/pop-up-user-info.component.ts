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
	data_service = inject(DataProcessingService);
	login_service = inject(LoginService);
	eref = inject(ElementRef);
	@Output() user_data_visible = new EventEmitter<boolean>();

	logOut() {
		this.login_service.logOut();
	}

	@HostListener("document:click", ["$event"])
	onOutsideClick(event: MouseEvent) {
		if (!this.eref.nativeElement.contains(event.target)) {
			this.user_data_visible.emit(false);
		}
	}
}

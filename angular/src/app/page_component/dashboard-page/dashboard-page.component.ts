import {
	Component,
	effect,
	HostListener,
	inject,
	Injector,
	signal,
} from "@angular/core";
import { DataProcessingService } from "../../service/data-processing.service";
import type { SimpleData } from "../../model/format.type";
import { CardRequestComponent } from "../../component/card-request/card-request.component";
import { CustomSquareButtonComponent } from "../../component/custom-square-button/custom-square-button.component";
import { MatDialog } from "@angular/material/dialog";
import { DialogNewRequestQuestionnaireComponent } from "../../component/dialog-new-request-questionnaire/dialog-new-request-questionnaire.component";
import { Router } from "@angular/router";
import { TickCounterService } from "../../service/tick-counter.service";

@Component({
	selector: "app-dashboard-page",
	imports: [CardRequestComponent, CustomSquareButtonComponent],
	templateUrl: "./dashboard-page.component.html",
	styleUrl: "./dashboard-page.component.css",
})
export class DashboardPageComponent {
	// Injecting necessary services
	dataService = inject(DataProcessingService);
	// Injecting to refresh data each hour
	counterService = inject(TickCounterService);
	injector = inject(Injector);
	// Injecting MatDialog for newRequest dialog
	dialog = inject(MatDialog);
	// Injecting Router to handle routing
	router = inject(Router);
	// Signal for the data of the user's existing request shown in the form of cards
	requests = signal<Array<SimpleData>>([]);

	// Width of the window.
	innerWidth = signal<number>(window.innerWidth);
	// A flag to check if this is the first init

	newInit = true;

	// This listens for the browser's 'resize' event on the window object and updates accordingly.
	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.innerWidth.set(window.innerWidth);
	}

	ngOnInit(): void {
		//Refreshes visible requests (initializes in this case)
		this.refreshRequests();
		// An `effect` runs automatically whenever any signal it reads changes.
		// Watches `counterService.currentTimeHour()` to refresh data each hour
		effect(
			() => {
				// Reading the signal from service.
				const currentHour = this.counterService.currentTimeHour();

				// If this is the first initialization, do not refresh
				if (this.newInit === true) {
					this.newInit = false;
					return;
				}
				// if the signal has changed, trigger refresh
				this.refreshRequests();
			},
			{ injector: this.injector },
		);
	}

	// Handles submission of a new request by calling the newRequest dialog
	makeNewRequest() {
		// Uses the MatDialog service to open the DialogNewRequestQuestionnaireComponent.
		const dialogRef = this.dialog.open(DialogNewRequestQuestionnaireComponent, {
			autoFocus: false, // Disables auto focusing on an element
			width: "90vw",
			height: "90vh",
			maxWidth: "90vw",
			maxHeight: "fit-content",
			panelClass: "custom-dialog-container",
		});
		// Refreshes the display of request upon successful submission (truthy result)
		dialogRef.afterClosed().subscribe((result) => {
			if (result) {
				this.refreshRequests();
			}
		});
	}

	// Calls a function from dataService that execute an api call to get user's existing requests data.
	// Then updates into variable.
	refreshRequests() {
		this.dataService
			.getUserRequest(this.dataService.getUserId())
			.subscribe((reqs: SimpleData[]) => {
				this.requests.set(reqs);
			});
	}
}

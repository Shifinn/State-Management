import { Component, HostListener, inject, signal } from "@angular/core";
import { DataProcessingService } from "../../service/data-processing.service";
import type { SimpleData } from "../../model/format.type";
import { CardRequestComponent } from "../../component/card-request/card-request.component";
import { CustomSquareButtonComponent } from "../../component/custom-square-button/custom-square-button.component";
import { MatDialog } from "@angular/material/dialog";
import { DialogNewRequestQuestionnaireComponent } from "../../component/dialog-new-request-questionnaire/dialog-new-request-questionnaire.component";
import { Router } from "@angular/router";

@Component({
	selector: "app-dashboard-page",
	imports: [CardRequestComponent, CustomSquareButtonComponent],
	templateUrl: "./dashboard-page.component.html",
	styleUrl: "./dashboard-page.component.css",
})
export class DashboardPageComponent {
	// Injecting DataProcessingService to handle API calls
	dataService = inject(DataProcessingService);
	// Injecting MatDialog to call dialog pop-ups
	dialog = inject(MatDialog);
	// Injecting Router to handle routing
	router = inject(Router);
	//init signal for the data of the user's request
	requests = signal<Array<SimpleData>>([]);

	innerWidth = signal<number>(9999);

	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.innerWidth.set(window.innerWidth);
	}

	ngOnInit(): void {
		if (Number(this.dataService.getUserRole()) > 1) {
			this.router.navigate(["/home", { outlets: { home: "todo" } }]);
		}
		this.refreshRequests();
		this.innerWidth.set(window.innerWidth);
	}

	makeNewRequest() {
		const dialogRef = this.dialog.open(DialogNewRequestQuestionnaireComponent, {
			autoFocus: false,
			width: "90vw",
			height: "90vh",
			maxWidth: "90vw",
			maxHeight: "fit-content",
			panelClass: "custom-dialog-container",
		});

		dialogRef.afterClosed().subscribe((result) => {
			if (result) {
				this.refreshRequests();
			}
		});
	}

	refreshRequests() {
		this.dataService
			.getUserRequest(this.dataService.getUserId())
			.subscribe((reqs: SimpleData[]) => {
				this.requests.set(reqs);
			});
	}
}

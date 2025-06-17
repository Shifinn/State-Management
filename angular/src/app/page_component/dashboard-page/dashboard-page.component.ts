import { Component, HostListener, inject, signal } from "@angular/core";
import { DataProcessingService } from "../../service/data-processing.service";
import type { SimpleData } from "../../model/format.type";
import { CardRequestComponent } from "../../component/card-request/card-request.component";
import { CustomSquareButtonComponent } from "../../component/custom-square-button/custom-square-button.component";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
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
	data_service = inject(DataProcessingService);
	// Injecting MatDialog to call dialog pop-ups
	dialog = inject(MatDialog);
	// Ijecting Router to handle routing
	router = inject(Router);
	//init signal for the data of the user's request
	requests = signal<Array<SimpleData>>([]);

	inner_width = signal<number>(9999);

	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.inner_width.set(window.innerWidth);
	}

	ngOnInit(): void {
		if (Number(this.data_service.getUserRole()) > 1) {
			this.router.navigate(["/home", { outlets: { home: "todo" } }]);
		}
		this.refreshRequests();
		this.inner_width.set(window.innerWidth);
	}

	makeNewRequest() {
		const dialog_ref = this.dialog.open(
			DialogNewRequestQuestionnaireComponent,
			{
				autoFocus: false,
				width: "90vw",
				height: "90vh",
				maxWidth: "90vw",
				panelClass: "custom-dialog-container",
			},
		);

		dialog_ref.afterClosed().subscribe((result) => {
			if (result) {
				this.refreshRequests();
			}
		});
		// this.dialog_config.disableClose = true;
	}

	refreshRequests() {
		this.data_service
			.getUserRequest(this.data_service.getUserId())
			.subscribe((reqs: SimpleData[]) => {
				this.requests.set(reqs);
			});
	}
}

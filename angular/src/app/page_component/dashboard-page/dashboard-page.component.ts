import { Component, inject, signal } from "@angular/core";
import { DataProcessingService } from "../../service/data-processing.service";
import type { SimpleData } from "../../model/format.type";
import { CardRequestComponent } from "../../component/card-request/card-request.component";
import { CustomSquareButtonComponent } from "../../component/custom-square-button/custom-square-button.component";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { DialogNewRequestQuestionnaireComponent } from "../../component/dialog-new-request-questionnaire/dialog-new-request-questionnaire.component";

@Component({
	selector: "app-dashboard-page",
	imports: [CardRequestComponent, CustomSquareButtonComponent],
	templateUrl: "./dashboard-page.component.html",
	styleUrl: "./dashboard-page.component.css",
})
export class DashboardPageComponent {
	data_service = inject(DataProcessingService);
	requests = signal<Array<SimpleData>>([]);
	dialog = inject(MatDialog);
	// dialog_config = inject(MatDialogConfig)

	ngOnInit(): void {
		this.refreshRequests();
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

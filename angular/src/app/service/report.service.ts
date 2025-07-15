import { inject, Injectable } from "@angular/core";
import { MatDialog, type MatDialogRef } from "@angular/material/dialog";
import { DialogActionReportComponent } from "../component/dialog-action-report/dialog-action-report.component";

@Injectable({
	providedIn: "root",
})
export class ReportService {
	private dialog = inject(MatDialog);
	openReportDialog(
		reportMessage: string,
		type: "fail" | "success",
	): MatDialogRef<DialogActionReportComponent> {
		// Uses the MatDialog service to open the DialogActionReportComponent.
		const dialogRefReport = this.dialog.open(DialogActionReportComponent, {
			autoFocus: false,
			width: "60vw",
			height: "90vh",
			maxWidth: "90vw",
			maxHeight: "fit-content",
			panelClass: "custom-dialog-container",
			data: { reportMessage, type }, // Passes the request ID to the dialog.
		});

		// Returns the refrence to the dialog opened
		return dialogRefReport;
	}
}

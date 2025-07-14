import { Component, inject, Input, Signal } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogClose } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";

@Component({
	selector: "app-dialog-action-report",
	imports: [MatIconModule, MatDialogClose, MatButtonModule],
	templateUrl: "./dialog-action-report.component.html",
	styleUrl: "./dialog-action-report.component.css",
})
export class DialogActionReportComponent {
	// Inject the data from the parent component
	dialogData = inject(MAT_DIALOG_DATA);
}

import { Component, inject, signal, Signal, ViewChild } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogClose, MatDialogRef } from "@angular/material/dialog";
import { MatFormField, MatFormFieldModule } from "@angular/material/form-field";
import { FormsModule, type NgModel } from "@angular/forms";
import { MatInputModule } from "@angular/material/input";
import { DIALOG_DATA } from "@angular/cdk/dialog";
import { NgIf } from "@angular/common";

@Component({
	selector: "app-dialog-more-details-confirmation",
	imports: [
		MatDialogClose,
		MatButtonModule,
		MatFormFieldModule,
		FormsModule,
		MatInputModule,
		NgIf,
	],
	templateUrl: "./dialog-more-details-confirmation.component.html",
	styleUrl: "./dialog-more-details-confirmation.component.css",
})
export class DialogMoreDetailsConfirmationComponent {
	// information on which type of state update need confirmation
	data_input = inject(DIALOG_DATA);
	comment = "";
	// Injet refrence to this dialog
	dialogRef = inject(MatDialogRef<DialogMoreDetailsConfirmationComponent>);
	// base "required" of the comment input (not necessary for update)
	require = false;
	// Warning err when wanting to drop a request
	fillWarning = signal<string>("");
	// View child to interact with comment input field
	@ViewChild("commentForm") commentForm!: NgModel;

	ngOnInit() {
		// set "required" to true for dropping request
		if (this.data_input.type === "drop") {
			this.require = true;
		}
	}

	// Continue to handle the more details to drop or upgrade a request
	continue() {
		// Comment only mandatory for dropping (reason to reject)
		if (this.comment.length === 0 && this.require === true) {
			// Check if filled to trigger warning
			this.commentForm.control.markAllAsTouched();
			// Set warning
			this.fillWarning.set("Tolong isi komentar mengapa di reject");
		} else {
			// Close dialog and pass back to more details
			this.dialogRef.close(this.comment);
		}
	}
}

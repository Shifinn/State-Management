import { Component, inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogClose } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { FormsModule } from "@angular/forms";
import { MatInputModule } from "@angular/material/input";
import { DIALOG_DATA } from "@angular/cdk/dialog";

@Component({
	selector: "app-dialog-more-details-confirmation",
	imports: [
		MatDialogClose,
		MatButtonModule,
		MatFormFieldModule,
		FormsModule,
		MatInputModule,
	],
	templateUrl: "./dialog-more-details-confirmation.component.html",
	styleUrl: "./dialog-more-details-confirmation.component.css",
})
export class DialogMoreDetailsConfirmationComponent {
	// information on which type of state update need confirmation
	data_input = inject(DIALOG_DATA);
	comment = "";
	// base "required" of the comment input (not necessary for update)
	require = false;

	ngOnInit() {
		// set "required" to true for dropping request
		if (this.data_input.type === "drop") {
			this.require = true;
		}
	}
}

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
	data_input = inject(DIALOG_DATA);
	comment = "";
	require = false;

	ngOnInit() {
		if (this.data_input.type === "degrade") {
			this.require = true;
		}
	}
}

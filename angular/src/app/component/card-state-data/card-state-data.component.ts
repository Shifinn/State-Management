// This component is used within the progress page to show the filtered request according to a state type
import { Component, inject, Input, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { CustomSquareButtonComponent } from "../custom-square-button/custom-square-button.component";
import type { StateInfoData } from "../../model/format.type";
import { MatDialog } from "@angular/material/dialog";
import { DialogMoreDetailComponent } from "../dialog-more-detail/dialog-more-detail.component";
import { MatTooltipModule } from "@angular/material/tooltip";

@Component({
	selector: "app-card-state-data",
	standalone: true,
	imports: [CustomSquareButtonComponent, CommonModule, MatTooltipModule],
	templateUrl: "./card-state-data.component.html",
	styleUrl: "./card-state-data.component.css",
})
export class CardStateDataComponent {
	// Data that is displayed within the card
	@Input() stateInfo!: StateInfoData;
	// Inject dialog for more details
	dialog = inject(MatDialog);
	// Text on the card either displays State Start Date or Completion Date depending on current state
	boxTextVariant = signal<string>("State Start Date:");

	ngOnInit() {
		// If the current state is 5 (DONE), change State Start Date to Completion Date
		if (this.stateInfo.currentState === 5) {
			this.boxTextVariant.set("Completed Date:");
		}
	}

	moreDetails() {
		// Uses the MatDialog service to open the DialogMoreDetailComponent.
		const dialogRef = this.dialog.open(DialogMoreDetailComponent, {
			autoFocus: false,
			width: "90vw",
			height: "90vh",
			maxWidth: "90vw",
			panelClass: "custom-dialog-container",
			data: { requestId: this.stateInfo.requestId }, // Passes the request ID to the dialog.
		});
	}
}

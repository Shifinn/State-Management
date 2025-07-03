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
	@Input() stateInfo!: StateInfoData;
	dialog = inject(MatDialog);
	boxTextVariant = signal<string>("State Start Date:");

	ngOnInit() {
		if (this.stateInfo.currentState === 5) {
			this.boxTextVariant.set("Completed Date:");
		}
	}

	moreDetails() {
		const dialogRef = this.dialog.open(DialogMoreDetailComponent, {
			autoFocus: false,
			width: "90vw",
			height: "90vh",
			maxWidth: "90vw",
			panelClass: "custom-dialog-container",
			data: { requestId: this.stateInfo.requestId },
		});

		// dialogRef.afterClosed().subscribe((result) => {
		// 	this.refresh.emit();
		// });
	}
}

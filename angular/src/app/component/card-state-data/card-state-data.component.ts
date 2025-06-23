import { Component, inject, Input, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { CustomSquareButtonComponent } from "../custom-square-button/custom-square-button.component";
import type { StateInfoData } from "../../model/format.type";
import { MatDialog } from "@angular/material/dialog";
import { DialogMoreDetailComponent } from "../dialog-more-detail/dialog-more-detail.component";
import { MatTooltipModule } from "@angular/material/tooltip";

@Component({
	selector: "app-card-state-data",
	imports: [CustomSquareButtonComponent, CommonModule, MatTooltipModule],
	templateUrl: "./card-state-data.component.html",
	styleUrl: "./card-state-data.component.css",
})
export class CardStateDataComponent {
	@Input() state_info!: StateInfoData;
	dialog = inject(MatDialog);
	box_text_variant = signal<string>("State Start Date:");

	ngOnInit() {
		if (this.state_info.current_state === 5) {
			this.box_text_variant.set("Completed Date:");
		}
	}

	moreDetails() {
		const dialogref = this.dialog.open(DialogMoreDetailComponent, {
			autoFocus: false,
			width: "90vw",
			height: "90vh",
			maxWidth: "90vw",
			panelClass: "custom-dialog-container",
			data: { request_id: this.state_info.request_id },
		});

		// dialogref.afterClosed().subscribe((result) => {
		// 	this.refresh.emit();
		// });
	}
}

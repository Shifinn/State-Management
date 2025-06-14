import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import type {
	ProgressCardOutput,
	StateStatus,
	StatusInfo,
} from "../../model/format.type";
@Component({
	selector: "app-card-progress-count",
	imports: [CommonModule],
	templateUrl: "./card-progress-count.component.html",
	styleUrl: "./card-progress-count.component.css",
})
export class CardProgressCountComponent {
	@Input() progress_info!: StatusInfo;
	@Input() isShrunk = false;
	@Input() isActiveCheck!: ProgressCardOutput;
	@Output() buttonClick = new EventEmitter<ProgressCardOutput>();

	isActive(): number {
		if (this.isActiveCheck.state_id !== this.progress_info.state_id) return 0;
		if (this.isActiveCheck.type === "TODO") return 1;
		if (this.isActiveCheck.type === "DONE") return 2;
		if (this.isActiveCheck.type === "TOTAL") return 3;

		return 0;
	}

	onClick(input: StateStatus) {
		const output: ProgressCardOutput = {
			type: input,
			state_id: this.progress_info.state_id,
		};
		switch (input) {
			case "TOTAL":
				if (this.progress_info.todo > 0 || this.progress_info.done > 0) {
					this.buttonClick.emit(output);
				}
				break;
			case "TODO":
				if (this.progress_info.todo > 0) {
					this.buttonClick.emit(output);
				}
				break;
			case "DONE":
				if (this.progress_info.done > 0) {
					this.buttonClick.emit(output);
				}
				break;
		}
	}
}

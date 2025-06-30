import {
	Component,
	EventEmitter,
	HostListener,
	Input,
	Output,
	signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import type {
	CachedProgrestCardMemory,
	StateStatus,
	StatusInfo,
} from "../../model/format.type";

@Component({
	selector: "app-card-progress-count",
	standalone: true,
	imports: [CommonModule],
	templateUrl: "./card-progress-count.component.html",
	styleUrl: "./card-progress-count.component.css",
})
export class CardProgressCountComponent {
	@Input() progressInfo!: StatusInfo;
	@Input() isShrunk = false;
	@Input() isActiveCheck!: CachedProgrestCardMemory;
	@Output() buttonClick = new EventEmitter<CachedProgrestCardMemory>();
	innerWidth = signal<number>(window.innerWidth);

	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.innerWidth.set(window.innerWidth);
	}

	isActive(): number {
		if (this.isActiveCheck.stateId !== this.progressInfo.stateId) return 0;
		if (this.isActiveCheck.type === "TODO") return 1;
		if (this.isActiveCheck.type === "DONE") return 2;
		if (this.isActiveCheck.type === "TOTAL") return 3;

		return 0;
	}

	onClick(inputType: StateStatus) {
		const output: CachedProgrestCardMemory = {
			type: inputType,
			stateId: this.progressInfo.stateId,
		};
		switch (inputType) {
			case "TOTAL":
				if (this.progressInfo.todo > 0 || this.progressInfo.done > 0) {
					this.buttonClick.emit(output);
				}
				break;
			case "TODO":
				if (this.progressInfo.todo > 0) {
					this.buttonClick.emit(output);
				}
				break;
			case "DONE":
				if (this.progressInfo.done > 0) {
					this.buttonClick.emit(output);
				}
				break;
		}
	}
}

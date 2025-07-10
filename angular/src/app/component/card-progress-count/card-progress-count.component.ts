// This component is used within the progress page to show the count of requests is a particular state
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
	CachedProgressCardMemory,
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
	// Data of the state count that is going to be displayed
	@Input() progressInfo!: StatusInfo;
	// To change shrink css status
	@Input() isShrunk = false;
	// To check which progress card is active,
	// for toggle (currently picked) and double click (revert to only count display)
	@Input() isActiveCheck!: CachedProgressCardMemory;
	// To inform parent component to change active progress card
	@Output() buttonClick = new EventEmitter<CachedProgressCardMemory>();
	// Width of window
	innerWidth = signal<number>(window.innerWidth);

	// This listens for the browser's 'resize' event on the window object and updates accordingly
	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.innerWidth.set(window.innerWidth);
	}

	// Determines if a section of this card (TODO, DONE, TOTAL) is currently active.
	isActive(): number {
		// If the parent is focused on a different state, none of this card's sections are active.
		if (this.isActiveCheck.stateId !== this.progressInfo.stateId) return 0; // 0 = Not active

		// Check which type of count is active for the current state.
		if (this.isActiveCheck.type === "TODO") return 1; // 1 = TODO is active
		if (this.isActiveCheck.type === "DONE") return 2; // 2 = DONE is active
		if (this.isActiveCheck.type === "TOTAL") return 3; // 3 = TOTAL is active

		// Default to not active.
		return 0;
	}

	// Handles click events on the card's sections (TODO, DONE, TOTAL).
	// It emits an event to the parent component to signal that the user wants to filter the data.
	onClick(inputType: StateStatus) {
		// Create the data payload to be emitted, containing the type of click and the state ID.
		const output: CachedProgressCardMemory = {
			type: inputType,
			stateId: this.progressInfo.stateId,
		};

		// Use a switch statement to handle the logic for each click type.
		// The event is only emitted if the corresponding count is greater than zero,
		// preventing the user from trying to filter an empty set
		// or the button is active as way to go back to count only view
		switch (inputType) {
			case "TOTAL":
				if (
					this.progressInfo.todo > 0 ||
					this.progressInfo.done > 0 ||
					this.isActive() === 3
				) {
					this.buttonClick.emit(output);
				}
				break;
			case "TODO":
				if (this.progressInfo.todo > 0 || this.isActive() === 1) {
					this.buttonClick.emit(output);
				}
				break;
			case "DONE":
				if (this.progressInfo.done > 0 || this.isActive() === 2) {
					this.buttonClick.emit(output);
				}
				break;
		}
	}
}

import {
	Component,
	computed,
	EventEmitter,
	inject,
	Input,
	Output,
	type Signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatDialog } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";

// Import your services and other dependencies
import { TickCounterService } from "../../service/tick-counter.service"; // Use the new service
import { DataProcessingService } from "../../service/data-processing.service";
import { DialogMoreDetailComponent } from "../dialog-more-detail/dialog-more-detail.component";
import { CustomSquareButtonComponent } from "../custom-square-button/custom-square-button.component";
import type { SimpleData, StateThreshold } from "../../model/format.type";

@Component({
	selector: "app-card-request",
	standalone: true, // This component is now standalone
	imports: [
		CommonModule,
		CustomSquareButtonComponent,
		MatIconModule,
		MatTooltipModule,
	],
	templateUrl: "./card-request.component.html",
	styleUrl: "./card-request.component.css",
})
export class CardRequestComponent {
	private dataService = inject(DataProcessingService);
	private tickCounter = inject(TickCounterService);
	private dialog = inject(MatDialog);

	@Input() request!: SimpleData;
	@Input() reminderTooltip!: StateThreshold[];
	@Output() refresh = new EventEmitter<void>();

	// This signal automatically recalculates whenever the timer service emits a new time.
	public readonly requestDurationString: Signal<string> = computed(() => {
		const now = this.tickCounter.currentTime(); // Get the current time from the service
		const dateRef = this.request.requestDate;
		// Assume dataService methods are updated to accept 'now'
		const duration = this.dataService.getTimeDifferenceInDayAndHour(dateRef);
		return ` ${duration.day} days ${Math.floor(duration.hour)} hours ago`;
	});

	// This signal also updates automatically based on the shared timer.
	public readonly stateDurationString: Signal<string> = computed(() => {
		const now = this.tickCounter.currentTime(); // Get current time
		const threshold = this.reminderTooltip?.find(
			(s) => s.stateNameId === this.request.stateNameId,
		)?.stateThresholdHour;

		if (!threshold) {
			return ""; // No threshold, no string to display
		}

		const dateRef = this.request.dateStart;
		const hours = this.dataService.getTimeDifferenceInHour(dateRef);

		if (hours > threshold) {
			const duration = this.dataService.getTimeDifferenceInDayAndHour(dateRef);
			return `Has been ${duration.day} days ${Math.floor(
				duration.hour,
			)} hours since ${this.request.stateName} started`;
		}
		return "";
	});

	moreDetails() {
		const dialogRef = this.dialog.open(DialogMoreDetailComponent, {
			autoFocus: false,
			width: "90vw",
			height: "90vh",
			maxWidth: "90vw",
			maxHeight: "fit-content",
			panelClass: "custom-dialog-container",
			data: { requestId: this.request.requestId },
		});

		dialogRef.afterClosed().subscribe((result) => {
			if (result) {
				this.refresh.emit();
			}
		});
	}
}

// This component is used within the the user's dashboard and todo page to show the requests
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
	// Inject necessary services
	private dataService = inject(DataProcessingService);
	// To reset age of req and warning every second
	private counterService = inject(TickCounterService);
	// Inject dialog for more details
	private dialog = inject(MatDialog);

	// Data that is displayed within the card
	@Input() request!: SimpleData;
	// Threshold to show warning, if not present, disables warning entirely (when DONE)
	@Input() reminderTooltip!: StateThreshold[];
	// Inform the parent to refresh the card view
	// Used when updating the state (upgrade or drop)
	@Output() refresh = new EventEmitter<void>();

	// This signal calculates and formats the total duration since the request was created.
	// It reactively updates every second because it depends on `counterService.currentTimeMs()`.
	public readonly requestDurationString: Signal<string> = computed(() => {
		// Reads the current time from the shared timer service.
		const now = this.counterService.currentTimeMs();
		// Gets the creation date of the request from the input data.
		const dateRef = this.request.requestDate;
		// Calculates the difference from time of request creation till now in days and hours.
		const duration = this.dataService.getTimeDifferenceInDayAndHour(dateRef);
		// Returns a formatted string for display.
		return ` ${duration.day} days ${Math.floor(duration.hour)} hours ago`;
	});

	// This signal calculates and formats the duration the request has been in its current state.
	// It only returns a string if the duration exceeds the configured threshold, creating a warning message.
	public readonly stateDurationString: Signal<string> = computed(() => {
		// Reads the current time from the shared timer service.
		const now = this.counterService.currentTimeMs();
		// Find the specific time threshold for the request's current state.
		const threshold = this.reminderTooltip?.find(
			(s) => s.stateNameId === this.request.stateNameId,
		)?.stateThresholdHour;

		// If there's no threshold for the current state (e.g., "DONE"), return an empty string.
		if (!threshold) {
			return "";
		}

		// Get the date when the request entered its current state.
		const dateRef = this.request.dateStart;
		// Calculate the total hours passed since the state started.
		const hours = this.dataService.getTimeDifferenceInHour(dateRef);

		// If the time spent in the current state exceeds the threshold, generate a warning message.
		if (hours > threshold) {
			const duration = this.dataService.getTimeDifferenceInDayAndHour(dateRef);
			return `Has been ${duration.day} days ${Math.floor(
				duration.hour,
			)} hours since ${this.request.stateName} started`;
		}
		// Otherwise, return an empty string so no warning is displayed.
		return "";
	});

	// Opens a dialog window on "more details" button click to show more the details of the request.
	moreDetails() {
		// Uses the MatDialog service to open the DialogMoreDetailComponent.
		const dialogRef = this.dialog.open(DialogMoreDetailComponent, {
			autoFocus: false, // Prevents the dialog from automatically focusing an element.
			width: "90vw",
			height: "90vh",
			maxWidth: "90vw",
			maxHeight: "fit-content",
			panelClass: "custom-dialog-container",
			data: { requestId: this.request.requestId }, // Passes the request ID to the dialog.
		});

		// Subscribes to the `afterClosed` event of the dialog.
		// This allows the component to react when the dialog is closed.
		dialogRef.afterClosed().subscribe((result) => {
			// If the dialog returns a truthy result,
			// emit the refresh event to the parent component.
			if (result) {
				this.refresh.emit();
			}
		});
	}
}

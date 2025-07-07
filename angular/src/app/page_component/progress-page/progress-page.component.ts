import { Component, HostListener, inject, signal } from "@angular/core";
import { CardProgressCountComponent } from "../../component/card-progress-count/card-progress-count.component";
import type {
	CachedProgressCardMemory,
	StateInfoData,
	TimePeriod,
	StateStatus,
} from "../../model/format.type";
import { CardStateDataComponent } from "../../component/card-state-data/card-state-data.component";
import { PeriodPickerComponent } from "../../component/period-picker/period-picker.component";
import { ProgressPageService } from "../../service/progress-page.service";

@Component({
	selector: "app-progress-page",
	standalone: true,
	imports: [
		CardProgressCountComponent,
		CardStateDataComponent,
		PeriodPickerComponent,
	],
	templateUrl: "./progress-page.component.html",
	styleUrl: "./progress-page.component.css",
})
export class ProgressPageComponent {
	// Injects necessary services
	progressService = inject(ProgressPageService);

	// A signal holding the array of request data currently visible in the detailed list.
	visibleStateData = signal<Array<StateInfoData>>([]);

	// A signal to cache the user's last selection (which state and status, e.g., "TODO" for "VERIFIED").
	// This is used to set which card is in an active state in the UI.
	currentViewStatus = signal<CachedProgressCardMemory>({
		type: "NAN",
		stateId: -2,
	});
	// Used to signal the state count cards to shrink
	isShrunk = signal<boolean>(false);

	// Width of the window.
	innerWidth = signal<number>(window.innerWidth);

	// This listens for the browser's 'resize' event on the window object and updates accordingly
	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.innerWidth.set(window.innerWidth);
	}

	// Toggles the "shrunk" state of the state count cards
	toggleShrink(input: number) {
		// Sets the state based on the input (0 for false, 1 for true).
		this.isShrunk.set(Boolean(input));
	}

	// Handles the event emitted from the period picker when the user selects a new time period.
	periodUpdate(newPeriod: TimePeriod) {
		// Calls the service to update the period to the new period.
		this.progressService.updatePeriodAndFetchData(newPeriod).subscribe(() => {
			// If the currently state specific request cards are visible,
			// change the current request filter accordingly
			if (this.isShrunk()) {
				const cache = this.currentViewStatus();
				// Temporarily reset the status to ensure the filter logic re-triggers correctly.
				// If the show state data uses 2 of the same type, it will revert to normal count view.
				this.currentViewStatus.set({ stateId: -2, type: "NAN" });
				this.showStateData(cache);
			}
		});
	}

	// Handles the event when a user switches the period type (e.g., from WEEK to MONTH).
	handlePeriodTypeShift() {
		// If the detailed view is open, this resets it to the default "TOTAL" view
		// Then calls the showStateData function to change the display.
		if (this.isShrunk()) {
			this.currentViewStatus.set({ stateId: -2, type: "NAN" });
			this.showStateData({ type: "TOTAL", stateId: -1 });
		}
	}

	// Shows the detailed list of requests based on the user's click on a progress card.
	showStateData(input: CachedProgressCardMemory) {
		// First, check if the user is clicking the same filter again to toggle the view off.
		// If so, the function stops here and revert to normal count view (logic within checkPreviousStateSelection).
		if (!this.checkPreviousStateSelection(input)) return;

		// Set the new active status, which will highlight the selected card in the UI.
		this.currentViewStatus.set(input);

		// This logic determines if new data needs to be fetched from the backend.
		const currentStateId = this.visibleStateData()[0]?.stateNameId;
		const hasCachedTotalData =
			(this.progressService.stateData.get("TOTAL") ?? []).length > 0;

		// Fetch new data only if the user has selected a different state OR
		// if the total data for the period hasn't been fetched and cached yet.
		if (currentStateId !== input.stateId || !hasCachedTotalData) {
			this.progressService.getStateSpecificData(input.stateId).subscribe(() => {
				// After fetching, update the visible data signal.
				this.setVisibleStateDataSignal(input.type);
			});
		} else {
			// If the data is already cached, just update the visible data signal directly.
			this.setVisibleStateDataSignal(input.type);
		}
	}

	// Updates the `visibleStateData` signal with the correctly filtered data from the service.
	setVisibleStateDataSignal(completionType: StateStatus) {
		// Shrink the count cards and display the filtered request data
		this.toggleShrink(1);
		// Get the processed and filtered data from the service.
		const data = this.progressService.getSeparatedData(completionType);
		// Update the signal, to set the new display.
		this.visibleStateData.set(data);
		// Set the `currentViewStatus` to the displayed data type.
		this.currentViewStatus().type = completionType;
	}

	// Checks if the user is clicking the same card section that is already active.
	// If so, it toggles the detailed view off.
	checkPreviousStateSelection(check: CachedProgressCardMemory): boolean {
		// Compare the incoming click event with the currently active view status.
		if (
			this.currentViewStatus().stateId === check.stateId &&
			this.currentViewStatus().type === check.type
		) {
			// If it's the same, hide the detailed view.
			this.toggleShrink(0);
			// Clear the visible data.
			this.visibleStateData.set([]);
			// Reset the active status.
			this.currentViewStatus.set({ stateId: -2, type: "NAN" });
			// Return false to prevent `showStateData` from re-fetching and re-showing the data.
			return false;
		}
		// If it's a new selection, return true to allow `showStateData` to proceed.
		return true;
	}
}

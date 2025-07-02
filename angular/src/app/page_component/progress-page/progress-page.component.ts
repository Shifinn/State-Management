import { Component, HostListener, inject, signal } from "@angular/core";
import { CardProgressCountComponent } from "../../component/card-progress-count/card-progress-count.component";
import type {
	CachedProgrestCardMemory,
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
	progressService = inject(ProgressPageService);

	visibleStateData = signal<Array<StateInfoData>>([]);
	currentViewStatus = signal<CachedProgrestCardMemory>({
		type: "NAN",
		stateId: -2,
	});
	isShrunk = signal<boolean>(false);
	isLeftAligned = signal<boolean>(true);
	innerWidth = signal<number>(window.innerWidth);

	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.innerWidth.set(window.innerWidth);
	}

	toggleShrink(input: number) {
		if (input === 2) {
			this.isShrunk.set(this.isShrunk());
			return;
		}
		this.isShrunk.set(Boolean(input));
	}

	/**
	 * Handles the period update event from the child component.
	 * Calls the service to update the period and fetch new data.
	 */
	periodUpdate(newPeriod: TimePeriod) {
		console.log("periodUpdate trigger");
		this.progressService.updatePeriodAndFetchData(newPeriod).subscribe(() => {
			if (this.isShrunk()) {
				const cache = this.currentViewStatus();
				this.currentViewStatus.set({ stateId: -2, type: "NAN" });
				this.showStateData(cache);
			}
		});
	}

	handlePeriodTypeShift() {
		if (this.isShrunk()) {
			this.currentViewStatus.set({ stateId: -2, type: "NAN" });
			this.showStateData({ type: "TOTAL", stateId: -1 });
		}
	}

	/**
	 * Shows detailed data for a selected state.
	 * Fetches data via the service if not already cached.
	 */
	showStateData(input: CachedProgrestCardMemory) {
		if (!this.checkPreviousStateSelection(input)) return;

		this.currentViewStatus.set(input);

		const currentStateId = this.visibleStateData()[0]?.stateNameId;
		const hasCachedTotalData =
			(this.progressService.stateData.get("TOTAL") ?? []).length > 0;

		if (currentStateId !== input.stateId || !hasCachedTotalData) {
			this.progressService.getStateSpecificData(input.stateId).subscribe(() => {
				this.setVisibleStateDataSignal(input.type);
			});
		} else {
			this.setVisibleStateDataSignal(input.type);
		}
	}

	/**
	 * Sets the visible data signal based on the completion type.
	 * Gets the processed data from the service.
	 */
	setVisibleStateDataSignal(completionType: StateStatus) {
		this.toggleShrink(1);
		const data = this.progressService.getSeparatedData(completionType);
		this.visibleStateData.set(data);
		this.currentViewStatus().type = completionType;
	}

	/**
	 * Checks if the user is clicking the same card again to toggle visibility.
	 */
	checkPreviousStateSelection(check: CachedProgrestCardMemory): boolean {
		if (
			this.currentViewStatus().stateId === check.stateId &&
			this.currentViewStatus().type === check.type
		) {
			this.toggleShrink(0);
			this.visibleStateData.set([]);
			this.currentViewStatus.set({ stateId: -2, type: "NAN" });
			return false;
		}
		return true;
	}
}

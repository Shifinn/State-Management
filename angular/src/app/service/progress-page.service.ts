import { inject, Injectable, signal } from "@angular/core";
import { DataProcessingService } from "./data-processing.service";
import type {
	StateInfoData,
	StateStatus,
	StatusInfo,
	TimePeriod,
} from "../model/format.type";
import { type Observable, of, tap } from "rxjs";
import { PeriodPickerService } from "./period-picker.service";

@Injectable({
	providedIn: "root",
})
export class ProgressPageService {
	// Inject necessary services
	private dataService = inject(DataProcessingService);
	private periodPickerService = inject(PeriodPickerService);

	// Stores the currently selected time period, which provides context for the current UI display.
	private currentPeriod!: TimePeriod;
	// A flag to ensure data has been fetched from api
	private hasStateData = false;
	// A signal that holds the counts for each state (e.g., "SUBMITTED: 5 todo, 10 Done").
	// Used to display the state count
	readonly progressInfo = signal<Array<StatusInfo>>([]);

	// A Map used as a client-side cache for detailed request data.
	// It stores the full list of requests for a state under the "TOTAL" key,
	// and filtered lists under "TODO" and "DONE".
	readonly stateData = new Map<StateStatus, Array<StateInfoData>>([
		["TOTAL", []],
		["TODO", []],
		["DONE", []],
	]);

	// Get data state (present or not)
	getHasStateData(): boolean {
		return this.hasStateData;
	}
	// Set data state to present
	setHasStateDataTrue() {
		this.hasStateData = true;
	}
	// Handles the process of selecting a new period.
	// Used when the user selects a new period on the periodPicker component.
	updatePeriodAndFetchData(): Observable<StatusInfo[]> {
		// Update the service's current period context.
		const newPeriod = this.periodPickerService.currentPeriod();

		// if null return empty set
		if (newPeriod === null) {
			return of([]);
		}
		this.currentPeriod = newPeriod;
		// Clear all previously cached data to prevent showing stale information.
		this.clearStateData();
		// Fetch the new state counts for the progress cards for the new period.
		return this.getNewStateCount(newPeriod.startDate, newPeriod.endDate);
	}

	// A private method to fetch the state counts for the progress count cards.
	private getNewStateCount(
		startDate: Date,
		endDate: Date,
	): Observable<StatusInfo[]> {
		// Fetch the data from the backend with getStateCount() from dataService.
		return this.dataService
			.getStateCount(startDate.toISOString(), endDate.toISOString())
			.pipe(
				// Use the `tap` operator to perform a "side effect": updating the `progressInfo`
				// signal with the result without altering the observable stream itself.
				tap((result) => {
					this.progressInfo.set(result);
				}),
			);
	}

	// Fetches the detailed list of all requests for a specific state.
	getStateSpecificData(stateId: number): Observable<StateInfoData[]> {
		// Clear any previously cached detailed data before fetching new data.
		this.clearStateData();
		// Fetch the requests data from the backend using getStateSpecificData() from dataService.
		return this.dataService
			.getStateSpecificData(
				stateId,
				this.currentPeriod.startDate.toISOString(),
				this.currentPeriod.endDate.toISOString(),
			)
			.pipe(
				// Use `tap` to cache the full result under the "TOTAL" key.
				// This is the source data that will be used for client-side filtering.
				tap((result) => {
					this.stateData.set("TOTAL", result);
				}),
			);
	}

	// Retrieves a filtered list of requests (e.g., only "TODO" items) from the cache.
	// If the filtered list isn't cached, it generates it from the "TOTAL" list.
	getSeparatedData(completionType: StateStatus): Array<StateInfoData> {
		// First, check if a pre-filtered list for this type (e.g., "TODO") already exists in the cache.
		const cachedData = this.stateData.get(completionType);
		if (cachedData?.length) {
			// If it exists, return it immediately.
			return cachedData;
		}

		// If not cached, get the full "TOTAL" list of requests for the current state.
		const totalData = this.stateData.get("TOTAL") ?? [];
		// Filters based on the completion type.
		const separatedData = this.separateBasedOnCompletion(
			completionType,
			totalData,
		);
		// Cache the newly filtered list for future use.
		this.stateData.set(completionType, separatedData);
		return separatedData;
	}

	// A function to reset the detailed data cache.
	// This is called whenever the period changes.
	private clearStateData() {
		this.stateData.set("TOTAL", []);
		this.stateData.set("TODO", []);
		this.stateData.set("DONE", []);
	}

	// Resets relevant data of the service.
	// Used when logging out a user.
	resetService() {
		this.progressInfo.set([]);
		this.clearStateData();
		this.currentPeriod = undefined as unknown as TimePeriod;
		this.hasStateData = false;
	}

	// Filter a list of requests based on their `completed` status.
	separateBasedOnCompletion(
		completionType: StateStatus,
		originStateData: StateInfoData[],
	): StateInfoData[] {
		let complete = false;
		if (completionType === "DONE") complete = true;

		// Use the standard array filter method to separate completed entries
		return originStateData.filter((x) => x.completed === complete);
	}
}

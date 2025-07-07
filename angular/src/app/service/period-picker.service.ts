import { inject, Injectable, signal } from "@angular/core";
import { DataProcessingService } from "./data-processing.service";
import type { PeriodGranularity, TimePeriod } from "../model/format.type";
import { DatePipe } from "@angular/common";
import { delay, map, shareReplay, type Observable } from "rxjs";

@Injectable({
	providedIn: "root",
})
export class PeriodPickerService {
	// Inject ncessary services
	private dataService = inject(DataProcessingService);
	//Insert datepipe with the en-US format
	private datePipe = new DatePipe("en-US");
	// Used for getting the available periods from the oldest to current time
	private oldestTime!: Observable<Date> | undefined;
	// Data of all available periods
	public readonly availablePeriod = signal(
		new Map<PeriodGranularity, Array<TimePeriod>>([
			["YEAR", []],
			["QUARTER", []],
			["MONTH", []],
			["WEEK", []],
		]),
	);
	// The currently selected period
	public readonly currentPeriod = signal<TimePeriod | null>(null);
	// The currently selected period tooltip
	public readonly currentPeriodTooltip = signal<string>("");

	constructor() {
		this.initializeAllPeriods();
	}

	// Inits the generation of all period types (Week, Month, Quarter, Year).
	initializeAllPeriods() {
		// Defines the granularities to be generated.
		const allPeriodTypes: PeriodGranularity[] = [
			"WEEK",
			"MONTH",
			"QUARTER",
			"YEAR",
		];

		// Loop through each type to generate and store its available periods.
		for (const type of allPeriodTypes) {
			// Get the current list of periods for the type from the signal.
			const periods = this.availablePeriod().get(type);
			// This check prevents redundant generation if the periods already exist.
			if (!periods || periods.length === 0) {
				// Asynchronously get the periods and update the state.
				this.getAvailablePeriods(type).subscribe((result) => {
					// Ensure the result is not empty before updating the state.
					if (result.length > 0) {
						// Store the generated periods in the `availablePeriod` signal's map.
						this.availablePeriod().set(type, result);
						// After generating weekly periods, set the most recent week as the default view.
						if (type === "WEEK") {
							this.setCurrentPeriod("WEEK");
						}
					}
				});
			}
		}
	}

	// Updates the currently selected time period.
	public updateCurrentPeriod(newPeriod: TimePeriod): string {
		// This guard clause prevents unnecessary state updates and re-renders if the
		// user selects the same period that is already active.
		if (this.currentPeriod()?.fullLabel === newPeriod.fullLabel) {
			return "same";
		}
		// Set the new period, which will reactively update any component observing this signal.
		this.currentPeriod.set(newPeriod);
		// Update the corresponding tooltip text.
		this.setCurrentPeriodTooltip();

		return "updated";
	}

	// Sets the current period to the most recent available period of a given type.
	setCurrentPeriod(periodType: PeriodGranularity) {
		// Retrieve the array of periods for the requested granularity (e.g., all "YEAR" periods).
		const tempPeriodArray = this.availablePeriod().get(periodType);
		// Ensure the array is not empty.
		if (tempPeriodArray?.length) {
			// This check prevents a redundant update if the user clicks the currently active tab.
			if (periodType === this.currentPeriod()?.periodType) {
				return;
			}
			// Get the last item in the array, which is the most recent period.
			const tempPeriod = tempPeriodArray[tempPeriodArray.length - 1];
			// Delegate the state update to the main update function.
			this.updateCurrentPeriod(tempPeriod);
		}
	}

	// Generates and sets a formatted tooltip string for the current period's date range.
	setCurrentPeriodTooltip() {
		// Get the current period from the signal.
		const current = this.currentPeriod();
		// Clear the tooltip if the current period is null
		// Used for making sure current period is not null
		if (!current) {
			this.currentPeriodTooltip.set("");
			return;
		}

		// Use Angular's DatePipe to format the start date into a readable format.
		const startDate = this.datePipe.transform(current.startDate, "fullDate");
		let endDate = "";

		// Check if an end date exists.
		if (current.endDate) {
			const end = new Date(current.endDate);
			// Subtract one day to make the range to avoid confusion,
			// since the end date is at 24:00 of the day, it is treated as the next day (00:00 of the next day).
			// e.g., end date of of 24:00 Jan 31 would be treated as Feb 1 (00:00), the substraction is to remedy this
			end.setDate(end.getDate() - 1);
			// Format the adjusted end date.
			endDate = this.datePipe.transform(end, "fullDate") ?? "";
		}
		// Set the final tooltip string.
		this.currentPeriodTooltip.set(`${startDate} - ${endDate}`);
	}

	// Generates an array of `TimePeriod` objects for a given granularity.
	getAvailablePeriods(
		periodType: PeriodGranularity,
	): Observable<Array<TimePeriod>> {
		// Start by getting the oldest date, then use RxJS `map` to transform this date into a list of periods.
		return this.getOldestPeriodTimeFromMemory().pipe(
			map((result) => {
				const oldestRequest = new Date(result);
				const today = new Date();
				const currentYear = today.getFullYear();
				const options: Array<TimePeriod> = [];

				// Iterate from the year of the oldest data point up to the current year.
				for (
					let year = oldestRequest.getFullYear();
					year <= currentYear;
					year++
				) {
					// Use a switch statement to handle the logic for each period type.
					switch (periodType) {
						case "YEAR":
							// For years, simply create one period object per year.
							options.push({
								label: `${year}`,
								fullLabel: `${year}`,
								year,
								startDate: new Date(year, 0, 1),
								endDate: new Date(year, 11, 31),
								periodType,
							});
							break;
						case "QUARTER":
							// Loop through the four quarters of the year.
							for (let q = 1; q <= 4; q++) {
								const startDate = new Date(year, q * 3 - 3, 1);
								// Stop generating quarters that are in the future.
								if (startDate > today) break;
								const endDate = new Date(year, q * 3, 0);
								// Only add the quarter if its end date is after the oldest data point.
								if (endDate > oldestRequest) {
									options.push({
										label: `Q${q}`,
										fullLabel: `Q${q} ${year}`,
										year,
										startDate,
										endDate,
										periodType,
									});
								}
							}
							break;

						case "MONTH":
							// Loop through the 12 months of the year (0-indexed).
							for (let m = 0; m < 12; m++) {
								const monthName = new Date(year, m, 1).toLocaleString(
									"default",
									{ month: "long" },
								);
								const startDate = new Date(year, m, 1);
								// Stop generating months that are in the future.
								if (startDate > today) break;
								const endDate = new Date(year, m + 1, 0);
								// Only add the month if its end date is after the oldest data point.
								if (endDate > oldestRequest) {
									options.push({
										label: `${monthName}`,
										fullLabel: `${monthName} ${year}`,
										year,
										startDate,
										endDate,
										periodType,
									});
								}
							}
							break;

						case "WEEK":
							// Loop through each month to generate the weeks within it.
							for (let m = 0; m < 12; m++) {
								const monthName = new Date(year, m, 1).toLocaleString(
									"default",
									{ month: "long" },
								);
								const startOfMonth = new Date(year, m, 1);
								const endOfMonth = new Date(year, m + 1, 0);
								// Align the start date to the beginning of the first week (Monday).
								const startDate = new Date(startOfMonth);
								startDate.setDate(
									startDate.getDate() + this.getStartDateOffset(startDate),
								);

								let week = 1;
								// Loop through the month, advancing 7 days at a time to create each week.
								while (startDate <= endOfMonth) {
									// Stop generating weeks that are in the future.
									if (startDate > today) break;
									const endDate = new Date(startDate);
									endDate.setDate(endDate.getDate() + 7);
									// Prevents creating a week for a new month if it only has a few days.
									if (endDate > endOfMonth && endDate.getUTCDate() >= 4) {
										break;
									}
									// Only add the week if its end date is after the oldest data point.
									if (endDate > oldestRequest) {
										options.push({
											label: `Week ${week}`,
											fullLabel: `Week ${week} ${monthName} ${year}`,
											year,
											startDate: new Date(startDate),
											endDate: new Date(endDate),
											periodType,
										});
									}
									week++;
									startDate.setDate(startDate.getDate() + 7);
								}
							}
							break;
					}
				}
				return options;
			}),
		);
	}

	// Helper function to align a start date to the beginning of a week (Monday).
	getStartDateOffset(startDate: Date): number {
		// Get the day of the week, where Sunday is 0 and Saturday is 6.
		const dayOfWeek = startDate.getDay();
		// Calculate the number of days to subtract to get to the previous or current Monday.
		const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
		return offset;
	}

	// Helper function to align an end date to the end of a work week (Sunday).
	getEndDateOffset(endDate: Date): number {
		// Get the day of the week.
		const dayOfWeek = endDate.getDay();
		// Calculate the number of days to add to get to the next or current Sunday.
		const offset = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
		return offset;
	}

	// Fetches the timestamp of the oldest request from the backend, with caching.
	getOldestPeriodTimeFromMemory(): Observable<Date> {
		// If the `oldestTime` observable is already cached, return it immediately
		// to avoid making a redundant API call.
		if (this.oldestTime) {
			return this.oldestTime;
		}

		// If not cached, make the API call via the dataService.
		this.oldestTime = this.dataService.getOldestRequestTime().pipe(
			// Convert the raw result to a Date object.
			map((result) => new Date(result)),
			// `shareReplay(1)` caches the last emitted value and shares it with any
			// new subscribers. This is the core of the caching mechanism, ensuring
			// the API is only hit once per service instance.
			shareReplay(1),
		);

		return this.oldestTime;
	}

	// Resets the service's state to its initial values.
	resetService() {
		// Reset all state signals to their default values.
		this.setCurrentPeriod("WEEK");
	}
}

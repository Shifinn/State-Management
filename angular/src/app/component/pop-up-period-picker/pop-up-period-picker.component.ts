import {
	Component,
	ElementRef,
	EventEmitter,
	HostListener,
	inject,
	Input,
	Output,
	signal,
	type OnInit,
} from "@angular/core";
import type {
	TimePeriod,
	PeriodGranularity,
	CachedPeriodPickerMemory,
} from "../../model/format.type";

@Component({
	selector: "app-pop-up-period-picker",
	standalone: true,
	imports: [],
	templateUrl: "./pop-up-period-picker.component.html",
	styleUrls: ["./pop-up-period-picker.component.css"],
})
export class PopUpPeriodPickerComponent {
	// Injects ElementRef to get a reference to the component's host element. Needed for the onOutsideClick listener.
	eref = inject(ElementRef);
	// ---- INPUTS ----
	// @Input() receives data from a parent component.
	@Input() category!: string[]; // Receives a list of category strings. (Note: This input is declared but not used in the provided code).
	@Input() availablePeriod!: TimePeriod[]; // Receives the list of all selectable time periods. It is required for the component to function.
	@Input() previousMenu?: CachedPeriodPickerMemory; // Optionally receives the previously saved menu state to restore it.

	// ---- OUTPUTS ----
	// @Output() emits events to the parent component.
	@Output() optionSelected = new EventEmitter<TimePeriod>(); // Emits the chosen time period when a user makes a selection.
	@Output() periodPickerVisible = new EventEmitter<PeriodGranularity>(); // Emits an event to notify the parent to close the pop-up.
	@Output() storeMenu = new EventEmitter<CachedPeriodPickerMemory>(); // Emits the current menu state to be cached by the parent.

	// ---- STATE MANAGEMENT (SIGNALS) ----
	// `signal` creates a reactive value that can be updated and components can react to its changes.
	yearList = signal<number[]>([]); // Holds the list of years available for selection.
	monthList = signal<string[]>([]); // Holds the list of months available for selection.
	visiblePeriod = signal<TimePeriod[]>([]); // Holds the filtered list of periods to be displayed to the user based on selected year/month.

	// ---- INTERNAL PROPERTIES ----
	currentMenu!: CachedPeriodPickerMemory; // Stores the current state of the UI (which view is shown, selected year, selected month).
	periodType: PeriodGranularity = "NAN"; // Determines the granularity of the periods being handled (e.g., 'WEEK', 'MONTH'). Initialized to a neutral state.

	// An array of month names for display and lookup. This is a constant utility array.
	monthNames = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];

	// ngOnInit is a lifecycle hook called once after the component's inputs are initialized.
	ngOnInit() {
		// Determine the period type from the first available period. If none exist, it remains 'NAN'.
		this.periodType = this.availablePeriod[0]?.periodType ?? "NAN";

		// Restore the previous menu state if it exists and the period type is 'WEEK', otherwise initialize a default state.
		if (this.previousMenu && this.periodType === "WEEK") {
			this.currentMenu = this.previousMenu;
		} else {
			// Default state: show the period list for the current year and month.
			this.currentMenu = {
				type: "PERIOD",
				year: new Date().getFullYear(),
				month: new Date().getMonth(),
			};
		}

		// Generate the list of selectable years unless the periods are yearly or not applicable.
		if (!(this.periodType === "NAN" || this.periodType === "YEAR")) {
			this.getYearList();
		}

		// If dealing with weekly periods, generate the initial list of months for the current year.
		if (this.periodType === "WEEK") {
			const currentYear = new Date().getFullYear();
			this.monthList.set(this.getMonthList(currentYear));
		}

		// Initial call to filter and display the relevant periods based on the initial state.
		this.updateVisiblePeriod();
	}

	// Filters the `availablePeriod` list based on the `currentMenu` state (selected year and month).
	updateVisiblePeriod() {
		const { year, month } = this.currentMenu;
		let filtered: TimePeriod[];

		// Logic for filtering weekly periods.
		if (this.periodType === "WEEK") {
			filtered = this.availablePeriod.filter((period) => {
				// Shift the date by 3 days to ensure the majority of the week falls within the correct month and year.
				// This prevents weeks at the beginning/end of a month from being miscategorized.
				const shiftedDate = new Date(period.startDate);
				shiftedDate.setDate(shiftedDate.getDate() + 3);
				return (
					shiftedDate.getFullYear() === year && shiftedDate.getMonth() === month
				);
			});
		} else {
			// Logic for filtering other period types (e.g., monthly).
			filtered = this.availablePeriod.filter((period) => {
				const shiftedDate = new Date(period.startDate);
				// Same date shifting logic to ensure correct year assignment.
				shiftedDate.setDate(shiftedDate.getDate() + 3);
				return shiftedDate.getFullYear() === year;
			});
		}

		// Update the reactive signal with the newly filtered list, which automatically updates the template.
		this.visiblePeriod.set(filtered);
	}

	// Handles the final selection of a time period.
	selectOption(option: TimePeriod) {
		this.optionSelected.emit(option); // Emit the selected period to the parent.
		this.storeMenu.emit(this.currentMenu); // Emit the current menu state for caching.
		this.periodPickerVisible.emit("NAN"); // Emit an event to close the picker.
	}

	// Updates the state when a user selects a year from the year list.
	selectYear(year: number) {
		this.currentMenu.year = year;
		this.currentMenu.type = "PERIOD"; // Switch the view back to the period list.
		this.updateVisiblePeriod(); // Refresh the visible periods for the new year.
		// If the period type is 'WEEK', also update the available months for the selected year.
		if (this.periodType === "WEEK") {
			this.monthList.set(this.getMonthList(year));
		}
	}

	// Updates the state when a user selects a month from the month list.
	selectMonth(month: string) {
		const monthIndex = this.monthNames.findIndex((m) => m === month); // Convert month name to index (0-11).
		this.currentMenu.month = monthIndex;
		this.currentMenu.type = "PERIOD"; // Switch back to the period list view.
		this.updateVisiblePeriod(); // Refresh the visible periods for the new month.
	}

	// Switches the UI to show the year selection list.
	changeYear() {
		this.currentMenu.type = "YEAR";
	}

	// Switches the UI to show the month selection list.
	changeMonth() {
		this.currentMenu.type = "MONTH";
	}

	// A helper function to find the earliest period in the `availablePeriod` array.
	getOldestPeriod(): TimePeriod | undefined {
		if (!this.availablePeriod?.length) return; // Return undefined if there are no periods.
		// Use reduce to iterate through the periods and find the one with the minimum startDate.
		return this.availablePeriod.reduce((oldest, current) =>
			current.startDate < oldest.startDate ? current : oldest,
		);
	}

	// Generates the list of years from the oldest available period up to the current year.
	getYearList() {
		const oldest = this.getOldestPeriod();
		if (!oldest) return; // Do nothing if there's no oldest period.

		const startYear = oldest.startDate.getFullYear();
		const currentYear = new Date().getFullYear();
		const years: number[] = [];

		// Loop from the start year to the current year and populate the array.
		for (let year = startYear; year <= currentYear; year++) {
			years.push(year);
		}

		// Set the signal with the generated list of years.
		this.yearList.set(years);
	}

	// Generates a list of month names available for a given year, considering data boundaries.
	getMonthList(year: number): string[] {
		const oldest = this.getOldestPeriod();
		if (!oldest) return []; // Return empty if no periods are available.

		const startYear = oldest.startDate.getFullYear();
		const currentYear = new Date().getFullYear();
		const currentMonth = new Date().getMonth(); // 0-11

		// Case 1: The selected year is both the earliest and the current year.
		if (year === currentYear && year === startYear) {
			// Slice the monthNames array to only include months from the oldest period's month to the current month.
			return this.monthNames.slice(
				oldest.startDate.getMonth(),
				currentMonth + 1,
			);
		}
		// Case 2: The selected year is the current year (but not the start year).
		if (year === currentYear) {
			// Show months from January up to the current month.
			return this.monthNames.slice(0, currentMonth + 1);
		}
		// Case 3: The selected year is the start year (but not the current year).
		if (year === startYear) {
			// Show months from the oldest period's month to December.
			return this.monthNames.slice(oldest.startDate.getMonth());
		}

		// Case 4: The selected year is between the start and current year. All 12 months are available.
		return this.monthNames;
	}

	// @HostListener listens for a click event on the entire document.
	@HostListener("document:click", ["$event"])
	onOutsideClick(event: MouseEvent) {
		// Check if the click occurred outside the component's own element.
		if (!this.eref.nativeElement.contains(event.target)) {
			// If the click was outside, emit an event to close the pop-up.
			this.periodPickerVisible.emit("NAN");
		}
	}
}

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
export class PopUpPeriodPickerComponent implements OnInit {
	eref = inject(ElementRef);
	@Input() category!: string[];
	@Input() availablePeriod!: TimePeriod[];
	@Input() previousMenu?: CachedPeriodPickerMemory;
	@Output() optionSelected = new EventEmitter<TimePeriod>();
	@Output() periodPickerVisible = new EventEmitter<PeriodGranularity>();
	@Output() storeMenu = new EventEmitter<CachedPeriodPickerMemory>();

	yearList = signal<number[]>([]);
	monthList = signal<string[]>([]);
	visiblePeriod = signal<TimePeriod[]>([]);
	currentMenu!: CachedPeriodPickerMemory;
	periodType: PeriodGranularity = "NAN";

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

	ngOnInit() {
		this.periodType = this.availablePeriod[0]?.periodType ?? "NAN";

		if (this.previousMenu && this.periodType === "WEEK") {
			this.currentMenu = this.previousMenu;
		} else {
			this.currentMenu = {
				type: "PERIOD",
				year: new Date().getFullYear(),
				month: new Date().getMonth(),
			};
		}

		if (!(this.periodType === "NAN" || this.periodType === "YEAR")) {
			this.getYearList();
		}

		if (this.periodType === "WEEK") {
			const currentYear = new Date().getFullYear();
			this.monthList.set(this.getMonthList(currentYear));
		}

		this.updateVisiblePeriod();
	}

	updateVisiblePeriod() {
		const { year, month } = this.currentMenu;
		let filtered: TimePeriod[];

		if (this.periodType === "WEEK") {
			filtered = this.availablePeriod.filter(
				(period) =>
					period.startDate.getFullYear() === year &&
					period.startDate.getMonth() === month,
			);
		} else {
			filtered = this.availablePeriod.filter(
				(period) => period.startDate.getFullYear() === year,
			);
		}

		this.visiblePeriod.set(filtered);
	}

	selectOption(option: TimePeriod) {
		this.optionSelected.emit(option);
		this.storeMenu.emit(this.currentMenu);
		this.periodPickerVisible.emit("NAN");
	}

	selectYear(year: number) {
		this.currentMenu.year = year;
		this.currentMenu.type = "PERIOD";
		this.updateVisiblePeriod();
		if (this.periodType === "WEEK") {
			this.monthList.set(this.getMonthList(year));
		}
	}

	selectMonth(month: string) {
		const monthIndex = this.monthNames.findIndex((m) => m === month);
		this.currentMenu.month = monthIndex;
		this.currentMenu.type = "PERIOD";
		this.updateVisiblePeriod();
	}

	changeYear() {
		this.currentMenu.type = "YEAR";
	}

	changeMonth() {
		this.currentMenu.type = "MONTH";
	}

	getOldestPeriod(): TimePeriod | undefined {
		if (!this.availablePeriod?.length) return;
		return this.availablePeriod.reduce((oldest, current) =>
			current.startDate < oldest.startDate ? current : oldest,
		);
	}

	getYearList() {
		const oldest = this.getOldestPeriod();
		if (!oldest) return;

		const startYear = oldest.startDate.getFullYear();
		const currentYear = new Date().getFullYear();
		const years: number[] = [];

		for (let year = startYear; year <= currentYear; year++) {
			years.push(year);
		}

		this.yearList.set(years);
	}

	getMonthList(year: number): string[] {
		const oldest = this.getOldestPeriod();
		if (!oldest) return [];

		const startYear = oldest.startDate.getFullYear();
		const currentYear = new Date().getFullYear();
		const currentMonth = new Date().getMonth();

		if (year === currentYear && year === startYear) {
			return this.monthNames.slice(
				oldest.startDate.getMonth(),
				currentMonth + 1,
			);
		}
		if (year === currentYear) {
			return this.monthNames.slice(0, currentMonth + 1);
		}
		if (year === startYear) {
			return this.monthNames.slice(oldest.startDate.getMonth());
		}

		return this.monthNames;
	}

	@HostListener("document:click", ["$event"])
	onOutsideClick(event: MouseEvent) {
		if (!this.eref.nativeElement.contains(event.target)) {
			this.periodPickerVisible.emit("NAN");
		}
	}
}

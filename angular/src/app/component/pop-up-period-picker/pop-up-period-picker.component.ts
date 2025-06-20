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
	imports: [],
	templateUrl: "./pop-up-period-picker.component.html",
	styleUrls: ["./pop-up-period-picker.component.css"],
})
export class PopUpPeriodPickerComponent implements OnInit {
	eref = inject(ElementRef);
	@Input() category!: string[];
	@Input() available_period!: TimePeriod[];
	@Input() previous_menu?: CachedPeriodPickerMemory;
	@Output() option_selected = new EventEmitter<TimePeriod>();
	@Output() period_picker_visible = new EventEmitter<PeriodGranularity>();
	@Output() store_menu = new EventEmitter<CachedPeriodPickerMemory>();

	year_list = signal<number[]>([]);
	month_list = signal<string[]>([]);
	visible_period = signal<TimePeriod[]>([]);
	current_menu!: CachedPeriodPickerMemory;
	period_type: PeriodGranularity = "NAN";

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
		this.period_type = this.available_period[0]?.period_type ?? "NAN";

		if (this.previous_menu && this.period_type === "WEEK") {
			this.current_menu = this.previous_menu;
		} else {
			this.current_menu = {
				type: "PERIOD",
				year: new Date().getFullYear(),
				month: new Date().getMonth(),
			};
		}

		if (!(this.period_type === "NAN" || this.period_type === "YEAR")) {
			this.getYearList();
		}

		if (this.period_type === "WEEK") {
			// const lastYear = this.year_list()[this.year_list().length - 1];
			const currentYear = new Date().getFullYear();
			this.month_list.set(this.getMonthList(2025));
		}

		this.updateVisiblePeriod();
	}

	updateVisiblePeriod() {
		const { year, month } = this.current_menu;
		let filtered: TimePeriod[];

		if (this.period_type === "WEEK") {
			filtered = this.available_period.filter(
				(period) =>
					period.start_date.getFullYear() === year &&
					period.start_date.getMonth() === month,
			);
		} else {
			filtered = this.available_period.filter(
				(period) => period.start_date.getFullYear() === year,
			);
		}

		this.visible_period.set(filtered);
	}

	selectOption(option: TimePeriod) {
		console.log(option.start_date.getDate());
		this.option_selected.emit(option);
		this.store_menu.emit(this.current_menu);
		this.period_picker_visible.emit("NAN");
	}

	selectYear(input: number) {
		this.current_menu.year = input;
		this.current_menu.type = "PERIOD";
		this.updateVisiblePeriod();
		if (this.period_type === "WEEK") {
			this.month_list.set(this.getMonthList(input));
		}
	}

	selectMonth(input: string) {
		const monthIndex = this.monthNames.findIndex((month) => month === input);
		this.current_menu.month = monthIndex;
		this.current_menu.type = "PERIOD";
		this.updateVisiblePeriod();
	}

	changeYear() {
		this.current_menu.type = "YEAR";
	}

	changeMonth() {
		this.current_menu.type = "MONTH";
	}

	getOldestPeriod(): TimePeriod | undefined {
		if (!this.available_period?.length) return;
		return this.available_period.reduce((oldest, current) =>
			current.start_date < oldest.start_date ? current : oldest,
		);
	}

	getYearList() {
		const oldest = this.getOldestPeriod();
		if (!oldest) return;

		const startYear = oldest.start_date.getFullYear();
		const currentYear = new Date().getFullYear();
		const years: number[] = [];

		for (let year = startYear; year <= currentYear; year++) {
			years.push(year);
		}

		this.year_list.set(years);
	}

	getMonthList(input: number): string[] {
		const oldest = this.getOldestPeriod();
		if (!oldest) return [];

		const startYear = oldest.start_date.getFullYear();
		const currentYear = new Date().getFullYear();

		const currentMonth = new Date().getMonth();

		if (input === currentYear && input === startYear) {
			return this.monthNames.slice(
				oldest.start_date.getMonth(),
				currentMonth + 1,
			);
		}
		if (input === currentYear) {
			return this.monthNames.slice(0, currentMonth + 1);
		}

		if (input === startYear) {
			return this.monthNames.slice(oldest.start_date.getMonth());
		}

		console.log(this.monthNames);
		return this.monthNames;
	}

	@HostListener("document:click", ["$event"])
	onOutsideClick(event: MouseEvent) {
		if (!this.eref.nativeElement.contains(event.target)) {
			this.period_picker_visible.emit("NAN");
		}
	}
}

import { Component, inject, Output, signal } from "@angular/core";
import type {
	CachedPeriodPickerMemory,
	PeriodGranularity,
	TimePeriod,
} from "../../model/format.type";
import { DataProcessingService } from "../../service/data-processing.service";
import { PopUpPeriodPickerComponent } from "../pop-up-period-picker/pop-up-period-picker.component";

@Component({
	selector: "app-period-picker",
	imports: [PopUpPeriodPickerComponent],
	templateUrl: "./period-picker.component.html",
	styleUrl: "./period-picker.component.css",
})
export class PeriodPickerComponent {
	data_service = inject(DataProcessingService);
	@Output() current_period!: TimePeriod;
	period_type: Array<PeriodGranularity> = ["YEAR", "QUARTER", "MONTH", "WEEK"];
	available_period = signal<Map<PeriodGranularity, Array<TimePeriod>>>(
		new Map<PeriodGranularity, Array<TimePeriod>>([
			["YEAR", []],
			["QUARTER", []],
			["MONTH", []],
			["WEEK", []],
		]),
	);

	// current_period!: TimePeriod;
	period_picker_visible = signal<PeriodGranularity>("NAN");
	current_period_menu = signal<CachedPeriodPickerMemory | undefined>(undefined);

	ngOnInit() {
		this.initPeriodDataFrom("WEEK");
	}

	togglePeriodPickerVisibility(input: PeriodGranularity) {
		this.period_picker_visible.set(input);
	}
	setCachedPeriod(input: CachedPeriodPickerMemory) {
		this.current_period_menu.set(input);
	}

	clickPeriodType(period_type: PeriodGranularity) {
		const temp_period_array = this.available_period().get(period_type);
		if (temp_period_array?.length) {
			const temp_period = temp_period_array[temp_period_array.length - 1];
			if (period_type === this.current_period.period_type) {
				console.log("same");
				return;
			}
			this.updateCurrentPeriod(temp_period_array[temp_period_array.length - 1]);
		}
		if (this.is_shrunk() === true) {
			this.current_view_status.set({ state_id: -2, type: "NAN" });
			this.showStateData({ type: "TOTAL", state_id: -1 });
		}
	}

	initPeriodDataFrom(period_type: PeriodGranularity) {
		this.data_service.getAvailablePeriods(period_type).subscribe((result) => {
			if (result.length) {
				this.available_period().set(period_type, result);
				this.updateCurrentPeriod(result[result.length - 1]);
			}
		});
		const filteredPeriodTypes = this.period_type.filter(
			(a) => a !== "WEEK" && a !== period_type,
		);
		for (const a of filteredPeriodTypes) {
			this.data_service.getAvailablePeriods(a).subscribe((result) => {
				if (result.length) {
					this.available_period().set(a, result);
				}
			});
		}
	}

	updateCurrentPeriod(new_period: TimePeriod) {
		this.current_period = new_period;
		this.clearStateData();
		this.getNewStateCount(
			this.current_period.start_date,
			this.current_period.end_date,
		);
	}
}

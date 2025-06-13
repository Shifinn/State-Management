import { Component, inject, signal, type OnInit } from "@angular/core";
import { CardProgressCountComponent } from "../../component/card-progress-count/card-progress-count.component";
import { DataProcessingService } from "../../service/data-processing.service";
import type {
	PeriodGranularity,
	ProgressCardOutput,
	StateInfoData,
	StatusInfo,
	TimePeriod,
	StateStatus,
	CachedPeriodPickerMemory,
} from "../../model/format.type";
import { CardStateDataComponent } from "../../component/card-state-data/card-state-data.component";
import { PeriodPickerComponent } from "../../component/period-picker/period-picker.component";

@Component({
	selector: "app-progress-page",
	imports: [
		CardProgressCountComponent,
		CardStateDataComponent,
		PeriodPickerComponent,
	],
	templateUrl: "./progress-page.component.html",
	styleUrl: "./progress-page.component.css",
})
export class ProgressPageComponent {
	data_service = inject(DataProcessingService);
	progress_info = signal<Array<StatusInfo>>([]);
	period_type: Array<PeriodGranularity> = ["YEAR", "QUARTER", "MONTH", "WEEK"];
	state_data: Map<StateStatus, Array<StateInfoData>> = new Map<
		StateStatus,
		Array<StateInfoData>
	>([
		["TOTAL", []],
		["TODO", []],
		["DONE", []],
	]);
	available_period = signal<Map<PeriodGranularity, Array<TimePeriod>>>(
		new Map<PeriodGranularity, Array<TimePeriod>>([
			["YEAR", []],
			["QUARTER", []],
			["MONTH", []],
			["WEEK", []],
		]),
	);
	visible_state_data = signal<Array<StateInfoData>>([]);
	current_view_status = signal<ProgressCardOutput>({
		type: "NAN",
		state_id: -2,
	});
	current_period!: TimePeriod;
	is_shrunk = signal<boolean>(false);
	is_left_aligned = signal<boolean>(true);
	period_picker_visible = signal<PeriodGranularity>("NAN");
	current_period_menu = signal<CachedPeriodPickerMemory | undefined>(undefined);

	toggleShrink(input: number) {
		if (input === 2) {
			this.is_shrunk.set(this.is_shrunk());
			return;
		}

		this.is_shrunk.set(Boolean(input));
	}

	togglePeriodPickerVisibility(input: PeriodGranularity) {
		this.period_picker_visible.set(input);
	}

	setCachedPeriod(input: CachedPeriodPickerMemory) {
		this.current_period_menu.set(input);
	}

	ngOnInit() {
		this.initPeriodDataFrom("WEEK");
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

	clearStateData() {
		this.state_data.set("TOTAL", []);
		this.state_data.set("TODO", []);
		this.state_data.set("DONE", []);
		this.visible_state_data.set([]);
	}

	getNewStateCount(start_date: Date, end_date: Date) {
		console.log(`start: ${start_date}, end: ${end_date}`);
		this.data_service
			.getStateCount(start_date.toISOString(), end_date.toISOString())
			.subscribe((result) => {
				this.progress_info.set(result);
			});
	}

	showStateData(input: ProgressCardOutput) {
		console.log(`The type from card is: ${input.type}`);
		if (!this.checkIfPressed(input)) return;

		this.current_view_status.set(input);

		const currentStateId = this.visible_state_data()[0]?.state_name_id;
		const cachedTotalData = this.state_data.get("TOTAL");
		// If the visible data doesn't match the selected state, reset
		if (currentStateId !== input.state_id) {
			this.clearStateData();
		} else if (cachedTotalData?.length) {
			this.setVisibleStateDataSignal(input.type);
			return;
		}

		// Otherwise, fetch from server
		this.data_service
			.getStateSpecificData(
				input.state_id,
				this.current_period.start_date.toISOString(),
				this.current_period.end_date.toISOString(),
			)
			.subscribe((result) => {
				this.state_data.set("TOTAL", result);
				this.setVisibleStateDataSignal(input.type);
			});
	}

	setVisibleStateDataSignal(completion_type: StateStatus) {
		const temp_state_array = this.state_data.get(completion_type);
		const temp_state_array_total = this.state_data.get("TOTAL");
		// console.log(
		// 	`enterset visible with type:${completion_type}, length = ${temp_state_array?.length}, current state of: ${this.current_view_status().type}`,
		// );

		this.toggleShrink(1);
		// this.current_view_status().state_id = current_state_id;
		// this.current_view_status().type = completion_type;
		if (temp_state_array?.length) {
			this.visible_state_data.set(temp_state_array);
		} else if (temp_state_array_total?.length) {
			const temp_new_period = this.data_service.separateBasedOnCompletion(
				completion_type,
				temp_state_array_total,
			);
			this.state_data.set(completion_type, temp_new_period);
			this.visible_state_data.set(temp_new_period);
			this.current_view_status().type = completion_type;
		}

		for (const a of this.visible_state_data()) {
			console.log(a);
		}
	}

	checkIfPressed(check: ProgressCardOutput): boolean {
		if (
			this.current_view_status().state_id === check.state_id &&
			this.current_view_status().type === check.type
		) {
			console.log("enter shrink");
			this.toggleShrink(0);
			this.visible_state_data.set([]);
			this.current_view_status.set({ state_id: -2, type: "NAN" });
			console.log(`shrink is ${this.is_shrunk}`);
			return false;
		}

		return true;
	}
}

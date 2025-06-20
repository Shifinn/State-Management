import {
	Component,
	HostListener,
	inject,
	signal,
	type OnInit,
} from "@angular/core";
import { CardProgressCountComponent } from "../../component/card-progress-count/card-progress-count.component";
import { DataProcessingService } from "../../service/data-processing.service";
import type {
	CachedProgrestCardMemory,
	StateInfoData,
	StatusInfo,
	TimePeriod,
	StateStatus,
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
	state_data: Map<StateStatus, Array<StateInfoData>> = new Map<
		StateStatus,
		Array<StateInfoData>
	>([
		["TOTAL", []],
		["TODO", []],
		["DONE", []],
	]);
	visible_state_data = signal<Array<StateInfoData>>([]);
	current_view_status = signal<CachedProgrestCardMemory>({
		type: "NAN",
		state_id: -2,
	});
	current_period!: TimePeriod;
	is_shrunk = signal<boolean>(false);
	is_left_aligned = signal<boolean>(true);
	inner_width = signal<number>(9999);

	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.inner_width.set(window.innerWidth);
	}

	ngOnInit() {
		this.inner_width.set(window.innerWidth);
	}

	toggleShrink(input: number) {
		if (input === 2) {
			this.is_shrunk.set(this.is_shrunk());
			return;
		}

		this.is_shrunk.set(Boolean(input));
	}

	periodUpdate(new_period: TimePeriod) {
		this.current_period = new_period;
		this.clearStateData();
		this.getNewStateCount(
			this.current_period.start_date,
			this.current_period.end_date,
		);
	}

	handlePeriodTypeShift() {
		if (this.is_shrunk() === true) {
			this.current_view_status.set({ state_id: -2, type: "NAN" });
			this.showStateData({ type: "TOTAL", state_id: -1 });
		}
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
		if (this.is_shrunk() === true) {
			const cache = this.current_view_status();
			this.current_view_status.set({ state_id: -2, type: "NAN" });
			this.showStateData(cache);
		}
	}

	showStateData(input: CachedProgrestCardMemory) {
		console.log(`The type from card is: ${input.type}`);
		if (!this.checkPreviousStateSelection(input)) return;

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

		this.toggleShrink(1);

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

	checkPreviousStateSelection(check: CachedProgrestCardMemory): boolean {
		if (
			this.current_view_status().state_id === check.state_id &&
			this.current_view_status().type === check.type
		) {
			this.toggleShrink(0);
			this.visible_state_data.set([]);
			this.current_view_status.set({ state_id: -2, type: "NAN" });
			console.log(`shrink is ${this.is_shrunk}`);
			return false;
		}

		return true;
	}
}

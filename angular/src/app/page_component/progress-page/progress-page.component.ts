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
	standalone: true,
	imports: [
		CardProgressCountComponent,
		CardStateDataComponent,
		PeriodPickerComponent,
	],
	templateUrl: "./progress-page.component.html",
	styleUrl: "./progress-page.component.css",
})
export class ProgressPageComponent implements OnInit {
	dataService = inject(DataProcessingService);
	progressInfo = signal<Array<StatusInfo>>([]);
	stateData: Map<StateStatus, Array<StateInfoData>> = new Map<
		StateStatus,
		Array<StateInfoData>
	>([
		["TOTAL", []],
		["TODO", []],
		["DONE", []],
	]);
	visibleStateData = signal<Array<StateInfoData>>([]);
	currentViewStatus = signal<CachedProgrestCardMemory>({
		type: "NAN",
		stateId: -2,
	});
	currentPeriod!: TimePeriod;
	isShrunk = signal<boolean>(false);
	isLeftAligned = signal<boolean>(true);
	innerWidth = signal<number>(window.innerWidth);

	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.innerWidth.set(window.innerWidth);
	}

	ngOnInit() {
		this.innerWidth.set(window.innerWidth);
	}

	toggleShrink(input: number) {
		if (input === 2) {
			this.isShrunk.set(this.isShrunk());
			return;
		}
		this.isShrunk.set(Boolean(input));
	}

	periodUpdate(newPeriod: TimePeriod) {
		this.currentPeriod = newPeriod;
		this.clearStateData();
		this.getNewStateCount(
			this.currentPeriod.startDate,
			this.currentPeriod.endDate,
		);
	}

	handlePeriodTypeShift() {
		if (this.isShrunk() === true) {
			this.currentViewStatus.set({ stateId: -2, type: "NAN" });
			this.showStateData({ type: "TOTAL", stateId: -1 });
		}
	}

	clearStateData() {
		this.stateData.set("TOTAL", []);
		this.stateData.set("TODO", []);
		this.stateData.set("DONE", []);
		this.visibleStateData.set([]);
	}

	getNewStateCount(startDate: Date, endDate: Date) {
		console.log(`start: ${startDate}, end: ${endDate}`);
		this.dataService
			.getStateCount(startDate.toISOString(), endDate.toISOString())
			.subscribe((result) => {
				this.progressInfo.set(result);
			});
		if (this.isShrunk() === true) {
			const cache = this.currentViewStatus();
			this.currentViewStatus.set({ stateId: -2, type: "NAN" });
			this.showStateData(cache);
		}
	}

	showStateData(input: CachedProgrestCardMemory) {
		console.log(`The type from card is: ${input.type}`);
		if (!this.checkPreviousStateSelection(input)) return;

		this.currentViewStatus.set(input);

		const currentStateId = this.visibleStateData()[0]?.stateNameId;
		const cachedTotalData = this.stateData.get("TOTAL");

		if (currentStateId !== input.stateId) {
			this.clearStateData();
		} else if (cachedTotalData?.length) {
			this.setVisibleStateDataSignal(input.type);
			return;
		}

		this.dataService
			.getStateSpecificData(
				input.stateId,
				this.currentPeriod.startDate.toISOString(),
				this.currentPeriod.endDate.toISOString(),
			)
			.subscribe((result) => {
				this.stateData.set("TOTAL", result);
				this.setVisibleStateDataSignal(input.type);
			});
	}

	setVisibleStateDataSignal(completionType: StateStatus) {
		const tempStateArray = this.stateData.get(completionType);
		const tempStateArrayTotal = this.stateData.get("TOTAL");

		this.toggleShrink(1);

		if (tempStateArray?.length) {
			this.visibleStateData.set(tempStateArray);
		} else if (tempStateArrayTotal?.length) {
			const tempNewPeriod = this.dataService.separateBasedOnCompletion(
				completionType,
				tempStateArrayTotal,
			);
			this.stateData.set(completionType, tempNewPeriod);
			this.visibleStateData.set(tempNewPeriod);
			this.currentViewStatus().type = completionType;
		}
	}

	checkPreviousStateSelection(check: CachedProgrestCardMemory): boolean {
		if (
			this.currentViewStatus().stateId === check.stateId &&
			this.currentViewStatus().type === check.type
		) {
			this.toggleShrink(0);
			this.visibleStateData.set([]);
			this.currentViewStatus.set({ stateId: -2, type: "NAN" });
			console.log(`shrink is ${this.isShrunk}`);
			return false;
		}

		return true;
	}
}

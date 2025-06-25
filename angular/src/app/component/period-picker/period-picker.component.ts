import { Component, EventEmitter, inject, Output, signal } from "@angular/core";
import type {
	CachedPeriodPickerMemory,
	PeriodGranularity,
	TimePeriod,
} from "../../model/format.type";
import { DataProcessingService } from "../../service/data-processing.service";
import { PopUpPeriodPickerComponent } from "../pop-up-period-picker/pop-up-period-picker.component";
import { MatTooltipModule } from "@angular/material/tooltip";
import { CommonModule, DatePipe } from "@angular/common";

@Component({
	selector: "app-period-picker",
	standalone: true,
	imports: [PopUpPeriodPickerComponent, MatTooltipModule, CommonModule],
	templateUrl: "./period-picker.component.html",
	styleUrl: "./period-picker.component.css",
	providers: [DatePipe],
})
export class PeriodPickerComponent {
	dataService = inject(DataProcessingService);
	datePipe = inject(DatePipe);
	@Output() newPeriod = new EventEmitter<TimePeriod>();
	@Output() changePeriodType = new EventEmitter();
	currentPeriodTooltip = signal<string>("");
	periodType: Array<PeriodGranularity> = ["YEAR", "QUARTER", "MONTH", "WEEK"];
	availablePeriod = signal<Map<PeriodGranularity, Array<TimePeriod>>>(
		new Map<PeriodGranularity, Array<TimePeriod>>([
			["YEAR", []],
			["QUARTER", []],
			["MONTH", []],
			["WEEK", []],
		]),
	);

	currentPeriod!: TimePeriod;
	periodPickerVisible = signal<PeriodGranularity>("NAN");
	currentPeriodMenu = signal<CachedPeriodPickerMemory | undefined>(undefined);

	ngOnInit() {
		this.initPeriodDataFrom("WEEK");
	}

	togglePeriodPickerVisibility(input: PeriodGranularity) {
		this.periodPickerVisible.set(input);
	}
	setCachedPeriod(input: CachedPeriodPickerMemory) {
		this.currentPeriodMenu.set(input);
	}

	clickPeriodType(periodType: PeriodGranularity) {
		const tempPeriodArray = this.availablePeriod().get(periodType);
		if (tempPeriodArray?.length) {
			const tempPeriod = tempPeriodArray[tempPeriodArray.length - 1];
			if (periodType === this.currentPeriod.periodType) {
				console.log("same");
				return;
			}
			this.updateCurrentPeriod(tempPeriodArray[tempPeriodArray.length - 1]);
		}
		this.changePeriodType.emit();
		// if (this.isShrunk() === true) {
		//  this.currentViewStatus.set({ stateId: -2, type: "NAN" });
		//  this.showStateData({ type: "TOTAL", stateId: -1 });
		// }
	}

	initPeriodDataFrom(periodType: PeriodGranularity) {
		this.dataService.getAvailablePeriods(periodType).subscribe((result) => {
			if (result.length) {
				this.availablePeriod().set(periodType, result);
				this.updateCurrentPeriod(result[result.length - 1]);
			}
		});
		const filteredPeriodTypes = this.periodType.filter(
			(a) => a !== "WEEK" && a !== periodType,
		);
		for (const a of filteredPeriodTypes) {
			this.dataService.getAvailablePeriods(a).subscribe((result) => {
				if (result.length) {
					this.availablePeriod().set(a, result);
				}
			});
		}
	}

	updateCurrentPeriod(newPeriod: TimePeriod) {
		this.currentPeriod = newPeriod;
		this.setCurrentPeriodTooltip();
		this.newPeriod.emit(newPeriod);
	}

	setCurrentPeriodTooltip() {
		const startDateString = this.datePipe.transform(
			this.currentPeriod.startDate,
			"fullDate",
		);
		const endDate = new Date(this.currentPeriod.endDate);
		endDate.setDate(endDate.getDate() - 1);
		const endDateString = this.datePipe.transform(endDate, "fullDate");
		this.currentPeriodTooltip.set(`${startDateString} - ${endDateString}`);
	}
}

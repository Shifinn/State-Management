import { Component, EventEmitter, inject, Output, signal } from "@angular/core";
import type {
	CachedPeriodPickerMemory,
	PeriodGranularity,
	TimePeriod,
} from "../../model/format.type";
import { PopUpPeriodPickerComponent } from "../pop-up-period-picker/pop-up-period-picker.component";
import { MatTooltipModule } from "@angular/material/tooltip";
import { CommonModule, DatePipe } from "@angular/common";
import { PeriodPickerService } from "../../service/period-picker.service";
import { delay } from "rxjs";

@Component({
	selector: "app-period-picker",
	standalone: true,
	imports: [PopUpPeriodPickerComponent, MatTooltipModule, CommonModule],
	templateUrl: "./period-picker.component.html",
	styleUrl: "./period-picker.component.css",
	providers: [DatePipe],
})
export class PeriodPickerComponent {
	periodPickerService = inject(PeriodPickerService);

	@Output() newPeriod = new EventEmitter<TimePeriod>();
	@Output() changePeriodType = new EventEmitter();

	periodType: Array<PeriodGranularity> = ["YEAR", "QUARTER", "MONTH", "WEEK"];

	periodPickerVisible = signal<PeriodGranularity>("NAN");
	currentPeriodMenu = signal<CachedPeriodPickerMemory | undefined>(undefined);

	ngOnInit() {
		delay(30);

		this.clickPeriodType("WEEK");
	}

	togglePeriodPickerVisibility(input: PeriodGranularity) {
		this.periodPickerVisible.set(input);
	}
	setCachedPeriod(input: CachedPeriodPickerMemory) {
		this.currentPeriodMenu.set(input);
	}

	clickPeriodType(periodType: PeriodGranularity) {
		const tempPeriodArray = this.periodPickerService
			.availablePeriod()
			.get(periodType);
		if (tempPeriodArray?.length) {
			const tempPeriod = tempPeriodArray[tempPeriodArray.length - 1];
			if (periodType === this.periodPickerService.currentPeriod()?.periodType) {
				return;
			}
			this.clickNewPeriod(tempPeriodArray[tempPeriodArray.length - 1]);
		} else {
		}
		this.changePeriodType.emit();
	}

	clickNewPeriod(newPeriod: TimePeriod) {
		const message = this.periodPickerService.updateCurrentPeriod(newPeriod);
		if (message === "updated") {
			this.newPeriod.emit(newPeriod);
		}
	}
}

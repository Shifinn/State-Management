import {
	Component,
	computed,
	effect,
	EventEmitter,
	inject,
	Injector,
	Output,
	type Signal,
	signal,
} from "@angular/core";
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
	// Injects necessary services.
	periodPickerService = inject(PeriodPickerService);
	// For the usage of effect
	injector = inject(Injector);

	// EventEmitters notify parent components of user actions or state changes.
	@Output() newPeriod = new EventEmitter<TimePeriod>();
	@Output() changePeriodType = new EventEmitter();

	// Defines the granularities to be displayed as tabs in the UI.
	periodType: Array<PeriodGranularity> = ["YEAR", "QUARTER", "MONTH", "WEEK"];

	// A signal to control the visibility of the period selection popUp.
	// It holds the type of period ("YEAR", "MONTH", etc.) for which the popUp is currently open.
	// "NAN" (Not a Number/None) is used to indicate that no popUp is visible.
	periodPickerVisible = signal<PeriodGranularity>("NAN");
	// A signal to cache information about the currently open popUp menu.
	currentPeriodMenu = signal<CachedPeriodPickerMemory | undefined>(undefined);
	newInit = true;

	ngOnInit(): void {
		// An `effect` runs automatically whenever any signal it reads changes.
		// Watches `periodPickerService.currentPeriod()`.
		effect(
			() => {
				// Get the current period from the service.
				const now = this.periodPickerService.currentPeriod();
				// If this is the first initialization, do not emit
				if (this.newInit === true) {
					this.newInit = false;
					return;
				}

				// if the new period is not null, emit to signal period has changed
				if (now !== null) {
					this.newPeriod.emit(now);
				}
			},
			{ injector: this.injector },
		);
	}

	// Toggles the visibility of the period selection popUp.
	togglePeriodPickerVisibility(input: PeriodGranularity) {
		// Sets the signal to the type of popUp to be shown (e.g., "YEAR").
		this.periodPickerVisible.set(input);
	}

	// Caches data about the currently open period selection menu.
	setCachedPeriod(input: CachedPeriodPickerMemory) {
		this.currentPeriodMenu.set(input);
	}

	// Handles a click on a period type tab (e.g., "YEAR", "MONTH").
	// It automatically selects the most recent available period of that type.
	clickPeriodType(periodType: PeriodGranularity) {
		// Delegates the period type update logic to the service.
		this.periodPickerService.setCurrentPeriod(periodType);
	}

	// Handles the selection of a new time period, changes the current period.
	clickNewPeriod(newPeriod: TimePeriod) {
		// Delegates the state update logic to the service.
		this.periodPickerService.updateCurrentPeriod(newPeriod);
	}
}

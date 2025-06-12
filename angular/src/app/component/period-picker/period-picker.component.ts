import { Component, Input } from "@angular/core";
import type { TimePeriod } from "../../model/format.type";

@Component({
	selector: "app-period-picker",
	imports: [],
	templateUrl: "./period-picker.component.html",
	styleUrl: "./period-picker.component.css",
})
export class PeriodPickerComponent {
	@Input() periods: TimePeriod[] = [];
	selectedPeriod: TimePeriod | null = null;

	currentPage = 0;
	pageSize = 5;

	ngOnInit() {
		this.currentPage = Math.ceil(this.periods.length / this.pageSize) - 1;
	}

	get paginatedPeriods() {
		const start = this.currentPage * this.pageSize;
		return this.periods.slice(start, start + this.pageSize);
	}

	selectPeriod(period: TimePeriod) {
		this.selectedPeriod = period;
		// Emit event or do something
	}

	nextPage() {
		if ((this.currentPage + 1) * this.pageSize < this.periods.length)
			this.currentPage++;
	}

	prevPage() {
		if (this.currentPage > 0) this.currentPage--;
	}
}

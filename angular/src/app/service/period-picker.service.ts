import { inject, Injectable, signal } from "@angular/core";
import { DataProcessingService } from "./data-processing.service";
import type { PeriodGranularity, TimePeriod } from "../model/format.type";
import { DatePipe } from "@angular/common";
import { map, type Observable } from "rxjs";

@Injectable({
	providedIn: "root",
})
export class PeriodPickerService {
	private dataService = inject(DataProcessingService);
	private datePipe = new DatePipe("en-US");

	public readonly availablePeriod = signal(
		new Map<PeriodGranularity, Array<TimePeriod>>([
			["YEAR", []],
			["QUARTER", []],
			["MONTH", []],
			["WEEK", []],
		]),
	);
	public readonly currentPeriod = signal<TimePeriod | null>(null);
	public readonly currentPeriodTooltip = signal<string>("");

	constructor() {
		this.initializeAllPeriods();
	}

	private initializeAllPeriods() {
		const allPeriodTypes: PeriodGranularity[] = [
			"YEAR",
			"QUARTER",
			"MONTH",
			"WEEK",
		];

		for (const type of allPeriodTypes) {
			this.getAvailablePeriods(type).subscribe((result) => {
				if (result.length > 0) {
					this.availablePeriod().set(type, result);
				}
			});
		}
	}

	public updateCurrentPeriod(newPeriod: TimePeriod): string {
		if (this.currentPeriod()?.fullLabel === newPeriod.fullLabel) {
			return "same";
		}
		this.currentPeriod.set(newPeriod);
		this.setCurrentPeriodTooltip();

		return "updated";
	}

	setCurrentPeriodTooltip() {
		const current = this.currentPeriod();
		if (!current) {
			this.currentPeriodTooltip.set("");
			return;
		}

		const startDate = this.datePipe.transform(current.startDate, "fullDate");
		let endDate = "";

		if (current.endDate) {
			const end = new Date(current.endDate);
			end.setDate(end.getDate() - 1);
			endDate = this.datePipe.transform(end, "fullDate") ?? "";
		}

		this.currentPeriodTooltip.set(`${startDate} - ${endDate}`);
	}

	getAvailablePeriods(
		periodType: PeriodGranularity,
	): Observable<Array<TimePeriod>> {
		return this.dataService.getOldestPeriodTimeFromMemory().pipe(
			map((result) => {
				const oldestRequest = new Date(result);
				const oldestYear = oldestRequest.getFullYear();
				const today = new Date();
				const currentYear = today.getFullYear();
				const options: Array<TimePeriod> = [];

				for (let year = oldestYear; year <= currentYear; year++) {
					const startOfYear = new Date(year, 0, 1);
					const endOfYear = new Date(year, 11, 31);
					switch (periodType) {
						case "YEAR":
							options.push({
								label: `${year}`,
								fullLabel: `${year}`,
								year,
								startDate: startOfYear,
								endDate: endOfYear,
								periodType,
							});
							break;

						case "QUARTER":
							for (let q = 1; q <= 4; q++) {
								const startDate = new Date(year, q * 3 - 3, 1);
								if (startDate > today) {
									break;
								}
								const endDate = new Date(year, q * 3, 0);
								if (q !== 1) {
									startDate.setDate(
										startDate.getDate() + this.getStartDateOffset(startDate),
									);
								}
								if (q !== 4) {
									endDate.setDate(
										endDate.getDate() + this.getEndDateOffset(endDate),
									);
								}
								options.push({
									label: `Q${q}`,
									fullLabel: `Q${q} ${year}`,
									year,
									startDate,
									endDate,
									periodType,
								});
							}
							break;

						case "MONTH":
							for (let m = 0; m < 12; m++) {
								const monthName = new Date(year, m, 1).toLocaleString(
									"default",
									{ month: "long" },
								);
								const startDate = new Date(year, m, 1);
								if (startDate > today) break;
								const endDate = new Date(year, m + 1, 0);

								if (m !== 0) {
									startDate.setDate(
										startDate.getDate() + this.getStartDateOffset(startDate),
									);
								}
								if (m !== 11) {
									endDate.setDate(
										endDate.getDate() + this.getEndDateOffset(endDate),
									);
								}
								options.push({
									label: `${monthName}`,
									fullLabel: `${monthName} ${year}`,
									year,
									startDate,
									endDate,
									periodType,
								});
							}
							break;

						case "WEEK":
							for (let m = 0; m < 12; m++) {
								const monthName = new Date(year, m, 1).toLocaleString(
									"default",
									{ month: "long" },
								);
								const startOfMonth = new Date(year, m, 1);
								const endOfMonth = new Date(year, m + 1, 0);
								const startDate = new Date(startOfMonth);
								startDate.setDate(
									startDate.getDate() + this.getStartDateOffset(startDate),
								);

								let week = 1;
								while (startDate <= endOfMonth) {
									if (startDate > today) break;
									const endDate = new Date(startDate);
									endDate.setDate(endDate.getDate() + 7);
									if (endDate > endOfMonth && endDate.getUTCDate() >= 4) {
										break;
									}
									options.push({
										label: `Week ${week}`,
										fullLabel: `Week ${week} ${monthName} ${year}`,
										year,
										startDate: new Date(startDate),
										endDate: new Date(endDate),
										periodType,
									});
									week++;
									startDate.setDate(startDate.getDate() + 7);
								}
							}
							break;
					}
				}
				return options;
			}),
		);
	}

	getStartDateOffset(startDate: Date): number {
		const dayOfWeek = startDate.getDay();
		let offset: number;

		if (dayOfWeek >= 5 || dayOfWeek === 0) {
			offset = (8 - dayOfWeek) % 7;
		} else {
			offset = -((dayOfWeek + 6) % 7);
		}
		return offset;
	}

	getEndDateOffset(endDate: Date): number {
		const dayOfWeek = endDate.getDay();
		let offset: number;

		if (dayOfWeek >= 5 || dayOfWeek === 0) {
			offset = (8 - dayOfWeek) % 7 || 7;
		} else {
			offset = -((dayOfWeek + 6) % 7);
		}
		return offset;
	}
}

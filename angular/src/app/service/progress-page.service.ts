import { inject, Injectable, signal } from "@angular/core";
import { DataProcessingService } from "./data-processing.service";
import type {
	StateInfoData,
	StateStatus,
	StatusInfo,
	TimePeriod,
} from "../model/format.type";
import { type Observable, tap } from "rxjs";

@Injectable({
	providedIn: "root",
})
export class ProgressPageService {
	private dataService = inject(DataProcessingService);
	private currentPeriod!: TimePeriod;

	readonly progressInfo = signal<Array<StatusInfo>>([]);
	readonly stateData = new Map<StateStatus, Array<StateInfoData>>([
		["TOTAL", []],
		["TODO", []],
		["DONE", []],
	]);

	updatePeriodAndFetchData(newPeriod: TimePeriod): Observable<StatusInfo[]> {
		this.currentPeriod = newPeriod;
		this.clearStateData();
		return this.getNewStateCount(newPeriod.startDate, newPeriod.endDate);
	}

	private getNewStateCount(
		startDate: Date,
		endDate: Date,
	): Observable<StatusInfo[]> {
		return this.dataService
			.getStateCount(startDate.toISOString(), endDate.toISOString())
			.pipe(
				tap((result) => {
					this.progressInfo.set(result);
				}),
			);
	}

	getStateSpecificData(stateId: number): Observable<StateInfoData[]> {
		this.clearStateData();
		return this.dataService
			.getStateSpecificData(
				stateId,
				this.currentPeriod.startDate.toISOString(),
				this.currentPeriod.endDate.toISOString(),
			)
			.pipe(
				tap((result) => {
					this.stateData.set("TOTAL", result);
				}),
			);
	}

	getSeparatedData(completionType: StateStatus): Array<StateInfoData> {
		const cachedData = this.stateData.get(completionType);
		if (cachedData?.length) {
			return cachedData;
		}

		const totalData = this.stateData.get("TOTAL") ?? [];
		const separatedData = this.dataService.separateBasedOnCompletion(
			completionType,
			totalData,
		);
		this.stateData.set(completionType, separatedData);
		return separatedData;
	}

	clearStateData() {
		this.stateData.set("TOTAL", []);
		this.stateData.set("TODO", []);
		this.stateData.set("DONE", []);
	}

	resetService() {
		this.progressInfo.set([]);
		this.clearStateData();
		this.currentPeriod = undefined as unknown as TimePeriod;
	}
}

import { inject, Injectable, signal } from "@angular/core";
import { DataProcessingService } from "./data-processing.service";
import type { SimpleData, StateThreshold } from "../model/format.type";
import { type Observable, tap } from "rxjs";

@Injectable({
	providedIn: "root",
})
export class TodoPageService {
	private dataService = inject(DataProcessingService);

	public readonly todoMap = signal(
		new Map<"TODO" | "IN PROGRESS" | "DONE", Array<SimpleData>>([
			["TODO", []],
			["IN PROGRESS", []],
			["DONE", []],
		]),
	);
	public readonly todoStateThreshold = signal<Array<StateThreshold>>([]);

	// --- PUBLIC SIGNALS ---
	// public readonly todoMap = this.todoMap.asReadonly();
	// public readonly todoStateThreshold = this.todoStateThreshold.asReadonly();

	constructor() {
		this.getThreshold();
	}

	getThreshold() {
		this.dataService.getStateThreshold().subscribe((result) => {
			this.todoStateThreshold.set(result);
		});
	}

	refreshTodoData(): Observable<SimpleData[]> {
		return this.dataService.getTodoData().pipe(
			tap((result) => {
				this.todoMap().set("TODO", this.separateTodo(result));
				this.todoMap().set("IN PROGRESS", this.separateInProgress(result));
				this.todoMap().set("DONE", this.separateDone(result));
			}),
		);
	}

	// --- PRIVATE HELPER METHODS ---
	// This logic has been moved from DataProcessingService to make this service more self-sufficient.
	private separateTodo(input: SimpleData[]): SimpleData[] {
		const userRole = this.dataService.getUserRole();
		if (userRole === "3") {
			return input.filter((x) => x.stateNameId === 1 || x.stateNameId === 4);
		}
		if (userRole === "2") {
			return input.filter((x) => x.stateNameId === 2);
		}
		return [];
	}

	private separateInProgress(input: SimpleData[]): SimpleData[] {
		const userRole = this.dataService.getUserRole();
		if (userRole === "2") {
			return input.filter((x) => x.stateNameId === 3 || x.stateNameId === 4);
		}
		if (userRole === "3") {
			return input.filter((x) => x.stateNameId === 2 || x.stateNameId === 3);
		}
		return [];
	}

	private separateDone(input: SimpleData[]): SimpleData[] {
		return input.filter((x) => x.stateNameId === 5);
	}

	resetService() {
		this.todoMap().set("TODO", []);
		this.todoMap().set("IN PROGRESS", []);
		this.todoMap().set("DONE", []);
		this.todoStateThreshold.set([]);
	}
}

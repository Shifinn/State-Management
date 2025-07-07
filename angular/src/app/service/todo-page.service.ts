import { inject, Injectable, signal } from "@angular/core";
import { DataProcessingService } from "./data-processing.service";
import type { SimpleData, StateThreshold } from "../model/format.type";
import { type Observable, tap } from "rxjs";

@Injectable({
	providedIn: "root",
})
export class TodoPageService {
	// Injects necessary sevices
	private dataService = inject(DataProcessingService);

	// Cached todo request data.
	// Used for the todo requests display.
	public readonly todoMap = signal(
		new Map<"TODO" | "IN PROGRESS" | "DONE", Array<SimpleData>>([
			["TODO", []],
			["IN PROGRESS", []],
			["DONE", []],
		]),
	);
	// Data of the time treshold for each state until a visual warning will be displayed
	public readonly todoStateThreshold = signal<Array<StateThreshold>>([]);

	constructor() {
		// Init the warning threshold for each state
		this.getThreshold();
	}

	// Fetch the data of the time threshold for each state from backend
	// using getStateThreshold() from dataService
	getThreshold() {
		this.dataService.getStateThreshold().subscribe((result) => {
			this.todoStateThreshold.set(result);
		});
	}

	// Fetch new todo data from backend.
	// Using getTodoData() from dataService
	refreshTodoData(): Observable<SimpleData[]> {
		return this.dataService.getTodoData().pipe(
			tap((result) => {
				// Then separated to the set categories
				this.todoMap().set("TODO", this.separateTodo(result));
				this.todoMap().set("IN PROGRESS", this.separateInProgress(result));
				this.todoMap().set("DONE", this.separateDone(result));
			}),
		);
	}

	// Handles todo data categorization of the todo category (states that the relevant role can progress)
	// based on the relevant role
	private separateTodo(input: SimpleData[]): SimpleData[] {
		const userRole = this.dataService.getUserRole();
		// If the role is 2 (Worker) the state within todo is VALIDATED and IN PROGRESS
		if (userRole === "2") {
			return input.filter((x) => x.stateNameId === 2 || x.stateNameId === 3);
		}
		// If the role is 3 (Validator) the state within todo is SUBMITTED and WAITING FOR REVIEW
		if (userRole === "3") {
			return input.filter((x) => x.stateNameId === 1 || x.stateNameId === 4);
		}

		return [];
	}

	// Handles todo data categorization of the in progress caregory based on the relevant role
	private separateInProgress(input: SimpleData[]): SimpleData[] {
		const userRole = this.dataService.getUserRole();
		// If the role is 2 (Worker) the state within todo is WAITING FOR REVIEW
		if (userRole === "2") {
			return input.filter((x) => x.stateNameId === 4);
		}
		// If the role is 3 (Validator) the state within todo is VALIDATED and IN PROGRESS
		if (userRole === "3") {
			return input.filter((x) => x.stateNameId === 2 || x.stateNameId === 3);
		}
		return [];
	}

	// Handles todo data categorization of the in done category based on the relevant role
	private separateDone(input: SimpleData[]): SimpleData[] {
		// For all role data that is in the 5th state (DONE) is within this category
		return input.filter((x) => x.stateNameId === 5);
	}

	// Resets relevant information, used upon logout
	resetService() {
		this.todoMap().set("TODO", []);
		this.todoMap().set("IN PROGRESS", []);
		this.todoMap().set("DONE", []);
	}
}

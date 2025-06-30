import { Component, HostListener, inject, signal } from "@angular/core";
import { DataProcessingService } from "../../service/data-processing.service";
import type { SimpleData, StateThreshold } from "../../model/format.type";
import { CardRequestComponent } from "../../component/card-request/card-request.component";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
	selector: "app-todo-page",
	standalone: true,
	imports: [
		CardRequestComponent,
		MatFormFieldModule,
		MatSelectModule,
		CommonModule,
		FormsModule,
	],
	templateUrl: "./todo-page.component.html",
	styleUrl: "./todo-page.component.css",
})
export class TodoPageComponent {
	dataService = inject(DataProcessingService);
	todoComplete: Array<SimpleData> = [];
	todoMap = signal(
		new Map<"TODO" | "IN PROGRESS" | "DONE", Array<SimpleData>>([
			["TODO", []],
			["IN PROGRESS", []],
			["DONE", []],
		]),
	);
	visibleTodo = signal<Array<SimpleData>>([]);
	todoStateThreshold = signal<Array<StateThreshold>>([]);
	currentMenu: "TODO" | "IN PROGRESS" | "DONE" = "TODO";
	currentFilter: -1 | 1 | 2 | 3 = -1; // -1 for all
	innerWidth = signal<number>(9999);

	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.innerWidth.set(window.innerWidth);
	}

	ngOnInit(): void {
		this.getTodo();
		this.innerWidth.set(window.innerWidth);

		this.dataService.getStateThreshold().subscribe((result) => {
			this.todoStateThreshold.set(result);
		});
	}

	setMenu(newMenu: "TODO" | "IN PROGRESS" | "DONE") {
		this.currentMenu = newMenu;
		this.setVisibleBasedOnFilter();
	}

	setVisibleBasedOnFilter() {
		if (this.currentFilter === -1) {
			this.visibleTodo.set(this.todoMap().get(this.currentMenu) ?? []);
		} else {
			const filteredTodos = this.todoMap()
				.get(this.currentMenu)
				?.filter((todo) => todo.requirementTypeId === this.currentFilter);
			this.visibleTodo.set(filteredTodos ?? []);
		}
	}

	sortVisibleData(input: string) {
		switch (input) {
			case "REQ_ID":
				this.visibleTodo().sort((a, b) => (a.requestId > b.requestId ? 1 : -1));
				break;

			case "STATE":
				this.visibleTodo().sort((a, b) =>
					a.stateNameId > b.stateNameId ? 1 : -1,
				);
				break;

			case "REQ_TYPE":
				this.visibleTodo().sort((a, b) =>
					a.requirementTypeId > b.requirementTypeId ? 1 : -1,
				);
				break;
		}
	}

	getTodo() {
		this.dataService.getTodoData().subscribe((data: SimpleData[]) => {
			this.todoComplete = data;
			this.todoMap().set(
				"TODO",
				this.dataService.separateTodo(this.todoComplete),
			);
			this.todoMap().set(
				"IN PROGRESS",
				this.dataService.separateInProgress(this.todoComplete),
			);
			this.todoMap().set(
				"DONE",
				this.dataService.separateDone(this.todoComplete),
			);
			// this.visibleTodo.set(this.todoMap().get("TODO") ?? []);
			this.setVisibleBasedOnFilter();
		});
	}
}

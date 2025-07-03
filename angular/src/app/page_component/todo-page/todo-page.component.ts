import { Component, HostListener, inject, signal } from "@angular/core";
import { DataProcessingService } from "../../service/data-processing.service";
import type { SimpleData, StateThreshold } from "../../model/format.type";
import { CardRequestComponent } from "../../component/card-request/card-request.component";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TodoPageService } from "../../service/todo-page.service";

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
	todoService = inject(TodoPageService);
	dataService = inject(DataProcessingService);
	// These properties are only for controlling what is visible in this component's view.
	visibleTodo = signal<Array<SimpleData>>([]);
	currentMenu: "TODO" | "IN PROGRESS" | "DONE" = "TODO";
	currentFilter: -1 | 1 | 2 | 3 = -1; // -1 for all
	innerWidth = signal<number>(window.innerWidth);

	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.innerWidth.set(window.innerWidth);
	}

	ngOnInit() {
		this.setVisibleBasedOnFilter();
	}

	// This method now reads from the service's todoMap signal.
	setMenu(newMenu: "TODO" | "IN PROGRESS" | "DONE") {
		this.currentMenu = newMenu;
		this.setVisibleBasedOnFilter();
	}

	// This method also reads from the service's todoMap signal.
	setVisibleBasedOnFilter() {
		let currentCategory =
			this.todoService.todoMap().get(this.currentMenu) ?? [];
		if (currentCategory.length === 0) {
			this.refreshData();
			currentCategory = this.todoService.todoMap().get(this.currentMenu) ?? [];
		}

		if (this.currentFilter === -1) {
			this.visibleTodo.set(currentCategory);
		} else {
			const filteredTodos = currentCategory.filter(
				(todo) => todo.requirementTypeId === this.currentFilter,
			);
			this.visibleTodo.set(filteredTodos);
		}
	}

	// The refresh method now calls the service to update the data.
	refreshData() {
		this.todoService.refreshTodoData().subscribe(() => {
			// After the data is refreshed in the service, update the local view.
			this.setVisibleBasedOnFilter();
		});
	}

	// The sorting logic remains in the component as it's a view concern.
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
}

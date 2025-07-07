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
	// Injects necessary services
	todoService = inject(TodoPageService);
	dataService = inject(DataProcessingService);

	// A signal that holds the array of request data currently visible in the UI.
	visibleTodo = signal<Array<SimpleData>>([]);
	// Tracks the currently selected menu.
	currentMenu: "TODO" | "IN PROGRESS" | "DONE" = "TODO";
	// Tracks the currently selected filter for requirement type
	// -1 = all, 1 = "FFRA", 2 = "Dataset (Penambahan Column)", 3= "Dataset Baru"
	currentFilter: -1 | 1 | 2 | 3 = -1;
	// Width of the window.
	innerWidth = signal<number>(window.innerWidth);

	// This listens for the browser's 'resize' event on the window object and updates accordingly
	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.innerWidth.set(window.innerWidth);
	}

	ngOnInit() {
		// Set the visible todos based on the default filters
		this.setVisibleBasedOnFilter();
	}

	// Sets the current menu tab and refreshes the visible data accordingly.
	setMenu(newMenu: "TODO" | "IN PROGRESS" | "DONE") {
		this.currentMenu = newMenu;
		this.setVisibleBasedOnFilter();
	}

	// Updates the `visibleTodo` signal based on the current menu and filter selections.
	setVisibleBasedOnFilter() {
		// Retrieve the appropriate category of the curren todo menu from the service's cached map.
		let currentCategory =
			this.todoService.todoMap().get(this.currentMenu) ?? [];
		// If the category is empty (e.g., on first load), trigger a data refresh.
		if (currentCategory.length === 0) {
			this.refreshData();
			// Re-attempt to get the data after the refresh.
			currentCategory = this.todoService.todoMap().get(this.currentMenu) ?? [];
		}

		// If the filter is set to "All" (-1), display the entire category.
		if (this.currentFilter === -1) {
			this.visibleTodo.set(currentCategory);
		} else {
			// Otherwise, apply the filter to the category.
			const filteredTodos = currentCategory.filter(
				(todo) => todo.requirementTypeId === this.currentFilter,
			);
			// Update the signal with the filtered list.
			this.visibleTodo.set(filteredTodos);
		}
	}

	// Triggers a data refresh by calling the todoService.
	refreshData() {
		// Call the service to fetch fresh data from the backend.
		this.todoService.refreshTodoData().subscribe(() => {
			// Then update the component's local view to reflect the latest data.
			this.setVisibleBasedOnFilter();
		});
	}

	// Sorts the currently visible list of to-dos based on user selection.
	// This is a client-side operation that only affects the view.
	sortVisibleData(input: string) {
		switch (input) {
			case "REQ_ID":
				// Sorts the array in place by request ID.
				this.visibleTodo().sort((a, b) => (a.requestId > b.requestId ? 1 : -1));
				break;
			case "STATE":
				// Sorts by the numerical state ID.
				this.visibleTodo().sort((a, b) =>
					a.stateNameId > b.stateNameId ? 1 : -1,
				);
				break;
			case "REQ_TYPE":
				// Sorts by the requirement type ID.
				this.visibleTodo().sort((a, b) =>
					a.requirementTypeId > b.requirementTypeId ? 1 : -1,
				);
				break;
		}
	}
}

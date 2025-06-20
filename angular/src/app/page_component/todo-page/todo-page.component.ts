import { Component, HostListener, inject, signal } from "@angular/core";
import { DataProcessingService } from "../../service/data-processing.service";
import type { SimpleData, StateThreshold } from "../../model/format.type";
import { CardRequestComponent } from "../../component/card-request/card-request.component";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";

@Component({
	selector: "app-todo-page",
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
	data_service = inject(DataProcessingService);
	todo_complete: Array<SimpleData> = [];
	todo_map = signal(
		new Map<"TODO" | "IN PROGRESS" | "DONE", Array<SimpleData>>([
			["TODO", []],
			["IN PROGRESS", []],
			["DONE", []],
		]),
	);
	visible_todo = signal<Array<SimpleData>>([]);
	todo_state_threshold = signal<Array<StateThreshold>>([]);
	current_menu: "TODO" | "IN PROGRESS" | "DONE" = "TODO";
	current_filter: -1 | 1 | 2 | 3 = -1; // -1 for all, 1 for TODO, 2 for IN PROGRESS, 3 for DONE
	// This is used to store the width of the inner window for responsive design
	inner_width = signal<number>(9999);

	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.inner_width.set(window.innerWidth);
	}

	ngOnInit(): void {
		this.getTodo();
		this.inner_width.set(window.innerWidth);

		this.data_service.getStateThreshold().subscribe((result) => {
			this.todo_state_threshold.set(result);
		});
	}

	setMenu(new_menu: "TODO" | "IN PROGRESS" | "DONE") {
		this.current_menu = new_menu;
		this.setVisiblebasedOnFilter();
		// this.visible_todo.set(this.todo_map().get(new_menu) ?? []);
	}

	setVisiblebasedOnFilter() {
		if (this.current_filter === -1) {
			this.visible_todo.set(this.todo_map().get(this.current_menu) ?? []);
		} else {
			const filtered_todos = this.todo_map()
				.get(this.current_menu)
				?.filter((todo) => todo.requirement_type_id === this.current_filter);
			this.visible_todo.set(filtered_todos ?? []);
		}
	}
	getTodo() {
		this.data_service.getTodoData().subscribe((data: SimpleData[]) => {
			this.todo_complete = data;
			this.todo_map().set(
				"TODO",
				this.data_service.separateTodo(this.todo_complete),
			);
			this.todo_map().set(
				"IN PROGRESS",
				this.data_service.separateInProgress(this.todo_complete),
			);
			this.todo_map().set(
				"DONE",
				this.data_service.separateDone(this.todo_complete),
			);
			this.visible_todo.set(this.todo_map().get("TODO") ?? []);
		});
	}
}

import { Component, HostListener, inject, signal } from "@angular/core";
import { DataProcessingService } from "../../service/data-processing.service";
import type { SimpleData } from "../../model/format.type";
import { CardRequestComponent } from "../../component/card-request/card-request.component";

@Component({
	selector: "app-todo-page",
	imports: [CardRequestComponent],
	templateUrl: "./todo-page.component.html",
	styleUrl: "./todo-page.component.css",
})
export class TodoPageComponent {
	data_service = inject(DataProcessingService);
	todo_complete: Array<SimpleData> = [];
	todo = signal<Array<SimpleData>>([]);
	in_progress = signal<Array<SimpleData>>([]);
	done = signal<Array<SimpleData>>([]);
	current_menu: "TODO" | "IN PROGRESS" | "DONE" = "TODO";
	inner_width = signal<number>(9999);

	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.inner_width.set(window.innerWidth);
	}

	ngOnInit(): void {
		this.getTodo();
		this.inner_width.set(window.innerWidth);
	}

	setMenu(new_menu: "TODO" | "IN PROGRESS" | "DONE") {
		this.current_menu = new_menu;
	}

	getTodo() {
		this.data_service.getTodoData().subscribe((data: SimpleData[]) => {
			this.todo_complete = data;
			this.todo.set(this.data_service.separateTodo(this.todo_complete));
			this.in_progress.set(
				this.data_service.separateInProgress(this.todo_complete),
			);
			this.done.set(this.data_service.separateDone(this.todo_complete));
		});
	}
	setTodoWarningIfAboveTreshold(
		date_ref: Date,
		threshold: number,
	): number | undefined {
		const hours = this.data_service.getTimeDifferenceInHour(date_ref);
		if (hours > threshold) return Math.floor(hours);

		return undefined;
	}
}

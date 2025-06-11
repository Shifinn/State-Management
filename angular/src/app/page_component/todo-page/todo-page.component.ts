import { Component, inject, signal } from "@angular/core";
import { DataProcessingService } from "../../service/data-processing.service";
import type { SimpleData } from "../../model/format.type";
import { RequestCardComponent } from "../../component/request-card/request-card.component";

@Component({
  selector: "app-todo-page",
  imports: [RequestCardComponent],
  templateUrl: "./todo-page.component.html",
  styleUrl: "./todo-page.component.css",
})
export class TodoPageComponent {
  dataService = inject(DataProcessingService);
  todoComplete: Array<SimpleData> = [];
  todo = signal<Array<SimpleData>>([]);
  in_progress = signal<Array<SimpleData>>([]);
  done = signal<Array<SimpleData>>([]);

  ngOnInit(): void {
    this.getTodo();
  }

  getTodo() {
    this.dataService.getTodoData().subscribe((data: SimpleData[]) => {
      this.todoComplete = data;
      this.todo.set(this.dataService.separateTodo(this.todoComplete));
      this.in_progress.set(this.dataService.separateInProgress(this.todoComplete));
      console.log(this.in_progress());
      this.done.set(this.dataService.separateDone(this.todoComplete));
      console.log(this.done());
    });
  }
}

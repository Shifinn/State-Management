import { type ComponentFixture, TestBed } from "@angular/core/testing";

import { TodoPageComponent } from "./todo-page.component";

describe("TodoPageComponent", () => {
	let component: TodoPageComponent;
	let fixture: ComponentFixture<TodoPageComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TodoPageComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(TodoPageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});

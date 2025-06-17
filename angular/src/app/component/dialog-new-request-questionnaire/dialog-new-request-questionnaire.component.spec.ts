import { type ComponentFixture, TestBed } from "@angular/core/testing";

import { DialogNewRequestQuestionnaireComponent } from "./dialog-new-request-questionnaire.component";
import { MatFormField } from "@angular/material/input";
import { MatDatepicker } from "@angular/material/datepicker";

describe("DialogNewRequestQuestionnaireComponent", () => {
	let component: DialogNewRequestQuestionnaireComponent;
	let fixture: ComponentFixture<DialogNewRequestQuestionnaireComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [
				DialogNewRequestQuestionnaireComponent,
				MatFormField,
				MatDatepicker,
			],
		}).compileComponents();

		fixture = TestBed.createComponent(DialogNewRequestQuestionnaireComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});

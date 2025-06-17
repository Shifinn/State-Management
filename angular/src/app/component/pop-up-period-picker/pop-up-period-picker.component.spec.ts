import { type ComponentFixture, TestBed } from "@angular/core/testing";

import { PopUpPeriodPickerComponent } from "./pop-up-period-picker.component";

describe("PopUpPeriodPickerComponent", () => {
	let component: PopUpPeriodPickerComponent;
	let fixture: ComponentFixture<PopUpPeriodPickerComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [PopUpPeriodPickerComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(PopUpPeriodPickerComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});

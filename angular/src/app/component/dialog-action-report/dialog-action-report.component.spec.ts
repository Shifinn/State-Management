import { type ComponentFixture, TestBed } from "@angular/core/testing";

import { DialogActionReportComponent } from "./dialog-action-report.component";

describe("DialogActionReportComponent", () => {
	let component: DialogActionReportComponent;
	let fixture: ComponentFixture<DialogActionReportComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [DialogActionReportComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(DialogActionReportComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});

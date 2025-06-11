import { type ComponentFixture, TestBed } from "@angular/core/testing";

import { DialogMoreDetailComponent } from "./dialog-more-detail.component";

describe("DialogMoreDetailComponent", () => {
	let component: DialogMoreDetailComponent;
	let fixture: ComponentFixture<DialogMoreDetailComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [DialogMoreDetailComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(DialogMoreDetailComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});

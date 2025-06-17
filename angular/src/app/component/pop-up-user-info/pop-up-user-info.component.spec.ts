import { type ComponentFixture, TestBed } from "@angular/core/testing";

import { PopUpUserInfoComponent } from "./pop-up-user-info.component";

describe("PopUpUserInfoComponent", () => {
	let component: PopUpUserInfoComponent;
	let fixture: ComponentFixture<PopUpUserInfoComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [PopUpUserInfoComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(PopUpUserInfoComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});

import { type ComponentFixture, TestBed } from "@angular/core/testing";

import { CardStateDataComponent } from "./card-state-data.component";

describe("CardStateDataComponent", () => {
	let component: CardStateDataComponent;
	let fixture: ComponentFixture<CardStateDataComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CardStateDataComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(CardStateDataComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});

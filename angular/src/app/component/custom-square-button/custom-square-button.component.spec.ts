import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomSquareButtonComponent } from './custom-square-button.component';

describe('CustomSquareButtonComponent', () => {
  let component: CustomSquareButtonComponent;
  let fixture: ComponentFixture<CustomSquareButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomSquareButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomSquareButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

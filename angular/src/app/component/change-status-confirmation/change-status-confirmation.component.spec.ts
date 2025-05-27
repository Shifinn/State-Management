import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeStatusConfirmationComponent } from './change-status-confirmation.component';

describe('ChangeStatusConfirmationComponent', () => {
  let component: ChangeStatusConfirmationComponent;
  let fixture: ComponentFixture<ChangeStatusConfirmationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangeStatusConfirmationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChangeStatusConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

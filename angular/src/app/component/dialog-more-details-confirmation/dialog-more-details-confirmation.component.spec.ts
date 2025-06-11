import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogMoreDetailsConfirmationComponent } from './dialog-more-details-confirmation.component';

describe('DialogMoreDetailsConfirmationComponent', () => {
  let component: DialogMoreDetailsConfirmationComponent;
  let fixture: ComponentFixture<DialogMoreDetailsConfirmationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogMoreDetailsConfirmationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogMoreDetailsConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

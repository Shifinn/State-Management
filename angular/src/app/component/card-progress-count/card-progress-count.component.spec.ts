import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardProgressCountComponent } from './card-progress-count.component';

describe('CardProgressCountComponent', () => {
  let component: CardProgressCountComponent;
  let fixture: ComponentFixture<CardProgressCountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardProgressCountComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardProgressCountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

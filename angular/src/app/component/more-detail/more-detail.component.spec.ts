import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoreDetailComponent } from './more-detail.component';

describe('MoreDetailComponent', () => {
  let component: MoreDetailComponent;
  let fixture: ComponentFixture<MoreDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoreDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoreDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

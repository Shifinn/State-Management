import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TodoSortAndFilterComponent } from './todo-sort-and-filter.component';

describe('TodoSortAndFilterComponent', () => {
  let component: TodoSortAndFilterComponent;
  let fixture: ComponentFixture<TodoSortAndFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodoSortAndFilterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TodoSortAndFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

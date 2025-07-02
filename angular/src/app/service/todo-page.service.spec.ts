import { TestBed } from '@angular/core/testing';

import { TodoPageService } from './todo-page.service';

describe('TodoPageService', () => {
  let service: TodoPageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TodoPageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

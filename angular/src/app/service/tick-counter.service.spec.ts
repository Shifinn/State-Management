import { TestBed } from '@angular/core/testing';

import { TickCounterService } from './tick-counter.service';

describe('TickCounterService', () => {
  let service: TickCounterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TickCounterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { PeriodPickerService } from './period-picker.service';

describe('PeriodPickerService', () => {
  let service: PeriodPickerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PeriodPickerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

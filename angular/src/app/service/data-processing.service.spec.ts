import { TestBed } from '@angular/core/testing';

import { DataProcessingService } from './data-processing.service';

describe('DataProcessingService', () => {
  let service: DataProcessingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataProcessingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { ProgressPageService } from './progress-page.service';

describe('ProgressPageService', () => {
  let service: ProgressPageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProgressPageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

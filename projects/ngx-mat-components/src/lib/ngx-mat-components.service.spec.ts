import { TestBed } from '@angular/core/testing';

import { NgxMatComponentsService } from './ngx-mat-components.service';

describe('NgxMatComponentsService', () => {
  let service: NgxMatComponentsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NgxMatComponentsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

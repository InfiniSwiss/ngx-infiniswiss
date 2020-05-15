import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxMatComponentsComponent } from './ngx-mat-components.component';

describe('NgxMatComponentsComponent', () => {
  let component: NgxMatComponentsComponent;
  let fixture: ComponentFixture<NgxMatComponentsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NgxMatComponentsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NgxMatComponentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

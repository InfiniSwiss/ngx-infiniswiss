import {FocusMonitor} from '@angular/cdk/a11y';
import {coerceBooleanProperty} from '@angular/cdk/coercion';
import {
    Component, OnInit, ChangeDetectionStrategy, ViewEncapsulation, OnDestroy, HostBinding, Input, Optional, Self, ElementRef, ViewChild
} from '@angular/core';
import {NgControl, ControlValueAccessor} from '@angular/forms';
import {MatFormFieldControl} from '@angular/material/form-field';
import {Subject} from 'rxjs';

interface PhoneInputModel {
    number: string;
    numberFormatted: string;
}

@Component({
    selector: 'ngx-phone-input',
    templateUrl: 'phone-input.html',
    styleUrls: ['phone-input.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    providers: [
        {provide: MatFormFieldControl, useExisting: PhoneInputComponent}
    ]
})
export class PhoneInputComponent implements OnInit, OnDestroy, MatFormFieldControl<PhoneInputModel>, ControlValueAccessor {
    static nextId = 0;
    readonly autofilled: boolean;
    readonly controlType: string;
    focused = false;
    @HostBinding()
    readonly id: string = `ngx-mat-phone-input-${PhoneInputComponent.nextId++}`;
    @HostBinding('attr.aria-describedby')
    describedBy = '';
    stateChanges: Subject<void> = new Subject<void>();
    private onChangeFn: any;
    private onTouched: any;

    private _disabled: boolean;

    get disabled() {
        return this._disabled;
    }

    @Input()
    set disabled(data: boolean) {
        this._disabled = data;
        this.stateChanges.next();
    }

    get empty() {
        return !this.value;
    }

    get errorState() {
        return !!this.ngControl.errors;
    }

    private _required = false;

    @Input()
    get required() {
        return this._required;
    }

    set required(req) {
        this._required = coerceBooleanProperty(req);
        this.stateChanges.next();
    }

    @HostBinding('class.floating')
    get shouldLabelFloat() {
        return this.focused || !this.empty;
    }

    private _value: PhoneInputModel;
    get value() {
        return this._value;
    }

    set value(data: PhoneInputModel | null) {
        this._value = data;
        this.stateChanges.next();
    }

    private _placeholder: string;

    get placeholder() {
        return this._placeholder;
    }

    @Input()
    set placeholder(value: string) {
        this._placeholder = value;
        this.stateChanges.next();
    }

    constructor(@Optional() @Self() public ngControl: NgControl,
                private fm: FocusMonitor,
                private elRef: ElementRef<HTMLElement>) {
        // Replace the provider from above with this.
        if (this.ngControl != null) {
            // Setting the value accessor directly (instead of using
            // the providers) to avoid running into a circular import.
            this.ngControl.valueAccessor = this;
        }
        this.fm.monitor(elRef.nativeElement, true).subscribe(origin => {
            this.focused = !!origin;
            this.stateChanges.next();
        });
    }

    writeValue(obj: PhoneInputModel): void {
        this.value = obj;
    }

    registerOnChange(fn: any): void {
        this.onChangeFn = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    setDisabledState?(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    onContainerClick(event: MouseEvent): void {
        if ((event.target as Element).tagName.toLowerCase() !== 'input') {
            this.elRef.nativeElement.querySelector('input').focus();
        }
    }

    setDescribedByIds(ids: string[]): void {
        this.describedBy = ids.join(' ');
    }

    ngOnDestroy(): void {
        this.stateChanges.complete();
    }

    ngOnInit() {
    }

    handleInputKeyUp($event: KeyboardEvent) {

    }
}

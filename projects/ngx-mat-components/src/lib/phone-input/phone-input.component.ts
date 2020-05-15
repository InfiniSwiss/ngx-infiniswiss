import {FocusMonitor} from '@angular/cdk/a11y';
import {coerceBooleanProperty} from '@angular/cdk/coercion';
import {
    Component, ChangeDetectionStrategy, ViewEncapsulation, OnDestroy, HostBinding, Input, Optional, Self, ElementRef, AfterViewInit,
    ViewChild
} from '@angular/core';
import {NgControl, ControlValueAccessor} from '@angular/forms';
import {MatFormFieldControl} from '@angular/material/form-field';
import {CountryCode, formatIncompletePhoneNumber} from 'libphonenumber-js';
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
export class PhoneInputComponent implements OnDestroy, AfterViewInit, MatFormFieldControl<string>, ControlValueAccessor {
    static nextId = 0;
    @Input()
    countryCode: CountryCode;
    // TODO fix this
    readonly autofilled: boolean;
    controlType = 'tel';
    focused = false;
    @HostBinding()
    readonly id: string = `ngx-mat-phone-input-${PhoneInputComponent.nextId++}`;
    @HostBinding('attr.aria-describedby')
    describedBy = '';
    stateChanges: Subject<void> = new Subject<void>();
    @ViewChild('inputElement')
    inputElement: ElementRef;

    get type() {
        return this.controlType;
    }

    @Input()
    set type(value: string) {
        this.controlType = value;
    }

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
        return !!this?.ngControl?.errors;
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

    private _value: PhoneInputModel = {number: '', numberFormatted: ''};

    get value() {
        return this._value;
    }

    set value(data: any) {
        this._value = {number: data, numberFormatted: formatIncompletePhoneNumber(this._value.number, this.countryCode)};
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

    private onChangeFn: any = (_: any) => {
    };

    private onTouched: any = () => {
    };

    ngAfterViewInit(): void {
        this.propagateValueToInput(this.value?.numberFormatted);
    }

    ngOnDestroy(): void {
        this.stateChanges.complete();
    }

    writeValue(obj: PhoneInputModel): void {
        this.value = obj;
        this.propagateValueToInput(this.value.numberFormatted);
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

    handleInputChange() {
        // TODO handle delete + backspace separately so we can format in reverse while deleting

        const possibleValueInsideInput = this.removeExtraCharacters(this.inputElement.nativeElement.value);
        this.value.number = this.leveOnlyPhoneChars(this.inputElement.nativeElement.value);
        this.value.numberFormatted = formatIncompletePhoneNumber(possibleValueInsideInput, this.countryCode);

        if (this.isFormattedValueDifferent(possibleValueInsideInput, this.value.numberFormatted)) {
            this.propagateValueToInput(this.value.numberFormatted);
        } else if (this.isFormattedValueDifferent(this.inputElement.nativeElement.value, possibleValueInsideInput)) {
            this.propagateValueToInput(possibleValueInsideInput);
        }
        this.onTouched();
        this.onChangeFn(this.value.number);
    }

    handleFocused() {
        this.onTouched();
        this.focused = true;
        this.stateChanges.next();
    }

    handleFocusOut() {
        this.focused = false;
        this.stateChanges.next();
    }

    private propagateValueToInput(value) {
        if (!this.inputElement) {
            return;
        }

        this.inputElement.nativeElement.value = value;
    }

    private leveOnlyPhoneChars(value: string) {
        // Leave only phone number chars
        const replacer = /\+|\*|\#|\d+/gi;
        const valuesList = value.match(replacer) ?? [];
        return valuesList.join('');
    }

    private removeExtraCharacters(value: any) {
        // Leave only chars which might be inserted by the formatter
        const replacer = /\+|\*|\#|-|\(|\)| |\d+/gi;
        const valuesList = value.match(replacer) ?? [];
        return valuesList.join('').trim();
    }

    private isFormattedValueDifferent(possibleValueInsideInput: string, numberFormatted: string) {
        const response = this.diffStrings(possibleValueInsideInput, numberFormatted);
        if (!response.onlyFormattingCharactersFound) {
            return true;
        }
        if (response.leftDifferentChars.length === 0 && response.rightDifferentChars.length === 0) {
            return false;
        }

        if (response.rightDifferentChars.length === 1 && this.isFormattingCharacter(response.rightDifferentChars[0])) {
            return false;
        }

        return true;
    }

    private isFormattingCharacter(char: string) {
        return (
            char === ')' ||
            char === '(' ||
            char === '-' ||
            char === ' '
        );
    }

    private diffStrings(leftValue: string, rightValue: string) {
        const leftDifferentChars = [];
        const rightDifferentChars = [];
        const maxLength = Math.max(leftValue.length, rightValue.length);

        for (let i = maxLength - 1; i >= 0; i--) {
            if (i >= leftValue.length) {
                if (!this.isFormattingCharacter(rightValue[i])) {
                    return {
                        leftDifferentChars,
                        rightDifferentChars,
                        onlyFormattingCharactersFound: false
                    };
                }
                rightDifferentChars.push(rightValue[i]);
            } else if (i >= rightValue.length) {
                if (!this.isFormattingCharacter(leftValue[i])) {
                    return {
                        leftDifferentChars,
                        rightDifferentChars,
                        onlyFormattingCharactersFound: false
                    };
                }
                leftDifferentChars.push(leftValue[i]);
            } else if (leftValue[i] !== rightValue[i]) {
                if (!this.isFormattingCharacter(leftValue[i]) ||
                    !this.isFormattingCharacter(rightValue[i])) {
                    return {
                        leftDifferentChars,
                        rightDifferentChars,
                        onlyFormattingCharactersFound: false
                    };
                }

                rightDifferentChars.push(rightValue[i]);
                leftDifferentChars.push(leftValue[i]);
            }
        }

        return {
            leftDifferentChars,
            rightDifferentChars,
            onlyFormattingCharactersFound: true
        };
    }
}

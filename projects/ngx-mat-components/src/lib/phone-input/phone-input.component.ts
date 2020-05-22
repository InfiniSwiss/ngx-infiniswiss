import {FocusMonitor} from '@angular/cdk/a11y';
import {coerceBooleanProperty} from '@angular/cdk/coercion';
import {Platform} from '@angular/cdk/platform';
import {AutofillMonitor} from '@angular/cdk/text-field';
import {
    Component, ChangeDetectionStrategy, ViewEncapsulation, OnDestroy, HostBinding, Input, Optional, Self, ElementRef, AfterViewInit,
    ViewChild, NgZone, OnChanges, SimpleChanges, DoCheck, Inject
} from '@angular/core';
import {NgControl, ControlValueAccessor, FormGroupDirective, NgForm} from '@angular/forms';
import {ErrorStateMatcher, CanUpdateErrorStateCtor, mixinErrorState, CanUpdateErrorState} from '@angular/material/core';
import {MatFormFieldControl} from '@angular/material/form-field';
import {MAT_INPUT_VALUE_ACCESSOR} from '@angular/material/input';
import {CountryCode, formatIncompletePhoneNumber} from 'libphonenumber-js';
import {Subject} from 'rxjs';

interface PhoneInputModel {
    number: string;
    numberFormatted: string;
}

let nextId = 0;

// Boilerplate for applying mixins to MatInput.
/** @docs-private */
class PhoneInputBase {
    constructor(public _defaultErrorStateMatcher: ErrorStateMatcher,
                public _parentForm: NgForm,
                public _parentFormGroup: FormGroupDirective,
                /** @docs-private */
                public ngControl: NgControl) {
    }
}

const _MatInputMixinBase: CanUpdateErrorStateCtor & typeof PhoneInputBase = mixinErrorState(PhoneInputBase);

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
export class PhoneInputComponent extends _MatInputMixinBase implements OnDestroy,
    OnChanges,
    DoCheck,
    AfterViewInit,
    MatFormFieldControl<string>,
    ControlValueAccessor,
    CanUpdateErrorState {
    /**
     * Implemented as part of MatFormFieldControl.
     */
    @HostBinding()
    public readonly id: string = `ngx-mat-phone-input-${nextId++}`;

    /**
     * Implemented as part of MatFormFieldControl.
     */
    public autofilled = false;

    /**
     * Implemented as part of MatFormFieldControl.
     */
    public focused = false;

    /**
     * Implemented as part of MatFormFieldControl.
     */
    private _previousNativeValue: string;
    /**
     * Implemented as part of MatFormFieldControl.
     */
    private _disabled: boolean;
    public get disabled() {
        if (this.ngControl && this.ngControl.disabled !== null) {
            return this.ngControl.disabled;
        }
        return this._disabled;
    }

    @Input()
    public set disabled(isDisabled: boolean) {
        this.setDisabledState(isDisabled);
    }

    /**
     * Implemented as part of MatFormFieldControl.
     */
    public get shouldLabelFloat(): boolean {
        return this.focused || !this.empty;
    }

    /**
     * Implemented as part phone number input handling.
     */
    public get empty() {
        return !this.value.numberFormatted && !this.autofilled;
    }

    /**
     * Implemented as part of MatFormFieldControl.
     */
    public describedBy = '';

    protected _required = false;

    /**
     * Implemented as part of MatFormFieldControl.
     * @docs-private
     */
    @Input()
    public get required(): boolean {
        return this._required;
    }

    public set required(value: boolean) {
        this._required = coerceBooleanProperty(value);
    }

    private _readonly = false;

    /** Whether the element is readonly. */
    @Input()
    get readonly(): boolean {
        return this._readonly;
    }

    set readonly(value: boolean) {
        this._readonly = coerceBooleanProperty(value);
    }

    public _isServer: boolean;

    /**
     * Implemented as part of MatFormFieldControl.
     */
    public readonly stateChanges: Subject<void> = new Subject<void>();

    /**
     * Implemented as part phone number handling.
     */
    @Input()
    public countryCode: CountryCode;

    /**
     * Implemented as part phone number input handling.
     */
    @Input()
    public controlType: string;

    /**
     * Implemented as part phone number input handling.
     */
    @ViewChild('inputElement')
    public readonly _elementRef: ElementRef;

    /**
     * Implemented as part of MatFormFieldControl. and PhoneHandling
     */
    private _value: PhoneInputModel = {number: '', numberFormatted: ''};
    get value() {
        return this._value;
    }

    set value(data: any) {
        if (typeof data === 'string' && data !== this._value.number) {
            this._value = {number: data, numberFormatted: this.formatPhoneNumber(data)};
            this.stateChanges.next();
        }
    }

    /**
     * Implemented as part of MatFormFieldControl.
     */
    @Input() placeholder: string;

    constructor(
        _defaultErrorStateMatcher: ErrorStateMatcher,
        @Optional() @Self() ngControl: NgControl,
        @Optional() _parentForm: NgForm,
        @Optional() _parentFormGroup: FormGroupDirective,
        @Optional() @Self() @Inject(MAT_INPUT_VALUE_ACCESSOR) inputValueAccessor: any,
        public _platform: Platform,
        public  ngZone: NgZone,
        public  _autofillMonitor: AutofillMonitor,
        public  fm: FocusMonitor,
        public hostElementRef: ElementRef<HTMLElement>) {
        super(_defaultErrorStateMatcher, _parentForm, _parentFormGroup, ngControl);

        this.id = this.id;

        this._previousNativeValue = this.value.numberFormatted;
        // Replace the provider from above with this.
        if (this.ngControl != null) {
            // Setting the value accessor directly (instead of using
            // the providers) to avoid running into a circular import.
            this.ngControl.valueAccessor = this;
        }
        this.fm.monitor(this.hostElementRef.nativeElement, true).subscribe(() => {
            this.handleFocusChanged(true);
        });

        this._isServer = !this._platform.isBrowser;
    }

    ngDoCheck(): void {
        if (this.ngControl) {
            // We need to re-evaluate this on every change detection cycle, because there are some
            // error triggers that we can't subscribe to (e.g. parent form submissions). This means
            // that whatever logic is in here has to be super lean or we risk destroying the performance.
            this.updateErrorState();
        }

        // We need to dirty-check the native element's value, because there are some cases where
        // we won't be notified when it changes (e.g. the consumer isn't using forms or they're
        // updating the value using `emitEvent: false`).
        this._dirtyCheckNativeValue();
    }

    public ngOnChanges(changes: SimpleChanges): void {
        this.stateChanges.next();
    }

    private _dirtyCheckNativeValue() {
        if (this._previousNativeValue !== this.value.numberFormatted) {
            this._previousNativeValue = this.value.numberFormatted;
            this.stateChanges.next();
        }
    }

    ngAfterViewInit(): void {
        this.propagateValueToInput(this.value?.numberFormatted);
        // On some versions of iOS the caret gets stuck in the wrong place when holding down the delete
        // key. In order to get around this we need to "jiggle" the caret loose. Since this bug only
        // exists on iOS, we only bother to install the listener on iOS.
        if (this._platform.IOS) {
            this.ngZone.runOutsideAngular(() => {
                this._elementRef.nativeElement.addEventListener('keyup', (event: Event) => {
                    const el = event.target as HTMLInputElement;
                    if (!el.value && !el.selectionStart && !el.selectionEnd) {
                        // Note: Just setting `0, 0` doesn't fix the issue. Setting
                        // `1, 1` fixes it for the first time that you controlType text and
                        // then hold delete. Toggling to `1, 1` and then back to
                        // `0, 0` seems to completely fix it.
                        el.setSelectionRange(1, 1);
                        el.setSelectionRange(0, 0);
                    }
                });
            });
        }
        if (this._platform.isBrowser) {
            this._autofillMonitor.monitor(this._elementRef.nativeElement).subscribe(event => {
                this.autofilled = event.isAutofilled;
                this.stateChanges.next();
            });
        }
    }

    ngOnDestroy(): void {
        this.stateChanges.complete();

        if (this._platform.isBrowser) {
            this._autofillMonitor.stopMonitoring(this._elementRef.nativeElement);
        }
    }

    /**
     * Implemented as part of ControlValueAccessor.
     */
    private onChangeFn(_: any) {
    }

    /**
     * Implemented as part of ControlValueAccessor.
     */
    private onTouched() {
    }

    /**
     * Implemented as part of ControlValueAccessor.
     */
    writeValue(obj: PhoneInputModel): void {
        this.value = obj;
        this.propagateValueToInput(this.value.numberFormatted);
    }

    /**
     * Implemented as part of ControlValueAccessor.
     */
    registerOnChange(fn: any): void {
        this.onChangeFn = fn;
    }

    /**
     * Implemented as part of ControlValueAccessor.
     */
    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    /**
     * Implemented as part of ControlValueAccessor.
     */
    setDisabledState?(isDisabled: boolean): void {
        this._disabled = isDisabled;
        // Browsers may not fire the blur event if the input is disabled too quickly.
        // Reset from here to ensure that the element doesn't become stuck.
        if (this.focused) {
            this.focused = false;
            this.stateChanges.next();
        }
    }

    /**
     * Implemented as part of MatFormFieldControl.
     */
    onContainerClick(event: MouseEvent): void {
        // Do not re-focus the input element if the element is already focused. Otherwise it can happen
        // that someone clicks on a time input and the cursor resets to the "hours" field while the
        // "minutes" field was actually clicked. See: https://github.com/angular/components/issues/12849
        if (!this.focused && this._elementRef) {
            this.focused = true;
            this._elementRef?.nativeElement?.focus();
        }
    }

    /**
     * Implemented as part of MatFormFieldControl.
     */
    setDescribedByIds(ids: string[]): void {
        this.describedBy = ids.join(' ');
    }

    handleFocusChanged(isFocused: boolean) {
        // On focus out try to format one more time
        if (!isFocused) {
            this.updateValueAndFormatInput();
        }
        if (isFocused !== this.focused && (!this.readonly || !isFocused)) {
            this.onTouched();
            this.focused = isFocused;
            this.stateChanges.next();
        }
    }

    updateValueAndFormatInput() {
        this.tryToFillWithFormattedValue();
        this.onTouched();
        this.onChangeFn(this.value.number);
    }

    private propagateValueToInput(value) {
        if (!this._elementRef) {
            return;
        }

        this._elementRef.nativeElement.value = value;
    }

    private clearInvalidCharacters(value: string) {
        const isPlusOnFirstPosition = value[0] === '+';
        const validCharsRegex = /\#|\*|\d/gi;
        const newValue = value.match(validCharsRegex) ?? [];
        return isPlusOnFirstPosition ? `+${newValue.join('')}` : newValue.join('');
    }

    private isFormattingCharacter(char: string) {
        return (
            char === ')' ||
            char === '(' ||
            char === '-' ||
            char === ' '
        );
    }

    private tryToFillWithFormattedValue() {
        const currentInputValue = this._elementRef.nativeElement.value === undefined || this._elementRef.nativeElement.value == null
            ? ''
            : this._elementRef.nativeElement.value.toString();
        this.value.number = this.clearInvalidCharacters(currentInputValue);
        this.value.numberFormatted = this.formatPhoneNumber(this.value.number);

        const hasAllowedCharactersButInvalidForFormatting = /\#|\*/.test(currentInputValue);
        if (hasAllowedCharactersButInvalidForFormatting) {
            // In this case user inserted # | * which is valid in some cases but the formatter will remove it
            this.value.numberFormatted = this.value.number;
            this.setValueAndRememberCursorPosition(currentInputValue, this.value.numberFormatted);
            return;
        }

        const wasNumberFormatted = /\(|\)|-| /.test(this.value.numberFormatted);
        const inputContainsFormatting = /\(|\)|-| /.test(currentInputValue);
        if (!wasNumberFormatted && inputContainsFormatting) {
            // Is this case the number was formatted before but not it shouldn't be cause it doesn't match the format
            this.resetInputFormatting(currentInputValue);
            return;
        }

        // Happy case user writes and we format in the same time so we need to replace the number but keep cursor position
        this.setValueAndRememberCursorPosition(currentInputValue, this.value.numberFormatted);
    }

    private resetInputFormatting(currentInputValue) {
        let {selectionStart, selectionEnd} = this.getInputSelection();
        const initialSelectionStart = selectionStart;
        const initialSelectionEnd = selectionEnd;
        for (let i = 0; i < currentInputValue.length; i++) {
            const isFormattingChar = this.isFormattingCharacter(currentInputValue[i]);
            if (isFormattingChar && initialSelectionStart >= i) {
                selectionStart--;
                selectionEnd--;
            } else if (isFormattingChar && initialSelectionEnd >= i) {
                selectionEnd--;
            }
        }

        this.setInputValue(this.value.number, selectionStart, selectionEnd);
    }

    private setValueAndRememberCursorPosition(inputCurrentValue: string, valueToSet: string) {
        let {selectionStart, selectionEnd} = this.getInputSelection();
        const initialSelectionEnd = selectionEnd;
        let inputIndex = 0;
        let valueToSetIndex = 0;
        // Go from start to end of selection
        while (inputIndex < initialSelectionEnd) {
            const charToCheck = inputCurrentValue[inputIndex];
            const shouldUpdateSelectionIndexes = charToCheck !== valueToSet[valueToSetIndex];
            // Check if we dont need to compute a new selection index and update the other iterator index if not
            if (!shouldUpdateSelectionIndexes) {
                valueToSetIndex++;
            } else if (valueToSetIndex < valueToSet.length) {
                // Compute a new selection index by finding the next value which is the same
                let j = valueToSetIndex;
                let possibleNextStart = selectionStart;
                let possibleNextEnd = selectionEnd;

                while (j < valueToSet.length && valueToSet[j] !== charToCheck) {
                    if (j <= possibleNextStart) {
                        possibleNextStart++;
                    }
                    if (j <= possibleNextEnd) {
                        possibleNextEnd++;
                    }
                    j++;
                }
                // Char was found
                if (valueToSet[j] === charToCheck) {
                    selectionStart = possibleNextStart;
                    selectionEnd = possibleNextEnd;
                    // We are on the last index which was already checked
                    valueToSetIndex = j + 1;
                } else {
                    selectionStart--;
                    selectionEnd--;
                }
            }
            inputIndex++;
        }

        this.setInputValue(valueToSet, selectionStart, selectionEnd);
    }

    private getInputSelection() {
        let selectionStart: number = this._elementRef.nativeElement.selectionStart;
        let selectionEnd: number = this._elementRef.nativeElement.selectionStart;
        selectionStart = Math.min(selectionStart, selectionEnd);
        selectionEnd = Math.max(selectionStart, selectionEnd);
        return {selectionStart, selectionEnd};
    }

    private setInputValue(valueToSet: string, selectionStart: number, selectionEnd: number) {
        selectionStart = Math.min(valueToSet.length, selectionStart);
        selectionEnd = Math.min(valueToSet.length, selectionEnd);
        this._elementRef.nativeElement.value = valueToSet;
        this._elementRef.nativeElement.setSelectionRange(selectionStart, selectionEnd, 'forward');
    }

    private formatPhoneNumber(value: string) {
        return formatIncompletePhoneNumber(value, this.countryCode);
    }
}

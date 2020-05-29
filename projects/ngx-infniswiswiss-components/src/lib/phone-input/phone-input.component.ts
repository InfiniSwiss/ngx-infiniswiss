import {FocusMonitor} from '@angular/cdk/a11y';
import {coerceBooleanProperty} from '@angular/cdk/coercion';
import {Platform} from '@angular/cdk/platform';
import {AutofillMonitor} from '@angular/cdk/text-field';
import {isDefined} from '@angular/compiler/src/util';
import {
    Component, ChangeDetectionStrategy, ViewEncapsulation, OnDestroy, HostBinding, Input, Optional, Self, ElementRef, AfterViewInit,
    ViewChild, NgZone, OnChanges, SimpleChanges, DoCheck, Inject
} from '@angular/core';
import {NgControl, ControlValueAccessor, FormGroupDirective, NgForm} from '@angular/forms';
import {ErrorStateMatcher, CanUpdateErrorStateCtor, mixinErrorState, CanUpdateErrorState} from '@angular/material/core';
import {MatFormFieldControl} from '@angular/material/form-field';
import {MAT_INPUT_VALUE_ACCESSOR} from '@angular/material/input';
import {CountryCode} from 'libphonenumber-js';
import {Subject, BehaviorSubject, Subscription} from 'rxjs';
import {filter, debounceTime, takeUntil} from 'rxjs/operators';
import {convertToString} from '../util/convert-to-string';
import {isChanged} from '../util/is-changed';
import {PhoneInputFillService} from './phone-input-fill.service';
import {PhoneNumberInternationalPrefixComponent} from './phone-number-international-prefix.component';
import {CountryModel} from './phone-tokens';

interface PhoneInputModel {
    number: string;
    numberFormatted: string;
}

interface PhoneInternalValueChange {
    number: string;
    countryCode: CountryCode;
    countriesList: CountryModel[];
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

    private prefixProviderSubscription: Subscription;

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
        return !this.internalValue.numberFormatted && !this.autofilled;
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

    @Input()
    public prefixProvider: PhoneNumberInternationalPrefixComponent;
    /**
     * Implemented as part phone number handling.
     */
    // @Input()
    // public internationalPrefixEnabled: boolean;

    // /**
    //  * Implemented as part phone number handling.
    //  */
    // @Input()
    // public internationalPrefixCountries: CountryModel[] = DEFAULT_COUNTRY_LIST;
    //
    /**
     * Implemented as part phone number handling.
     */
    private internationalPrefix: string;

    /**
     * Implemented as part phone number input handling.
     */
    private lastPressedKey: string;

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

    @Input()
    set value(data: any) {
        this.writeValue(data);
    }

    /**
     * Implemented as part of MatFormFieldControl. and PhoneHandling
     */
    private setInternalDataAndUpdateInput$: BehaviorSubject<PhoneInternalValueChange> = new BehaviorSubject<PhoneInternalValueChange>(null);
    public internalValue: PhoneInputModel = {number: '', numberFormatted: ''};

    /**
     * Implemented as part of MatFormFieldControl.
     */
    @Input() placeholder: string;

    private onDestroy = new Subject();

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
        public hostElementRef: ElementRef<HTMLElement>,
        public phoneInputFillService: PhoneInputFillService) {
        super(_defaultErrorStateMatcher, _parentForm, _parentFormGroup, ngControl);

        this.id = this.id;

        this._previousNativeValue = this.internalValue.numberFormatted;
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

        this.setInternalDataAndUpdateInput$.pipe(
            filter(v => v && isDefined(v.countryCode)),
            debounceTime(0),
            takeUntil(this.onDestroy)
        ).subscribe(data => {
            this.countryCode = data.countryCode;
            if (this.prefixProvider && this.prefixProvider.countryCode !== this.countryCode) {
                this.prefixProvider.countryCode = this.countryCode;
                this.prefixProvider.updateSelectedCountryCode();
            }
            if (this.prefixProvider && isDefined(data.countryCode) && isDefined(this.prefixProvider.countriesList)) {
                const country = data.countriesList.find(c => c.code === data.countryCode);
                this.internationalPrefix = convertToString(country?.phoneNumberCode);
                data.number = convertToString(data.number);
                data.number = data.number.substring(this.internationalPrefix.length, data.number.length);
            }
            this.internalValue = this.phoneInputFillService.formatPhoneNumber(data.number, data.countryCode, this.internationalPrefix);
            if (this._elementRef) {
                this.propagateValueToInput(this.internalValue.numberFormatted);
            }
        });
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
        if (isChanged(changes.countryCode)) {
            this.updateInternalValueWithoutTriggeringChanges({
                countryCode: this.countryCode
            });
        }
        if (isChanged(changes.prefixProvider) && this.prefixProvider) {
            this.updateInternalValueWithoutTriggeringChanges({
                countriesList: this.prefixProvider.countriesList
            });
            this.prefixProviderSubscription?.unsubscribe();
            this.prefixProviderSubscription = this.prefixProvider.countryCodeChange
                .subscribe($ev => {
                    this.handleCountryCodeChange($ev);
                });
        }
        this.stateChanges.next();
    }

    private _dirtyCheckNativeValue() {
        if (this._previousNativeValue !== this.internalValue.numberFormatted) {
            this._previousNativeValue = this.internalValue.numberFormatted;
            this.stateChanges.next();
        }
    }

    ngAfterViewInit(): void {
        // Notify input initialized
        this.updateInternalValueWithoutTriggeringChanges({});
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
        this.prefixProviderSubscription?.unsubscribe();
        this.onDestroy.next();
        this.onDestroy.complete();

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
    writeValue(obj: string): void {
        this.updateInternalValueWithoutTriggeringChanges({
            number: obj
        });
    }

    private updateInternalValueWithoutTriggeringChanges(data: Partial<PhoneInternalValueChange>) {
        const current: PhoneInternalValueChange = this.setInternalDataAndUpdateInput$.getValue() ?? {} as PhoneInternalValueChange;
        this.setInternalDataAndUpdateInput$.next({
            ...current,
            ...data
        });
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
        if (this._elementRef) {
            const inputValue = this.phoneInputFillService.setFormattingAndUpdateInput(this._elementRef, this.countryCode, this.internationalPrefix, this.lastPressedKey);
            this.internalValue.number = inputValue.number;
            this.internalValue.numberFormatted = inputValue.numberFormatted;
        }
        this.onTouched();
        this.onChangeFn(this.internalValue.number);
    }

    handleCountryCodeChange($event: CountryCode) {
        const selectedCountry = this.prefixProvider.countriesList.find(c => c.code === $event);
        let phoneNumberValue = this.internalValue.number;
        // Remove old prefix if it was set
        if (this.internationalPrefix && this.internalValue.number.startsWith(this.internationalPrefix)) {
            phoneNumberValue = phoneNumberValue.substring(this.internationalPrefix.length, phoneNumberValue.length);
        }
        this.internationalPrefix = convertToString(selectedCountry?.phoneNumberCode);
        const isPhoneAlreadyStartingWithPrefix = phoneNumberValue.startsWith(this.internationalPrefix);
        if (!isPhoneAlreadyStartingWithPrefix && phoneNumberValue.startsWith('+')) {
            // Remove leading + cause it's part of the prefix
            phoneNumberValue = this.internationalPrefix + phoneNumberValue.substring(1, phoneNumberValue.length);
        } else if (!isPhoneAlreadyStartingWithPrefix && phoneNumberValue.length) {
            phoneNumberValue = this.internationalPrefix + phoneNumberValue;
        }
        this.updateInternalValueWithoutTriggeringChanges({
            number: phoneNumberValue,
            countryCode: $event
        });
        this.onTouched();
        this.onChangeFn(phoneNumberValue);
    }

    updateLastKeyDown($event: KeyboardEvent) {
        this.lastPressedKey = $event.key;
    }

    private propagateValueToInput(value) {
        if (!this._elementRef) {
            return;
        }

        this._elementRef.nativeElement.value = value;
    }
}

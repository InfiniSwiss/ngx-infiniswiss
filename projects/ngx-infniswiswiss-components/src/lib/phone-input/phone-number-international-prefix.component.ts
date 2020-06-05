import {
    Component, ChangeDetectionStrategy, ViewEncapsulation, Input, OnChanges, SimpleChanges, forwardRef, Output, EventEmitter,
    ChangeDetectorRef, ViewChild, ElementRef, NgZone
} from '@angular/core';
import {FormControl, ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {MatMenuTrigger} from '@angular/material/menu';
import {CountryCode} from 'libphonenumber-js';
import {BehaviorSubject, Observable, combineLatest} from 'rxjs';
import {startWith, map, distinctUntilChanged} from 'rxjs/operators';
import {convertToString} from '../util/convert-to-string';
import {isChangedAndHasValue} from '../util/is-changed';
import {DEFAULT_COUNTRY_LIST} from './metadata/phone-numbers-by-country';
import {CountryModel, PhoneInputPrefixProvider, PrefixProviderState} from './phone-tokens';

const DEFAULT_COUNTRY_CODE_VALUE = {
    phoneNumberCode: '',
    code: '' as CountryCode,
    flagClass: '',
    name: ''
};

@Component({
    selector: 'ngx-phone-number-international-prefix',
    templateUrl: 'phone-number-international-prefix.html',
    styleUrls: ['phone-number-international-prefix.scss'],
    exportAs: 'ngxPhoneNumberInternationalPrefix',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => PhoneNumberInternationalPrefixComponent),
            multi: true
        }
    ]
})

export class PhoneNumberInternationalPrefixComponent implements OnChanges, PhoneInputPrefixProvider, ControlValueAccessor {
    @Input()
    public searchPlaceholder: string = 'Search';
    @Input()
    public countriesList = DEFAULT_COUNTRY_LIST;
    @Input()
    public countryCode: CountryCode;
    @Input()
    public disabled: boolean;
    @Output()
    countryCodeChange: EventEmitter<CountryCode> = new EventEmitter<CountryCode>();
    @ViewChild(MatMenuTrigger) trigger: MatMenuTrigger;
    @ViewChild('searchRef', {read: ElementRef}) searchInput: ElementRef;
    @ViewChild('menuTriggerElement', {read: ElementRef}) menuTriggerElement: ElementRef;
    public searchControl = new FormControl('');
    public readonly visibleCountries$: Observable<{ countries: CountryModel[] }>;
    private readonly _prefixProviderState: BehaviorSubject<PrefixProviderState>;
    public isMenuOpened: boolean;

    public get prefixProviderState() {
        return this._prefixProviderState.asObservable();
    }

    constructor(private cdRef: ChangeDetectorRef, private ngZone: NgZone) {
        this._prefixProviderState = new BehaviorSubject<PrefixProviderState>({
            selectedCode: null,
            countries: this.mapCountriesList(),
            selected: DEFAULT_COUNTRY_CODE_VALUE,
            isUserChange: false
        });

        this.visibleCountries$ = combineLatest([
            this.searchControl.valueChanges.pipe(startWith(this.searchControl.value)),
            this._prefixProviderState.pipe(map(c => c.countries), distinctUntilChanged())
        ]).pipe(
            map(([searchQuery, countries]) => {
                if (!searchQuery) {
                    return {countries};
                }
                searchQuery = convertToString(searchQuery).toLocaleLowerCase();
                const filtered = countries.filter(c => {
                    return c.name.toLocaleLowerCase().includes(searchQuery);
                });
                return {countries: filtered};
            })
        );
    }

    writeValue(obj: CountryCode): void {
        const selectedCountry = this._prefixProviderState.getValue().countries.find(c => c.code === obj)
            ?? DEFAULT_COUNTRY_CODE_VALUE;
        this.updateState({
            selectedCode: obj,
            isUserChange: false,
            selected: selectedCountry
        });
    }

    private updateState(obje: Partial<PrefixProviderState>) {
        this._prefixProviderState.next({
            ...this._prefixProviderState.getValue(),
            ...obje
        });
    }

    registerOnChange(fn: any): void {
        this.onChangeFn = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    setDisabledState?(isDisabled: boolean): void {
        this.disabled = isDisabled;
        this.cdRef.markForCheck();
    }

    ngOnChanges(changes: SimpleChanges): void {
        const stateChanges: Partial<PrefixProviderState> = this._prefixProviderState.getValue();
        stateChanges.isUserChange = false;
        let isStateChanged = false;

        if (isChangedAndHasValue(changes.countriesList)) {
            stateChanges.countries = this.mapCountriesList();
            stateChanges.selected = stateChanges.countries.find(c => c.code === stateChanges.selectedCode)
                ?? DEFAULT_COUNTRY_CODE_VALUE;
            isStateChanged = true;
        }

        if (isChangedAndHasValue(changes.countryCode)) {
            stateChanges.selectedCode = this.countryCode;
            stateChanges.selected = stateChanges.countries.find(c => c.code === stateChanges.selectedCode)
                ?? DEFAULT_COUNTRY_CODE_VALUE;
            isStateChanged = true;
        }
        if (isStateChanged) {
            this.updateState(stateChanges);
        }
    }

    private mapCountriesList() {
        return this.countriesList.map(
            c => ({...c, flagClass: `iti__${c.code.toLocaleLowerCase()}`})
        );
    }

    handleSelectCountry(c: CountryModel) {
        if (this.disabled) {
            return;
        }
        this.updateState({
            selectedCode: c.code,
            selected: c,
            isUserChange: true
        });
        this.onChangeFn(c.code);
        this.onTouched();
        this.countryCodeChange.emit(c.code);

        if (this.trigger) {
            this.trigger.closeMenu();
        }
    }

    public handleMenuOpened() {
        this.isMenuOpened = true;
    }

    public handleMenuClosed() {
        this.isMenuOpened = false;
        this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
                if (!this.disabled && !this.isMenuOpened && this.menuTriggerElement) {
                    this.menuTriggerElement.nativeElement.focus();
                }
            });
        });
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
}

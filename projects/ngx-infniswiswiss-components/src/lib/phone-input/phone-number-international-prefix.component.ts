import {Component, ChangeDetectionStrategy, ViewEncapsulation, Input, Output, EventEmitter, OnChanges, SimpleChanges} from '@angular/core';
import {FormControl} from '@angular/forms';
import {CountryCode} from 'libphonenumber-js';
import {BehaviorSubject, Observable} from 'rxjs';
import {filter, switchMap, startWith, map} from 'rxjs/operators';
import {isChangedAndHasValue} from '../util/is-changed';
import {DEFAULT_COUNTRY_LIST} from './metadata/phone-numbers-by-country';
import {CountryModel, PhoneInputPrefixProvider} from './phone-tokens';

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
    encapsulation: ViewEncapsulation.None
})

export class PhoneNumberInternationalPrefixComponent implements OnChanges, PhoneInputPrefixProvider {
    @Input()
    searchPlaceholder: string = 'Search';
    @Input()
    countriesList = DEFAULT_COUNTRY_LIST;
    @Input()
    disabled: boolean;
    @Input()
    countryCode: CountryCode;
    @Output()
    countryCodeChange: EventEmitter<CountryCode> = new EventEmitter<CountryCode>();
    searchControl = new FormControl('');
    public visibleCountries$: Observable<CountryModel[]>;
    private _visibleCountries$ = new BehaviorSubject<CountryModel[]>([]);
    private internalCountries: CountryModel[];
    private readonly selectedCountry: BehaviorSubject<CountryModel> = new BehaviorSubject<CountryModel>(DEFAULT_COUNTRY_CODE_VALUE);

    constructor() {
        this.updateInternalCountries();
        this.visibleCountries$ = this._visibleCountries$.pipe(
            switchMap((countries => {
                return this.searchControl.valueChanges.pipe(
                    startWith(this.searchControl.value),
                    map(search => ({search: search.toLocaleLowerCase(), countries}))
                );
            })),
            map(data => {
                if (!data.search) {
                    return data.countries;
                }
                return data.countries.filter(c => c.name.toLocaleLowerCase().includes(data.search));
            })
        );
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (isChangedAndHasValue(changes.countriesList)) {
            this.updateInternalCountries();
        }
        if (isChangedAndHasValue(changes.countriesList) && isChangedAndHasValue(changes.countryCode)) {
            this.updateSelectedCountryCode();
        }
    }

    private updateInternalCountries() {
        this.internalCountries = this.countriesList.map(
            c => ({...c, flagClass: `iti__${c.code.toLocaleLowerCase()}`})
        );
        this._visibleCountries$.next(this.internalCountries);
    }

    public get countryValue() {
        return this.selectedCountry.pipe(filter(v => v !== null));
    }

    handleSelectCountry(c: CountryModel) {
        this.selectedCountry.next(c);
        this.countryCodeChange.emit(c.code);
    }

    public updateSelectedCountryCode() {
        if (!this.internalCountries || !this.countryCode) {
            return;
        }
        const country = this.internalCountries.find(el => el.code === this.countryCode);
        this.selectedCountry.next(country ?? DEFAULT_COUNTRY_CODE_VALUE);
    }
}

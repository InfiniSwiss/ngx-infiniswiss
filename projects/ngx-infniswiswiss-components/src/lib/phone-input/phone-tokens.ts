import {InjectionToken, EventEmitter} from '@angular/core';
import {CountryCode} from 'libphonenumber-js';
import {Observable} from 'rxjs';

export interface CountryModel {
    name: string;
    code: CountryCode;
    flagClass?: string;
    phoneNumberCode: string;
}
export const NGX_PHONE_COUNTRY_CODES = new InjectionToken<CountryModel[]>('NGX_PHONE_COUNTRY_CODES');


export interface PrefixProviderState {
    isUserChange: boolean;
    selectedCode: CountryCode;
    selected: CountryModel;
    countries: CountryModel[];
}

export interface PhoneInputPrefixProvider {
    prefixProviderState: Observable<PrefixProviderState>;
}

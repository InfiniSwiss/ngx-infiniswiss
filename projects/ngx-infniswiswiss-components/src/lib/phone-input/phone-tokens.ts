import {InjectionToken, EventEmitter} from '@angular/core';
import {CountryCode} from 'libphonenumber-js';

export interface CountryModel {
    name: string;
    code: CountryCode;
    flagClass?: string;
    phoneNumberCode: string;
}
export const NGX_PHONE_COUNTRY_CODES = new InjectionToken<CountryModel[]>('NGX_PHONE_COUNTRY_CODES');


export interface PhoneInputPrefixProvider {
    countryCode: CountryCode;
    countriesList: CountryModel[];
    countryCodeChange: EventEmitter<CountryCode>;
    updateSelectedCountryCode();
}

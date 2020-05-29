import {InjectionToken} from '@angular/core';
import {CountryCode} from 'libphonenumber-js';

export interface CountryModel {
    name: string;
    code: CountryCode;
    flagClass?: string;
    phoneNumberCode: string;
}
export const NGX_PHONE_COUNTRY_CODES = new InjectionToken<CountryModel[]>('NGX_PHONE_COUNTRY_CODES');

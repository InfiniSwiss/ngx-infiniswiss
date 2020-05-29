import {Injectable, Inject, Optional} from '@angular/core';
import {NGX_PHONE_COUNTRY_CODES, CountryModel} from './phone-tokens';

@Injectable()
export class PhoneCountryService {
    constructor(@Optional() @Inject(NGX_PHONE_COUNTRY_CODES)
                private readonly countryCodesList: CountryModel[]) {
    }
}

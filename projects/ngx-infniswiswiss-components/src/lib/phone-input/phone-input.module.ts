import {CommonModule} from '@angular/common';
import {NgModule, ModuleWithProviders} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {MatRippleModule} from '@angular/material/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatMenuModule} from '@angular/material/menu';
import {DEFAULT_COUNTRY_LIST} from './metadata/phone-numbers-by-country';
import {PhoneInputFillService} from './phone-input-fill.service';

import {PhoneInputComponent} from './phone-input.component';
import {PhoneNumberInternationalPrefixComponent} from './phone-number-international-prefix.component';
import {NGX_PHONE_COUNTRY_CODES} from './phone-tokens';

@NgModule({
    imports: [CommonModule, MatFormFieldModule, MatMenuModule, MatRippleModule, MatInputModule, ReactiveFormsModule],
    exports: [PhoneInputComponent, PhoneNumberInternationalPrefixComponent],
    declarations: [PhoneInputComponent, PhoneNumberInternationalPrefixComponent],
    providers: [
        PhoneInputFillService
    ]
})
export class PhoneInputModule {
    static forRoot(): ModuleWithProviders {
        return {
            ngModule: PhoneInputModule,
            providers: [
                {
                    provide: NGX_PHONE_COUNTRY_CODES,
                    useValue: DEFAULT_COUNTRY_LIST
                }
            ]
        };
    }
}

import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatFormFieldModule} from '@angular/material/form-field';

import {PhoneInputComponent} from './phone-input.component';

@NgModule({
    imports: [CommonModule, MatFormFieldModule],
    exports: [PhoneInputComponent],
    declarations: [PhoneInputComponent],
    providers: []
})
export class PhoneInputModule {
}

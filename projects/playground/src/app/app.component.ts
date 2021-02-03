import {Component} from '@angular/core';
import {FormControl, Validators} from '@angular/forms';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    title = 'playground';
    countryCode = 'RO';
    countryCodesList = [
        'RO',
        'GB',
        'US',
        'RU'
    ];
    countryCodeControl = new FormControl('', [Validators.required]);
    phoneInputControl = new FormControl('+40774234567', [Validators.required]);

    constructor() {
    }

    toggleDisabled() {
        if (this.phoneInputControl.disabled) {
            this.phoneInputControl.enable();
            this.countryCodeControl.enable();
        } else {
            this.phoneInputControl.disable();
            this.countryCodeControl.disable();
        }
    }
}

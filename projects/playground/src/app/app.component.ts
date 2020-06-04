import {Component} from '@angular/core';
import {FormControl} from '@angular/forms';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    title = 'playground';
    countryCode = 'US';
    countryCodesList = [
        'RO',
        'GB',
        'US',
        'RU'
    ];
    countryCodeControl = new FormControl('');
    phoneInputControl = new FormControl('+40774234567');

    constructor() {
    }

    toggleDisabled() {
        if (this.phoneInputControl.disabled) {
            this.phoneInputControl.enable();
        } else {
            this.phoneInputControl.disable();
        }
    }
}

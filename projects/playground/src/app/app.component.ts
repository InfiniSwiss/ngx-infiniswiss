import {Component} from '@angular/core';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    title = 'playground';
    countryCode = 'US';
    countryCodeSecond = 'US';
    countryCodesList = [
        'RO',
        'GB',
        'US',
        'RU'
    ];
}

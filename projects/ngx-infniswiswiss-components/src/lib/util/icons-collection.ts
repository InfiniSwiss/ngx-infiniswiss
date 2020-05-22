import { Provider, APP_INITIALIZER } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { DeviceTypeService } from '../services/application-host/device-type.service';

const svgIconsUrl = '/assets/icons/svgs/';

const SVG_ICONS_URLS = {
    epp_dashboard: svgIconsUrl + 'menu/Dasboard.svg',
    epp_directory: svgIconsUrl + 'menu/Directory.svg',
    epp_important_doc: svgIconsUrl + 'menu/ImportantDoc.svg',
    epp_my_benefits: svgIconsUrl + 'menu/My Benefits.svg',
    epp_time_off: svgIconsUrl + 'menu/TimeOff.svg',
    epp_time_sheets: svgIconsUrl + 'menu/Timesheets.svg',
    epp_training: svgIconsUrl + 'menu/Training.svg',
    epp_action_link: svgIconsUrl + 'action/Action Link.svg',
    epp_action_notification_link: svgIconsUrl + 'action/Activity Notif. Link.svg',
    epp_logo: svgIconsUrl + 'action/Eppione Icon.svg',
    epp_action_filter: svgIconsUrl + 'action/Filter.svg',
    epp_action_search: svgIconsUrl + 'action/Search.svg',
};

const ALL_ICONS_URLS = {
    ...SVG_ICONS_URLS,
};

const ICONS_DATA = {
    ...SVG_ICONS_URLS,
};

for (let key in ICONS_DATA) {
    ICONS_DATA[key] = key;
}

export const ICONS_COLLECTION = Object.freeze(ICONS_DATA);

export function registerIcons(registry: MatIconRegistry, sanitizer: DomSanitizer) {
    return () => {
        for (const key in ALL_ICONS_URLS) {
            registry.addSvgIcon(key, sanitizer.bypassSecurityTrustResourceUrl(ALL_ICONS_URLS[key]));
        }
    };
}

export const ICONS_COLLECTION_INITIALIZER: Provider = {
    provide: APP_INITIALIZER,
    deps: [MatIconRegistry, DomSanitizer],
    useFactory: registerIcons,
    multi: true,
};

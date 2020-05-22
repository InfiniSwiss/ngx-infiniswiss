import {NgModule} from '@angular/core';
import {AppLoaderService} from './app-loader.service';
import {LOADING_HANDLER} from './component-loader.interface';
import {StateManagementServicesModule} from './state-management-services.module';


@NgModule({
    imports: [StateManagementServicesModule],
    exports: [StateManagementServicesModule],
    providers: [
        {
            provide: LOADING_HANDLER,
            useExisting: AppLoaderService
        }
    ]
})
export class StateManagementModule {
}

import {Injectable, Inject, Optional} from '@angular/core';
import {AppLoggerService} from '../logging/app-logger.service';
import {LOADING_HANDLER, IComponentLoader} from './component-loader.interface';
import {ComponentStateManager, ComponentStateManagerOptions} from './component-state-manager';
import {StateManagementServicesModule} from './state-management-services.module';

@Injectable({
    providedIn: StateManagementServicesModule
})
export class ComponentStateFactoryService {
    constructor(
        @Inject(LOADING_HANDLER) private readonly appLoaderService: IComponentLoader,
        @Optional()  private readonly appLogger: AppLoggerService
    ) {
    }

    create<TInputs, TState>(loaderOptions: ComponentStateManagerOptions<TInputs, TState>) {
        return new ComponentStateManager<TInputs, TState>(this.appLoaderService, this.appLogger, loaderOptions);
    }
}

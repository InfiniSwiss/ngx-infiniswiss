import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {AppLoggerService} from '../logging/app-logger.service';
import {ComponentLoader} from './component-loader';
import {IComponentLoader} from './component-loader.interface';
import {StateManagementServicesModule} from './state-management-services.module';

@Injectable({
    providedIn: StateManagementServicesModule
})
export class AppLoaderService implements IComponentLoader {
    private readonly appLoader: ComponentLoader;

    constructor(private readonly appLoggerService: AppLoggerService) {
        this.appLoader = new ComponentLoader(this.appLoggerService);
    }

    get loader$() {
        return this.appLoader.loader$;
    }

    public markLoading(trackingId: string, shouldBlockScreen: boolean = false) {
        this.appLoader.markLoading(trackingId, shouldBlockScreen);
    }

    public markNotLoading(trackingId: string, unblockNow: boolean = false) {
        this.appLoader.markNotLoading(trackingId, unblockNow);
    }

    public detachLoader(trackingId: string) {
        this.appLoader.detachLoader(trackingId);
    }

    public getMonitored<T>(trackingId: string, subscribeAble: Observable<T>): Observable<T> {
        return new Observable<T>(subscriber => {
            this.markLoading(trackingId);

            return subscribeAble.subscribe({
                next: value => {
                    subscriber.next(value);
                    this.markNotLoading(trackingId);
                },
                error: err => {
                    subscriber.error(err);
                    this.markNotLoading(trackingId);
                },
                complete: () => {
                    subscriber.complete();
                    this.markNotLoading(trackingId);
                }
            });
        });
    }
}

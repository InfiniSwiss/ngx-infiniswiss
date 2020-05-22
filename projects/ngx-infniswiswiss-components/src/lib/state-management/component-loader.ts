import {Optional} from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppLoggerService } from '../logging/app-logger.service';
import { ComponentLoaderState, IComponentLoader } from './component-loader.interface';

export class ComponentLoader implements IComponentLoader {
    private isBlockedCount: number = 0;
    private loadersCount: number = 0;
    private readonly loaders: {
        [id: string]: { count: number; blocks: boolean };
    } = {};
    private readonly loaderState$: BehaviorSubject<ComponentLoaderState> = new BehaviorSubject<ComponentLoaderState>({
        isLoading: false,
        isBlocked: false,
    });

    get isLoading() {
        return this.loadersCount > 0;
    }

    get isBlocked() {
        return this.isBlockedCount > 0;
    }

    get loader$() {
        return this.loaderState$.asObservable();
    }

    constructor(@Optional() private readonly appLoggerService: AppLoggerService) {}

    public markLoading(id: string, shouldBlockScreen: boolean = false) {
        if (!this.loaders[id]) {
            this.loaders[id] = { count: 0, blocks: false };
        }

        this.loaders[id].count++;
        this.loadersCount++;
        if (!this.loaders[id].blocks && shouldBlockScreen) {
            this.loaders[id].blocks = true;
            this.isBlockedCount++;
        }
        this.notifyLoaderChange();
    }

    public markNotLoading(id: string, unblockNow: boolean = false) {
        if (!this.loaders[id]) {
            return;
        }
        this.loaders[id].count--;
        this.loadersCount--;
        if (this.loaders[id].blocks && this.loaders[id].count <= 0) {
            this.loaders[id].blocks = false;
            this.isBlockedCount--;
        } else if (unblockNow) {
            this.loaders[id].blocks = false;
            this.isBlockedCount--;
        }
        this.notifyLoaderChange();
    }

    detachLoader(trackingId: string) {
        if (!this.loaders[trackingId]) {
            return;
        }

        this.loadersCount = this.loadersCount - this.loaders[trackingId].count;
        if (this.loaders[trackingId].blocks) {
            this.isBlockedCount--;
        }
        this.loaders[trackingId] = {
            blocks: false,
            count: 0,
        };
        this.notifyLoaderChange();
    }

    private notifyLoaderChange() {
        const oldState = this.loaderState$.getValue();
        const newState: ComponentLoaderState = {
            isBlocked: this.isBlocked,
            isLoading: this.isLoading,
        };

        if (newState.isLoading !== oldState.isLoading || newState.isBlocked !== oldState.isBlocked) {
            this.appLoggerService?.debug([`Loaders changed`, `{0}`], [this.loaders], ComponentLoader);
            this.loaderState$.next(newState);
        }
    }
}

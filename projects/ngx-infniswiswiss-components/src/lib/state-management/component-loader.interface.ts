import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface ComponentLoaderState {
    isLoading: boolean;
    isBlocked: boolean;
}

export interface IComponentLoader {
    loader$: Observable<ComponentLoaderState>;

    markLoading(trackingId: string, shouldBlockScreen?: boolean);

    markNotLoading(trackingId: string, unblockNow?: boolean);

    detachLoader(trackingId: string);
}

export const LOADING_HANDLER = new InjectionToken<IComponentLoader>('LOADING_HANDLER');

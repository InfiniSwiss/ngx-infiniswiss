import {Optional} from '@angular/core';
import {Observable, merge, Subject, Subscriber, of} from 'rxjs';
import {switchMap, filter, map, startWith, publishReplay, refCount, tap} from 'rxjs/operators';
import {AppLoggerService} from '../logging/app-logger.service';
import {generateUuid} from '../util/generate-uuid';
import {IComponentLoader} from './component-loader.interface';
import {ComponentObserverState, ComponentObserverLoadState} from './component-observer-state';
import {referenceCountObservable} from './reference-counted-observable';

export interface ComponentStateManagerOptions<TInputs, TState> {
    componentId: string;
    inputs: () => Observable<TInputs>;
    makeState: (inputs: TInputs, activeState: ComponentObserverState<TInputs, TState>) => Observable<TState> | TState;
    loader?: { disableGlobalLoader?: boolean; blockScreen?: boolean };
}

export enum InputChangeEventTypes {
    InputsChange = 'inputs-change',
    Refresh = 'refresh',
    Reload = 'reload',
}

interface InputChangeEvent<TInputs> {
    eventId: string;
    inputs: TInputs | 'INITIAL_VALUE';
    changeType: InputChangeEventTypes;
}

type RefreshDataTypes = 'refresh' | 'reload';

export class ComponentStateManager<TInputs, TState> {
    private activeStateOk: TState | 'INITIAL_VALUE' = 'INITIAL_VALUE';
    private activeInputs: TInputs | 'INITIAL_VALUE' = 'INITIAL_VALUE';
    private activatedComponentObserver: ComponentObserverState<TInputs, TState>;

    private readonly requestNewData$: Subject<RefreshDataTypes> = new Subject<RefreshDataTypes>();
    private readonly componentState$: Observable<ComponentObserverState<TInputs, TState>>;

    get state$(): Observable<ComponentObserverState<TInputs, TState>> {
        return this.componentState$;
    }

    get stateOk$(): Observable<TState> {
        return this.componentState$.pipe(
            filter(s => s.isOk),
            map(s => s.ok)
        );
    }

    constructor(
        private readonly appLoaderService: IComponentLoader,
        @Optional() private readonly appLogger: AppLoggerService | null,
        private readonly options: ComponentStateManagerOptions<TInputs, TState>
    ) {
        this.componentState$ = this.createComponentState();
    }

    refresh() {
        this.requestNewData$.next(InputChangeEventTypes.Refresh);
    }

    reload() {
        this.requestNewData$.next(InputChangeEventTypes.Reload);
    }

    private createComponentState() {
        // First state notification
        this.activatedComponentObserver = new ComponentObserverState<TInputs, TState>({
            componentState: 'initial-loading',
            activatedInputs: 'INITIAL_VALUE',
            ok: 'INITIAL_VALUE',
            error: null
        });

        // Multicast structure for listening to changes
        let stateObservable = merge<InputChangeEvent<TInputs>>(this.requestInputChanges(), this.requestNewDataEvent()).pipe(
            switchMap(inputValues => this.evaluateInputsAndMakeState(inputValues)),
            // Multicast results
            publishReplay(1),
            // Auto unsubscribe from source
            refCount(),
            // Setup first emission
            startWith(this.activatedComponentObserver),
            // Again reference count subscribers for auto cleanup internal state
            referenceCountObservable(() => this.cleanupState())
        );

        if (this.isGlobalLoaderEnabled()) {
            stateObservable = stateObservable.pipe(
                tap(state => {
                    this.updateGlobalLoader(state);
                })
            );
        }

        return stateObservable;
    }

    private isGlobalLoaderEnabled() {
        return !this.options.loader || (this.options.loader && !this.options.loader.disableGlobalLoader);
    }

    private getBlockState() {
        return this.options.loader?.blockScreen ?? false;
    }

    private cleanupState() {
        this.appLogger?.debug(`${this.options.componentId} State destroyed cleaning up loaders`, [], ComponentStateManager.name);
        if (this.isGlobalLoaderEnabled()) {
            this.appLoaderService.detachLoader(this.options.componentId);
        }
    }

    private requestInputChanges(): Observable<InputChangeEvent<TInputs>> {
        return this.options.inputs().pipe(
            map<TInputs, InputChangeEvent<TInputs>>(inputs => ({
                eventId: generateUuid(),
                changeType: InputChangeEventTypes.InputsChange,
                inputs
            }))
        );
    }

    private requestNewDataEvent(): Observable<InputChangeEvent<TInputs>> {
        return this.requestNewData$.pipe(
            filter(() => this.activeInputs !== 'INITIAL_VALUE'),
            map<any, InputChangeEvent<TInputs>>(changeType => ({
                eventId: generateUuid(),
                inputs: this.activeInputs,
                changeType
            }))
        );
    }

    private evaluateInputsAndMakeState(inputValues: InputChangeEvent<TInputs>) {
        return new Observable<ComponentObserverState<TInputs, TState>>(observer => {
            const componentState = this.getComponentLoadState(inputValues);

            // emit an intermediate state
            if (!this.activatedComponentObserver.isInitialLoading) {
                this.dispatchIntermediateState(componentState, observer);
            }

            const makeStateResponse = this.options.makeState(inputValues.inputs as TInputs, this.activatedComponentObserver);
            const makeStateObservable = makeStateResponse instanceof Observable ? makeStateResponse : of(makeStateResponse);

            const subscription = makeStateObservable.subscribe({
                next: data => this.setDataLoadedState(observer, inputValues, data),
                error: err => this.setDataLoadErrorState(observer, inputValues, err)
            });

            return {
                unsubscribe(): void {
                    subscription.unsubscribe();
                    observer.complete();
                }
            };
        });
    }

    private dispatchIntermediateState(
        componentState: 'loading' | 'data-transition',
        observer: Subscriber<ComponentObserverState<TInputs, TState>>
    ) {
        const ok = componentState === 'loading' ? null : this.activeStateOk;
        const activatedInputs = componentState === 'loading' ? null : this.activeInputs;

        this.activatedComponentObserver = new ComponentObserverState<TInputs, TState>({
            componentState,
            error: null,
            ok,
            activatedInputs
        });
        observer.next(this.activatedComponentObserver);
    }

    private getComponentLoadState(inputChangeEvent: InputChangeEvent<TInputs>) {
        let componentState: ComponentObserverLoadState = 'loading';
        if (this.isActiveStateAnOkState()) {
            switch (inputChangeEvent.changeType) {
                case InputChangeEventTypes.Reload:
                    componentState = 'loading';
                    break;
                case InputChangeEventTypes.InputsChange:
                case InputChangeEventTypes.Refresh:
                    componentState = 'data-transition';
                    break;
                default:
                    // It seems there is an unknown event
                    componentState = 'data-transition';
            }
        }
        return componentState;
    }

    private setDataLoadedState(
        observer: Subscriber<ComponentObserverState<TInputs, TState>>,
        inputValues: InputChangeEvent<TInputs>,
        data: TState
    ) {
        this.activeInputs = inputValues.inputs;
        this.activeStateOk = data;

        this.activatedComponentObserver = new ComponentObserverState<TInputs, TState>({
            activatedInputs: this.activeInputs as TInputs,
            ok: this.activeStateOk as TState,
            componentState: 'ok',
            error: null
        });
        observer.next(this.activatedComponentObserver);
    }

    private setDataLoadErrorState(
        observer: Subscriber<ComponentObserverState<TInputs, TState>>,
        inputValues: InputChangeEvent<TInputs>,
        err
    ) {
        // @ts-ignore
        this.activeInputs = inputValues.inputs;
        this.activeStateOk = null;

        if (err instanceof TypeError) {
            throw err;
        }

        this.activatedComponentObserver = new ComponentObserverState<TInputs, TState>({
            // @ts-ignore
            activatedInputs: this.activeInputs,
            ok: null,
            componentState: 'error',
            error: err
        });
        // @ts-ignore
        observer.next(this.activatedComponentObserver);
    }

    private isActiveStateAnOkState() {
        return this.activeInputs !== 'INITIAL_VALUE' && this.activeStateOk !== 'INITIAL_VALUE';
    }

    private updateGlobalLoader(state: ComponentObserverState<TInputs, TState>) {
        if (state.isLoading) {
            this.appLogger?.debug(`${this.options.componentId} is loading`, null, ComponentStateManager.name);
            this.appLoaderService.markLoading(this.options.componentId, this.getBlockState());
        } else {
            this.appLogger?.debug(`${this.options.componentId} loaded`, null, ComponentStateManager.name);
            this.appLoaderService.markNotLoading(this.options.componentId, this.getBlockState());
        }
    }
}

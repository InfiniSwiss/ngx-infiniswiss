export type ComponentObserverLoadState = 'initial-loading' | 'loading' | 'data-transition' | 'error' | 'ok';

export class ComponentObserverState<TInputs, TState> {
    public readonly componentState: ComponentObserverLoadState;
    public readonly error: any;
    private readonly okData: TState | 'INITIAL_VALUE';
    private readonly activatedInputsData: TInputs | 'INITIAL_VALUE';

    constructor(props: {
        componentState: ComponentObserverLoadState;
        ok: TState | 'INITIAL_VALUE';
        activatedInputs: TInputs | 'INITIAL_VALUE';
        error: any;
    }) {
        this.componentState = props.componentState;
        this.okData = props.ok;
        this.activatedInputsData = props.activatedInputs;
        this.error = props.error;
    }

    get isInitialLoading() {
        return this.componentState === 'initial-loading';
    }

    get ok() {
        return this.okData as TState;
    }

    get activatedInputs() {
        return this.activatedInputsData as TInputs;
    }

    get isLoading() {
        return this.componentState === 'initial-loading' || this.componentState === 'loading' || this.componentState === 'data-transition';
    }

    get isOk() {
        return this.componentState === 'ok';
    }

    get isOkOrDataTransition() {
        return this.componentState === 'ok' || this.componentState === 'data-transition';
    }

    isError() {
        return this.componentState === 'error';
    }
}

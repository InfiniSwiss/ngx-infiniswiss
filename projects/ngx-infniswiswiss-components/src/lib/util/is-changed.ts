import { SimpleChange } from '@angular/core';
import { isInitialized } from './is-initialized';

export function isChanged(change: SimpleChange) {
    if (!change) {
        return false;
    }

    return change.currentValue !== change.previousValue;
}

export function isChangedAndHasValue(change: SimpleChange) {
    return isChanged(change) && isInitialized(change.currentValue);
}

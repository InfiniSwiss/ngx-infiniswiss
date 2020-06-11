import {Platform} from '@angular/cdk/platform';
import {Injectable, ElementRef, NgZone, Optional} from '@angular/core';
import {CountryCode, formatIncompletePhoneNumber} from 'libphonenumber-js';
import {convertToString} from '../util/convert-to-string';
import {isInitialized} from '../util/is-initialized';

@Injectable()
export class PhoneInputFillService {
    constructor(@Optional() private readonly ngZone: NgZone,
                private readonly platform: Platform) {
    }

    private runOutsideOfAngular(fn: () => void) {
        if (this.ngZone) {
            this.ngZone.runOutsideAngular(fn);
        }
        fn();
    }

    public formatStringAsPhone(pureNumber: string, countryCode: CountryCode) {
        return formatIncompletePhoneNumber(pureNumber, countryCode);
    }

    public formatPhoneNumber(originalValue: string,
                             countryCode: CountryCode,
                             ignoredPrefix: string) {
        if (!countryCode) {
            return {number: originalValue ?? '', numberFormatted: originalValue ?? ''};
        }

        ignoredPrefix = convertToString(ignoredPrefix);
        const pureNumber = ignoredPrefix + this.clearInvalidCharacters(originalValue);
        const hasAllowedCharactersButInvalidForFormatting = /\#|\*/.test(originalValue);
        let numberFormatted = '';
        try {
            numberFormatted = hasAllowedCharactersButInvalidForFormatting
                ? pureNumber
                : this.formatStringAsPhone(pureNumber, countryCode);
            numberFormatted = numberFormatted.substring(ignoredPrefix.length, numberFormatted.length).trim();
        } catch (e) {
            numberFormatted = pureNumber;
        }
        if (pureNumber === ignoredPrefix) {
            return {number: '', numberFormatted: ''};
        }

        return {numberFormatted, number: pureNumber};
    }

    public setFormattingAndUpdateInput(elementRef: ElementRef,
                                       countryCode: CountryCode,
                                       ignoredPrefix: string,
                                       lastPressedKey: string) {
        const originalValue = convertToString(elementRef.nativeElement.value);
        const nextValue = this.formatPhoneNumber(originalValue, countryCode, ignoredPrefix);
        const {selectionStart, selectionEnd} = this.predictCursorPositionInValue(elementRef, nextValue.numberFormatted, lastPressedKey);
        this.setInputValue(elementRef, nextValue.numberFormatted, selectionStart, selectionEnd);
        return nextValue;
    }

    private clearInvalidCharacters(value: string) {
        const isPlusOnFirstPosition = value[0] === '+';
        const validCharsRegex = /\#|\*|\d/gi;
        const newValue = value.match(validCharsRegex) ?? [];
        return isPlusOnFirstPosition ? `+${newValue.join('')}` : newValue.join('');
    }

    private predictCursorPositionInValue(elementRef: ElementRef, valueToSet: string, lastPressedKey: string) {
        let {selectionStart, selectionEnd} = this.getCursorPositionWithoutFormatting(elementRef);
        console.log(`INITIAL WORD: ${elementRef.nativeElement.value}: Cursor: ${selectionStart}, ${selectionEnd}`);
        if (!isInitialized(selectionStart) || !isInitialized(selectionEnd)) {
            return {selectionStart, selectionEnd};
        }
        let i = 0;
        while (i < valueToSet.length && i <= selectionEnd) {
            const isFormattingChar = this.isFormattingCharacter(valueToSet[i]);
            if (isFormattingChar && selectionStart > i) {
                selectionStart++;
                selectionEnd++;
            } else if (isFormattingChar && selectionEnd > i) {
                selectionEnd++;
            }
            i++;
        }
        console.log(`INITIAL COMPUTED POSITION: ${valueToSet}: Cursor: ${selectionStart}, ${selectionEnd}`);
        const isSelectionStartAsSelectionEnd = selectionStart === selectionEnd;
        const moveDirection = lastPressedKey === 'Backspace' || lastPressedKey === ''
            ? -1
            : 1;
        let valueIndex = Math.max(selectionEnd - 1, 0);
        while (valueIndex >= 0 && valueIndex < valueToSet.length && this.isFormattingCharacter(valueToSet[valueIndex])) {
            selectionEnd += moveDirection;
            if (isSelectionStartAsSelectionEnd) {
                selectionStart += moveDirection;
            }
            valueIndex += moveDirection;
        }

        console.log(`FINAL COMPUTED POSITION: ${valueToSet}: Cursor: ${selectionStart}, ${selectionEnd}`);
        return {selectionStart, selectionEnd};
    }

    private getCursorPositionWithoutFormatting(elementRef: ElementRef) {
        let {selectionStart, selectionEnd} = this.getInputSelection(elementRef);
        const currentInputValue = convertToString(elementRef.nativeElement.value);
        if (isInitialized(selectionStart) && isInitialized(selectionEnd)) {
            const initialSelectionStart = selectionStart;
            const initialSelectionEnd = selectionEnd;
            for (let i = 0; i < currentInputValue.length; i++) {
                const isFormattingChar = this.isFormattingCharacter(currentInputValue[i]);
                if (isFormattingChar && initialSelectionStart > i) {
                    selectionStart--;
                    selectionEnd--;
                } else if (isFormattingChar && initialSelectionEnd > i) {
                    selectionEnd--;
                }
            }
        }
        return {selectionStart, selectionEnd};
    }


    private getInputSelection(elementRef) {
        let selectionStart: number = elementRef.nativeElement.selectionStart;
        let selectionEnd: number = elementRef.nativeElement.selectionStart;
        selectionStart = Math.min(selectionStart, selectionEnd);
        selectionEnd = Math.max(selectionStart, selectionEnd);
        return {selectionStart, selectionEnd};
    }

    private setInputValue(inputRef: ElementRef,
                          valueToSet: string,
                          selectionStart: number,
                          selectionEnd: number) {
        inputRef.nativeElement.value = valueToSet;
        if (!isInitialized(selectionStart) || !isInitialized(selectionEnd)) {
            return;
        }

        selectionStart = Math.min(valueToSet.length, selectionStart);
        selectionEnd = Math.min(valueToSet.length, selectionEnd);
        if (!this.platform.ANDROID) {
            inputRef.nativeElement.setSelectionRange(selectionStart, selectionEnd, 'forward');
            return;
        }

        // For some reason on Android the cursor moves weird
        this.runOutsideOfAngular(() => {
            setTimeout(() => {
                if (valueToSet === inputRef.nativeElement.value) {
                    inputRef.nativeElement.setSelectionRange(selectionStart, selectionEnd, 'forward');
                }
            });
        });
    }

    private isFormattingCharacter(char: string) {
        return (
            char === ')' ||
            char === '(' ||
            char === '-' ||
            char === ' '
        );
    }
}

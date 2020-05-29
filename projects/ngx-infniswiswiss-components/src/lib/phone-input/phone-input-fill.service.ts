import {isDefined} from '@angular/compiler/src/util';
import {Injectable, ElementRef} from '@angular/core';
import {CountryCode, formatIncompletePhoneNumber} from 'libphonenumber-js';
import {convertToString} from '../util/convert-to-string';

@Injectable()
export class PhoneInputFillService {
    public formatPhoneNumber(originalValue: string,
                             countryCode: CountryCode,
                             ignoredPrefix: string) {
        ignoredPrefix = convertToString(ignoredPrefix);
        const pureNumber = ignoredPrefix + this.clearInvalidCharacters(originalValue);
        const hasAllowedCharactersButInvalidForFormatting = /\#|\*/.test(originalValue);
        let numberFormatted = hasAllowedCharactersButInvalidForFormatting
            ? pureNumber
            : formatIncompletePhoneNumber(pureNumber, countryCode);
        numberFormatted = numberFormatted.substring(ignoredPrefix.length, numberFormatted.length).trim();
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
        if (!isDefined(selectionStart) || !isDefined(selectionEnd)) {
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

        const isSelectionStartAsSelectionEnd = selectionStart === selectionEnd;
        const moveDirection = lastPressedKey === 'Backspace'
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

        return {selectionStart, selectionEnd};
    }

    private getCursorPositionWithoutFormatting(elementRef: ElementRef) {
        let {selectionStart, selectionEnd} = this.getInputSelection(elementRef);
        const currentInputValue = convertToString(elementRef.nativeElement.value);
        if (isDefined(selectionStart) && isDefined(selectionEnd)) {
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
        if (isDefined(selectionStart) && isDefined(selectionEnd)) {
            selectionStart = Math.min(valueToSet.length, selectionStart);
            selectionEnd = Math.min(valueToSet.length, selectionEnd);
            inputRef.nativeElement.setSelectionRange(selectionStart, selectionEnd, 'forward');
        }
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

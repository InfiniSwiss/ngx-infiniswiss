export function convertToNumber(value: any, defaultNumberValue: number = 0) {
    const valueAsNumber = +value;
    return isNaN(valueAsNumber) || value === null || value === undefined ? defaultNumberValue : valueAsNumber;
}

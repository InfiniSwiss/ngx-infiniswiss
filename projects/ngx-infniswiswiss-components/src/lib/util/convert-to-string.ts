export function convertToString(data: any, defaultStringValue = '') {
    return data === null || data === undefined ? defaultStringValue : data.toString();
}

export function toString2(value: number) {
    const numberAsString = convertToString(value);
    return numberAsString.length < 2 ? `0${numberAsString}` : numberAsString;
}

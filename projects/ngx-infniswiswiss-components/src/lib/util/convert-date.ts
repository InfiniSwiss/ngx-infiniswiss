import { isInitialized } from './is-initialized';

const transformTimezoneToMiliseconds = 60000;

export function convertUtcTimestampToDate(miliseconds: number, defaultValue: Date | null = null): Date {
    if (isInitialized(miliseconds) && !isNaN(miliseconds)) {
        const currentDate = new Date(miliseconds);
        const timezoneDifference = currentDate.getTimezoneOffset() * transformTimezoneToMiliseconds;
        currentDate.setMilliseconds(currentDate.getMilliseconds() + timezoneDifference);
        return currentDate;
    }
    return defaultValue;
}

export function convertDateToUtcTimestamp<T>(date: Date, defaultValue: T = null): number | T {
    if (isInitialized(date)) {
        const timezoneDifference = date.getTimezoneOffset() * transformTimezoneToMiliseconds;
        return date?.getTime() - timezoneDifference;
    }

    return defaultValue;
}

export function getMonthFrom(date: Date) {
    return date.getMonth() + 1;
}

export function today() {
    return new Date();
}

export function isToday(date: Date) {
    const todayVal = today();
    return (
        todayVal.getFullYear() === date.getFullYear() && todayVal.getMonth() === date.getMonth() && todayVal.getDate() === date.getDate()
    );
}

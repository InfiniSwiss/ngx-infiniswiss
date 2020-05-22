export function convertToArray<T>(data: T | T[], defaultValue: T[] = []): T[] {
    if (Array.isArray(data)) {
        return data as T[];
    }

    if (data !== null && data !== undefined) {
        return [data] as T[];
    }

    return defaultValue;
}

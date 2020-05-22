export function objectValues(data: any): any[] {
    if (!data) {
        return [];
    }

    return Object.keys(data).map(key => data[key]);
}

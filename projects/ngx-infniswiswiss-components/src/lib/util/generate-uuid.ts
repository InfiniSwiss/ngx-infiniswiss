let uuidNumber = -1;

export function generateUuid(): string {
    uuidNumber++;
    return `next-uuid-${uuidNumber}`;
}

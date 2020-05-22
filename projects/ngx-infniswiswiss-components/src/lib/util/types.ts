export type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>;
};

export type DictionaryOf<T> = {
    [key: string]: T;
};

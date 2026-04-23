type Interpolatable = string | number | boolean | null | undefined | Interpolatable[] | {
    [key: string]: Interpolatable;
};
export declare const interpolateTemplate: (template: string, values: Record<string, string>) => string;
export declare const interpolateObject: <T extends Interpolatable>(value: T, variables: Record<string, string>) => T;
export declare const toEnabledRecord: (pairs: Array<{
    key: string;
    value: string;
    enabled?: boolean;
}>) => Record<string, string>;
export declare const safeJsonParse: <T>(value: string, fallback: T) => T;
export declare const createSortOrder: (index: number) => number;
export declare const uniqueBy: <T>(items: T[], keySelector: (item: T) => string) => T[];
export {};

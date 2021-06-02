export interface EditDistance {
    name: String;

    calculateDistance(source: string, target: string): number;
}

export interface Profile {
    includes: Array<{ k: string, v: Array<number> }>
    ignores: Array<string>;
}

export interface DataStore {
    name: string;

    initialize(): Promise<void>;

    isInitialized(): boolean;

    setLanguage(language: string): Promise<void>;

    // List data structure
    pushTerm(key: string): Promise<number>;

    getTermAt(index: number): Promise<string>;

    // Hash table data structure
    getEntry(key: string): Promise<Array<number>>;

    getManyEntries(keys: Array<string>): Promise<Array<Array<number>>>;

    setEntry(key: string, value: Array<number>): Promise<boolean>;

    hasEntry(key: string): Promise<boolean>;

    maxEntryLength(): Promise<number>;

    clear(): Promise<void>;
}

export class Suggestion {
    term: string;
    distance: number;
    frequency: number;

    constructor(term: string, distance: number = 0, frequency: number = 0) {
        this.term = term;
        this.distance = distance;
        this.frequency = frequency;
    }
}

export class DictionaryEntry extends Array {
    constructor(frequency?: number, ...suggestions: Array<number>) {
        super();
        this.push(frequency || 0);
        if (suggestions.length > 0) {
            this.push(...suggestions);
        }
    }
}

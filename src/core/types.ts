export interface EditDistance {
    name: String;
    calculateDistance(source: string, target: string): number;
}

export interface Profile {
    includes: Array<{ k: string, v: Array<number> }>
    ignores: Array<string>;
}

export interface Tokenizer {
    tokenize(input: string): Array<Token>;
}

export interface DataStore {
    name: string;
    initialize(): Promise<void>;
    isInitialized(): boolean;
    setLanguage(language: string): Promise<void>;
    // List data structure
    pushTerm(value: string): Promise<number>;
    getTermAt(index: number): Promise<string>;
    getTermsAt(indexes: Array<number>): Promise<Array<string>>;
    // Hash table data structure
    getEntry(key: string): Promise<Array<number>>;
    getEntries(keys: Array<string>): Promise<Array<Array<number>>>;
    setEntry(key: string, value: Array<number>): Promise<boolean>;
    hasEntry(key: string): Promise<boolean>;
    maxEntryLength(): Promise<number>;
    clear(): Promise<void>;
}

export class Token {
    value: string;
    tag: string;
    alphabet: string;
    distance: number;

    constructor(value: string, tag?: string, alphabet?: string, distance: number = 0) {
        this.value = value;
        this.tag = tag;
        this.alphabet = alphabet;
        this.distance = distance;
    }
}

export class Suggestion {
    term: string;
    suggestion: string;
    distance: number;
    frequency: number;

    constructor(term: string, suggestion: string, distance: number = 0, frequency: number = 0) {
        this.term = term;
        this.suggestion = suggestion;
        this.distance = distance;
        this.frequency = frequency;
    }
}

export class Correction {
    input: string;
    output: string;
    suggestions: Array<Suggestion> = [];

    constructor(input: string, output: string, suggestions: Array<Suggestion> = []) {
        this.input = input;
        this.output = output;
        this.suggestions = suggestions;
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

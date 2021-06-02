import {Languages} from "../core";
import MegaHash from "megahash";
import {DataStore} from "../core";

export class MemoryStore implements DataStore {
    name = 'memory_store';
    private _language: string = Languages.ENGLISH;
    private _terms: {[key: string]: Array<string>;};
    private _entries: {[key: string]: any;};
    private _maxEntryLength: number = 0;
    private _initialized: boolean = false;

    async initialize(): Promise<void> {
        this._terms = {[this._language]: []};
        this._entries = {[this._language]: new MegaHash()};
        this._initialized = true;
    }

    isInitialized() {
        return this._initialized;
    }

    async setLanguage(language: string): Promise<void> {
        if (this._terms[language] == null) {
            this._terms[language] = [];
            this._entries[language] = new MegaHash();
        }
        this._language = language;
    }

    async pushTerm(key: string): Promise<number> {
        return this._terms[this._language].push(key);
    }

    async getTermAt(index: number): Promise<string> {
        return this._terms[this._language][index] || null;
    }

    async getTermsAt(indexes: Array<number>): Promise<Array<string>> {
        const terms: Array<string> = [];
        for(let i=0; i < indexes.length; i+= 1){
            terms.push(this._terms[this._language][indexes[i]] || null);
        }

        return terms;
    }

    async setEntry(key: string, value: Array<number>): Promise<boolean> {
        const result = this._entries[this._language].set(key, value);

        if (key.length > this._maxEntryLength) {
            this._maxEntryLength = key.length;
        }
        return (result === 1 || result === 2);
    }

    async getEntry(key: string): Promise<Array<number>> {
        if (key == null || key.length === 0) return null;
        return this._entries[this._language].get(key) || null;
    }

    async getEntries(keys: Array<string>): Promise<Array<Array<number>>> {
        const result: Array<Array<number>> = [];
        for (let i = 0; i < keys.length; i += 1) {
            const item = this._entries[this._language].get(keys[i]);
            if (item != null && item.length > 0) {
                result.push(item);
            } else {
                result.push(null);
            }
        }

        return result;
    }

    async hasEntry(key: string): Promise<boolean> {
        return this._entries[this._language].has(key);
    }

    async maxEntryLength(): Promise<number> {
        return this._maxEntryLength;
    }

    async clear(): Promise<void> {
        this._terms = {[this._language]: []};
        this._entries = {[this._language]: new MegaHash()};
    }
}

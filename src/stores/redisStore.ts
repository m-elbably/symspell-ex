import {DEFAULT_LANGUAGE} from "../core";
import {DataStore} from "../core";

export class RedisStore implements DataStore {
    name = 'redis_store';
    private _redis: any;
    private _language: string = DEFAULT_LANGUAGE;
    private readonly _MAIN_KEY = 'symspell_ex';
    private readonly _CONFIG_KEY = 'config';
    private readonly _TERMS_KEY = 'terms';
    private readonly _ENTRIES_KEY = 'entries';
    // Configuration keys
    private readonly _MAX_ENTRY_LENGTH = 'maxEntryLength';
    private _initialized: boolean = false;

    constructor(instance: any) {
        this._redis = instance;
    }

    async initialize(): Promise<void> {
        await this._redis.defineCommand('hSetEntry', {
            numberOfKeys: 2,
            lua:
                `
                local olen = redis.call("hget", ARGV[2], ARGV[3])
                local value = redis.call("hset", KEYS[1], KEYS[2], ARGV[1])
                local nlen = #KEYS[2]
                if(not olen or nlen > tonumber(olen)) then
                  redis.call("hset", ARGV[2], ARGV[3], nlen)
                end
                return value
                `
        });
        this._initialized = true;
    }

    isInitialized() {
        return this._initialized;
    }

    private get _configNamespace() {
        return `${this._MAIN_KEY}:${this._CONFIG_KEY}`
    }

    private get _termsNamespace() {
        return `${this._MAIN_KEY}:${this._language}:${this._TERMS_KEY}`
    }

    private get _entriesNamespace() {
        return `${this._MAIN_KEY}:${this._language}:${this._ENTRIES_KEY}`
    }

    private get _maxEntryLength() {
        return `${this._language}.${this._MAX_ENTRY_LENGTH}`;
    }

    async setLanguage(language: string): Promise<void> {
        this._language = language;
    }

    async pushTerm(key: string): Promise<number> {
        return this._redis.rpush(this._termsNamespace, key);
    }

    async getTermAt(index: number): Promise<string> {
        return this._redis.lindex(this._termsNamespace, index);
    }

    async setEntry(key: string, value: Array<number>): Promise<boolean> {
        const mValue = JSON.stringify(value);
        return this._redis.hSetEntry(this._entriesNamespace, key, mValue, this._configNamespace, this._maxEntryLength)
            .then((value: number) => value === 1);
    }

    async getEntry(key: string): Promise<Array<number>> {
        return this._redis.hget(this._entriesNamespace, key)
            .then((value: string) => JSON.parse(value));
    }

    async getManyEntries(keys: Array<string>): Promise<Array<Array<number>>> {
        return this._redis.hmget(this._entriesNamespace, ...keys)
            .then((values: Array<string>) => values.map((value) => JSON.parse(value)));
    }

    async hasEntry(key: string): Promise<boolean> {
        return this._redis.hexists(this._entriesNamespace, key)
            .then((value: number) => value === 1);
    }

    async maxEntryLength(): Promise<number> {
        return this._redis.hget(this._configNamespace, this._maxEntryLength)
            .then((value: string) => parseInt(value));
    }

    async clear(): Promise<void> {
        const keys = await this._redis.keys(`${this._MAIN_KEY}:*`);
        for (let i = 0; i < keys.length; i += 1) {
            await this._redis.del(keys[i]);
        }
    }
}

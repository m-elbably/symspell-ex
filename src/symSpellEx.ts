import {
    DataStore,
    EditDistance,
    DictionaryEntry,
    Suggestion,
    Correction,
    Tokenizer,
    TokenTags,
    Languages
} from "./core";
import {DamerauLevenshteinDistance} from "./core/nlp/editDistance";
import {CoreTokenizer} from "./core/nlp/tokenizers";
import * as buffer from "buffer";

const DEFAULT_MAX_DISTANCE = 2;
const DEFAULT_MAX_SUGGESTIONS = 5;

export class SymSpellEx {
    store: DataStore;
    editDistance: EditDistance;
    private _tokenizer: Tokenizer;
    private readonly _maxDistance: number;
    private readonly _maxSuggestions: number;
    private _language = Languages.ENGLISH;
    private _isInitialized = false;

    constructor(store: DataStore,
                editDistance: EditDistance = new DamerauLevenshteinDistance(),
                tokenizer: Tokenizer = new CoreTokenizer(),
                maxDistance = DEFAULT_MAX_DISTANCE,
                maxSuggestions = DEFAULT_MAX_SUGGESTIONS) {
        this.store = store || null;
        this.editDistance = editDistance;
        this._tokenizer = tokenizer;
        this._maxDistance = maxDistance;
        this._maxSuggestions = maxSuggestions;
    }

    async initialize(): Promise<void> {
        await this.store.initialize();
        this._isInitialized = true;
    }

    isInitialized() {
        return this._isInitialized;
    }

    get maxDistance(): Number {
        return this._maxDistance;
    }

    get maxSuggestions(): Number {
        return this._maxSuggestions;
    }

    async setLanguage(language: string): Promise<void> {
        this._checkForReadiness();
        this._language = language;
        await this.store.setLanguage(language)
    }

    get language() {
        return this._language;
    }

    private _checkForReadiness(): void {
        if (!this._isInitialized) {
            throw new Error('SymSpellEx must be initialized, Please call initialize() first');
        }
    }

    private edits(word: string, min: number, max: number, deletes: Set<string>): Set<string> {
        deletes = deletes || new Set();
        min++;

        let deletedItem: string;
        let l = word.length;
        let i = 0;

        if (l > 1) {
            for (i = 0; i < l; i += 1) {
                deletedItem = word.substring(0, i) + word.substring(i + 1);

                if (!deletes.has(deletedItem)) {
                    deletes.add(deletedItem);
                    if (min < max) {
                        this.edits(deletedItem, min, max, deletes);
                    }
                }
            }
        }

        return deletes;
    }

    private async filterAndRankSuggestions(suggestions: Array<any>, max: number): Promise<Array<Suggestion>> {
        if (suggestions == null || suggestions.length <= 0) {
            return [];
        }

        return suggestions.sort((a: any, b: any) => {
            if(a.distance < b.distance){
                return -1;
            } else if (a.distance === b.distance) {
                if(a.frequency >= b.frequency){
                    return -1;
                }
            }

            return 1;
        }).filter((i, index) => index < max);
    }

    async lookup(term: string, language?: string, maxDistance?: number, maxSuggestions?: number):
        Promise<Array<Suggestion>> {

        this._checkForReadiness();

        const iLanguage = language || this._language;
        const iMaxDistance = maxDistance || this._maxDistance;
        const iMaxSuggestions = maxSuggestions || this._maxSuggestions;
        const iTerm = term.toLowerCase().trim();
        const iLength = iTerm.length;
        const maxKeyLength = await this.store.maxEntryLength();

        if(iLanguage !== this._language) {
            await this.store.setLanguage(iLanguage);
        }

        if (iLength - iMaxDistance > maxKeyLength) {
            return [];
        }

        let termsCache: Array<string> = [];
        let entriesCache:  {[k: string]: Array<number>;} = {};

        let candidate: string;
        let candidateHasHigherDistance = false;
        let inputCandidateDistance = 0;

        const candidates = [iTerm];
        const candidateSet = new Set<string>();

        let suggestions: Array<Suggestion> = [];
        const suggestionSet = new Set<string>();

        while (candidates.length > 0) {
            candidate = candidates.shift();

            inputCandidateDistance = iLength - candidate.length;
            candidateHasHigherDistance = suggestions.length > 0 &&
                inputCandidateDistance > suggestions[0].distance;
            if (candidateHasHigherDistance) {
                break;
            }

            const entry = await this.store.getEntry(candidate);
            if (entry != null) {
                if (entry[0] > 0 && !suggestionSet.has(candidate)) {
                    const suggestion = new Suggestion(term, candidate, inputCandidateDistance, entry[0]);
                    suggestionSet.add(candidate);
                    suggestions.push(suggestion);

                    if (inputCandidateDistance === 0) {
                        break;
                    }
                }

                termsCache = await this.store.getTermsAt(entry);
                for (let i = 1; i < entry.length; i += 1) {
                    const sIndex = entry[i];
                    const sTerm = termsCache[i] != null ? termsCache[i] :
                            await this.store.getTermAt(sIndex);

                    if (suggestionSet.has(sTerm)) {
                        continue;
                    }

                    suggestionSet.add(sTerm);
                    // Computing distance between candidate & suggestion
                    let distance = 0;
                    if (iTerm !== sTerm) {
                        if (sTerm.length === candidate.length) {
                            distance = iLength - candidate.length;
                        } else if (iLength === candidate.length) {
                            distance = sTerm.length - candidate.length;
                        } else {
                            let ii = 0;
                            let jj = 0;
                            const sLen = sTerm.length;

                            while (ii < sLen && ii < iLength && sTerm[ii] === iTerm[ii]) {
                                ii++;
                            }

                            while (jj < sLen - ii && jj < iLength && sTerm[sLen - jj - 1] === iTerm[iLength - jj - 1]) {
                                jj++;
                            }

                            if (ii > 0 || jj > 0) {
                                distance = this.editDistance.calculateDistance(
                                    sTerm.substr(ii, sLen - ii - jj),
                                    iTerm.substr(ii, iLength - ii - jj)
                                );
                            } else {
                                distance = this.editDistance.calculateDistance(sTerm, iTerm);
                            }
                        }
                    }

                    if(suggestions.length > 0){
                        if(distance < suggestions[0].distance) {
                            suggestions = [];
                        } else if(distance > suggestions[0].distance) {
                            continue;
                        }
                    }

                    if (distance <= iMaxDistance) {
                        const suggestionEntry = await this.store.getEntry(sTerm);
                        if (suggestionEntry != null) {
                            suggestions.push(new Suggestion(term, sTerm, distance, suggestionEntry[0]));
                        }
                    }
                }
            }

            if (iLength - candidate.length < iMaxDistance) {
                if (candidateHasHigherDistance) {
                    continue;
                }

                for (let i = 0; i < candidate.length; i++) {
                    const deletedItem = candidate.substring(0, i) + candidate.substring(i + 1);
                    if (!candidateSet.has(deletedItem)) {
                        candidates.push(deletedItem);
                        candidateSet.add(deletedItem);
                    }
                }
            }
        }

        return this.filterAndRankSuggestions(suggestions, iMaxSuggestions);
    }

    async add(term: string, frequency: number = 1, language?: string, maxDistance?: number): Promise<void> {
        this._checkForReadiness();
        if (term == null || term.length <= 1) return;

        const iLanguage = language || this._language;
        const iMaxDistance = maxDistance || this._maxDistance;
        const iTerm = term.toLowerCase().trim();
        if(iLanguage !== this._language) {
            await this.store.setLanguage(iLanguage);
        }

        let initialEntry = true;
        let entry = await this.store.getEntry(iTerm);

        if(entry == null) {
            entry = new DictionaryEntry(frequency)
        } else {
            const entryFrequency = entry[0];
            if(entryFrequency === 0) {
                entry[0] = frequency;
            } else {
                initialEntry = false;
            }
        }

        await this.store.setEntry(iTerm, entry);
        if (initialEntry) {
            const number = await this.store.pushTerm(iTerm) - 1;
            const deletes = this.edits(iTerm, 0, iMaxDistance, null);
            const deletesArray = Array.from(deletes);

            await this.store.getEntries(deletesArray)
                .then((items) => {
                    items.forEach(async (item, index) => {
                        const dKey = deletesArray[index];
                        if(item != null) {
                            if(item.indexOf(number) <= 0){
                                item.push(number);
                                await this.store.setEntry(dKey, item);
                            }
                        } else {
                            const dEntry = new DictionaryEntry(0, number);
                            await this.store.setEntry(dKey, dEntry);
                        }
                    });
                });
        }
    }

    /**
     * Train on bulk data
     * @param {Array<string>} terms - each item is comma separated value contains "term,frequency"
     * @param {string} language
     * @returns {Promise<void>}
     */
    async train(terms: Array<string>, language: string): Promise<void> {
        this._checkForReadiness();

        for (let i = 0; i < terms.length; i += 1) {
            if (terms[i] == null || terms[i].length === 0) continue;
            const [term, frequency] = terms[i].split(/,/);
            if (term == null || term.length === 0) continue;
            await this.add(term, parseInt(frequency) || 1, language);
        }
    }

    async search(input: string, language: string, maxDistance = this._maxDistance,
                 maxSuggestions = this._maxSuggestions): Promise<Array<Suggestion>> {
        return this.lookup(input, language, maxDistance, maxSuggestions);
    }

    async correct(input: string, language: string, maxDistance = this._maxDistance): Promise<Correction> {
        this._checkForReadiness();
        if(input == null) {
            return null;
        }

        const bLength = Buffer.byteLength(input, 'utf8');
        const output = Buffer.alloc(bLength * 2);
        const suggestions = new Array<Suggestion>();
        const tokens = this._tokenizer.tokenize(input);
        let bOffset = 0;
        let tOutput;

        for(let i=0; i < tokens.length; i += 1) {
            const token = tokens[i];
            let term = token.value;
            let termSuggestion = new Suggestion(term, null,0, 0);
            const postDistance = token.distance;
            if(token.tag === TokenTags.WORD && token.value.length >= 2){
                await this.lookup(term, language, maxDistance, 1)
                    .then((lSuggestions) => {
                        if(lSuggestions.length > 0) {
                            termSuggestion = lSuggestions[0];
                        }
                    });
            }

            // Check word first char case
            const caseMatch = token.value.match(/^[A-Z]/g);
            if(caseMatch != null){
                const sTerm = termSuggestion.suggestion;
                if(sTerm != null) {
                    termSuggestion.suggestion = `${sTerm.substr(0, 1).toUpperCase()}${sTerm.substr(1)}`;
                }
            }

            suggestions.push(termSuggestion);
            term = termSuggestion.suggestion != null ? termSuggestion.suggestion: termSuggestion.term;
            term = `${term}${String(' ').repeat(postDistance)}`;
            output.write(term, bOffset, 'utf8');
            bOffset += Buffer.byteLength(term, 'utf8') + 1;
        }

        // Trim 0x00 from buffer
        tOutput = Buffer.from(output.filter((b) => b !== 0x00))
            .toString('utf8');

        return new Correction(input, tOutput, suggestions);
    }

    async clear() {
        this._checkForReadiness();
        await this.store.clear();
    }
}

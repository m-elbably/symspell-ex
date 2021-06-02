import {DataStore, EditDistance, DictionaryEntry, Suggestion} from "./core";
import {DamerauLevenshteinDistance} from "./editDistance";

const DEFAULT_MAX_DISTANCE = 2;
const DEFAULT_MAX_SUGGESTIONS = 5;

export class SymSpellEx {
    store: DataStore;
    editDistance: EditDistance;
    maxDistance: number;
    maxSuggestions: number;

    constructor(store: DataStore,
                editDistance = new DamerauLevenshteinDistance(),
                maxDistance = DEFAULT_MAX_DISTANCE,
                maxSuggestions = DEFAULT_MAX_SUGGESTIONS) {
        this.store = store || null;
        this.editDistance = editDistance;
        this.maxDistance = maxDistance;
        this.maxSuggestions = maxSuggestions;

        if(!store.isInitialized()) {
            throw new Error('Store must be initialized, Please call store.initialize() first');
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
            return suggestions;
        }

        return suggestions.sort((a: any, b: any) => {
            return (a.distance <= b.distance && a.frequency >= b.frequency) ? -1 : 1;
        }).filter((i, index) => index < max);
    }

    private async lookup(input: string, language: string, maxDistance: number = this.maxDistance, maxSuggestions: number = this.maxSuggestions):
        Promise<Array<Suggestion>> {
        const inputLen = input.length;
        const maxKeyLength = await this.store.maxEntryLength();

        await this.store.setLanguage(language);
        if (inputLen - maxDistance > maxKeyLength) {
            return [];
        }

        let candidate: string;
        let isInputCandidateDistanceHigh = false;
        const candidates = [input];
        const candidateSet = new Set();

        let suggestionCache: { [key: string]: Array<number>; } = {};
        const suggestions: Array<Suggestion> = [];
        const suggestionSet = new Set();

        while (candidates.length > 0) {
            candidate = candidates.shift();

            isInputCandidateDistanceHigh = suggestions.length > 0 &&
                inputLen - candidate.length > suggestions[0].distance;

            if (isInputCandidateDistanceHigh) {
                break;
            }

            const cachedSuggestion = suggestionCache.hasOwnProperty(candidate);
            const entry = cachedSuggestion ? suggestionCache[candidate] : await this.store.getEntry(candidate);

            if (entry != null) {
                if (entry[0] > 0 && !suggestionSet.has(candidate)) {
                    const inputCandidateDistance = inputLen - candidate.length;
                    const suggestion = new Suggestion(candidate, inputCandidateDistance, entry[0]);

                    suggestionSet.add(candidate);
                    suggestions.push(suggestion);

                    if (inputCandidateDistance === 0) {
                        break;
                    }
                }

                for (let i = 1; i < entry.length; i += 1) {
                    const suggestionIndex = entry[i];
                    const suggestion = await this.store.getTermAt(suggestionIndex);
                    if (suggestionSet.has(suggestion)) {
                        continue;
                    }

                    suggestionSet.add(suggestion);
                    // Computing distance between candidate & suggestion
                    let distance = 0;
                    if (input !== suggestion) {
                        if (suggestion.length === candidate.length) {
                            distance = inputLen - candidate.length;
                        } else if (inputLen === candidate.length) {
                            distance = suggestion.length - candidate.length;
                        } else {
                            let ii = 0;
                            let jj = 0;
                            const sLen = suggestion.length;

                            while (ii < sLen && ii < inputLen && suggestion[ii] === input[ii]) {
                                ii++;
                            }

                            while (jj < sLen - ii && jj < inputLen && suggestion[sLen - jj - 1] === input[inputLen - jj - 1]) {
                                jj++;
                            }

                            if (ii > 0 || jj > 0) {
                                distance = this.editDistance.calculateDistance(
                                    suggestion.substr(ii, sLen - ii - jj),
                                    input.substr(ii, inputLen - ii - jj)
                                );
                            } else {
                                distance = this.editDistance.calculateDistance(suggestion, input);
                            }
                        }
                    }

                    if (suggestions.length > 0) {
                        const hDistance = distance > suggestions[suggestions.length - 1].distance;
                        const lDistance = distance < suggestions[suggestions.length - 1].distance;

                        if (lDistance) {
                            suggestions.splice(suggestions.length - 1, 1);
                        } else if (hDistance) {
                            continue;
                        }
                    }

                    if (distance <= maxDistance) {
                        const suggestionEntry = await this.store.getEntry(suggestion);
                        if (suggestionEntry != null) {
                            suggestions.push(new Suggestion(suggestion, distance, suggestionEntry[0]));
                        }
                    }
                }
            }

            // Term does not exists with dictionary, add edits
            if (inputLen - candidate.length < maxDistance) {
                if (isInputCandidateDistanceHigh) {
                    continue;
                }

                for (let i = 0; i < candidate.length; i++) {
                    const deletedItem = candidate.substring(0, i) + candidate.substring(i + 1);
                    if (!candidateSet.has(deletedItem)) {
                        candidates.push(deletedItem);
                        candidateSet.add(deletedItem);
                    }
                }

                // Enhancement to avoid checking individual suggestions
                await this.store.getManyEntries(candidates)
                    .then((items) => {
                        suggestionCache = {};
                        items.forEach((v, i) => {
                            suggestionCache[candidates[i]] = v;
                        });
                    });
            }
        }

        return this.filterAndRankSuggestions(suggestions, maxSuggestions);
    }

    async add(term: string, language: string, maxDistance = this.maxDistance): Promise<void> {
        if (term == null || term.length <= 1) return;

        const nTerm = term.toLowerCase();
        await this.store.setLanguage(language);
        let item = await this.store.getEntry(nTerm);

        if (item == null) {
            item = new DictionaryEntry(1);
        } else {
            item[0]++; // Increase frequency
        }

        await this.store.setEntry(nTerm, item);

        if (item[0] === 1) {
            const number = await this.store.pushTerm(nTerm) - 1;
            const deletes = this.edits(nTerm, 0, maxDistance, null);

            for (const deletedItem of deletes) {
                const target = await this.store.getEntry(deletedItem);
                if (target != null) {
                    if (target.indexOf(number) <= 0) {
                        target.push(number);
                    }
                } else {
                    const deletedEntry = new DictionaryEntry(0, number);
                    await this.store.setEntry(deletedItem, deletedEntry);
                }
            }
        }
    }

    async train(terms: Array<string>, language: string): Promise<void> {
        for (let i = 0; i < terms.length; i += 1) {
            await this.add(terms[i], language);
        }
    }

    async search(input: string, language: string, maxDistance = this.maxDistance,
                 maxSuggestions = this.maxSuggestions): Promise<Array<Suggestion>> {
        return this.lookup(input, language, maxDistance, maxSuggestions);
    }

    async correct(input: string, language: string, maxDistance = this.maxDistance): Promise<Suggestion> {
        return this.lookup(input, language, maxDistance, 1)
            .then((suggestions) =>
                suggestions != null && suggestions.length > 0 ? suggestions[0] : null);
    }

    async clear() {
        await this.store.clear();
    }
}

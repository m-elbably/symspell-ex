import {expect} from "chai";
import {before, describe, it} from "mocha"
import {SymSpellEx, DataStore, MemoryStore} from "../../src";
import {basicTerms} from "../data";
import {DamerauLevenshteinDistance} from "../../src/editDistance";

enum Language {
    English = 'en',
    Arabic = 'ar'
};

let store: DataStore;
let symSpellEx: SymSpellEx;

const {EN_TERMS, EN_INV_TERMS} = basicTerms;

before(async () => {
    store = new MemoryStore();
    await store.initialize();
});

describe('Testing SymSpellEx instance creation', () => {
    it('Should have new instance created with all required params in constructor', async () => {
        const editDistance = 3;
        const maxSuggestions = 10;
        symSpellEx = new SymSpellEx(store, new DamerauLevenshteinDistance(), editDistance, maxSuggestions);

        for (let i = 0; i < EN_TERMS.length; i += 1) {
            await symSpellEx.add(EN_TERMS[i], Language.English);
        }

        const suggestion = await symSpellEx.correct("acaddemqicaly", Language.English);

        expect(symSpellEx.editDistance)
            .to.be.a('object')
            .and.to.instanceof(DamerauLevenshteinDistance);

        expect(symSpellEx.maxDistance)
            .to.be.a('number')
            .and.equal(editDistance);

        expect(symSpellEx.maxSuggestions)
            .to.be.a('number')
            .and.equal(maxSuggestions);

        expect(suggestion)
            .to.be.a('object')
            .and.to.haveOwnProperty('distance')
            .equal(3);
    });
});

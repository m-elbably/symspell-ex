import {expect} from "chai";
import {before, describe, it} from "mocha"
import {SymSpellEx, DataStore, MemoryStore} from "../../src";
import {basicTerms} from '../data';

enum Language {
    English = 'en',
    Arabic = 'ar'
}

let store: DataStore;
let symSpellEx: SymSpellEx;

const {
    EN_TERMS, EN_INV_TERMS,
    AR_TERMS, AR_INV_TERMS
} = basicTerms;

before(async () => {
    // Create store and symSpellEx instance
    store = new MemoryStore();
    await store.initialize();
    symSpellEx = new SymSpellEx(store);
    await symSpellEx.store.clear();
});

describe('test memory store functionalities', () => {
    it('Should have new terms added after training', async () => {
        for (let i = 0; i < EN_TERMS.length; i += 1) {
            await symSpellEx.add(EN_TERMS[i], Language.English);
        }

        const firstEntry = await symSpellEx.store.getTermAt(0);
        const lastEntry = await symSpellEx.store.getTermAt(EN_TERMS.length - 1);

        expect(firstEntry).to.be.a('string')
            .and.equal(EN_TERMS[0]);

        expect(lastEntry).to.be.a('string')
            .and.equal(EN_TERMS[EN_TERMS.length - 1]);
    });

    it('Should have entry for selected term with frequency 1', async () => {
        const entry = await symSpellEx.store.getEntry(EN_TERMS[2]);
        expect(entry)
            .to.be.an('array')
            .and.length(1);
    });

    it('Should return true if entry already exists when checking with hasEntry', async () => {
        const entryExists = await symSpellEx.store.hasEntry(EN_TERMS[1]);
        expect(entryExists)
            .to.be.a('boolean')
            .and.equal(true);
    });

    it('Should return false if entry does not exists when checking with hasEntry', async () => {
        const entryExists = await symSpellEx.store.hasEntry(`${EN_TERMS[1]}+`);
        expect(entryExists)
            .to.be.a('boolean')
            .and.equal(false);
    });

    it('Should get multiple entries returned using getManyEntries', async () => {
        const entries = await symSpellEx.store.getManyEntries([EN_TERMS[1], EN_TERMS[2]]);
        expect(entries)
            .to.be.an('array')
            .and.length(2);
    });

    it('Should return largest entry length', async () => {
        const maxEntryLength = await symSpellEx.store.maxEntryLength();
        expect(maxEntryLength)
            .to.be.a('number')
            .and.equal(12);
    });

    it('Should have terms and entries for another language as undefined', async () => {
        await symSpellEx.store.setLanguage(Language.Arabic);
        const term = await symSpellEx.store.getTermAt(0);
        const entry = await symSpellEx.store.getEntry(EN_TERMS[0]);

        expect(term).to.be.null;
        expect(entry).to.be.null;
    });

    it('Should have terms for arabic language added', async () => {
        for (let i = 0; i < AR_TERMS.length; i += 1) {
            await symSpellEx.add(AR_TERMS[i], Language.Arabic);
        }

        const firstEntry = await symSpellEx.store.getTermAt(0);
        const lastEntry = await symSpellEx.store.getTermAt(AR_TERMS.length - 1);

        expect(firstEntry).to.be.a('string')
            .and.equal(AR_TERMS[0]);

        expect(lastEntry).to.be.a('string')
            .and.equal(AR_TERMS[AR_TERMS.length - 1]);
    });

    it('Should have all terms and entries cleared', async () => {
        await symSpellEx.store.clear();
        const term = await symSpellEx.store.getTermAt(0);
        const entry = await symSpellEx.store.getEntry(EN_TERMS[0]);

        expect(term).to.be.null;
        expect(entry).to.be.null;
    });
});

describe('Testing memory store spelling search and correction', () => {
    before(async () => {
        await symSpellEx.store.clear();
        for (let i = 0; i < EN_TERMS.length; i += 1) {
            await symSpellEx.add(EN_TERMS[i], Language.English);
        }

        for (let i = 0; i < AR_TERMS.length; i += 1) {
            await symSpellEx.add(AR_TERMS[i], Language.Arabic);
        }
    });

    it('Should return list of suggestions', async () => {
        const suggestions = await symSpellEx.search(EN_INV_TERMS[1], Language.English);

        expect(suggestions)
            .to.be.an('array')
            .with.length(1);

        expect(suggestions[0])
            .to.be.an('object')
            .with.ownProperty('term')
            .equal(EN_TERMS[1]);

        expect(suggestions[0])
            .to.be.an('object')
            .with.ownProperty('distance')
            .equal(2);

        expect(suggestions[0])
            .to.be.an('object')
            .with.ownProperty('frequency')
            .equal(1);
    });

    it('Should return list of suggestions after changing language', async () => {
        const suggestions = await symSpellEx.search(AR_INV_TERMS[1], Language.Arabic);

        expect(suggestions)
            .to.be.an('array')
            .with.length(1);

        expect(suggestions[0])
            .to.be.an('object')
            .with.ownProperty('term')
            .equal(AR_TERMS[1]);

        expect(suggestions[0])
            .to.be.an('object')
            .with.ownProperty('distance')
            .equal(2);

        expect(suggestions[0])
            .to.be.an('object')
            .with.ownProperty('frequency')
            .equal(1);
    });

    it('Should return the correct suggestion for provided term', async () => {
        const suggestion = await symSpellEx.correct(EN_INV_TERMS[2], Language.English);

        expect(suggestion)
            .to.be.an('object')
            .with.ownProperty('term')
            .equal(EN_TERMS[2]);

        expect(suggestion)
            .to.be.an('object')
            .with.ownProperty('distance')
            .equal(2);

        expect(suggestion)
            .to.be.an('object')
            .with.ownProperty('frequency')
            .equal(1);
    });

    it('Should return the correct suggestion for provided term after changing language', async () => {
        const suggestion = await symSpellEx.correct(AR_INV_TERMS[0], Language.Arabic);

        expect(suggestion)
            .to.be.an('object')
            .with.ownProperty('term')
            .equal(AR_TERMS[0]);

        expect(suggestion)
            .to.be.an('object')
            .with.ownProperty('distance')
            .equal(1);

        expect(suggestion)
            .to.be.an('object')
            .with.ownProperty('frequency')
            .equal(1);
    });

    it('Should return "null" suggestion with default maxDistance = 2', async () => {
        const suggestion = await symSpellEx.correct(AR_INV_TERMS[2], Language.Arabic);

        expect(suggestion)
            .to.be.null;
    });

    it('Should return the correct suggestion for provided term with maxDistance = 3', async () => {
        const suggestion = await symSpellEx.correct(AR_INV_TERMS[2], Language.Arabic, 3);

        expect(suggestion)
            .to.be.an('object')
            .with.ownProperty('term')
            .equal(AR_TERMS[2]);

        expect(suggestion)
            .to.be.an('object')
            .with.ownProperty('distance')
            .equal(3);

        expect(suggestion)
            .to.be.an('object')
            .with.ownProperty('frequency')
            .equal(1);
    });
});

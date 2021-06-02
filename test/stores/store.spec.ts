import {expect} from "chai";
import {before, after, describe, it} from "mocha"
import {SymSpellEx, DataStore} from "../../src";
import {TERMS} from '../data';
import {Languages} from "../../src";

const {
    EN: {VALID: enValidTerms, INVALID: enInvalidTerms},
    AR: {VALID: arValidTerms, INVALID: arInvalidTerms}
} = TERMS;

export function executeStoreTest(symSpellEx: SymSpellEx,
                                 store: DataStore,
                                 beforeHook?: {(): Promise<void>},
                                 afterHook?: {(): Promise<void>}) {
    before(beforeHook);
    if(afterHook != null) {
        after(afterHook);
    }

    describe('Test store internals', () => {
        it('Should have store initialized after initialization', async () => {
            await store.initialize();

            expect(store.isInitialized())
                .to.be.a('boolean')
                .equal(true);
        });
    });

    describe('Test store functionalities', () => {
        it('Should have new terms added after training', async () => {
            for (let i = 0; i < enValidTerms.length; i += 1) {
                await symSpellEx.add(enValidTerms[i], 1, Languages.ENGLISH);
            }

            const firstEntry = await symSpellEx.store.getTermAt(0);
            const lastEntry = await symSpellEx.store.getTermAt(enValidTerms.length - 1);

            expect(firstEntry).to.be.a('string')
                .and.equal(enValidTerms[0]);

            expect(lastEntry).to.be.a('string')
                .and.equal(enValidTerms[enValidTerms.length - 1].toLowerCase());
        });

        it('Should have entry for selected term with frequency 1', async () => {
            const entry = await symSpellEx.store.getEntry(enValidTerms[2]);
            expect(entry)
                .to.be.an('array')
                .and.length(1);
        });

        it('Should return true if entry already exists when checking with hasEntry', async () => {
            const entryExists = await symSpellEx.store.hasEntry(enValidTerms[1]);
            expect(entryExists)
                .to.be.a('boolean')
                .and.equal(true);
        });

        it('Should return false if entry does not exists when checking with hasEntry', async () => {
            const entryExists = await symSpellEx.store.hasEntry(`${enValidTerms[1]}+`);
            expect(entryExists)
                .to.be.a('boolean')
                .and.equal(false);
        });

        it('Should get multiple entries returned using getManyEntries', async () => {
            const entries = await symSpellEx.store.getEntries([enValidTerms[1], enValidTerms[2]]);
            expect(entries)
                .to.be.an('array')
                .and.length(2);
        });

        it('Should return largest entry length when calling maxEntryLength', async () => {
            const maxEntryLength = await symSpellEx.store.maxEntryLength();
            expect(maxEntryLength)
                .to.be.a('number')
                .and.equal(15);
        });

        it('Should have terms and entries for another language as undefined', async () => {
            await symSpellEx.store.setLanguage(Languages.ARABIC);
            const term = await symSpellEx.store.getTermAt(0);
            const entry = await symSpellEx.store.getEntry(enValidTerms[0]);

            expect(term).to.be.null;
            expect(entry).to.be.null;
        });

        it('Should have terms for arabic language added', async () => {
            for (let i = 0; i < arValidTerms.length; i += 1) {
                await symSpellEx.add(arValidTerms[i], 1, Languages.ARABIC);
            }

            const firstEntry = await symSpellEx.store.getTermAt(0);
            const lastEntry = await symSpellEx.store.getTermAt(arValidTerms.length - 1);

            expect(firstEntry).to.be.a('string')
                .and.equal(arValidTerms[0]);

            expect(lastEntry).to.be.a('string')
                .and.equal(arValidTerms[arValidTerms.length - 1]);
        });

        it('Should have all terms and entries cleared', async () => {
            await symSpellEx.store.clear();
            const term = await symSpellEx.store.getTermAt(0);
            const entry = await symSpellEx.store.getEntry(enValidTerms[0]);

            expect(term).to.be.null;
            expect(entry).to.be.null;
        });
    });

    describe('Testing store spelling search and correction', () => {
        before(async () => {
            await symSpellEx.store.clear();
            for (let i = 0; i < enValidTerms.length; i += 1) {
                await symSpellEx.add(enValidTerms[i], 1, Languages.ENGLISH);
            }

            for (let i = 0; i < arValidTerms.length; i += 1) {
                await symSpellEx.add(arValidTerms[i], 1, Languages.ARABIC);
            }
        });

        it('Should return list of suggestions', async () => {
            const suggestions = await symSpellEx.search(enInvalidTerms[1], Languages.ENGLISH);

            expect(suggestions)
                .to.be.an('array')
                .with.length(1);

            expect(suggestions[0])
                .to.be.an('object')
                .with.ownProperty('term')
                .equal(enInvalidTerms[1]);

            expect(suggestions[0])
                .to.be.an('object')
                .with.ownProperty('suggestion')
                .equal(enValidTerms[1]);

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
            const correction = await symSpellEx.correct(enInvalidTerms[2], Languages.ENGLISH);

            expect(correction)
                .to.be.an('object')
                .with.ownProperty('input')
                .equal(enInvalidTerms[2]);

            expect(correction)
                .to.be.an('object')
                .with.ownProperty('output')
                .equal(enValidTerms[2]);

            expect(correction)
                .to.be.an('object')
                .with.ownProperty('suggestions')
                .to.be.an('array')
                .with.length(1);

            expect(correction.suggestions[0])
                .to.be.an('object')
                .with.ownProperty('term')
                .equal(enInvalidTerms[2]);

            expect(correction.suggestions[0])
                .to.be.an('object')
                .with.ownProperty('suggestion')
                .equal(enValidTerms[2]);

            expect(correction.suggestions[0])
                .to.be.an('object')
                .with.ownProperty('distance')
                .equal(2);

            expect(correction.suggestions[0])
                .to.be.an('object')
                .with.ownProperty('frequency')
                .equal(1);
        });

        it('Should return list of suggestions after changing language', async () => {
            const suggestions = await symSpellEx.search(arInvalidTerms[1], Languages.ARABIC);

            expect(suggestions)
                .to.be.an('array')
                .with.length(1);

            expect(suggestions[0])
                .to.be.an('object')
                .with.ownProperty('term')
                .equal(arInvalidTerms[1]);

            expect(suggestions[0])
                .to.be.an('object')
                .with.ownProperty('suggestion')
                .equal(arValidTerms[1]);

            expect(suggestions[0])
                .to.be.an('object')
                .with.ownProperty('distance')
                .equal(2);

            expect(suggestions[0])
                .to.be.an('object')
                .with.ownProperty('frequency')
                .equal(1);
        });

        it('Should return the correct suggestion for provided term after changing language', async () => {
            const correction = await symSpellEx.correct(arInvalidTerms[0], Languages.ARABIC);

            expect(correction)
                .to.be.an('object')
                .with.ownProperty('input')
                .equal(arInvalidTerms[0]);

            expect(correction)
                .to.be.an('object')
                .with.ownProperty('output')
                .equal(arValidTerms[0]);

            expect(correction)
                .to.be.an('object')
                .with.ownProperty('suggestions')
                .to.be.an('array')
                .with.length(1);

            expect(correction.suggestions[0])
                .to.be.an('object')
                .with.ownProperty('term')
                .equal(arInvalidTerms[0]);

            expect(correction.suggestions[0])
                .to.be.an('object')
                .with.ownProperty('suggestion')
                .equal(arValidTerms[0]);

            expect(correction.suggestions[0])
                .to.be.an('object')
                .with.ownProperty('distance')
                .equal(1);

            expect(correction.suggestions[0])
                .to.be.an('object')
                .with.ownProperty('frequency')
                .equal(1);
        });

        it('Should return "null" suggestion with default maxDistance = 2', async () => {
            const correction = await symSpellEx.correct(arInvalidTerms[2], Languages.ARABIC);

            expect(correction)
                .to.be.an('object')
                .with.ownProperty('input')
                .equal(arInvalidTerms[2]);

            expect(correction)
                .to.be.an('object')
                .with.ownProperty('output')
                .equal(arInvalidTerms[2]);

            expect(correction)
                .to.be.an('object')
                .with.ownProperty('suggestions')
                .to.be.an('array')
                .with.length(1);

            expect(correction.suggestions[0])
                .to.be.an('object')
                .with.ownProperty('term')
                .equal(arInvalidTerms[2]);

            expect(correction.suggestions[0])
                .to.be.an('object')
                .with.ownProperty('suggestion')
                .to.be.null;

            expect(correction.suggestions[0])
                .to.be.an('object')
                .with.ownProperty('distance')
                .equal(0);

            expect(correction.suggestions[0])
                .to.be.an('object')
                .with.ownProperty('frequency')
                .equal(0);
        });

        it('Should return the correct suggestion for provided term with maxDistance = 3', async () => {
            const correction = await symSpellEx.correct(arInvalidTerms[2], Languages.ARABIC, 3);

            expect(correction)
                .to.be.an('object')
                .with.ownProperty('input')
                .equal(arInvalidTerms[2]);

            expect(correction)
                .to.be.an('object')
                .with.ownProperty('output')
                .equal(arValidTerms[2]);

            expect(correction)
                .to.be.an('object')
                .with.ownProperty('suggestions')
                .to.be.an('array')
                .with.length(1);

            expect(correction.suggestions[0])
                .to.be.an('object')
                .with.ownProperty('term')
                .equal(arInvalidTerms[2]);

            expect(correction.suggestions[0])
                .to.be.an('object')
                .with.ownProperty('suggestion')
                .equal(arValidTerms[2]);

            expect(correction.suggestions[0])
                .to.be.an('object')
                .with.ownProperty('distance')
                .equal(3);

            expect(correction.suggestions[0])
                .to.be.an('object')
                .with.ownProperty('frequency')
                .equal(1);
        });
    });
}

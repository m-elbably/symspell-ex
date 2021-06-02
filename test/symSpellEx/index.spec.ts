import {expect} from "chai";
import {before, describe, it} from "mocha"
import {SymSpellEx, DataStore, MemoryStore} from "../../src";
import {TERMS, SENTENCES} from "../data";
import {DamerauLevenshteinDistance} from "../../src";
import {CoreTokenizer} from "../../src/core/nlp/tokenizers";
import {Languages} from "../../src";

let store: DataStore;
let symSpellEx: SymSpellEx;
const {
    EN: {VALID: enValidTerms, INVALID: enInvalidTerms},
    AR: {VALID: arValidTerms, INVALID: arInvalidTerms}
} = TERMS;

const {
    EN: {VALID: enValidSentences, INVALID: enInvalidSentences},
    AR: {VALID: arValidSentences, INVALID: arInvalidSentences}
} = SENTENCES;

before(async () => {
    store = new MemoryStore();
});

describe('Testing SymSpellEx instance creation', () => {
    it('Should have new instance initialized after initialization', async () => {
        symSpellEx = new SymSpellEx(store);
        await symSpellEx.initialize();

        expect(symSpellEx.isInitialized())
            .to.be.a('boolean')
            .equal(true);
    });

    it('Should return false if new instance is not initialized', async () => {
        symSpellEx = new SymSpellEx(store);
        expect(symSpellEx.isInitialized())
            .to.be.a('boolean')
            .equal(false);
    });

    it('Should return an error if new instance is not initialized', async () => {
        try {
            symSpellEx = new SymSpellEx(store);
            await symSpellEx.clear();
        } catch (e){
            expect(e)
                .to.be.an('Error')
                .with.ownProperty('message')
                .equal('SymSpellEx must be initialized, Please call initialize() first');
        }
    });

    it('Should have new instance created with all required params in constructor', async () => {
        const editDistance = 3;
        const maxSuggestions = 10;
        symSpellEx = new SymSpellEx(
            store,
            new DamerauLevenshteinDistance(),
            new CoreTokenizer(),
            editDistance,
            maxSuggestions
        );
        await symSpellEx.initialize();

        for (let i = 0; i < enValidTerms.length; i += 1) {
            await symSpellEx.add(enValidTerms[i], 1, Languages.ENGLISH);
        }

        const correction = await symSpellEx.correct("acaddemqicaly", Languages.ENGLISH);

        expect(symSpellEx.editDistance)
            .to.be.an('object')
            .and.to.instanceof(DamerauLevenshteinDistance);

        expect(symSpellEx.maxDistance)
            .to.be.a('number')
            .and.equal(editDistance);

        expect(symSpellEx.maxSuggestions)
            .to.be.a('number')
            .and.equal(maxSuggestions);

        expect(correction)
            .to.be.an('object')
            .and.to.haveOwnProperty('suggestions')
            .to.be.an('array')
            .with.length(1);

        expect(correction.suggestions[0])
            .to.be.an('object')
            .and.to.haveOwnProperty('distance')
            .to.be.equal(3);
    });
});

describe('Testing SymSpellEx core tokenizer', () => {
    it('Should have new instance created with all required params in constructor', async () => {
        const tokenizer = new CoreTokenizer();
        const tokens = await tokenizer.tokenize(enValidSentences[0]);

        expect(tokens)
            .to.be.an('array')
            .with.length(22);

        expect(tokens[21])
            .to.be.an('object')
            .with.ownProperty('value')
            .equal('.');

        expect(tokens[21])
            .to.be.an('object')
            .with.ownProperty('tag')
            .equal('punctuation');
    });
});

describe('Testing SymSpellEx basic corrections', () => {
    it('Should have new instance created with all required params in constructor', async () => {
        symSpellEx = new SymSpellEx(store);
        await symSpellEx.initialize();

        for (let i = 0; i < enValidTerms.length; i += 1) {
            await symSpellEx.add(enValidTerms[i], 1, Languages.ENGLISH);
        }

        const sNormal = await symSpellEx.correct("academically", Languages.ENGLISH);
        const sCase = await symSpellEx.correct("Academically", Languages.ENGLISH);

        expect(sNormal)
            .to.be.an('object')
            .with.ownProperty('suggestions')
            .to.be.an('array')
            .with.length(1);

        expect(sCase)
            .to.be.an('object')
            .with.ownProperty('suggestions')
            .to.be.an('array')
            .with.length(1);

        expect(sNormal.suggestions[0])
            .to.be.an('object')
            .and.to.haveOwnProperty('distance')
            .equal(0);

        expect(sCase.suggestions[0])
            .to.be.an('object')
            .and.to.haveOwnProperty('distance')
            .equal(0);

        expect(sNormal.output)
            .to.be.equal(sCase.output);
    });
});

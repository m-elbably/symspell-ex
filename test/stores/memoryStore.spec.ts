import {SymSpellEx, MemoryStore} from "../../src";
import {executeStoreTest} from './store.spec';

const store = new MemoryStore();
const symSpellEx = new SymSpellEx(store);

executeStoreTest(
    symSpellEx,
    store,
    async () => {
        await symSpellEx.initialize();
        await symSpellEx.store.clear();
    });

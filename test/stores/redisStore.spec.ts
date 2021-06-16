import {SymSpellEx, RedisStore} from "../../src";
import {Redis, RedisConfig} from "../../src";
import {executeStoreTest} from "./store.spec";

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;

const redis = new Redis(new RedisConfig(redisHost, redisPort));
const store = new RedisStore(redis.instance); ;
let symSpellEx = new SymSpellEx(store);

executeStoreTest(
    symSpellEx,
    store,
    async () => {
        await symSpellEx.initialize();
        await symSpellEx.store.clear();
    },
    async () => {
        await redis.disconnect();
    });

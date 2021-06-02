import {expect} from "chai";
import {before, after, describe, it} from "mocha"
import {SymSpellEx, DataStore, MemoryStore} from "../../src";
import {Redis, RedisConfig} from "../../src/core/redis/database";
import {Languages, RedisStore} from "../../src";

let redis: any;
let store: DataStore;
let symSpellEx: SymSpellEx;

before(async () => {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;

    redis = new Redis(new RedisConfig(redisHost, redisPort));
    store = new RedisStore(redis.instance);

    // store = new MemoryStore();
    symSpellEx = new SymSpellEx(store);
    await symSpellEx.initialize();
});

after(async () => {
   if(redis != null) {
       redis.disconnect();
   }
});

describe('Testing SymSpellEx instance creation', () => {
    it('Should have new instance created with all required params in constructor', async () => {
        const sentence = 'بدا كرين في كتابة روايتته الحوحش في يونيو عام 1897، وفي ذلك الحين كان يعيشوا مع رفيقة دربه كرا تايلر في أكستد في إنجلتراا. على الرغط من النجاح البباهر الذيت حققته الرواية في الولايات المتحدا وإنجمترا، كان كرين يواجه مشاكل ماديخ - هذا المقل من ويكبديه www.wikipedia.com - الصحافى ->> أحمد ابراهيم';
        const sentence2 = 'Special relatvity was orignally proposed by Albert Einstein';
        const correction = await symSpellEx.correct(sentence2, Languages.ENGLISH);

        expect(correction)
            .to.be.an('object');
            // .and.to.haveOwnProperty('distance')
            // .equal(3);
    });
});

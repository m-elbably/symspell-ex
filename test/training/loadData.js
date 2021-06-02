const fs = require('fs');
const {Redis, RedisConfig} = require('../../lib/core/redis/database');
const {SymSpellEx, RedisStore, MemoryStore} = require('../../lib');
const {Languages} = require('../../lib/core/constants');

let redis;
let store;
let symSpellEx;
const SOURCE = './data/dictionaries/english-freq.dat';
const VALIDATION_SRC = './data/spelling-validation/arabic.txt';

async function init() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;

    redis = new Redis(new RedisConfig(redisHost, redisPort));
    store = new RedisStore(redis.instance);

    // store = new MemoryStore();
    symSpellEx = new SymSpellEx(store);
    await symSpellEx.initialize();
}

async function loadData() {
    await symSpellEx.store.clear();
    const data = fs.readFileSync(SOURCE, 'utf8').split(/\n/);

    const max = 500000;
    for (let i=0; i < max; i += 1) {
        const [term, frequency] = data[i].split(/,/);
        if(i === 483) {
            console.log(`${Math.round(i/max * 100 * 100) / 100}%`);
        }

        await symSpellEx.add(term, parseInt(frequency), Languages.ENGLISH);

        if(i % 10000 === 1) {
            console.log(`${Math.round(i/max * 100 * 100) / 100}%`);
        }
    }

    await symSpellEx.store.flush();
}

async function processData() {
    await init();
    await loadData();

    // Load test data
    const rows = fs.readFileSync(VALIDATION_SRC, 'utf8').split(/\n/);
    const data = [];

    for (let i=0; i < rows.length; i += 1) {
        if(rows[i] == null) continue;

        const [a, b] = rows[i].split(/\t/);
        if(a == null || b == null) continue;
        data.push({
           rightTerm: b.trim(),
           wrongTerm: a.trim()
        });
    }

    console.log('Testing');
    const timeStart = process.hrtime();

    let termsCount = 0;
    let accurateChecks = 0;
    for(let i=0 ; i < data.length; i += 1) {
        const entry = data[i];
        const result = await symSpellEx.lookup(entry.wrongTerm, Languages.ARABIC,2,1);

        if(result.length > 0){
            if(result[0].suggestion === entry.rightTerm) {
                accurateChecks += 1;
            } else {
                // console.log(entry.rightTerm);
            }
        }

        termsCount++;
    }

    const hrtime = process.hrtime(timeStart);
    const elapsed = hrtime[0] * 1e3 + hrtime[1] / 1e6;

    console.log(`Checked: ${termsCount}, with accuracy: ${(accurateChecks/termsCount * 100).toFixed(2)}%`)
    console.log(`Elapsed Time: ${Math.round(elapsed * 100) / 100} ms`);

    await redis.disconnect();
}

processData();

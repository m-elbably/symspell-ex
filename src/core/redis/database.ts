import IoRedis from 'ioredis';

const RETRY_COUNT = 15;
const RETRY_DELAY = 100;
const RETRY_DELAY_MIN = 2000;

export class RedisConfig {
    host: string;
    port: number = 6379;
    password: string;
    db: number = 0;
    onConnected: () => void;

    constructor(host: string, port: number, password?: string, db: number = 0) {
        this.host = host;
        this.port = port;
        this.password = password;
        this.db = db;
    }
}

export class Redis {
    _config: any;
    _db: IoRedis.Redis;
    _isConnected = false;

    /**
     *
     * @param config
     * {
     *     host: {type: 'string'},
     *     port: {type: 'number'},
     *     password: {type: 'string'},
     *     db: {type: 'number'},
     *     onConnected: {type: 'function'}
     * }
     */
    constructor(config: RedisConfig) {
        // @ts-ignore
        const {host, port, password, db} = config;

        this._config = {
            host,
            port,
            password,
            db,
            enableReadyCheck: true,
            lazyConnect: true,
            retryStrategy: (times: number) => {
                const delay = Math.min(times * RETRY_DELAY, RETRY_DELAY_MIN);
                if (times <= RETRY_COUNT) {
                    return delay;
                }
                return false;
            }
        };

        const self = this;
        this._db = new IoRedis(this._config);
        this._db.on('ready', async () => {
            // console.log('Connected to redis');
            self._isConnected = true;
        });
    }

    async connect() {
        return this._db.connect();
    }

    async isConnected() {
        return this._isConnected;
    }

    async disconnect() {
        return this._db.disconnect();
    }

    get instance() {
        return this._db;
    }
}

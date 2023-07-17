import config from "../config/index.js";
import {createClient} from "redis";
import {saveError} from "../error/saveError.js";

const client = createClient({
    url: config.redis.url,
    password: config.redis.password,
});
try {
    await client.connect();
} catch (e) {
    saveError(e);
}

client.on('error', err => {
    console.log('Redis Server Error', err);
    saveError(err);
});

export default client;

export async function redisKeyExist(key) {
    try {
        if (!client.isReady) {
            return false;
        }
        return (await client.exists(key)) === 1;
    } catch (error) {
        saveError(error);
        return false;
    }
}

export async function getRedis(key) {
    try {
        if (!client.isReady) {
            return null;
        }
        return JSON.parse(await client.get(key));
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function setRedis(key, value, duration = null) {
    try {
        if (!client.isReady) {
            return 'error';
        }
        if (duration) {
            return await client.set(key, JSON.stringify(value), {EX: duration});
        } else {
            return await client.set(key, JSON.stringify(value));
        }
    } catch (error) {
        saveError(error);
        return 'error';
    }
}
import config from "../config/index.js";
import {createClient} from "redis";
import {saveError} from "../error/saveError.js";

const client = createClient({
    url: config.dataBases.redis.url,
    password: config.dataBases.redis.password,
});

try {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await client.connect();
} catch (e) {
    // saveError(e); //todo :
}

client.on('error', err => {
    console.log('Redis Server Error', err);
    saveError(err);
});

export default client;

//-----------------------------------------------------
//-----------------------------------------------------

export async function clearRedisRedundantCachedData(retryCounter = 0) {
    try {
        if (!client.isReady) {
            if (retryCounter === 0) {
                retryCounter++;
                await new Promise(resolve => setTimeout(resolve, 3000));
                return await clearRedisRedundantCachedData(retryCounter);
            }
            return false;
        }
        await Promise.allSettled([
            client.del('someKey'),
        ]);
        return 'ok';
    } catch (error) {
        if (retryCounter === 0) {
            retryCounter++;
            await new Promise(resolve => setTimeout(resolve, 3000));
            return await clearRedisRedundantCachedData(retryCounter);
        }
        saveError(error);
        return 'error';
    }
}

//-----------------------------------------------------
//-----------------------------------------------------

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
    //duration: seconds
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
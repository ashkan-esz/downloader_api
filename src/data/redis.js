import config from "../config/index.js";
import {createClient} from "redis";
import {saveError} from "../error/saveError.js";

const client = createClient({
    url: config.redis.url,
    password: config.redis.password,
});
await client.connect();

client.on('error', err => {
    console.log('Redis Server Error', err);
    saveError(err);
});

export default client;

export async function getRedis(key) {
    try {
        return JSON.parse(await client.get(key));
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function setRedis(key, value) {
    try {
        return await client.set(key, JSON.stringify(value));
    } catch (error) {
        saveError(error);
        return 'error';
    }
}
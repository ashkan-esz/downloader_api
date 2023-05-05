import {createClient} from "redis";
import {saveError} from "../error/saveError.js";

const url = process.env.REDIS_URL;

const client = createClient({
    url: url,
});

if (url) {
    await client.connect();
}

client.on('error', err => {
    console.log('Redis Server Error', err);
    saveError(err);
});

export default client;

export async function getRedis(key) {
    if (!url) {
        return null;
    }
    try {
        return JSON.parse(await client.get(key));
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function setRedis(key, value) {
    if (!url) {
        return 'error';
    }
    try {
        return await client.set(key, JSON.stringify(value));
    } catch (error) {
        saveError(error);
        return 'error';
    }
}
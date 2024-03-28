import {blurHashBindingKey, blurHashExchange, rabbitmqPublishChannel} from "./rabbitmq.js";
import {saveError} from "../src/error/saveError.js";

export async function addBlurHashToQueue(type, id, url) {
    //downloader_gochat project consume this and generate/save blurHash for the image
    try {
        let msg = {
            type: type,
            id: id.toString(),
            url: url,
        };
        rabbitmqPublishChannel.publish(blurHashExchange, blurHashBindingKey, Buffer.from(JSON.stringify(msg)), {
            persistent: true,
        });
    } catch (error) {
        saveError(error);
    }
}
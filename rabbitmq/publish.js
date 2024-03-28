import config from "../src/config/index.js";
import {blurHashBindingKey, blurHashExchange, rabbitmqPublishChannel} from "./rabbitmq.js";
import {saveError} from "../src/error/saveError.js";

export const blurHashTypes = Object.freeze({
    staff: "staff",
    character: "character",
    movie: "movie",
    movieS3: "movieS3",
    movieWideS3: "movieWideS3",
});

export async function addBlurHashToQueue(type, id, url) {
    if (!config.rabbitmqUrl) {
        return;
    }
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
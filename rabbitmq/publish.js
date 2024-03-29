import config from "../src/config/index.js";
import {
    blurHashBindingKey,
    blurHashExchange,
    emailBindingKey,
    emailExchange,
    rabbitmqPublishChannel
} from "./rabbitmq.js";
import {saveError} from "../src/error/saveError.js";

export const blurHashTypes = Object.freeze({
    staff: "staff",
    character: "character",
    movie: "movie",
    movieS3: "movieS3",
    movieWideS3: "movieWideS3",
});

export const emailTypes = Object.freeze({
    userRegistration: "registration email",
    userLogin: "login email",
    passwordUpdated: "password updated",
    resetPassword: "reset password",
    verifyEmail: "verify email",
    deleteAccount: "delete account",
});

//type EmailQueueData struct {
// 	Type        EmailType         `json:"type"`
// 	UserId      int64             `json:"userId"`
// 	RawUsername string            `json:"rawUsername"`
// 	Email       string            `json:"email"`
// 	Token       string            `json:"token"`
// 	Host        string            `json:"host"`
// 	Url         string            `json:"url"`
// 	DeviceInfo  *model.DeviceInfo `json:"deviceInfo"`
// 	IpLocation  string            `json:"ipLocation"`
// }

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

export async function addEmailToQueue(type, id, url, expiration) {
    if (!config.rabbitmqUrl) {
        return;
    }
    //downloader_email project consume this and send email
    try {
        let msg = {
            type: type,
            id: id.toString(),
            url: url,
        };
        rabbitmqPublishChannel.publish(emailExchange, emailBindingKey, Buffer.from(JSON.stringify(msg)), {
            persistent: true,
        });
    } catch (error) {
        saveError(error);
    }
}
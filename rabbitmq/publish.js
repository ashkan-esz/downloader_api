import config from "../src/config/index.js";
import {
    blurHashBindingKey,
    blurHashExchange,
    emailBindingKey,
    emailExchange, notificationBindingKey, notificationExchange,
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

export const movieNotificationTypes = Object.freeze({
    finishedListSpinOffSequel: 1,
    followingMovie: 2,
    followMovieBetterQuality: 3,
    followMovieSubtitle: 4,
    futureList: 5,
    futureListSerialSeasonEnd: 6,
    futureListSubtitle: 7,
});

const movieNotifAction = "movie-notification"


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

export async function addMovieNotificationToQueue(movieId, moviePoster, type, receiverId, message) {
    if (!config.rabbitmqUrl) {
        return;
    }
    //downloader_gochat project consume this and send notification and push-notification

    // type NotificationDataModel struct {
    //     Id              int64           `gorm:"column:id;" json:"id"`
    //     CreatorId       int64           `gorm:"column:creatorId;" json:"creatorId"`
    //     ReceiverId      int64           `gorm:"column:receiverId;" json:"receiverId"`
    //     Date            time.Time       `gorm:"column:date;" json:"date"`
    //     Status          int             `gorm:"column:status;" json:"status"` //1: saved, 2: seen
    //	   Message         string          `gorm:"column:message;" json:"message"`
    //     EntityId        int64           `gorm:"column:entityId;" json:"entityId"`
    //     EntityTypeId    int             `gorm:"column:entityTypeId;" json:"entityTypeId"`
    //     SubEntityTypeId SubEntityTypeId `gorm:"column:subEntityTypeId" json:"subEntityTypeId"`
    //     CreatorImage    string          `json:"creatorImage"`
    // }

    try {
        let msg = {
            action: movieNotifAction,
            notificationData: {
                entityId: movieId,
                entityTypeId: 3,
                subEntityTypeId: type,
                creatorId: receiverId,
                receiverId: receiverId,
                date: new Date(),
                message: message,
                creatorImage: moviePoster,
            },
        };
        rabbitmqPublishChannel.publish(notificationExchange, notificationBindingKey, Buffer.from(JSON.stringify(msg)), {
            persistent: true,
        });
    } catch (error) {
        saveError(error);
    }
}
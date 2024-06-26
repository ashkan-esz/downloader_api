import config from "../src/config/index.js";
import amqp from "amqplib"
import {saveError} from "../src/error/saveError.js";

export const blurHashQueue = "blurHash";
export const blurHashBindingKey = "blurHash";
export const blurHashExchange = "blurHashExchange";
export const blurHashExchangeType = "direct";

//-----------------------------
export const emailQueue = "email";
export const emailBindingKey = "email";
export const emailExchange = "EmailExchange";
export const emailExchangeType = "direct";
//-----------------------------

export const notificationQueue = "notification";
export const notificationBindingKey = "notification";
export const notificationExchange = "NotificationExchange";
export const notificationExchangeType = "direct";
//-----------------------------

export let rabbitmqPublishChannel = null
export let rabbitmqConsumeChannel = null

startRabbitmq();

export async function startRabbitmq() {
    let tryCounter = 0
    while (true) {
        try {
            tryCounter++;
            await new Promise(resolve => setTimeout(resolve, 10 * 1000));
            const connection = await amqp.connect(config.rabbitmqUrl)
            rabbitmqPublishChannel = await connection.createChannel();
            rabbitmqConsumeChannel = await connection.createChannel();

            process.once("SIGINT", async () => {
                await rabbitmqPublishChannel.close();
                await rabbitmqConsumeChannel.close();
                await connection.close();
            });

            await createExchangesAndQueues(rabbitmqPublishChannel)

            await rabbitmqConsumeChannel.prefetch(1);
            await createConsumers(rabbitmqConsumeChannel);
            break;
        } catch (error) {
            if (tryCounter > 10) {
                break;
            }
            if (error.code !== "ECONNREFUSED" || tryCounter > 9) {
                saveError(error)
            }
        }
    }
}

async function createExchangesAndQueues(channel) {
    // blurHash queue
    await channel.assertExchange(blurHashExchange, blurHashExchangeType, {
        durable: true
    })
    await channel.assertQueue(blurHashQueue, {
        durable: true,
    });
    await channel.bindQueue(blurHashQueue, blurHashExchange, blurHashBindingKey);
    //----------------------------

    await channel.assertExchange(emailExchange, emailExchangeType, {
        durable: true
    })
    await channel.assertQueue(emailQueue, {
        durable: true,
    });
    await channel.bindQueue(emailQueue, emailExchange, emailBindingKey);
    //----------------------------

    await channel.assertExchange(notificationExchange, notificationExchangeType, {
        durable: true
    })
    await channel.assertQueue(notificationQueue, {
        durable: true,
    });
    await channel.bindQueue(notificationQueue, notificationExchange, notificationBindingKey);
}

async function createConsumers(channel) {
    // channel.consume(blurHashQueue, function (msg) {
    //     console.log(" [x] Received %s", msg.content.toString());
    //     channel.ack(msg)
    // }, {
    //     noAck: false
    // });
}
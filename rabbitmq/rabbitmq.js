import config from "../src/config/index.js";
import amqp from "amqplib"
import {saveError} from "../src/error/saveError.js";

export const blurHashQueue = "blurHash"
export const blurHashBindingKey = "blurHash"
export const blurHashExchange = "blurHashExchange"
export const blurHashExchangeType = "direct"

export let rabbitmqPublishChannel = null
export let rabbitmqConsumeChannel = null

startRabbitmq();

export async function startRabbitmq() {
    try {
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
        await createConsumers(rabbitmqConsumeChannel)
    } catch (error) {
        saveError(error)
    }
}

async function createExchangesAndQueues(channel){
    // blurHash queue
    await channel.assertExchange(blurHashExchange, blurHashExchangeType, {
        durable: true
    })
    await channel.assertQueue(blurHashQueue, {
        durable: true,
    });
    await channel.bindQueue(blurHashQueue, blurHashExchange, blurHashBindingKey);
}

async function createConsumers(channel){
    // channel.consume(blurHashQueue, function (msg) {
    //     console.log(" [x] Received %s", msg.content.toString());
    //     channel.ack(msg)
    // }, {
    //     noAck: false
    // });
}
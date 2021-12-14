import config from "../config";
import nodemailer from "nodemailer";
import {saveError} from "../error/saveError";

const transporter = nodemailer.createTransport({
    service: 'gmail',
    from: config.email.username,
    auth: {
        user: config.email.username,
        pass: config.email.password,
    }
});

export default function (agenda) {
    agenda.define("registration email", {concurrency: 100}, async (job) => {
        try {
            let {email, rawUsername} = job.attrs.data;
            const mailOptions = {
                from: 'downloaderapi@gmail.com',
                to: email,
                subject: 'Thanks for registering',
                text: `user ${rawUsername}, welcome to our wonderful app`,
            };
            let result = await transporter.sendMail(mailOptions);
            return {delivered: 1, status: 'ok'};
        } catch (error) {
            saveError(error);
            return {delivered: 0, status: 'error'};
        }
    });

    agenda.define("verify email", async (job) => {
        // Etc
    });

    agenda.define("reset password", async (job) => {
        // Etc
    });
}

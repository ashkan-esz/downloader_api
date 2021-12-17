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
    agenda.define("registration email", {concurrency: 50}, async (job) => {
        try {
            let {email, rawUsername, emailVerifyToken, host} = job.attrs.data;
            const mailOptions = {
                from: 'downloaderapi@gmail.com',
                to: email,
                subject: 'Thanks for registering',
                text: `user ${rawUsername}, welcome to our wonderful app, open this link to verify your account --> ${host}/users/verifyEmail/${emailVerifyToken}`,
                html: `<a href="${host}/users/verifyEmail/${emailVerifyToken}">user ${rawUsername}, welcome to our wonderful app, click this link to verify your account<a/>`,
            };
            let result = await transporter.sendMail(mailOptions);
            return {delivered: 1, status: 'ok'};
        } catch (error) {
            saveError(error);
            return {delivered: 0, status: 'error'};
        }
    });

    agenda.define("verify email", {concurrency: 50}, async (job) => {
        try {
            let {email, rawUsername, emailVerifyToken, host} = job.attrs.data;
            const mailOptions = {
                from: 'downloaderapi@gmail.com',
                to: email,
                subject: 'Verify Account',
                text: `user ${rawUsername}, open this link to verify your account --> ${host}/users/verifyEmail/${emailVerifyToken}`,
                html: `<a href="${host}/users/verifyEmail/${emailVerifyToken}">user ${rawUsername}, click this link to verify your account<a/>
                        <p>if you don't know what's this, ignore.</p>`,
            };
            let result = await transporter.sendMail(mailOptions);
            return {delivered: 1, status: 'ok'};
        } catch (error) {
            saveError(error);
            return {delivered: 0, status: 'error'};
        }
    });

    agenda.define("reset password", async (job) => {
        // Etc
    });
}

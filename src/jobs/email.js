import config from "../config/index.js";
import nodemailer from "nodemailer";
import {saveError} from "../error/saveError.js";

const transporter = nodemailer.createTransport({
    service: 'gmail',
    from: config.email.username,
    auth: {
        user: config.email.username,
        pass: config.email.password,
    }
});

//todo : better html for emails
//todo : add sendgrid api
//todo : fix bug

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

    agenda.define("login email", {concurrency: 50}, async (job) => {
        try {
            let {deviceInfo, email} = job.attrs.data;
            const mailOptions = {
                from: 'downloaderapi@gmail.com',
                to: email,
                subject: 'New login detected',
                text: `new device login ---> ${deviceInfo.appName}/${deviceInfo.appVersion} , ${deviceInfo.deviceModel}/${deviceInfo.os} from ${deviceInfo.ipLocation}`,
                html: `
                <div>
                    <p>new device login: \n<p/>
                    <p>appName: ${deviceInfo.appName} \n<p/>
                    <p>appVersion: ${deviceInfo.appVersion} \n<p/>
                    <p>deviceModel: ${deviceInfo.os} \n<p/>
                    <p>deviceModel: ${deviceInfo.deviceModel} \n<p/>
                    <p>ipLocation: ${deviceInfo.ipLocation} \n<p/>
                </div>
                `,
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
        // todo :
        // Etc
    });
}

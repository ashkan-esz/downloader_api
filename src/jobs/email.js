import config from "../config/index.js";
import nodemailer from "nodemailer";
import {saveError} from "../error/saveError.js";

const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
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
                from: config.email.username,
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
        //todo : use config.userSessionsPage
        try {
            let {deviceInfo, email} = job.attrs.data;
            const mailOptions = {
                from: config.email.username,
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

    agenda.define("update password", {concurrency: 50}, async (job) => {
        //todo : use config.userSessionsPage
        try {
            let {email} = job.attrs.data;
            const mailOptions = {
                from: config.email.username,
                to: email,
                subject: 'Password Changed',
                text: `Your password has been changed`,
                html: `
                <div>
                    <p>Your password has been changed<p/>
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
            let {userId, email, rawUsername, emailVerifyToken, host} = job.attrs.data;
            const mailOptions = {
                from: config.email.username,
                to: email,
                subject: 'Verify Account',
                text: `user ${rawUsername}, open this link to verify your account --> ${host}/users/verifyEmail/${userId}/${emailVerifyToken}`,
                html: `<a href="${host}/users/verifyEmail/${userId}/${emailVerifyToken}">user ${rawUsername}, click this link to verify your account<a/>
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

    agenda.define("delete account",{concurrency: 50}, async (job) => {
        // todo : delete account page design
        try {
            let {userId, email, rawUsername, deleteAccountVerifyToken, host} = job.attrs.data;
            const mailOptions = {
                from: config.email.username,
                to: email,
                subject: 'Delete Account',
                text: `user ${rawUsername}, open this link to delete your account --> ${host}/users/deleteAccount/${userId}/${deleteAccountVerifyToken}`,
                html: `<a href="${host}/users/deleteAccount/${userId}/${deleteAccountVerifyToken}">user ${rawUsername}, click this link to delete your account<a/>
                        <p>if you don't know what's this, ignore.</p>`,
            };
            let result = await transporter.sendMail(mailOptions);
            return {delivered: 1, status: 'ok'};
        } catch (error) {
            saveError(error);
            return {delivered: 0, status: 'error'};
        }
    });
}

import {body} from 'express-validator';

export const USERNAME_IS_EMPTY = 'Username Is Empty';
export const USERNAME_MUST_BE_STRING = 'Username Must Be String';
export const EMAIL_IS_EMPTY = 'Email Is Empty';
export const EMAIL_MUST_BE_STRING = 'Email Must Be String';
export const USERNAME_LENGTH_MUST_BE_MORE_THAN_6 = 'Username Length Must Be More Than 6';
export const USERNAME_LENGTH_MUST_BE_LESS_THAN_50 = 'Username Length Must Be Less Than 50';
export const USERNAME_BAD_FORMAT = 'Only a-z, 0-9, and underscores are allowed';
export const EMAIL_IS_IN_WRONG_FORMAT = 'Email Is in Wrong Format';
export const PASSWORD_IS_EMPTY = 'Password Is Empty';
export const PASSWORD_MUST_BE_STRING = 'Password Must Be String';
export const PASSWORD_LENGTH_MUST_BE_MORE_THAN_8 = 'Password Length Must Be More Than 8';
export const PASSWORD_LENGTH_MUST_BE_LESS_THAN_50 = 'Password Length Must Be LESS Than 50';
export const PASSWORDS_DONT_MATCH = 'Passwords Don\'t Match';
export const PASSWORD_IS_EQUAL_WITH_USERNAME = 'Password Is Equal With Username';
export const Password_Must_Contain_A_Number = 'Password Must Contain A Number';
export const Password_Must_Contain_An_Uppercase = 'Password Must Contain An Uppercase';
export const Password_Cannot_Have_Space = 'Password Cannot Have Space';
export const DEVICE_INFO_IS_EMPTY = 'DeviceInfo Is Empty';
export const DEVICE_INFO_MUST_BE_OBJECT = 'DeviceInfo Must Be Object';

const deviceInfoFields = ['appName', 'appVersion', 'os', 'deviceModel', 'notifToken'];

export const signupValidation = [
    body('username')
        .exists().withMessage(USERNAME_IS_EMPTY)
        .isString().withMessage(USERNAME_MUST_BE_STRING)
        .isLength({min: 6}).withMessage(USERNAME_LENGTH_MUST_BE_MORE_THAN_6)
        .isLength({max: 50}).withMessage(USERNAME_LENGTH_MUST_BE_LESS_THAN_50)
        .custom((value, {req, loc, path}) => {
            if (!value.toString().match(/^[a-z|\d_-]+$/gi)) {
                // trow error if password is equal with username
                throw new Error(USERNAME_BAD_FORMAT);
            } else {
                return value;
            }
        })
        .trim().escape(),
    body('email')
        .exists().withMessage(EMAIL_IS_EMPTY)
        .isString().withMessage(EMAIL_MUST_BE_STRING)
        .isEmail().withMessage(EMAIL_IS_IN_WRONG_FORMAT)
        .trim().escape().normalizeEmail({gmail_remove_dots: false}),
    body('password')
        .exists().withMessage(PASSWORD_IS_EMPTY)
        .isString().withMessage(PASSWORD_MUST_BE_STRING)
        .isLength({min: 8}).withMessage(PASSWORD_LENGTH_MUST_BE_MORE_THAN_8)
        .isLength({max: 50}).withMessage(PASSWORD_LENGTH_MUST_BE_LESS_THAN_50)
        .matches('[0-9]').withMessage(Password_Must_Contain_A_Number)
        .matches('[A-Z]').withMessage(Password_Must_Contain_An_Uppercase)
        .custom((value, {req, loc, path}) => {
            if (value === req.body.username) {
                // trow error if password is equal with username
                throw new Error(PASSWORD_IS_EQUAL_WITH_USERNAME);
            } else if (value.includes(' ')) {
                throw new Error(Password_Cannot_Have_Space);
            } else {
                return value;
            }
        })
        .trim().escape(),
    body('confirmPassword')
        .custom((value, {req, loc, path}) => {
            if (value !== req.body.password) {
                // trow error if passwords do not match
                throw new Error(PASSWORDS_DONT_MATCH);
            } else {
                return value;
            }
        })
        .trim().escape(),
    body('deviceInfo')
        .exists().withMessage(DEVICE_INFO_IS_EMPTY)
        .custom((value, {req, loc, path}) => {
            if (!value || Array.isArray(value) || typeof value !== 'object') {
                throw new Error(DEVICE_INFO_MUST_BE_OBJECT);
            }
            let keys = Object.keys(value);
            for (let i = 0; i < deviceInfoFields.length; i++) {
                if (value[deviceInfoFields[i]] === undefined) {
                    throw new Error(`Missed parameter deviceInfo.${deviceInfoFields[i]}`);
                }
            }
            for (let i = 0; i < keys.length; i++) {
                if (!deviceInfoFields.includes(keys[i])) {
                    throw new Error(`Wrong parameter deviceInfo.${keys[i]}`);
                }
                if (typeof value[keys[i]] !== 'string') {
                    throw new Error(`Invalid parameter deviceInfo.${keys[i]} :: String`);
                }
                if (!value[keys[i]]) {
                    throw new Error(`Empty parameter deviceInfo.${keys[i]}`);
                }
            }

            return value;
        }),
];

export const loginValidation = [
    body('username_email')
        .exists().withMessage(USERNAME_IS_EMPTY)
        .isString().withMessage(USERNAME_MUST_BE_STRING)
        .isLength({min: 6}).withMessage(USERNAME_LENGTH_MUST_BE_MORE_THAN_6)
        .isLength({max: 50}).withMessage(USERNAME_LENGTH_MUST_BE_LESS_THAN_50)
        .trim().escape(),
    body('password')
        .exists().withMessage(PASSWORD_IS_EMPTY)
        .isString().withMessage(PASSWORD_MUST_BE_STRING)
        .isLength({min: 8}).withMessage(PASSWORD_LENGTH_MUST_BE_MORE_THAN_8)
        .isLength({max: 50}).withMessage(PASSWORD_LENGTH_MUST_BE_LESS_THAN_50)
        .custom((value, {req, loc, path}) => {
            if (value === req.body.username) {
                // trow error if password is equal with username
                throw new Error(PASSWORD_IS_EQUAL_WITH_USERNAME);
            } else {
                return value;
            }
        })
        .trim().escape(),
    body('deviceInfo')
        .exists().withMessage(DEVICE_INFO_IS_EMPTY)
        .custom((value, {req, loc, path}) => {
            if (!value || Array.isArray(value) || typeof value !== 'object') {
                throw new Error(DEVICE_INFO_MUST_BE_OBJECT);
            }
            let keys = Object.keys(value);
            for (let i = 0; i < deviceInfoFields.length; i++) {
                if (value[deviceInfoFields[i]] === undefined) {
                    throw new Error(`Missed parameter deviceInfo.${deviceInfoFields[i]}`);
                }
            }
            for (let i = 0; i < keys.length; i++) {
                if (!deviceInfoFields.includes(keys[i])) {
                    throw new Error(`Wrong parameter deviceInfo.${keys[i]}`);
                }
                if (typeof value[keys[i]] !== 'string') {
                    throw new Error(`Invalid parameter deviceInfo.${keys[i]} :: String`);
                }
                if (!value[keys[i]]) {
                    throw new Error(`Empty parameter deviceInfo.${keys[i]}`);
                }
            }

            return value;
        }),
];

export const getTokenValidation = [
    body('deviceInfo')
        .exists().withMessage(DEVICE_INFO_IS_EMPTY)
        .custom((value, {req, loc, path}) => {
            if (!value || Array.isArray(value) || typeof value !== 'object') {
                throw new Error(DEVICE_INFO_MUST_BE_OBJECT);
            }
            let keys = Object.keys(value);
            for (let i = 0; i < deviceInfoFields.length; i++) {
                if (value[deviceInfoFields[i]] === undefined) {
                    throw new Error(`Missed parameter deviceInfo.${deviceInfoFields[i]}`);
                }
            }
            for (let i = 0; i < keys.length; i++) {
                if (!deviceInfoFields.includes(keys[i])) {
                    throw new Error(`Wrong parameter deviceInfo.${keys[i]}`);
                }
                if (typeof value[keys[i]] !== 'string') {
                    throw new Error(`Invalid parameter deviceInfo.${keys[i]} :: String`);
                }
                if (!value[keys[i]]) {
                    throw new Error(`Empty parameter deviceInfo.${keys[i]}`);
                }
            }

            return value;
        }),
];

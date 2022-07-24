import {check} from 'express-validator';

const USERNAME_IS_EMPTY = 'Username Is Empty';
const EMAIL_IS_EMPTY = 'Email Is Empty';
const USERNAME_LENGTH_MUST_BE_MORE_THAN_6 = 'Username Length Must Be More Than 6';
const USERNAME_LENGTH_MUST_BE_LESS_THAN_50 = 'Username Length Must Be Less Than 50';
const USERNAME_BAD_FORMAT = 'Only a-z, 0-9, and underscores are allowed';
const EMAIL_IS_IN_WRONG_FORMAT = 'Email Is in Wrong Format';
const PASSWORD_IS_EMPTY = 'Password Is Empty';
const PASSWORD_LENGTH_MUST_BE_MORE_THAN_8 = 'Password Length Must Be More Than 8';
const PASSWORD_LENGTH_MUST_BE_LESS_THAN_50 = 'Password Length Must Be LESS Than 50';
const PASSWORDS_DONT_MATCH = 'Passwords Don\'t Match';
const PASSWORD_IS_EQUAL_WITH_USERNAME = 'Password Is Equal With Username';
const Password_Must_Contain_A_Number = 'Password Must Contain A Number';
const Password_Must_Contain_An_Uppercase = 'Password Must Contain An Uppercase';
const Password_Cannot_Have_Space = 'Password Cannot Have Space';

export const signupValidation = [
    check('username')
        .exists().withMessage(USERNAME_IS_EMPTY)
        .isLength({min: 6}).withMessage(USERNAME_LENGTH_MUST_BE_MORE_THAN_6)
        .isLength({max: 50}).withMessage(USERNAME_LENGTH_MUST_BE_LESS_THAN_50)
        .custom((value, {req, loc, path}) => {
            if (!value.match(/^[a-z|\d_-]+$/gi)) {
                // trow error if password is equal with username
                throw new Error(USERNAME_BAD_FORMAT);
            } else {
                return value;
            }
        })
        .trim().escape(),
    check('email')
        .exists().withMessage(EMAIL_IS_EMPTY)
        .isEmail().withMessage(EMAIL_IS_IN_WRONG_FORMAT)
        .trim().escape().normalizeEmail({gmail_remove_dots: false}),
    check('password')
        .exists().withMessage(PASSWORD_IS_EMPTY)
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
    check('confirmPassword')
        .custom((value, {req, loc, path}) => {
            if (value !== req.body.password) {
                // trow error if passwords do not match
                throw new Error(PASSWORDS_DONT_MATCH);
            } else {
                return value;
            }
        })
        .trim().escape(),
];

export const loginValidation = [
    check('username_email')
        .exists().withMessage(USERNAME_IS_EMPTY)
        .isLength({min: 6}).withMessage(USERNAME_LENGTH_MUST_BE_MORE_THAN_6)
        .isLength({max: 50}).withMessage(USERNAME_LENGTH_MUST_BE_LESS_THAN_50)
        .trim().escape(),
    check('password')
        .exists().withMessage(PASSWORD_IS_EMPTY)
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
];

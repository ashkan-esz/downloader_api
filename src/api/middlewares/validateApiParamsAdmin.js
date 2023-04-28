import {body, param, query, validationResult} from 'express-validator';
import {isUri} from "valid-url";
import {safeFieldsToRead_array} from "../../config/configsDb.js";

const validations = Object.freeze({

    skip: param('skip')
        .trim().isInt({min: 0}).withMessage('Invalid parameter skip :: Number 1 to Infinite')
        .toInt(),

    limit: param('limit')
        .trim().isInt({min: 0}).withMessage('Invalid parameter limit :: Number 1 to Infinite')
        .toInt(),

    duration: param('duration')
        .trim().isInt({min: 1, max: 120}).withMessage('Invalid parameter duration :: Number 1 to 120')
        .toInt(),

    force: param('force')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter force :: (true|false)')
        .toBoolean(),

    startTime: param('startTime')
        .custom((value) => {
            try {
                let temp = new Date(value);
                if (temp === 'Invalid Date') {
                    throw new Error('Invalid parameter startTime :: (Date String | Time in milliseconds)');
                } else {
                    return value;
                }
            } catch (error) {
                throw new Error('Invalid parameter startTime :: (Date String | Time in milliseconds)');
            }
        })
        .customSanitizer(value => {
            return new Date(value);
        }),

    endTime: param('endTime')
        .custom((value) => {
            try {
                let temp = new Date(value);
                if (temp === 'Invalid Date') {
                    throw new Error('Invalid parameter endTime :: (Date String | Time in milliseconds)');
                } else {
                    return value;
                }
            } catch (error) {
                throw new Error('Invalid parameter endTime :: (Date String | Time in milliseconds)');
            }
        })
        .customSanitizer(value => {
            return new Date(value);
        }),

    checkWarnings: param('checkWarnings')
        .trim()
        .isBoolean().withMessage('Invalid parameter dontUpdateServerDate :: (true|false)')
        .toBoolean(),

    //--------------------------------------
    //--------------------------------------

    sourceName_query: query('sourceName')
        .customSanitizer(value => {
            return value
                ? value.toString().toLowerCase().trim()
                : '';
        }),

    crawlerMode: query('mode')
        .customSanitizer(value => {
            return (value && !isNaN(value))
                ? Math.floor(Number(value))
                : 0;
        }),

    handleDomainChange: query('handleDomainChange')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter handleDomainChange :: (true|false)')
        .toBoolean(),

    handleDomainChangeOnly: query('handleDomainChangeOnly')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter handleDomainChangeOnly :: (true|false)')
        .toBoolean(),

    handleCastUpdate: query('handleCastUpdate')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter handleCastUpdate :: (true|false)')
        .toBoolean(),

    //--------------------------------------
    //--------------------------------------

    id: param('id')
        .exists().withMessage("Missed parameter id")
        .isString().withMessage("id must be String")
        .trim().escape(),

    sourceName_param: param('sourceName')
        .exists().withMessage("Missed parameter sourceName")
        .isString().withMessage("sourceName must be String")
        .trim().escape(),

    sourceName: body('sourceName')
        .exists().withMessage("Missed parameter sourceName")
        .isString().withMessage("sourceName must be String")
        .trim().escape(),

    movie_url: body('movie_url')
        .exists().withMessage("Missed parameter movie_url")
        .isString().withMessage("movie_url must be String")
        .isURL().withMessage("movie_url must be valid Url")
        .custom((value, {req, loc, path}) => {
            if (!value.toString().match(/[?\/]page[\/=]$/gi)) {
                throw new Error("movie_url must match regex :: [?/]page[/=]$");
            } else {
                return value;
            }
        })
        .trim(),

    serial_url: body('serial_url')
        .exists().withMessage("Missed parameter serial_url")
        .isString().withMessage("serial_url must be String")
        .custom((value, {req, loc, path}) => {
            if (value === "") {
                return "empty";// optional
            }
            if (!isUri(value.toString()) || !value.toString().match(/[?/]page[/=]$/gi)) {
                throw new Error("serial_url must be a valid url match regex :: [?/]page[/=]$");
            } else {
                return value;
            }
        })
        .trim()
        .replace('empty', ''),

    page_count: body('page_count')
        .exists().withMessage("Missed parameter page_count")
        .isInt({min: 0}).withMessage("page_count must be Number starting from 0")
        .toInt(),

    serial_page_count: body('serial_page_count')
        .exists().withMessage("Missed parameter serial_page_count")
        .isInt({min: 0}).withMessage("serial_page_count must be Number starting from 0")
        .toInt(),

    crawlCycle: body('crawlCycle')
        .exists().withMessage("Missed parameter crawlCycle")
        .isInt({min: 0}).withMessage("crawlCycle must be Number starting from 0")
        .toInt(),

    disabled: body('disabled')
        .exists().withMessage("Missed parameter disabled")
        .isBoolean({strict: true}).withMessage("disabled must be Boolean")
        .toBoolean(),

    cookies: body('cookies')
        .exists().withMessage("Missed parameter cookies")
        .isArray({max: 10}).withMessage("cookies Must be an array")
        .custom((value, {req, loc, path}) => {
            for (let i = 0; i < value.length; i++) {
                if (!value[i] || Array.isArray(value[i]) || typeof value[i] !== 'object') {
                    throw new Error("cookies Must be an array of object");
                }
                let allowedKeys = ['name', 'value', 'expire'];
                for (let j = 0; j < allowedKeys.length; j++) {
                    if (value[i][allowedKeys[j]] === undefined) {
                        throw new Error(`Missed field cookies[${i}].${allowedKeys[j]}`);
                    }
                }
                let cookieKeys = Object.keys(value[i]);
                for (let j = 0; j < cookieKeys.length; j++) {
                    if (!allowedKeys.includes(cookieKeys[j])) {
                        throw new Error(`Wrong field cookies[${i}].${cookieKeys[j]}`);
                    }
                }
                if (typeof value[i].name !== "string") {
                    throw new Error(`cookies[${i}].name must be String`);
                }
                if (typeof value[i].value !== "string") {
                    throw new Error(`cookies[${i}].value must be String`);
                }
                if (isNaN(value[i].expire)) {
                    throw new Error(`cookies[${i}].expire must be Number (Int)`);
                }
            }
            return value;
        }),

    configs: body('configs')
        .exists().withMessage("Missed parameter configs")
        .custom((value, {req, loc, path}) => {
            if (!value || Array.isArray(value) || typeof value !== 'object') {
                throw new Error('Invalid parameter configs :: Object');
            }
            let keys = Object.keys(value);
            for (let i = 0; i < keys.length; i++) {
                if (!safeFieldsToRead_array.includes(keys[i])) {
                    throw new Error(`Wrong parameter settings.${keys[i]}`);
                }
                if (keys[i] === "corsAllowedOrigins") {
                    if (!Array.isArray(value[keys[i]])) {
                        throw new Error(`Invalid parameter configs.${keys[i]} :: Array(String)`);
                    }
                }
            }
            return value;
        })
});

export function checkApiParams(apiParams) {
    let validationArray = [];
    for (let i = 0; i < apiParams.length; i++) {
        let val = validations[apiParams[i]];
        if (val) {
            validationArray.push(val);
        }
    }
    return validationArray;
}

export function apiParams_sendError(req, res, next) {
    const errorsAfterValidation = validationResult(req);
    if (!errorsAfterValidation.isEmpty()) {
        return res.status(400).json({
            data: null,
            code: 400,
            errorMessage: errorsAfterValidation.errors.map(item => item.msg).join(', ')
        });
    }
    return next();
}

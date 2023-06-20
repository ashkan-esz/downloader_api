import {utilsServices} from "../services/index.js";
import {sendResponse} from "./controllerUtils.js";


export async function getMessage(req, res) {
    let result = await utilsServices.getMessage(req.url);
    return sendResponse(req, res, result);
}

export async function getApps(req, res) {
    let result = await utilsServices.getApps(req.query.appName, req.url);
    return sendResponse(req, res, result);
}

export async function checkAppUpdate(req, res) {
    let {appName, os, version} = req.params;
    let result = await utilsServices.checkAppUpdate(appName, os, version, req.url);
    return sendResponse(req, res, result);
}
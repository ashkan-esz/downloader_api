import {utilsServices} from "../services/index.js";
import {sendResponse} from "./controllerUtils.js";


export async function getMessage(req, res) {
    let result = await utilsServices.getMessage();
    return sendResponse(req, res, result);
}
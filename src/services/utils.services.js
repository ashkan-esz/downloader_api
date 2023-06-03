import * as adminConfigDbMethods from "../data/db/admin/adminConfigDbMethods.js";
import {errorMessage, generateServiceResult} from "./serviceUtils.js";


export async function getMessage() {
    let result = await adminConfigDbMethods.getMessageDB();
    if (result === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (result === null) {
        return generateServiceResult({data: null}, 404, errorMessage.messageNotFound);
    }
    return generateServiceResult({data: result}, 200, '');
}
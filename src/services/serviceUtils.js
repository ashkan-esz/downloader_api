
export function generateServiceResult(dataFields, code, errorMessage, extraData = {}) {
    return {
        ...extraData,
        responseData: {
            ...dataFields,
            code: code,
            errorMessage: errorMessage,
        }
    };
}


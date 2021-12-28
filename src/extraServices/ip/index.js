import {IP2Location} from 'ip2location-nodejs';
import countries from 'i18n-iso-countries';
import {saveError} from "../../error/saveError.js";

const ip2location = new IP2Location();
ip2location.open("./src/extraServices/ip/IP2LOCATION-LITE-DB3.IPV6.BIN");

export default function (ipString) {
    try {
        let ipDetectionResult = ip2location.getAll(ipString);
        if (!ipDetectionResult || ipDetectionResult.countryShort === 'MISSING_FILE' || ipDetectionResult.countryShort === '-') {
            return '';
        }
        let countryName = countries.getName(ipDetectionResult.countryShort, 'en', {select: "official"});
        return ipDetectionResult.city + ', ' + countryName;
    } catch (error) {
        saveError(error);
        return '';
    }
}

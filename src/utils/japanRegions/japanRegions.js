import {prefs, regs} from "./data.js";

//copied from https://www.npmjs.com/package/jp-prefectures and https://www.npmjs.com/package/jp-prefecture
//copied due to node import error:
//  Warning: To load an ES module, set "type": "module" in the package.json or use the .mjs extension.
//  import prefs from "../data/prefectures.json";

export function findByName(value) {
    return prefs.find((pref) => pref.name === value);
}

export function findByCode(value) {
    return prefs.find((pref) => pref.code === Number(value));
}

export function filterByArea(value) {
    return prefs.filter((pref) => pref.area === value);
}

export function prefectures() {
    return prefs;
}

export function regions() {
    return regs;
}

export function prefectureCodes() {
    return prefs.map((pref) => pref.code);
}

export function prefectureNames() {
    return prefs.map((pref) => pref.name);
}

export function prefectureEnNames() {
    return prefs.map((pref) => pref.enName);
}

export function regionsEnNames() {
    return regions.map((pref) => pref.enName);
}

export function prefectureAreas() {
    const onlyUnique = (value, index, self) => {
        return self.indexOf(value) === index;
    };
    const areas = prefs.map((pref) => pref.area);
    return areas.filter(onlyUnique);
}

export function prefectureCapitals() {
    return prefs.map((pref) => pref.capital);
}

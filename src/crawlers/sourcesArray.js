import * as film2movie from "./sources/3film2movie.js";
import * as tokyotosho from "./torrentSources/tokyotosho.js";
import * as shanaproject from "./torrentSources/shanaproject.js";
import * as nyaa from "./torrentSources/nyaa.js";
import * as eztv from "./torrentSources/eztv.js";

export const sourcesNames = Object.freeze([
    'film2movie',
    'tokyotosho', 'shanaproject', 'nyaa', 'eztv', // torrent
]);
export const torrentSourcesNames = Object.freeze([
    'tokyotosho', 'shanaproject', 'nyaa', 'eztv',
]);
export const sortPostersOrder = Object.freeze(['film2movie', 's3Poster']);
export const sortTrailersOrder = Object.freeze(['film2movie', 's3Trailer']);

export function getSourcesMethods() {
    return ({
        film2movie: film2movie,
        tokyotosho: tokyotosho,
        shanaproject: shanaproject,
        nyaa: nyaa,
        eztv: eztv,
    });
}

export function getSourcesArray(sourcesObj, crawlMode, extraConfigs) {
    const pageCount = crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : null;

    return [
        {
            name: 'film2movie',
            configs: film2movie.sourceConfig,
            starter: () => {
                return film2movie.default(sourcesObj.film2movie, pageCount, extraConfigs);
            }
        },
        {
            name: 'tokyotosho',
            configs: tokyotosho.sourceConfig,
            starter: () => {
                return tokyotosho.default(sourcesObj.tokyotosho, pageCount, extraConfigs);
            }
        },
        {
            name: 'shanaproject',
            configs: shanaproject.sourceConfig,
            starter: () => {
                return shanaproject.default(sourcesObj.shanaproject, pageCount, extraConfigs);
            }
        },
        {
            name: 'nyaa',
            configs: nyaa.sourceConfig,
            starter: () => {
                return nyaa.default(sourcesObj.nyaa, pageCount, extraConfigs);
            }
        },
        {
            name: 'eztv',
            configs: eztv.sourceConfig,
            starter: () => {
                return eztv.default(sourcesObj.eztv, pageCount, extraConfigs);
            }
        },
    ];
}

export const sourcesObj = () => {
    let now = new Date();
    let obj = {
        title: "sources",
    };
    for (let i = 0; i < sourcesNames.length; i++) {
        obj[sourcesNames[i]] = {
            movie_url: "",
            serial_url: "",
            crawlCycle: 0,
            disabled: true,
            isManualDisable: false,
            cookies: [],
            addDate: now,
            disabledDate: now,
            lastCrawlDate: 0,
            lastDomainChangeDate: 0,
            lastConfigUpdateDate: 0,
            userData: null,
            description: '',
            status: {
                notRespondingFrom: 0,
                lastCheck: 0,
            }
        }
    }
    return obj;
}

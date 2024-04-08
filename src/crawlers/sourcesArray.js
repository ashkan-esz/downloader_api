import * as digimoviez from "./sources/1digimoviez.js";
import * as film2movie from "./sources/3film2movie.js";
import * as avamovie from "./sources/5avamovie.js";
import * as anime20 from "./sources/anime20.js";
import * as tokyotosho from "./torrentSources/tokyotosho.js";

export const sourcesNames = Object.freeze(['digimoviez', 'film2movie', 'avamovie', 'anime20', 'tokyotosho']);
export const sortPostersOrder = Object.freeze(['digimoviez', 'avamovie', 'film2movie', 's3Poster', 'anime20', 'tokyotosho']);
export const sortTrailersOrder = Object.freeze(['film2movie', 's3Trailer', 'digimoviez', 'avamovie', 'anime20', 'tokyotosho']);

export function getSourcesMethods() {
    return ({
        digimoviez: digimoviez,
        film2movie: film2movie,
        avamovie: avamovie,
        anime20: anime20,
        tokyotosho: tokyotosho,
    });
}

export function getSourcesArray(sourcesObj, crawlMode, extraConfigs) {
    const pageCount = crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : null;

    return [
        {
            name: 'digimoviez',
            configs: digimoviez.sourceConfig,
            starter: () => {
                return digimoviez.default(sourcesObj.digimoviez, pageCount, extraConfigs);
            },
        },
        {
            name: 'film2movie',
            configs: film2movie.sourceConfig,
            starter: () => {
                return film2movie.default(sourcesObj.film2movie, pageCount, extraConfigs);
            }
        },
        {
            name: 'avamovie',
            configs: avamovie.sourceConfig,
            starter: () => {
                return avamovie.default(sourcesObj.avamovie, pageCount, extraConfigs);
            }
        },
        {
            name: 'anime20',
            configs: anime20.sourceConfig,
            starter: () => {
                return anime20.default(sourcesObj.anime20, pageCount, extraConfigs);
            }
        },
        {
            name: 'tokyotosho',
            configs: tokyotosho.sourceConfig,
            starter: () => {
                return tokyotosho.default(sourcesObj.tokyotosho, pageCount, extraConfigs);
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

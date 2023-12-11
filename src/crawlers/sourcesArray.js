import * as digimoviez from "./sources/1digimoviez.js";
import * as film2movie from "./sources/3film2movie.js";
import * as avamovie from "./sources/5avamovie.js";
import * as anime20 from "./sources/anime20.js";

export const sourcesNames = Object.freeze(['digimoviez', 'film2movie', 'avamovie', 'anime20']);
export const sortPostersOrder = Object.freeze(['digimoviez', 'avamovie', 'film2movie', 's3Poster', 'anime20']);
export const sortTrailersOrder = Object.freeze(['film2movie', 's3Trailer', 'digimoviez', 'avamovie', 'anime20']);

export function getSourcesMethods() {
    return ({
        digimoviez: digimoviez,
        film2movie: film2movie,
        avamovie: avamovie,
        anime20: anime20,
    });
}

export function getSourcesArray(sourcesObj, crawlMode) {
    const pageCount = crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : null;

    return [
        {
            name: 'digimoviez',
            starter: () => {
                return digimoviez.default(sourcesObj.digimoviez, pageCount);
            },
        },
        {
            name: 'film2movie',
            starter: () => {
                return film2movie.default(sourcesObj.film2movie, pageCount);
            }
        },
        {
            name: 'avamovie',
            starter: () => {
                return avamovie.default(sourcesObj.avamovie, pageCount);
            }
        },
        {
            name: 'anime20',
            starter: () => {
                return anime20.default(sourcesObj.anime20, pageCount);
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

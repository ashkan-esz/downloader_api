import * as digimoviez from "./sources/1digimoviez.js";
import * as film2movie from "./sources/3film2movie.js";
import * as salamdl from "./sources/4salamdl.js";
import * as avamovie from "./sources/5avamovie.js";
import * as bia2hd from "./sources/7bia2hd.js";
import * as golchindl from "./sources/8golchindl.js";
import * as bia2anime from "./sources/10bia2anime.js";
import * as anime20 from "./sources/anime20.js";

export const sourcesNames = Object.freeze(['digimoviez', 'film2movie', 'salamdl', 'avamovie', 'bia2hd', 'golchindl', 'bia2anime', 'anime20']);
export const sortPostersOrder = Object.freeze(['digimoviez', 'avamovie', 'film2movie', 'golchindl', 's3Poster', 'bia2anime', 'bia2hd', 'salamdl', 'anime20']);
export const sortTrailersOrder = Object.freeze(['film2movie', 'bia2hd', 'bia2anime', 'golchindl', 's3Trailer', 'digimoviez', 'avamovie', 'salamdl', 'anime20']);

export function getSourcesMethods() {
    return ({
        digimoviez: digimoviez,
        film2movie: film2movie,
        salamdl: salamdl,
        avamovie: avamovie,
        bia2hd: bia2hd,
        golchindl: golchindl,
        bia2anime: bia2anime,
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
            name: 'salamdl',
            starter: () => {
                return salamdl.default(sourcesObj.salamdl, pageCount);
            }
        },
        {
            name: 'avamovie',
            starter: () => {
                return avamovie.default(sourcesObj.avamovie, pageCount);
            }
        },
        {
            name: 'bia2hd',
            starter: () => {
                return bia2hd.default(sourcesObj.bia2hd, pageCount);
            }
        },
        {
            name: 'golchindl',
            starter: () => {
                return golchindl.default(sourcesObj.golchindl, pageCount);
            }
        },
        {
            name: 'bia2anime',
            starter: () => {
                return bia2anime.default(sourcesObj.bia2anime, pageCount);
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
            cookies: [],
            addDate: now,
            disabledDate: now,
            lastCrawlDate: 0,
            lastDomainChangeDate: 0,
        }
    }
    return obj;
}

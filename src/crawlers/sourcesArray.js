import * as digimoviez from "./sources/1digimoviez.js";
import * as film2movie from "./sources/3film2movie.js";
import * as salamdl from "./sources/4salamdl.js";
import * as avamovie from "./sources/5avamovie.js";
import * as bia2hd from "./sources/7bia2hd.js";
import * as golchindl from "./sources/8golchindl.js";
import * as bia2anime from "./sources/10bia2anime.js";

export const sourcesNames = Object.freeze(['digimoviez', 'film2movie', 'salamdl', 'avamovie', 'bia2hd', 'golchindl', 'bia2anime']);
export const sortPostersOrder = Object.freeze(['digimoviez', 'avamovie', 'film2movie', 'golchindl', 's3Poster', 'bia2anime', 'bia2hd', 'salamdl']);
export const sortTrailersOrder = Object.freeze(['film2movie', 'bia2hd', 'bia2anime', 'golchindl', 's3Trailer', 'digimoviez', 'avamovie', 'salamdl']);

export const getSourcesMethods = () => ({
    digimoviez: digimoviez,
    film2movie: film2movie,
    salamdl: salamdl,
    avamovie: avamovie,
    bia2hd: bia2hd,
    golchindl: golchindl,
    bia2anime: bia2anime,
});

export function getSourcesArray(sourcesObj, crawlMode, pageCounter_time = '') {
    let pageCounterTime = new Date((pageCounter_time || sourcesObj.pageCounter_time));
    let now = new Date();
    let daysElapsed = (now.getTime() - pageCounterTime.getTime()) / (24 * 3600 * 1000);

    return [
        {
            name: 'digimoviez',
            starter: () => {
                return digimoviez.default({
                    ...sourcesObj.digimoviez,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : sourcesObj.digimoviez.page_count + daysElapsed,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : sourcesObj.digimoviez.serial_page_count + daysElapsed / 3,
                })
            },
        },
        {
            name: 'film2movie',
            starter: () => {
                return film2movie.default({
                    ...sourcesObj.film2movie,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : sourcesObj.film2movie.page_count + daysElapsed,
                });
            }
        },
        {
            name: 'salamdl',
            starter: () => {
                return salamdl.default({
                    ...sourcesObj.salamdl,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : sourcesObj.salamdl.page_count + daysElapsed,
                });
            }
        },
        {
            name: 'avamovie',
            starter: () => {
                return avamovie.default({
                    ...sourcesObj.avamovie,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : sourcesObj.avamovie.page_count + daysElapsed,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : sourcesObj.avamovie.serial_page_count + daysElapsed / 3,
                });
            }
        },
        {
            name: 'bia2hd',
            starter: () => {
                return bia2hd.default({
                    ...sourcesObj.bia2hd,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : sourcesObj.bia2hd.page_count + daysElapsed,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : sourcesObj.bia2hd.serial_page_count + daysElapsed / 3,
                });
            }
        },
        {
            name: 'golchindl',
            starter: () => {
                return golchindl.default({
                    ...sourcesObj.golchindl,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : sourcesObj.golchindl.page_count + daysElapsed,
                });
            }
        },
        {
            name: 'bia2anime',
            starter: () => {
                return bia2anime.default({
                    ...sourcesObj.bia2anime,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : sourcesObj.bia2anime.page_count + daysElapsed,
                });
            }
        },
    ];
}

export const sourcesObj = () => {
    let now = new Date();
    let obj = {
        title: "sources",
        pageCounter_time: now,
    };
    for (let i = 0; i < sourcesNames.length; i++) {
        obj[sourcesNames[i]] = {
            movie_url: "",
            page_count: 0,
            serial_url: "",
            serial_page_count: 0,
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

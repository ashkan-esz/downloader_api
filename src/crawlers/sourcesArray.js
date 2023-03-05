import digimoviez, {sourceConfig as digimoviez_config} from "./sources/1digimoviez.js";
import film2movie, {sourceConfig as film2movie_config} from "./sources/3film2movie.js";
import salamdl, {sourceConfig as salamdl_config} from "./sources/4salamdl.js";
import avamovie, {sourceConfig as avamovie_config} from "./sources/5avamovie.js";
import bia2hd, {sourceConfig as bia2hd_config} from "./sources/7bia2hd.js";
import golchindl, {sourceConfig as golchindl_config} from "./sources/8golchindl.js";
import bia2anime, {sourceConfig as bia2anime_config} from "./sources/10bia2anime.js";

export const sourcesNames = Object.freeze(['digimoviez', 'film2movie', 'salamdl', 'avamovie', 'bia2hd', 'golchindl', 'bia2anime']);

export const sourcesConfigs = () => ({
    digimoviez: digimoviez_config,
    film2movie: film2movie_config,
    salamdl: salamdl_config,
    avamovie: avamovie_config,
    bia2hd: bia2hd_config,
    golchindl: golchindl_config,
    bia2anime: bia2anime_config,
});

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

export function getSourcesArray(sourcesObj, crawlMode, pageCounter_time = '') {
    let pageCounterTime = new Date((pageCounter_time || sourcesObj.pageCounter_time));
    let now = new Date();
    let daysElapsed = (now.getTime() - pageCounterTime.getTime()) / (24 * 3600 * 1000);

    return [
        {
            name: 'digimoviez',
            starter: () => {
                return digimoviez({
                    ...sourcesObj.digimoviez,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : sourcesObj.digimoviez.page_count + daysElapsed,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : sourcesObj.digimoviez.serial_page_count + daysElapsed / 3,
                })
            },
        },
        {
            name: 'film2movie',
            starter: () => {
                return film2movie({
                    ...sourcesObj.film2movie,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : sourcesObj.film2movie.page_count + daysElapsed,
                });
            }
        },
        {
            name: 'salamdl',
            starter: () => {
                return salamdl({
                    ...sourcesObj.salamdl,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : sourcesObj.salamdl.page_count + daysElapsed,
                });
            }
        },
        {
            name: 'avamovie',
            starter: () => {
                return avamovie({
                    ...sourcesObj.avamovie,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : sourcesObj.avamovie.page_count + daysElapsed,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : sourcesObj.avamovie.serial_page_count + daysElapsed / 3,
                });
            }
        },
        {
            name: 'bia2hd',
            starter: () => {
                return bia2hd({
                    ...sourcesObj.bia2hd,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : sourcesObj.bia2hd.page_count + daysElapsed,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : sourcesObj.bia2hd.serial_page_count + daysElapsed / 3,
                });
            }
        },
        {
            name: 'golchindl',
            starter: () => {
                return golchindl({
                    ...sourcesObj.golchindl,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : sourcesObj.golchindl.page_count + daysElapsed,
                });
            }
        },
        {
            name: 'bia2anime',
            starter: () => {
                return bia2anime({
                    ...sourcesObj.bia2anime,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : sourcesObj.bia2anime.page_count + daysElapsed,
                });
            }
        },
    ];
}


export const sortPostersOrder = Object.freeze(['digimoviez', 'avamovie', 'film2movie', 'golchindl', 's3Poster', 'bia2anime', 'bia2hd', 'salamdl']);
export const sortTrailersOrder = Object.freeze(['film2movie', 'bia2hd', 'bia2anime', 'golchindl', 's3Trailer', 'digimoviez', 'avamovie', 'salamdl']);

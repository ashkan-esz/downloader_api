import digimoviez from "./sources/1digimoviez.js";
import film2movie from "./sources/3film2movie.js";
import salamdl from "./sources/4salamdl.js";
import avamovie from "./sources/5avamovie.js";
import bia2hd from "./sources/7bia2hd.js";
import golchindl from "./sources/8golchindl.js";
import bia2anime from "./sources/10bia2anime.js";

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


export const sortPostersOrder = ['digimoviez', 'avamovie', 'film2movie', 'golchindl', 's3Poster', 'bia2anime', 'bia2hd', 'salamdl'];
export const sortTrailersOrder = ['film2movie', 'bia2hd', 'bia2anime', 'golchindl', 's3Trailer', 'digimoviez', 'avamovie', 'salamdl'];

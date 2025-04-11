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
            configs: sourcesObj.film2movie.config,
            starter: () => {
                return film2movie.default(sourcesObj.film2movie, pageCount, extraConfigs);
            }
        },
        {
            name: 'tokyotosho',
            configs: sourcesObj.tokyotosho.config,
            starter: () => {
                return tokyotosho.default(sourcesObj.tokyotosho, pageCount, extraConfigs);
            }
        },
        {
            name: 'shanaproject',
            configs: sourcesObj.shanaproject.config,
            starter: () => {
                return shanaproject.default(sourcesObj.shanaproject, pageCount, extraConfigs);
            }
        },
        {
            name: 'nyaa',
            configs: sourcesObj.nyaa.config,
            starter: () => {
                return nyaa.default(sourcesObj.nyaa, pageCount, extraConfigs);
            }
        },
        {
            name: 'eztv',
            configs: sourcesObj.eztv.config,
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

    const sampleSourceConfig = {
        movie_url: "",
        serial_url: "",
        anime_url: "",
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
        },
        config: {
            sourceName: "",
            //------------------
            isGeneric: false,
            checkTrailers: false,
            headers: '',
            //------------------
            is_censored: false,
            is_half_network: false,
            dontRemoveDimensions: false,
            //------------------
            has_watch_online: false,
            has_summary: true,
            has_poster: true,
            has_wide_poster: true,
            has_trailer: true,
            has_subtitle: false,
            //------------------
            needHeadlessBrowser: false,
            sourceAuthStatus: 'ok',
            vpnStatus: Object.freeze({
                poster: 'vpnOnly',
                trailer: 'vpnOnly',
                downloadLink: 'vpnOnly',
            }),
            isTorrent: false,
            replaceInfoOnDuplicate: true,
            removeScriptAndStyleFromHtml: false,
        }
    }

    for (let i = 0; i < sourcesNames.length; i++) {
        let newSource = JSON.parse(JSON.stringify(sampleSourceConfig));
        newSource.config.sourceName = sourcesNames[i];
        newSource.config.isTorrent = false;
        newSource.config.removeScriptAndStyleFromHtml = true;
        obj[sourcesNames[i]] = newSource;
    }

    for (let i = 0; i < torrentSourcesNames.length; i++) {
        let newSource = JSON.parse(JSON.stringify(sampleSourceConfig));
        newSource.config.sourceName = torrentSourcesNames[i];
        newSource.config.isTorrent = true;
        newSource.config.removeScriptAndStyleFromHtml = false;
        obj[torrentSourcesNames[i]] = newSource;
    }

    return obj;
}

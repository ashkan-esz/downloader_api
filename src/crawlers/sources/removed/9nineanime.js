import config from "../../../config";
import {search_in_title_page, wrapper_module} from "../../searchTools";
import {
    getTitleAndYear,
    getType,
    checkDubbed,
    replacePersianNumbers,
    purgeQualityText,
    purgeSizeText,
    persianWordToNumber,
    getDecodedLink,
} from "../../utils";
import save from "../../save_changes_db";
import * as persianRex from "persian-rex";
import {saveError} from "../../../error/saveError";

const sourceName = "nineanime";

export default async function nineanime({movie_url, page_count}) {
    await wrapper_module(sourceName, movie_url, page_count, search_title);
}

async function search_title(link, i) {
    try {
        let title = link.attr('title');
        if (title && title.includes('دانلود') && link.parent()[0].name === 'h2') {
            let pageLink = link.attr('href');
            let year;
            let type = title.includes('انیمه')
                ? title.includes('سینمایی') ? 'anime_movie' : 'anime_serial'
                : getType(title);

            if (config.nodeEnv === 'dev') {
                console.log(`nineanime/${type}/${i}/${title}  ========>  `);
            }
            if (title.includes('دانلود مانهوا')) {
                return;
            }
            if (title.toLowerCase().includes('قسمت های سینمایی') && !type.includes('anime')) {
                type = 'anime_' + type;
            }
            ({title, year} = getTitleAndYear(title, year, type));
            if (title.toLowerCase().includes('ova') && !type.includes('anime')) {
                type = 'anime_' + type;
            }

            if (title !== '') {
                type = fixWrongType(title, type);
                let pageSearchResult = await search_in_title_page(title, pageLink, type, getFileData, null,
                    extraSearchMatch, extraSearch_getFileData);
                if (pageSearchResult) {
                    let {downloadLinks, $2, cookies} = pageSearchResult;
                    title = replaceShortTitleWithFull(title, type);
                    type = fixWrongType2(title, type);
                    let sourceData = {
                        sourceName,
                        pageLink,
                        downloadLinks,
                        watchOnlineLinks: [],
                        persianSummary: getPersianSummary($2),
                        poster: getPoster($2),
                        trailers: [],
                        subtitles: [],
                        cookies
                    };
                    await save(title, type, year, sourceData);
                }
            }
        }
    } catch (error) {
        saveError(error);
    }
}

function getPersianSummary($) {
    try {
        let $p = $('p');
        for (let i = 0; i < $p.length; i++) {
            if ($($p[i]).text().includes('خلاصه داستان')) {
                return $($p[i]).text().replace('خلاصه داستان', '').trim()
                    .replace('N / A', '');
            }
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function getPoster($) {
    try {
        let $img = $('img');
        for (let i = 0; i < $img.length; i++) {
            let parent = $img[i].parent;
            if (parent.name === 'a') {
                let href = parent.attribs.href;
                if (href.includes('uploads')) {
                    return href;
                }
            }
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function getFileData($, link, type) {
    // '480p.HardSub - 520MB'  //
    // 'S1E03.480p.HardSub' // S5E08.720p.HardSub
    try {
        return type.includes('serial')
            ? getFileData_serial($, link)
            : getFileData_movie($, link);
    } catch (error) {
        saveError(error);
        return 'ignore';
    }
}

function getFileData_serial($, link) {
    let infoNodeChildren = $($(link).parent().prev()).hasClass('download-info')
        ? $($(link).parent().prev().children()[0]).children()
        : $($(link).parent().parent().parent().parent().prev().children()[0]).children();

    if (infoNodeChildren.text() === '') {
        infoNodeChildren = $($(link).parent().parent().parent().parent().prev().children()[0]).children();
    }

    let linkHref = $(link).attr('href').toLowerCase();
    let infoText = replacePersianNumbers($(infoNodeChildren[1]).text());
    infoText = purgeQualityText(infoText).replace('قسمت ', '');
    let linkText = infoText;
    if (infoText.match(/^\d+$/g) || infoText.match(/\d+و\d+/g)) {
        infoNodeChildren = $($(link).parent().parent().parent().parent().prev().children()[0]).children();
        infoText = replacePersianNumbers($(infoNodeChildren[1]).text());
        infoText = purgeQualityText(infoText);
    }

    let seasonEpisode, ova;
    if (persianRex.hasLetter.test(infoText)) {
        let seasonNumber = persianWordToNumber(infoText);
        if (linkText.match(/\d+و\d+/g)) {
            let episodes = linkText.split('و');
            seasonEpisode = 'S' + seasonNumber + 'E' + episodes[0] + '-' + episodes[1];
        } else {
            let episodeNumber = getDecodedLink(linkHref)
                .replace('/nine9anime', '')
                .match(/-\s*\d+\s*\[\d\d\d+]\.mkv|\[\d+(\.\d)*]|e\d+(\.\d[^\d])*/g)[0]
                .replace(/\[720]\.mkv|[\[\]e\-]/g, '').trim();
            seasonEpisode = 'S' + seasonNumber + 'E' + episodeNumber;
        }
        ova = '';
    } else {
        seasonEpisode = '';
        ova = infoText
            .replace(/#|.x265/g, '')
            .replace(/\s\s/g, ' ')
            .replace(/\s/g, '.')
            .trim();
    }

    let dubbed = checkDubbed(linkHref, '') ? 'dubbed' : 'HardSub';
    if (dubbed !== 'dubbed' && infoNodeChildren.length > 4) {
        if (checkDubbed($(infoNodeChildren[4]).text(), '')) {
            dubbed = 'dubbed';
        }
    }
    let quality = purgeQualityText($(infoNodeChildren[2]).text());
    quality = replacePersianNumbers(quality);
    if (quality === '') {
        let resolution = linkHref.match(/\.\d\d\d+\.nineanime\.ir\.mkv/g);
        if (resolution) {
            quality = resolution.pop().replace('nineanime.ir.mkv', '').replace(/\./g, '');
        }
    }

    quality = quality.match(/\d\d\d+p/g) ? quality : quality + 'p';
    let temp = $(infoNodeChildren[3]).text().toLowerCase();
    let sizeText = temp.includes('mb') || temp.includes('gb') ? temp : '';
    let size = purgeSizeText(sizeText);
    size = replacePersianNumbers(size);
    let info = [seasonEpisode, ova, quality, dubbed].filter(value => value).join('.');
    return [info, size].filter(value => value).join(' - ');
}

function getFileData_movie($, link) {
    let infoNodeChildren = $($(link).parent().prev().children()[0]).children();
    let topBoxText = $(link).parent().parent().parent().parent().prev().text();
    let dubbed = checkDubbed($(link).attr('href'), topBoxText) ? 'dubbed' : 'HardSub';
    let quality = $(infoNodeChildren[1]).text().replace('#', '').replace('.x264', '').trim() + 'p';
    quality = purgeQualityText(quality);
    quality = replacePersianNumbers(quality);
    let sizeText = replacePersianNumbers($(infoNodeChildren[2]).text().toLowerCase());
    let size, extraInfo;
    if (
        sizeText.includes('mb') ||
        sizeText.includes('gb') ||
        sizeText.includes('مگا') ||
        sizeText.includes('گیگا') ||
        sizeText.includes('گیگ')
    ) {
        extraInfo = '';
        size = purgeSizeText(sizeText);
    } else {
        extraInfo = sizeText
            .trim()
            .replace(/#|.x265/g, '')
            .replace(/\s\s\s/g, ' ')
            .replace(/\s\s/g, ' ')
            .replace(/\s/g, '.');
        size = purgeSizeText($(infoNodeChildren[3]).text());
        size = replacePersianNumbers(size);
    }

    let info = [extraInfo, quality, dubbed].filter(value => value).join('.');
    return [info, size].filter(value => value).join(' - ');
}

function extraSearchMatch($, link, title) {
    let linkHref = $(link).attr('href');
    let linkTitle = $(link).attr('title');
    let splitLinkHref = linkHref.split('/');
    let lastPart = splitLinkHref.pop();
    if (!lastPart) {
        lastPart = splitLinkHref.pop();
    }
    let infoText = $($($($(link).parent().prev().children()[0])).children()[1]).text();
    infoText = replacePersianNumbers(infoText.trim());

    return (
        (linkTitle === 'لینک دانلود' && !linkHref.includes('.mkv') && !linkHref.includes('.mp4') &&
            lastPart.toLowerCase().includes(title.toLowerCase().replace(/\s/g, '.'))) ||
        (infoText.length < 30 && infoText.includes('دانلود همه قسمت ها')) ||
        (infoText.length < 15 && infoText.includes('دانلود فصل')) ||
        (infoText.length < 30 && infoText.includes('قسمت') && infoText.match(/\s*\d+\s*تا\s*\d+\s*/g))
    );
}

function extraSearch_getFileData($, link, type, sourceLinkData) {
    try {
        let linkHref = getDecodedLink($(link).attr('href').toLowerCase());
        if (linkHref.match(/^\.+\/\.*$/g) || !linkHref.match(/\.(mkv|mp4|avi|mov|flv|wmv)$/g)) {
            return 'ignore';
        }
        let dubbed = checkDubbed(linkHref, '') ? 'dubbed' : 'HardSub';
        let seasonMatch = linkHref.match(/s\d+/g);
        let source$ = sourceLinkData.$;
        let topBoxData = source$(source$(sourceLinkData.link).parent().parent().parent().parent().prev().children()[0]).children();
        let seasonFromTopBox = persianWordToNumber(source$(topBoxData[1]).text());
        let qualityFromTopBox = replacePersianNumbers(purgeQualityText(source$(topBoxData[2]).text()));
        qualityFromTopBox = qualityFromTopBox.match(/\d\d\d+p*/g) ? qualityFromTopBox : '';

        let seasonNumber = seasonMatch ? seasonMatch.pop().replace('s', '') : seasonFromTopBox || 1;
        let episodeNumber = linkHref
            .match(/\[\d+(\.\d*)*]|e\d+(\.\d[^\d])*|[.\-]\s*\d+\s*([.\[])\s*\d\d\d+p*([.\]])/gi)[0]
            .replace(/^\[|[^\d\s]\[|[\]e\s\-]|^\./g, '')
            .split(/[.[]/g);

        let seasonEpisode;
        if (episodeNumber.length === 2 && Number(episodeNumber[0]) + 1 === Number(episodeNumber[1])) {
            seasonEpisode = 'S' + seasonNumber + 'E' + episodeNumber[0] + '-' + episodeNumber[1];
        } else {
            seasonEpisode = 'S' + seasonNumber + 'E' + episodeNumber[0];
        }

        let matchQuality = linkHref.match(/\[*\d\d\d+p*(\.|]|nineanime)/gi);
        let quality = matchQuality ? matchQuality.pop().replace(/[.\[\]]|nineanime/gi, '') : qualityFromTopBox;
        quality = quality.includes('p') ? quality : quality !== '' ? quality + 'p' : '';
        return [seasonEpisode, quality, dubbed].filter(value => value).join('.');
    } catch (error) {
        saveError(error);
        return '';
    }
}

function replaceShortTitleWithFull(title, type) {
    if (title === 'mushoku tensei' && type === 'anime_serial') {
        title = 'mushoku tensei isekai ittara honki dasu';
    } else if (title === 'kings raid ishi o tsugu mono tachi' && type === 'anime_serial') {
        title = 'kings raid ishi wo tsugumono tachi';
    } else if (title === 'shinchou yuusha' && type === 'anime_serial') {
        title = 'shinchou yuusha kono yuusha ga ore tueee kuse ni shinchou sugiru';
    } else if (title === 'maou gakuin no futekigousha' && type === 'anime_serial') {
        title = 'maou gakuin no futekigousha shijou saikyou no maou no shiso tensei shite shison tachi no gakkou e';
    } else if (title === 'kaguya sama wa kokurasetai' && type === 'anime_serial') {
        title = 'kaguya sama wa kokurasetai tensai tachi no renai zunousen all seasons';
    } else if (title === 'saenai heroine' && type === 'anime_movie') {
        title = 'saenai heroine no sodatekata fine';
    } else if (title === 'yahari ore no seishun rabukome wa machigatteiru' && type === 'anime_serial') {
        title = 'yahari ore no seishun love comedy wa machigatteiru all seasons';
    } else if (title === 'genjitsu shugi yuusha' && type === 'anime_serial') {
        title = 'genjitsu shugi yuusha no oukoku saikenki';
    } else if (title === 'fumetsu no anata' && type === 'anime_serial') {
        title = 'fumetsu no anata e';
    } else if (title === 'chuunibyou' && type === 'anime_serial') {
        title = 'chuunibyou demo koi ga shitai';
    } else if (title === 'kyuukyoku shinka shita full dive rpg' && type === 'anime_serial') {
        title = 'kyuukyoku shinka shita full dive rpg ga genjitsu yori mo kusoge dattara';
    } else if (title === 'osananajimi ga zettai' && type === 'anime_serial') {
        title = 'osananajimi ga zettai ni makenai love comedy';
    } else if (title === 'resident evil infinite darkness' && type === 'anime_serial') {
        title = 'biohazard infinite darkness';
    } else if (title === 'seijo no maryoku' && type === 'anime_serial') {
        title = 'seijo no maryoku wa bannou desu';
    } else if (title === 'hige wo soru soshite joshikousei no hero' && type === 'anime_serial') {
        title = 'hige wo soru soshite joshikousei wo hirou';
    } else if (title === 'ore wo suki' && type === 'anime_serial') {
        title = 'ore wo suki nano wa omae dake ka yo';
    } else if (title === 'sword art online alternative' && type === 'anime_serial') {
        title = 'sword art online alternative gun gale online';
    } else if (title === 'gekijouban toriniti sebun' && type === 'anime_movie') {
        title = 'trinity seven movie 1 eternity library to alchemic girl';
    } else if (title === 'fate grand order babylonia' && type === 'anime_serial') {
        title = 'fate grand order zettai majuu sensen babylonia';
    } else if (title === 'konosuba' && type === 'anime_serial') {
        title = 'kono subarashii sekai ni shukufuku wo all seasons';
    } else if (title === 'the devil ring' && type === 'anime_serial') {
        title = 'jie mo ren';
    } else if (title === 'shingeki no kyojin OVA' && type === 'anime_serial') {
        title = 'shingeki no kyojin ova all';
    } else if (title === 'itai no wa iya' && type === 'anime_serial') {
        title = 'itai no wa iya nano de bougyoryoku ni kyokufuri shitai to omoimasu all seasons';
    } else if (title === 'arifureta shokugyou de sekai' && type === 'anime_serial') {
        title = 'arifureta shokugyou de sekai saikyou all seasons';
    } else if (title === 'seishun buta yarou wa' && type === 'anime_serial') {
        title = 'seishun buta yarou wa bunny girl senpai no yume wo minai';
    } else if (title === 'mahouka koukou no rettousei movie' && type === 'anime_movie') {
        title = 'mahouka koukou no rettousei movie hoshi wo yobu shoujo';
    } else if (title === 'the girl who leapt through time' && type === 'anime_movie') {
        title = 'toki wo kakeru shoujo';
    } else if (title === 'kaifuku jutsushi wa yarinaosu' && type === 'anime_serial') {
        title = 'kaifuku jutsushi no yarinaoshi';
    } else if (title === 'despicable me' && type === 'anime_serial') {
        title = 'despicable me all';
    } else if (title === 'doukyonin wa hiza tokidoki' && type === 'anime_serial') {
        title = 'doukyonin wa hiza tokidoki atama no ue';
    } else if (title === 'gintama the movie 1' && type === 'anime_movie') {
        title = 'gintama movie 1 shinyaku benizakura hen';
    } else if (title === 'hypnosis mic division rap battle' && type === 'anime_serial') {
        title = 'hypnosis mic division rap battle rhyme anima';
    } else if (title === 'nakitai watashi wa' && type === 'anime_movie') {
        title = 'nakitai watashi wa neko wo kaburu';
    } else if (title === 'sora no aosa wo shiru hito yo her blue sky' && type === 'anime_movie') {
        title = 'sora no aosa wo shiru hito yo';
    } else if (title === 'arpeggio of blue steel candeza' && type === 'anime_movie') {
        title = 'aoki hagane no arpeggio ars nova movie 2 cadenza';
    } else if (title === 're zero ova 02 frozen bonds' && type === 'anime_serial') {
        title = 're zero kara hajimeru isekai seikatsu hyouketsu no kizuna';
    } else if (title === 'iya na kao sare nagara opantsu misete moraita' && type === 'anime_serial') {
        title = 'iya na kao sare nagara opantsu misete moraitai all seasons';
    } else if (title === 'natsume yujin cho' && type === 'anime_movie') {
        title = 'natsume yuujinchou movie utsusemi ni musubu';
    } else if (title === 'fate stay night heavens feel i' && type === 'anime_movie') {
        title = 'fate stay night movie heavens feel i presage flower';
    } else if (title === 'konosuba' && type === 'anime_movie') {
        title = 'kono subarashii sekai ni shukufuku wo kono subarashii choker ni shukufuku wo';
    } else if (title === 'go toubun no hanayome' && type === 'anime_serial') {
        title = '5 toubun no hanayome all seasons';
    } else if (title === 'date a live ova 2' && type === 'anime_serial') {
        title = 'date a live 2 kurumi star festival';
    } else if (title === 'kishuku gakko no juliet' && type === 'anime_serial') {
        title = 'kishuku gakkou no juliet';
    } else if (title === 'overlord movie 2' && type === 'anime_movie') {
        title = 'overlord movie 2 shikkoku no eiyuu';
    } else if (title === 'overlord movie 1' && type === 'anime_movie') {
        title = 'overlord movie 1 fushisha no ou';
    } else if (title === 'violet evergarden eternity and the auto memories doll' && type === 'anime_movie') {
        title = 'violet evergarden gaiden eien to jidou shuki ningyou';
    } else if (title === 'hunter x hunter phantom rouge' && type === 'anime_movie') {
        title = 'hunter x hunter movie 1 phantom rouge';
    } else if (title === 'highschool of the dead ova' && type === 'anime_serial') {
        title = 'highschool of the dead drifters of the dead';
    } else if (title === 'date a bullet zenpen dead or bullet' && type === 'anime_movie') {
        title = 'date a bullet dead or bullet';
    } else if (title === 'given' && type === 'anime_movie') {
        title = 'given movie';
    } else if (title === 'noragami' && type === 'anime_serial') {
        title = 'noragami ova';
    } else if (title === 'ice age' && type === 'movie') {
        title = 'ice age all';
    } else if (title === 'high school dxd' && type === 'anime_serial') {
        title = 'high school dxd all seasons';
    }
    return title;
}

function fixWrongType(title, type) {
    if (title === 'resident evil infinite darkness' && type === 'serial') {
        type = 'anime_serial';
    } else if (title === 'despicable me' && type === 'serial') {
        type = 'movie';
    } else if (title === 'avatar the last airbender' && type === 'movie') {
        type = 'serial';
    } else if (title === 're zero ova 02 frozen bonds' && type === 'anime_movie') {
        type = 'anime_serial';
    } else if (title === 'dota dragons blood' && type === 'anime_serial') {
        type = 'serial';
    } else if (title === 'date a live ova 2' && type === 'anime_movie') {
        type = 'anime_serial';
    } else if (title === 'highschool of the dead ova' && type === 'anime_movie') {
        type = 'anime_serial';
    } else if (title === 'your name' && type === 'anime_serial') {
        type = 'anime_movie';
    } else if (title === 'a silent voice' && type === 'anime_serial') {
        type = 'anime_movie';
    } else if (title === 'noragami' && type === 'anime_movie') {
        type = 'anime_serial';
    } else if (title === 'high school dxd' && type === 'serial') {
        type = 'anime_serial';
    } else if (title === 'mononoke hime' && type === 'anime_serial') {
        type = 'anime_movie';
    }
    return type;
}

function fixWrongType2(title, type) {
    if (title === 'kono subarashii sekai ni shukufuku wo kono subarashii choker ni shukufuku wo' && type === 'anime_movie') {
        type = 'anime_serial';
    } else if (title === 'kono subarashii sekai ni shukufuku wo kono subarashii choker ni shukufuku wo' && type === 'anime_serial') {
        type = 'anime_movie';
    }
    return type;
}

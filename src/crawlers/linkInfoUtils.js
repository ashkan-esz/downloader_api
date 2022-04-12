//----------------------------------------
export const releaseRegex = /WEB-DL|WEB-RIP|BluRay|HDTV|HD-RIP|BR-RIP|DVDRip|DVDScr|Mobile|CAMRip|HD-CAM/;

export const encodersRegex = new RegExp([
    /RARBG?|Pa[Hh]e|PSA|YTS|[Rr][Mm][Tt]eam|EVO|R?MT|Y[Ii]?F[IY]/,
    /|ShAaNiG|Ganool|Mkv?Cage|Mkvking|GalaxyR?G?|HDTS/,
    /|Digimoviez|AvaMovie|SalamDL|HDETG|AdiT|GalaxyTV/,
    /|DRONES|Joy|Ozlem|NitRo|nItRo|B2HD|GAZ|VXT|([tT]igo(le|el))/,
    /|anoXmous|Judas|ETRG|jbr|Kick|STRiFE|LIMITED|SUNSCREEN/,
    /|CMRG|sujaidr|[Ss]ilence|xTv|BTRG|TURG|HdT|KRT|DJT/,
    /|AMRAP|SiGMA|i[Kk][Aa]|LLG|FGT|MkvHub|MW|WiKi|Hon3y|JYK/,
    /|AME|ELR|NTG|eSc|associate|[Ss]c[Oo]rp|RDH|AMZN|afm7[23]/,
    /|Jalucian|muhHD|GAN|AC3|[Ww]orldmkv|AiRLiNE|DEFiNiTE/,
    /|HazMatt|FiDELiO|AR|monkee|vsenc|BDP|D3FiL3R|watcher/,
    /|SaNiG|Frontline|TNTVillage|LordVako|titler|rDX|w4f/,
    /|HighCode|TuGAZx|GCJM|BONE|Qman|Micromkv|d3g|NVEE|AViATOR/,
    /|SUJAIDR|r00t|MovCr|ACOOL|N[Oo]GRP|AAA(UHD)?|DAA|BRSHNKV/,
    /|HEVCBay|TTL|NBY|KamiKaze|TEPES|MZABI|DEEP|RSG|GOOZ/,
    /|Tom[Dd]oc|POIASD|SUECOS|Garshasp|SARTRE|Budgetbits|Prof/,
    /|LiBRARiANS|m2g|FreetheFish|[Nn]ickarad|AnimeRG|TombDoc/,
    /|FRISKY|3dg|SAMPA|Vyndros|ANONA911|Natty|GetSchwifty/,
    /|Obey|GSFTX|RONIN|UNK|Bandi|QxR|Paso7[27]|Slinece|SPARKS/,
    /|DTSJYK|RZeroX|Omikron|CHD|t3nzin|PAAI|T0M|[Pp]av69|Telugu/,
    /|RKO?|h3llg0d|M[Hk]UB|Panda|SADPANDA|RKHD|z97|MeGUiL|DMV/,
    /|[Aa]pekat|LION|imSamir|KIMO|Telly|TeamMCU|Grashasp|YOGI/,
    /|HDSTAr|ViZNU|DREDD|TM[VK]|MHB|EXT|ION10|SECRECY|[RH]?TM|HORiZON/,
    /|Bollycine|InSaNe|ESubs|Lover|FC|COALiTiON|RUSTED|LCK|iExTv/,
    /|F2[MmNn]|SH0W|GECK|AMIABLE|KatmovieHD|REM|PRiME|NEZU|TFP|DON/,
    /|SMAHAWUG|CRiSC|STRONTiUM|BdC|HDC|LAZY|FraMeSToR|BAM|Felony/,
    /|SECTOR7|CADAVER|YOL0W|Replica|KaKa|SPRiNTER|Rapta|C1NEM4/,
    /|ROVERS|EPSiLON|SAPHiRE|DEFLATE|BRMP|HET|BLOW|DDR|HDL|HAiKU/,
    /|CiNEFiLE|SNG|FLAME|[Ii]FT|TBS|EGEN|TOMMY|AvoHD|MRN|GETiT/,
    /|PLUTONiUM|TiTAN|JiO|SKGTV|QPEL|NM|HV|VETO|YST|SHeRiF/,
    /|AN0NYM0US|CROOKS|ALTEREGO|SiNNERS|FiCO|mSD|PoOlLa|MAX/,
    /|ALLiANCE|DiAMOND|Team-x265/,
].map(item => item.source).join(''));

export const linkInfoRegex = new RegExp([
    /^(\d\d\d\d?p|(1080p\.FULL-HD)|(1440p\.2K)|(2160p\.4K))/,
    /(\.DIRECTORS\.CUT)?/,
    /(\.ALT-UNIVERSE-CUT)?/,
    /(\.EXTENDED)?/,
    /(\.Theatrical)?/,
    /((\.3D)?\.x265\.10bit(\.HDR)?|(\.3D)?\.x265|\.10bit|\.3D(\.HSBS)?)?/,
    /(\.Episode\(\d\d?\d?-\d\d?\d?\))?/,
    /(\.(Special|NCED|OVA)(_\d)?)?/,
    /(\.EXTENDED)?/,
    /(\.REMUX)?/,
    /(\.Part\.\d)?/,
    /(\.Extra)?/,
    /(\.Encore\.Edition)?/,
    /(\.IMAX)?/,
    /(\.Backstage)?/,
    new RegExp(`\\.(${releaseRegex.source})`), // --> /\.(releaseRegex)/
    /(\.REMASTERED)?/,
    new RegExp(`(\\.(${encodersRegex.source}))?`), // --> /(\.(encodersRegex))?/
    /(\.Censored)?/,
    /(\.(HardSub(\.dubbed)?|SoftSub|dubbed(\(.+\))?))?/,
    /( - (\d\d?(\.\d\d?)?GB|\d\d\d?MB))?$/
].map(item => item.source).join(''), 'g');

//----------------------------------------

export function purgeQualityText(qualityText) {
    return qualityText
        .replace(/\s\s+/g, ' ')
        .replace('دانلود', '')
        .replace('فیلم', '')
        .replace('کیفیت', '')
        .replace('انتخاب', '')
        .replace('کیفیت', '')
        .replace(/نسخه \d ساعته/, '')
        .replace('نسخه', '')
        .replace('سخه', '')
        .replace('کم حجم', '')
        .replace('حجم بالا', '')
        .replace('اختصاصی', '')
        .replace('گلچین', '')
        .replace('دوبله', '')
        .replace('زیرنویس', '')
        .replace('فارسی', '')
        .replace('بدون', '')
        .replace('هاردساب', '')
        .replace('پخش آنلاین', '')
        .replace('بدون سانسور', '')
        .replace('سانسور شده', 'Censored')
        .replace('دوزبانه', '')
        .replace('زبان اصلی', '')
        .replace('لينک مستقيم', '')
        .replace('لینک مستقیم', '') //its not duplicate
        .replace('لینک مستقم', '')
        .replace(/قسمت \d\d?\d?(\s*([و٫]|تا)\s*)?\d?\d?\d?/, '')
        .replace('قسمت', '')
        .replace('فرمت', '')
        .replace('دالبی', '')
        .replace('دیجیتال', '')
        .replace('ریلیز', '')
        .replace('پشت صحنه', 'Backstage')
        .replace('بازنگری', 'ReWatch')
        .replace('پریویو شو', 'Preview')
        .replace('روز', 'Day')
        .replace('اس‌پی‌یک', 'Special_1')
        .replace('اس‌پی', 'Special_')
        .replace('ان‌سی‌ئی‌دی', 'NCED')
        .replace('اووی‌ای', 'OVA')
        .replace('پارت ', 'Part ')
        .replace('مراسم اسکار', 'Oscar')
        .replace('مراسم فرش قرمز', 'Red Carpet')
        .replace('مراسم افتتاحیه بازی های المپیک', '')
        .replace('مراسم اختتامیه بازی های المپیک', '')
        .replace('بالا', '')
        .replace(/با|و/g, '')
        .replace(/[)(:|«»_]|\.H264|\sHQ/gi, '')
        .replace(/bluray/gi, 'BluRay')
        .replace(/weba?[-_]?d(l|$)/gi, 'WEB-DL')
        .replace(/weba?[-_]?d\s/gi, 'WEB-DL ')
        .replace(/web(-)*rip/gi, 'WEB-RIP')
        .replace(/BR(-)?RIP/gi, 'BR-RIP')
        .replace(/DvdRip/gi, 'DVDRip')
        .replace(/hdrip/gi, 'HD-RIP')
        .replace(/hdtv/gi, 'HDTV')
        .replace(/full hd/gi, 'FULL-HD')
        .replace(/HD-?CAM/gi, 'HD-CAM')
        .replace(/ 4k /g, ' 4K ')
        .replace(/ Extended/gi, ' EXTENDED')
        .replace(/\s(BrRio|AC3|PROPER)/, '')
        .replace(/\s\s+/g, ' ')
        .trim();
}

export function fixLinkInfo(info, linkHref) {
    if (!info.match(/\d\d\d\d?p/gi)) {
        let qualityMatch = linkHref.match(/[.\s]\d\d\d\d?p[.\s]/gi);
        let resolution = qualityMatch
            ? qualityMatch.pop().replace(/[.\s]/g, '')
            : (info.includes('DVDRip') || linkHref.includes('DVDRip')) ? '576p' : '480p';
        info = info ? resolution + '.' + info : resolution;
    }

    info = info
        .replace(/(^|\.)x256\./, (res) => res.replace('256', '265'))
        .replace('.10bir.', '.10bit.')
        .replace('.10bt.', '.10bit.')
        .replace(/bl?urayR?/i, 'BluRay')
        .replace(/WEB-?DLR/i, 'WEB-DL')
        .replace('DL.WEB', 'WEB-DL')
        .replace(/FullHD/i, 'FULL-HD')
        .replace('Farsi.Dubbed', 'dubbed');

    if (!info.toLowerCase().includes('x265') && linkHref.toLowerCase().includes('x265')) {
        info = info
            .replace(/\d\d\d\d?p/g, (res) => res + '.x265')
            .replace('2160p.x265.4K', '2160p.4K.x265');
    }

    if (!info.toLowerCase().includes('10bit') && linkHref.toLowerCase().includes('10bit')) {
        info = info.replace('.x265', '.x265.10bit');
    }

    const qualityTypeRegex = /bluray|b\.lu\.ry|weba?([-_.]|%20)?dl|web-?rip|br(-)?rip|hd-rip|hdtv|DVDRip/gi;
    let linkHrefQualityMatch = linkHref.match(qualityTypeRegex);
    if (!info.match(qualityTypeRegex) && linkHrefQualityMatch) {
        info = info + '.' + linkHrefQualityMatch.pop()
            .replace('b.lu.ry', 'BluRay')
            .replace(/bluray/gi, 'BluRay')
            .replace(/weba?([-_.]|%20)?dl/gi, 'WEB-DL')
            .replace(/web(-)*rip/gi, 'WEB-RIP')
            .replace(/hdrip/gi, 'HD-RIP')
            .replace(/BR(-)?RIP/gi, 'BR-RIP')
            .replace(/DvdRip/gi, 'DVDRip')
            .replace('hdtv', 'HDTV');
    }
    if (!info.match(qualityTypeRegex) && linkHref.match(/((\d\d\d\d?p)|(4k))\.WEB([-.](HD|x265))?\./gi)) {
        info = info + '.' + 'WEB-DL';
    }

    let multiEpisodeMatch = linkHref.match(/\.(s\d\d?)?e\d\d\d?([-.])?(e\d\d\d?)+\./gi);
    if (multiEpisodeMatch) {
        let temp = multiEpisodeMatch.pop().replace(/s\d\d?/i, '').replace(/(^\.e)|\.|-/gi, '').split(/e/i);
        let number1 = Number(temp[0]);
        let number2 = Number(temp.pop());
        if (number1 < number2) {
            info = info.replace(/\d\d\d\d?p/, (res) => res + `.Episode(${number1}-${number2})`);
        }
    }

    return info.replace(/\.$/, '');
}

export function fixLinkInfoOrder(info) {
    const subRegex = new RegExp(`(SoftSub|HardSub)\\.(${releaseRegex.source})`, 'g');
    info = getCleanLinkInfo(info);
    return info
        .replace(/3D\.HSBS\.\d\d\d\d?p/, (res) => {
            let temp = res.split('.');
            return [temp[2], temp[0], temp[1]].join('.');
        })
        .replace(new RegExp(`(${releaseRegex.source})\\.x265(\\.10bit)?`), (res) => {
            let temp = res.split('.');
            return [...temp.slice(1), temp[0]].filter(item => item).join('.');
        })
        .replace(new RegExp(`(${releaseRegex.source})\\d\\d\\d\\d?p`), (res) => res.replace(/\d\d\d\d?p/, (res2) => '.' + res2))
        .replace(new RegExp(`(${releaseRegex.source})\\.\\d\\d\\d\\d?p(\\.x265(\\.10bit)?)?`, 'g'), (res) => {
            let temp = res.split('.');
            return [temp[1], ...temp.slice(2), temp[0]].filter(item => item).join('.');
        })
        .replace(new RegExp(`dubbed(\\(.+\\))?\\.\\d\\d\\d\\d?p(\\.(${releaseRegex.source}))?(\\.(${encodersRegex.source}))?`, 'g'), (res) => {
            let temp = res.split('.');
            return [...temp.slice(1), temp[0]].filter(item => item).join('.');
        })
        .replace(new RegExp(`dubbed(\\(.+\\))?(\\.Censored)?\\.(${releaseRegex.source})`, 'g'), (res) => res.split('.').reverse().join('.'))
        .replace(new RegExp(`(HardSub\\.)?Censored\\.(${releaseRegex.source})`, 'g'), (res) => res.split('.').reverse().join('.'))
        .replace(new RegExp(`(HardSub|SoftSub|dubbed(\\(.+\\))?)\\.Censored`, 'g'), (res) => res.split('.').reverse().join('.'))
        .replace(new RegExp(`\\d\\.Part\\.\\d\\d\\d\\d?p(\\.x265\\.10bit)?`, 'g'), (res) => {
            let temp = res.split('.');
            return [...temp.slice(2), temp[1], temp[0]].filter(item => item).join('.');
        })
        .replace(new RegExp(`(${encodersRegex.source})\\.Part\\.\\d`), (res) => {
            let temp = res.split('.');
            return [temp[1], temp[2], temp[0]].join('.');
        })
        .replace(new RegExp(`(${releaseRegex.source})\\.Part\\.\\d`), (res) => {
            let temp = res.split('.');
            return [temp[1], temp[2], temp[0]].join('.');
        })
        .replace(subRegex, (res) => res.split('.').reverse().join('.'))
        .replace(new RegExp(`(${encodersRegex.source})\\.\\d\\d\\d\\d?p`, 'g'), (res) => res.split('.').reverse().join('.'))
        .replace(new RegExp(`(${encodersRegex.source})\\.(${releaseRegex.source})`, 'g'), (res) => res.split('.').reverse().join('.'))
        .replace('10bit.x265', 'x265.10bit')
        .replace(/(x265\.10bit\.\d\d\d\d?p)|(10bit\.\d\d\d\d?p\.x265)/g, (res) => res.match(/\d\d\d\d?p/)[0] + '.x265.10bit')
        .replace(/(x265|10bit|(FULL-)?HD|3D)\.\d\d\d\d?p/g, (res) => res.split('.').reverse().join('.'))
        .replace('.HD.WEB-DL', '.WEB-DL')
        .replace(subRegex, (res) => res.split('.').reverse().join('.'))
        .replace('HDR.1080p.10bit', '1080p.10bit.HDR')
        .replace('HDR.10bit', '10bit.HDR')
        .replace('x265.3D', '3D.x265')
        .replace('x265.x265', 'x265')
        .replace('2160p.x265.10bit.4K', '2160p.4K.x265.10bit')
        .replace('1080p.x265.10bit.4K', '1080p.4K.x265.10bit')
        .replace('4K.2160p', '2160p.4K')
        .replace('2K.1440p', '1440p.2K')
        .replace('x265.10bit.3D', '3D.x265.10bit')
        .replace(/((x265\.10bit)|(2160p\.x265)|(4K\.x265)|BluRay)\.FULL?[-.]HD/i, (res) => res.replace(/\.FULL?[-.]HD/i, ''))
        .replace('2K.1080p.', '1080p.')
        .replace(/REMASTERED\.\d\d\d\d?p(\.x265)?(\.10bit)?/, (res) => res.replace('REMASTERED.', '') + '.REMASTERED')
        .replace(new RegExp(`REMASTERED\\.(${releaseRegex.source})`), (res) => res.split('.').reverse().join('.'))
        .replace(/EXTRAS\.\d\d\d\d?p/, (res) => res.split('.').reverse().join('.'))
        .replace(/EXTENDED\.\d\d\d\d?p/, (res) => res.split('.').reverse().join('.'))
        .replace(/Theatrical\.\d\d\d\d?p/, (res) => res.split('.').reverse().join('.'))
        .replace(/IMAX\.\d\d\d\d?p(\.4K)?\.x265\.10bit/, (res) => res.replace('IMAX.', '') + '.IMAX')
        .replace(/Episode\(\d\d?\d?-\d\d?\d?\)\.x265(\.10bit)?/, (res) => {
            let temp = res.split('.');
            return [...temp.slice(1), temp[0]].filter(item => item).join('.');
        })
        .replace(/Cut\.Directors\.\d\d\d\d?p(\.4K)?/, (res) => res.replace('Cut.Directors.', '') + '.DIRECTORS.CUT')
        .replace(/\.(2020|(Cut\.)?Exclusive)/gi, '')
        .replace(/\d\d\d\d٫\d\d٫\d\d/, (res) => res.replace(/٫/g, '.').split('.').reverse().join('.')) //case: 2020٫11٫19
        .replace(/\d\d٫\d\d٫\d\d\d\d/, (res) => res.replace(/٫/g, '.')); //case: 28٫09٫2020
}

export function getCleanLinkInfo(info) {
    return info
        .replace(/[ًًًٌٍَُِ]/g, '')
        .replace(/\d\d\d\d?P\./, (res) => res.replace('P', 'p'))
        .replace('20160p.', '2160p.')
        .replace(/^(10820p|10800p|1080pHQ)\./, '1080p.')
        .replace(/^720p.\./, '720p.')
        .replace(/\.(1080|80p|720|72p|70p?|20p|480|40p|48p|128|0p)\./, '.')
        .replace(/\.(1080|80p|720|72p|70p?|20p|480|40p|48p|128|0p)$/, '')
        .replace(/\.720$/, '')
        .replace(/\.(x254|x264)/g, '')
        .replace('x256', 'x265')
        .replace('X265', 'x265')
        .replace('UHD.4K', '4K')
        .replace('x265.4K', '4K.x265')
        .replace('10bit.4K', '4K.10bit')
        .replace('4K.2160p', '2160p.4K')
        .replace(/10Bitr?/i, '10bit')
        .replace(/\.(H264|HEVC|mkv|mp4|uRay|Dolby|x26|x2256)\./gi, '.')
        .replace(/\.(H264|HEVC|mkv|mp4|uRay)$/gi, '')
        .replace('10bit.10it', '10bit')
        .replace('dubbed.dubbed', 'dubbed')
        .replace(/ENG\.Dubbed/i, 'dubbed(english)')
        .replace(/Part \d/, (res) => res.replace(' ', '.'))
        .replace(/Part\d/, (res) => res.replace('Part', 'Part.'))
        .replace(/remux/i, 'REMUX')
        .replace(/(Cut\.)?Alt[-.]Universe(\.Cut)?/i, 'ALT-UNIVERSE-CUT')
        .replace(/\.(MB|GB)[.\s]\d\d\d?\./, '.')
        .replace(/\.\d\d\d?[.\s](MB|GB)\./, '.');
}

export function purgeSizeText(sizeText) {
    let result = sizeText
        .trim()
        .replace(/[ۀإ]/g, '')
        .replace('میانگین حجم', '')
        .replace('حجم: نامشخص', '')
        .replace('حجم', '')
        .replace('میانگین', '')
        .replace('فایل', '')
        .replace('گیگابایت', 'GB')
        .replace('گیگا بایت', 'GB')
        .replace('گیگابیت', 'GB')
        .replace('گیابایت', 'GB')
        .replace('گیگابات', 'GB')
        .replace('گیگ', 'GB')
        .replace('گمابایت', 'MB')
        .replace('مگابایت', 'MB')
        .replace('مگابابت', 'MB')
        .replace('مکگابایت', 'MB')
        .replace('مگاابایت', 'MB')
        .replace('مگا بایت', 'MB')
        .replace('bytes', 'b')
        .replace('انکودر', '')
        .replace(/[\s:,]/g, '')
        .replace(/\(ورژن\d\)/g, '') // (ورژن1)
        .replace(/\(جدید\)/g, '') // (جدید)
        .replace(/bytes|kb|720p/gi, '')
        .replace(/^\d(\.\d)?(BG|G8|GHB)$/i, (res) => res.replace(/(BG|G8|GHB)/i, 'GB'))
        .replace(/\.([mg])/i, (res) => res.replace('.', ''))
        .replace(/g$/i, (res) => res + 'b')
        .replace(/(GBB|GBGB|HB)$/i, 'GB')
        .replace(/(BMB)$/i, 'MB')
        .toUpperCase();

    if (result.match(/(mb|gb)\d+/gi)) {
        result = result.slice(2) + result.slice(0, 2);
    }
    if (result && !result.match(/mb|gb/gi)) {
        let temp = result.match(/^\d(\.\d+)?$/g) ? 'GB' : 'MB';
        result += temp;
    }
    if (result.match(/^\d\d+\.\d+MB$/g)) {
        result = result.split('.')[0] + 'MB';
    }
    if (result.match(/\d\d\d\dMB/)) {
        let size = result.split('M')[0];
        let newSize = (size / 1024).toFixed(2);
        result = newSize + 'GB';
    }
    if (result.match(/^\d(\.\d\d?)?MB$/)) {
        result = result.replace('MB', 'GB');
    }
    if (result.match(/^\d\d\d(\.?\d)?GB$/)) {
        result = result.replace(/\.\d/, '').replace('GB', 'MB');
        if (result.match(/\d\d\d\dMB/)) {
            let size = result.split('M')[0];
            let newSize = (size / 1024).toFixed(2);
            result = newSize + 'GB';
        }
    }
    if (result.match(/^((mkvmb|mb|gb)|(0(mb|gb)))$/gi) || result === '1MB') {
        return '';
    }
    return result;
}

export function purgeEncoderText(encoderText) {
    return encoderText
        .replace('انتخاب انکودر', '')
        .replace('انکودر', '')
        .replace('انکدر', '')
        .replace('انکود', '')
        .replace('موسسه', '')
        .replace('لینک های دانلود با زیرنویس فارسی چسبیده', '')
        .replace(/[ًًًَ]/g, '')
        .replace(/encoder|Unknown|Unkown|Unjnown|Unlnown|:|-|‌| /gi, '')
        .replace(/mkvcage/gi, 'MkvCage')
        .replace(/mkvhub/gi, 'MkvHub')
        .replace(/shaanig/gi, 'ShAaNiG')
        .replace(/yts(\.(mx|ag))?/gi, 'YTS')
        .replace(/(MB)?Pahe/gi, 'PaHe')
        .replace(/xtv/gi, 'xTv')
        .replace(/n[il]tro/gi, 'NitRo')
        .replace(/yify/gi, 'YIFY')
        .replace(/yifi/gi, 'YIFI')
        .replace(/WEB-?DL/gi, 'WEB-DL')
        .replace(/GalxayR?G?/i, 'GalaxyRG')
        .replace('af,72', 'afm72')
        .replace(/playWEB/i, '')
        .trim();
}

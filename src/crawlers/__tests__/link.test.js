import {
    checkEqualLinks,
    groupMovieLinks,
    groupSerialLinks,
    updateMoviesGroupedLinks,
    updateSerialLinks
} from "../link.js";

test('link with same common fields result in equal=true', () => {
    let link1 = {
        link: 'link1',
        info: 'info1',
        qualitySample: 'qualitySample1',
        season: 1,
        episode: 2,
    };
    let link2 = {
        link: 'link1',
        info: 'info1',
        qualitySample: 'qualitySample1',
        season: 1,
        episode: 2,
    };
    expect(checkEqualLinks(link1, link2)).toBe(true);
});

test('link without same common fields result in equal=false', () => {
    let link1 = {
        link: 'link1',
        info: 'info1',
        qualitySample: 'qualitySample1',
        season: 1,
        episode: 2,
    };
    let link2 = {
        link: 'link2',
        info: 'info2',
        qualitySample: 'qualitySample1',
        season: 1,
        episode: 2,
    };
    expect(checkEqualLinks(link1, link2)).toBe(false);
});

test('group links of movie titles', () => {
    let links = [
        {
            link: 'link1',
            info: '720p.WEB-DL',
            qualitySample: 'qualitySample1',
            sourceName: 'sourceName1',
            season: 0,
            episode: 0,
        },
        {
            link: 'link2',
            info: '1080p.x265',
            qualitySample: 'qualitySample2',
            sourceName: 'sourceName1',
            season: 0,
            episode: 0,
        }
    ];

    let watchOnlineLinks = [
        {
            link: 'link1',
            info: '480p',
            sourceName: 'sourceName1',
            season: 0,
            episode: 0,
        },
        {
            link: 'link2',
            info: '720p.HDTV',
            sourceName: 'sourceName1',
            season: 0,
            episode: 0,
        }
    ];

    let torrentLinks = [];

    let expectedResult = [
        {quality: '2160p', links: [], watchOnlineLinks: [], torrentLinks: []},
        {
            quality: '1080p',
            links: [{
                link: 'link2',
                info: '1080p.x265',
                qualitySample: 'qualitySample2',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },],
            watchOnlineLinks: [],
            torrentLinks: []
        },
        {
            quality: '720p',
            links: [{
                link: 'link1',
                info: '720p.WEB-DL',
                qualitySample: 'qualitySample1',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },],
            watchOnlineLinks: [{
                link: 'link2',
                info: '720p.HDTV',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },],
            torrentLinks: []
        },
        {
            quality: '480p',
            links: [],
            watchOnlineLinks: [{
                link: 'link1',
                info: '480p',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },],
            torrentLinks: []
        },
        {quality: '360p', links: [], watchOnlineLinks: [], torrentLinks: []},
        {quality: 'others', links: [], watchOnlineLinks: [], torrentLinks: []}
    ];
    expect(groupMovieLinks(links, watchOnlineLinks, torrentLinks)).toStrictEqual(expectedResult);
});

test('update movies grouped links', () => {
    let prevGroupLinks = [
        {quality: '2160p', links: [], watchOnlineLinks: [], torrentLinks: []},
        {
            quality: '1080p',
            links: [{
                link: 'link2',
                info: '1080p.x265',
                qualitySample: 'qualitySample2',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },],
            watchOnlineLinks: [],
            torrentLinks: []
        },
        {
            quality: '720p',
            links: [{
                link: 'link3',
                info: '720p.WEB-DL',
                qualitySample: 'qualitySample3',
                sourceName: 'sourceName3',
                season: 0,
                episode: 0,
            },],
            watchOnlineLinks: [{
                link: 'link2',
                info: '720p.HDTV',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },],
            torrentLinks: []
        },
        {
            quality: '480p',
            links: [],
            watchOnlineLinks: [{
                link: 'link1',
                info: '480p.v1',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },],
            torrentLinks: []
        },
    ];

    let currentGroupLinks = [
        {quality: '2160p', links: [], watchOnlineLinks: [], torrentLinks: []},
        {quality: '1080p', links: [], watchOnlineLinks: [], torrentLinks: []},
        {
            quality: '720p',
            links: [{
                link: 'link1',
                info: '720p.WEB-DL',
                qualitySample: 'qualitySample1',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },],
            watchOnlineLinks: [],
            torrentLinks: []
        },
        {
            quality: '480p',
            links: [],
            watchOnlineLinks: [{
                link: 'link1',
                info: '480p.v2',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },],
            torrentLinks: []
        },
        {quality: '360p', links: [], watchOnlineLinks: [], torrentLinks: []},
        {quality: 'others', links: [], watchOnlineLinks: [], torrentLinks: []}
    ];

    let newGroupLinks = [
        {quality: '2160p', links: [], watchOnlineLinks: [], torrentLinks: []},
        {quality: '1080p', links: [], watchOnlineLinks: [], torrentLinks: []},
        {
            quality: '720p',
            links: [
                {
                    link: 'link3',
                    info: '720p.WEB-DL',
                    qualitySample: 'qualitySample3',
                    sourceName: 'sourceName3',
                    season: 0,
                    episode: 0,
                },
                {
                    link: 'link1',
                    info: '720p.WEB-DL',
                    qualitySample: 'qualitySample1',
                    sourceName: 'sourceName1',
                    season: 0,
                    episode: 0,
                },
            ],
            watchOnlineLinks: [],
            torrentLinks: []
        },
        {
            quality: '480p',
            links: [],
            watchOnlineLinks: [{
                link: 'link1',
                info: '480p.v2',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },],
            torrentLinks: []
        },
        {quality: '360p', links: [], watchOnlineLinks: [], torrentLinks: []},
        {quality: 'others', links: [], watchOnlineLinks: [], torrentLinks: []}
    ];
    let result = updateMoviesGroupedLinks(prevGroupLinks, currentGroupLinks, 'sourceName1');
    expect(result).toEqual(true);
    expect(prevGroupLinks).toStrictEqual(newGroupLinks);
});

test('group links of serials titles', () => {
    let links = [
        {
            link: 'link1',
            info: '720p.WEB-DL',
            qualitySample: 'qualitySample1',
            sourceName: 'sourceName1',
            season: 1,
            episode: 1,
        },
        {
            link: 'link2',
            info: '1080p.x265',
            qualitySample: 'qualitySample2',
            sourceName: 'sourceName1',
            season: 3,
            episode: 2,
        }
    ];

    let watchOnlineLinks = [
        {
            link: 'link1',
            info: '480p',
            sourceName: 'sourceName1',
            season: 2,
            episode: 3,
        },
        {
            link: 'link2',
            info: '720p.HDTV',
            sourceName: 'sourceName1',
            season: 1,
            episode: 1,
        }
    ];

    let torrentLinks = [];

    let otherEpisodeFields = {
        title: 'unknown',
        released: 'unknown',
        releaseStamp: '',
        duration: '0 min',
        imdbRating: '0',
        imdbID: '',
    }

    let expectedResult = [
        {
            seasonNumber: 1,
            episodes: [
                {
                    episodeNumber: 1,
                    ...otherEpisodeFields,
                    links: [{
                        link: 'link1',
                        info: '720p.WEB-DL',
                        qualitySample: 'qualitySample1',
                        sourceName: 'sourceName1',
                        season: 1,
                        episode: 1,
                    },],
                    watchOnlineLinks: [{
                        link: 'link2',
                        info: '720p.HDTV',
                        sourceName: 'sourceName1',
                        season: 1,
                        episode: 1,
                    },],
                    torrentLinks: []
                }
            ]
        },
        {
            seasonNumber: 2,
            episodes: [
                {
                    episodeNumber: 3,
                    ...otherEpisodeFields,
                    links: [],
                    watchOnlineLinks: [{
                        link: 'link1',
                        info: '480p',
                        sourceName: 'sourceName1',
                        season: 2,
                        episode: 3,
                    },],
                    torrentLinks: []
                }
            ]
        },
        {
            seasonNumber: 3,
            episodes: [
                {
                    episodeNumber: 2,
                    ...otherEpisodeFields,
                    links: [{
                        link: 'link2',
                        info: '1080p.x265',
                        qualitySample: 'qualitySample2',
                        sourceName: 'sourceName1',
                        season: 3,
                        episode: 2,
                    },],
                    watchOnlineLinks: [],
                    torrentLinks: []
                },
            ]
        },
    ];
    expect(groupSerialLinks(links, watchOnlineLinks, torrentLinks)).toStrictEqual(expectedResult);
});

test('update serial episode/movie quality links', () => {
    let episodeOrQuality = {
        // other fields
        links: [
            {
                link: 'link3',
                info: '1080p.x265',
                qualitySample: 'qualitySample2',
                sourceName: 'sourceName2',
                season: 2,
                episode: 1,
            },
            {
                link: 'link2',
                info: '720p.HDTV',
                qualitySample: 'qualitySample1',
                sourceName: 'sourceName1',
                season: 2,
                episode: 1,
            },
            {
                link: 'link1',
                info: '720p.WEB-DL',
                qualitySample: 'qualitySample1',
                sourceName: 'sourceName1',
                season: 2,
                episode: 1,
            },
        ],
        watchOnlineLinks: [
            {
                link: 'link5',
                info: '720p.HDTV',
                sourceName: 'sourceName3',
                season: 2,
                episode: 1,
            },
            {
                link: 'link4',
                info: '480p',
                sourceName: 'sourceName2',
                season: 2,
                episode: 1,
            },
        ],
        torrentLinks: []
    }

    let prevLinks = episodeOrQuality.links.filter(item => item.sourceName === 'sourceName1');
    let prevOnlineLinks = episodeOrQuality.watchOnlineLinks.filter(item => item.sourceName === 'sourceName1');
    let currentLinks = [
        {
            link: 'link2.v2',
            info: '720p.HDTV',
            qualitySample: 'qualitySample1',
            sourceName: 'sourceName1',
            season: 2,
            episode: 1,
        },
    ];
    let currentOnlineLinks = [
        {
            link: 'link6',
            info: '480p',
            sourceName: 'sourceName1',
            season: 2,
            episode: 1,
        },
    ];

    let episodeOrQuality_new = {
        links: [
            {
                link: 'link3',
                info: '1080p.x265',
                qualitySample: 'qualitySample2',
                sourceName: 'sourceName2',
                season: 2,
                episode: 1,
            },
            {
                link: 'link2.v2',
                info: '720p.HDTV',
                qualitySample: 'qualitySample1',
                sourceName: 'sourceName1',
                season: 2,
                episode: 1,
            },
        ],
        watchOnlineLinks: [
            {
                link: 'link5',
                info: '720p.HDTV',
                sourceName: 'sourceName3',
                season: 2,
                episode: 1,
            },
            {
                link: 'link4',
                info: '480p',
                sourceName: 'sourceName2',
                season: 2,
                episode: 1,
            },
            {
                link: 'link6',
                info: '480p',
                sourceName: 'sourceName1',
                season: 2,
                episode: 1,
            },
        ],
        torrentLinks: []
    };

    let result = updateSerialLinks(episodeOrQuality, prevLinks, prevOnlineLinks, [], currentLinks, currentOnlineLinks, []);
    expect(result).toEqual(true);
    expect(episodeOrQuality).toStrictEqual(episodeOrQuality_new);
});

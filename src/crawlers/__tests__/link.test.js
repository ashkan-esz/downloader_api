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
        pageLink: 'pageLink1',
        season: 1,
        episode: 2,
    };
    let link2 = {
        link: 'link1',
        info: 'info1',
        qualitySample: 'qualitySample1',
        pageLink: 'pageLink1',
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
        pageLink: 'pageLink1',
        season: 1,
        episode: 2,
    };
    let link2 = {
        link: 'link2',
        info: 'info2',
        qualitySample: 'qualitySample1',
        pageLink: 'pageLink2',
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
            pageLink: 'pageLink1',
            sourceName: 'sourceName1',
            season: 0,
            episode: 0,
        },
        {
            link: 'link2',
            info: '1080p.x265',
            qualitySample: 'qualitySample2',
            pageLink: 'pageLink1',
            sourceName: 'sourceName1',
            season: 0,
            episode: 0,
        }
    ];

    let watchOnlineLinks = [
        {
            link: 'link1',
            info: '480p',
            pageLink: 'pageLink1',
            sourceName: 'sourceName1',
            season: 0,
            episode: 0,
        },
        {
            link: 'link2',
            info: '720p.HDTV',
            pageLink: 'pageLink1',
            sourceName: 'sourceName1',
            season: 0,
            episode: 0,
        }
    ];

    let expectedResult = [
        {quality: '2160p', links: [], watchOnlineLinks: []},
        {
            quality: '1080p',
            links: [{
                link: 'link2',
                info: '1080p.x265',
                qualitySample: 'qualitySample2',
                pageLink: 'pageLink1',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },],
            watchOnlineLinks: []
        },
        {
            quality: '720p',
            links: [{
                link: 'link1',
                info: '720p.WEB-DL',
                qualitySample: 'qualitySample1',
                pageLink: 'pageLink1',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },],
            watchOnlineLinks: [{
                link: 'link2',
                info: '720p.HDTV',
                pageLink: 'pageLink1',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },]
        },
        {
            quality: '480p',
            links: [],
            watchOnlineLinks: [{
                link: 'link1',
                info: '480p',
                pageLink: 'pageLink1',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },]
        },
        {quality: '360p', links: [], watchOnlineLinks: []},
        {quality: 'others', links: [], watchOnlineLinks: []}
    ];
    expect(groupMovieLinks(links, watchOnlineLinks)).toStrictEqual(expectedResult);
});

test('update movies grouped links', () => {
    let prevGroupLinks = [
        {quality: '2160p', links: [], watchOnlineLinks: []},
        {
            quality: '1080p',
            links: [{
                link: 'link2',
                info: '1080p.x265',
                qualitySample: 'qualitySample2',
                pageLink: 'pageLink1',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },],
            watchOnlineLinks: []
        },
        {
            quality: '720p',
            links: [{
                link: 'link3',
                info: '720p.WEB-DL',
                qualitySample: 'qualitySample3',
                pageLink: 'pageLink3',
                sourceName: 'sourceName3',
                season: 0,
                episode: 0,
            },],
            watchOnlineLinks: [{
                link: 'link2',
                info: '720p.HDTV',
                pageLink: 'pageLink1',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },]
        },
        {
            quality: '480p',
            links: [],
            watchOnlineLinks: [{
                link: 'link1',
                info: '480p.v1',
                pageLink: 'pageLink1',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },]
        },
    ];

    let currentGroupLinks = [
        {quality: '2160p', links: [], watchOnlineLinks: []},
        {
            quality: '1080p',
            links: [],
            watchOnlineLinks: []
        },
        {
            quality: '720p',
            links: [{
                link: 'link1',
                info: '720p.WEB-DL',
                qualitySample: 'qualitySample1',
                pageLink: 'pageLink1',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },],
            watchOnlineLinks: []
        },
        {
            quality: '480p',
            links: [],
            watchOnlineLinks: [{
                link: 'link1',
                info: '480p.v2',
                pageLink: 'pageLink1',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },]
        },
        {quality: '360p', links: [], watchOnlineLinks: []},
        {quality: 'others', links: [], watchOnlineLinks: []}
    ];

    let newGroupLinks = [
        {quality: '2160p', links: [], watchOnlineLinks: []},
        {
            quality: '1080p',
            links: [],
            watchOnlineLinks: []
        },
        {
            quality: '720p',
            links: [
                {
                    link: 'link3',
                    info: '720p.WEB-DL',
                    qualitySample: 'qualitySample3',
                    pageLink: 'pageLink3',
                    sourceName: 'sourceName3',
                    season: 0,
                    episode: 0,
                },
                {
                    link: 'link1',
                    info: '720p.WEB-DL',
                    qualitySample: 'qualitySample1',
                    pageLink: 'pageLink1',
                    sourceName: 'sourceName1',
                    season: 0,
                    episode: 0,
                },
            ],
            watchOnlineLinks: []
        },
        {
            quality: '480p',
            links: [],
            watchOnlineLinks: [{
                link: 'link1',
                info: '480p.v2',
                pageLink: 'pageLink1',
                sourceName: 'sourceName1',
                season: 0,
                episode: 0,
            },]
        },
        {quality: '360p', links: [], watchOnlineLinks: []},
        {quality: 'others', links: [], watchOnlineLinks: []}
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
            pageLink: 'pageLink1',
            sourceName: 'sourceName1',
            season: 1,
            episode: 1,
        },
        {
            link: 'link2',
            info: '1080p.x265',
            qualitySample: 'qualitySample2',
            pageLink: 'pageLink1',
            sourceName: 'sourceName1',
            season: 3,
            episode: 2,
        }
    ];

    let watchOnlineLinks = [
        {
            link: 'link1',
            info: '480p',
            pageLink: 'pageLink1',
            sourceName: 'sourceName1',
            season: 2,
            episode: 3,
        },
        {
            link: 'link2',
            info: '720p.HDTV',
            pageLink: 'pageLink1',
            sourceName: 'sourceName1',
            season: 1,
            episode: 1,
        }
    ];

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
                        pageLink: 'pageLink1',
                        sourceName: 'sourceName1',
                        season: 1,
                        episode: 1,
                    },],
                    watchOnlineLinks: [{
                        link: 'link2',
                        info: '720p.HDTV',
                        pageLink: 'pageLink1',
                        sourceName: 'sourceName1',
                        season: 1,
                        episode: 1,
                    },]
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
                        pageLink: 'pageLink1',
                        sourceName: 'sourceName1',
                        season: 2,
                        episode: 3,
                    },]
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
                        pageLink: 'pageLink1',
                        sourceName: 'sourceName1',
                        season: 3,
                        episode: 2,
                    },],
                    watchOnlineLinks: []
                },
            ]
        },
    ];
    expect(groupSerialLinks(links, watchOnlineLinks)).toStrictEqual(expectedResult);
});

test('update serial episode/movie quality links', () => {
    let episodeOrQuality = {
        // other fields
        links: [
            {
                link: 'link1',
                info: '720p.WEB-DL',
                qualitySample: 'qualitySample1',
                pageLink: 'pageLink1',
                sourceName: 'sourceName1',
                season: 2,
                episode: 1,
            },
            {
                link: 'link2',
                info: '720p.HDTV',
                qualitySample: 'qualitySample1',
                pageLink: 'pageLink1',
                sourceName: 'sourceName1',
                season: 2,
                episode: 1,
            },
            {
                link: 'link3',
                info: '1080p.x265',
                qualitySample: 'qualitySample2',
                pageLink: 'pageLink2',
                sourceName: 'sourceName2',
                season: 2,
                episode: 1,
            }
        ],
        watchOnlineLinks: [
            {
                link: 'link4',
                info: '480p',
                pageLink: 'pageLink2',
                sourceName: 'sourceName2',
                season: 2,
                episode: 1,
            },
            {
                link: 'link5',
                info: '720p.HDTV',
                pageLink: 'pageLink3',
                sourceName: 'sourceName3',
                season: 2,
                episode: 1,
            }
        ]
    }

    let prevLinks = episodeOrQuality.links.filter(item => item.sourceName === 'sourceName1');
    let prevOnlineLinks = episodeOrQuality.watchOnlineLinks.filter(item => item.sourceName === 'sourceName1');
    let currentLinks = [
        {
            link: 'link2.v2',
            info: '720p.HDTV',
            qualitySample: 'qualitySample1',
            pageLink: 'pageLink1',
            sourceName: 'sourceName1',
            season: 2,
            episode: 1,
        },
    ];
    let currentOnlineLinks = [
        {
            link: 'link6',
            info: '480p',
            pageLink: 'pageLink1',
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
                pageLink: 'pageLink2',
                sourceName: 'sourceName2',
                season: 2,
                episode: 1,
            },
            {
                link: 'link2.v2',
                info: '720p.HDTV',
                qualitySample: 'qualitySample1',
                pageLink: 'pageLink1',
                sourceName: 'sourceName1',
                season: 2,
                episode: 1,
            },
        ],
        watchOnlineLinks: [
            {
                link: 'link4',
                info: '480p',
                pageLink: 'pageLink2',
                sourceName: 'sourceName2',
                season: 2,
                episode: 1,
            },
            {
                link: 'link5',
                info: '720p.HDTV',
                pageLink: 'pageLink3',
                sourceName: 'sourceName3',
                season: 2,
                episode: 1,
            },
            {
                link: 'link6',
                info: '480p',
                pageLink: 'pageLink1',
                sourceName: 'sourceName1',
                season: 2,
                episode: 1,
            },
        ]
    };

    let result = updateSerialLinks(episodeOrQuality, prevLinks, prevOnlineLinks, currentLinks, currentOnlineLinks);
    expect(result).toEqual(true);
    expect(episodeOrQuality).toStrictEqual(episodeOrQuality_new);
});

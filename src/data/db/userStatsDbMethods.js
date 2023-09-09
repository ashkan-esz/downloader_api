import prisma from "../prisma.js";
import {saveError} from "../../error/saveError.js";


export const statTypes = Object.freeze({
    likeDislike: Object.freeze([
        'like_movie', 'dislike_movie',
        'like_staff', 'dislike_staff',
        'like_character', 'dislike_character',
    ]),
    followStaff: Object.freeze([
        'follow_staff', 'favorite_character',
    ]),
    movies: Object.freeze([
        'finish_movie', 'follow_movie', 'watchlist_movie',
    ]),
    withScore: Object.freeze(['finish_movie', 'follow_movie', 'watchlist_movie']),
    all: Object.freeze([
        'like_movie', 'dislike_movie',
        'like_staff', 'dislike_staff',
        'like_character', 'dislike_character',
        'follow_staff', 'favorite_character',
        'finish_movie', 'follow_movie', 'watchlist_movie',
    ]),
});

const _transactionRetryDelay = 100;

//-----------------------------------------------------
//-----------------------------------------------------

export async function addUserStats_likeDislike(userId, statType, id, isRemove, retryCounter = 0) {
    try {
        const type = statType.split('_')[0];
        const type2 = type === 'like' ? 'dislike' : 'like';

        const counterField = type + 's_count';
        const counterField2 = type2 + 's_count';

        if (statType === 'like_staff' || statType === 'dislike_staff') {
            id = Number(id);
            if (isRemove) {
                return await removeUserStats_likeDislike_staff(userId, id, counterField);
            }
            return await addUserStats_likeDislike_staff(userId, id, type, counterField, counterField2);
        } else if (statType === 'like_character' || statType === 'dislike_character') {
            id = Number(id);
            if (isRemove) {
                return await removeUserStats_likeDislike_character(userId, id, counterField);
            }
            return await addUserStats_likeDislike_character(userId, id, type, counterField, counterField2);
        } else {
            if (isRemove) {
                return await removeUserStats_likeDislike_movie(userId, id, counterField);
            }
            return await addUserStats_likeDislike_movie(userId, id, type, counterField, counterField2);
        }
    } catch (error) {
        if (error.code === 'P2003' || error.code === 'P2025') {
            return 'notfound';
        }
        if (retryCounter < 2) {
            await new Promise(resolve => setTimeout(resolve, _transactionRetryDelay));
            retryCounter++;
            return await addUserStats_likeDislike(userId, statType, id, isRemove, retryCounter);
        }
        saveError(error);
        return 'error';
    }
}

async function addUserStats_likeDislike_staff(userId, id, type, counterField, counterField2) {
    let checkExist = await prisma.likeDislikeStaff.findFirst({
        where: {
            userId: userId,
            staffId: id,
        },
        select: {
            type: true,
        }
    });
    if (checkExist) {
        if (checkExist.type === type) {
            return checkExist;
        } else {
            //type swap
            return prisma.likeDislikeStaff.update({
                where: {
                    userId_staffId: {
                        userId: userId,
                        staffId: id,
                    },
                },
                data: {
                    type: type,
                    date: new Date(),
                    staff: {
                        update: {
                            [counterField2]: {decrement: 1},
                            [counterField]: {increment: 1},
                        }
                    }
                },
                select: {
                    type: true,
                }
            });
        }
    } else {
        return await prisma.$transaction(async (prisma) => {
            let res = await Promise.all([
                prisma.likeDislikeStaff.create({
                    data: {
                        userId: userId,
                        staffId: id,
                        type: type,
                        date: new Date(),
                    },
                    select: {
                        type: true,
                    }
                }),
                prisma.staff.update({
                    where: {
                        id: id,
                    },
                    data: {
                        [counterField]: {increment: 1}
                    },
                    select: {
                        likes_count: true,
                    }
                })
            ]);
            return res[0];
        });
    }
}

async function addUserStats_likeDislike_character(userId, id, type, counterField, counterField2) {
    let checkExist = await prisma.likeDislikeCharacter.findFirst({
        where: {
            userId: userId,
            characterId: id,
        },
        select: {
            type: true,
        }
    });
    if (checkExist) {
        if (checkExist.type === type) {
            return checkExist;
        } else {
            //type swap
            return prisma.likeDislikeCharacter.update({
                where: {
                    userId_characterId: {
                        userId: userId,
                        characterId: id,
                    },
                },
                data: {
                    type: type,
                    date: new Date(),
                    character: {
                        update: {
                            [counterField2]: {decrement: 1},
                            [counterField]: {increment: 1},
                        }
                    },
                },
                select: {
                    type: true,
                }
            });
        }
    } else {
        return await prisma.$transaction(async (prisma) => {
            let res = await Promise.all([
                prisma.likeDislikeCharacter.create({
                    data: {
                        userId: userId,
                        characterId: id,
                        type: type,
                        date: new Date(),
                    },
                    select: {
                        type: true,
                    }
                }),
                prisma.character.update({
                    where: {
                        id: id,
                    },
                    data: {
                        [counterField]: {increment: 1}
                    },
                    select: {
                        likes_count: true,
                    }
                })
            ]);
            return res[0];
        });
    }
}

async function addUserStats_likeDislike_movie(userId, id, type, counterField, counterField2) {
    let checkExist = await prisma.likeDislikeMovie.findFirst({
        where: {
            userId: userId,
            movieId: id,
        },
        select: {
            type: true,
        }
    });
    if (checkExist) {
        if (checkExist.type === type) {
            return checkExist;
        } else {
            //type swap
            return prisma.likeDislikeMovie.update({
                where: {
                    userId_movieId: {
                        userId: userId,
                        movieId: id,
                    },
                },
                data: {
                    type: type,
                    date: new Date(),
                    movie: {
                        update: {
                            [counterField2]: {decrement: 1},
                            [counterField]: {increment: 1},
                        },
                    },
                },
                select: {
                    type: true,
                }
            });
        }
    } else {
        return await prisma.$transaction(async (prisma) => {
            let res = await Promise.all([
                prisma.likeDislikeMovie.create({
                    data: {
                        userId: userId,
                        movieId: id,
                        type: type,
                        date: new Date(),
                    },
                    select: {
                        type: true,
                    }
                }),
                prisma.movie.update({
                    where: {
                        movieId: id,
                    },
                    data: {
                        [counterField]: {increment: 1}
                    },
                    select: {
                        likes_count: true,
                    }
                }),
            ]);
            return res[0];
        });
    }
}

async function removeUserStats_likeDislike_staff(userId, id, counterField) {
    return prisma.$transaction(async (prisma) => {
        let res = await Promise.all([
            prisma.likeDislikeStaff.delete({
                where: {
                    userId_staffId: {
                        userId: userId,
                        staffId: id,
                    },
                },
                select: {
                    type: true,
                }
            }),
            prisma.staff.update({
                where: {
                    id: id,
                },
                data: {
                    [counterField]: {decrement: 1}
                },
                select: {
                    likes_count: true,
                }
            })
        ]);
        return res[0];
    });
}

async function removeUserStats_likeDislike_character(userId, id, counterField) {
    return prisma.$transaction(async (prisma) => {
        let res = await Promise.all([
            prisma.likeDislikeCharacter.delete({
                where: {
                    userId_characterId: {
                        userId: userId,
                        characterId: id,
                    },
                },
                select: {
                    type: true,
                }
            }),
            prisma.character.update({
                where: {
                    id: id,
                },
                data: {
                    [counterField]: {decrement: 1}
                },
                select: {
                    likes_count: true,
                }
            })
        ]);
        return res[0];
    });
}

async function removeUserStats_likeDislike_movie(userId, id, counterField) {
    return prisma.$transaction(async (prisma) => {
        let res = await Promise.all([
            prisma.likeDislikeMovie.delete({
                where: {
                    userId_movieId: {
                        userId: userId,
                        movieId: id,
                    },
                },
                select: {
                    type: true,
                }
            }),
            prisma.movie.update({
                where: {
                    movieId: id,
                },
                data: {
                    [counterField]: {decrement: 1}
                },
                select: {
                    likes_count: true,
                }
            }),
        ]);
        return res[0];
    });
}

//-----------------------------------------------------
//-----------------------------------------------------

export async function addUserStats_followStaff(userId, statType, id, isRemove, retryCounter = 0) {
    try {
        id = Number(id);
        if (isRemove) {
            return await removeUserStats_followStaff(userId, id);
        }

        return await prisma.$transaction(async (prisma) => {
            let res = await Promise.all([
                prisma.followStaff.create({
                    data: {
                        userId: userId,
                        staffId: id,
                        date: new Date(),
                    },
                    select: {
                        date: true,
                    }
                }),
                prisma.staff.update({
                    where: {
                        id: id,
                    },
                    data: {
                        follow_count: {increment: 1}
                    },
                    select: {
                        follow_count: true,
                    }
                })
            ]);
            return res[0];
        });

    } catch (error) {
        if (error.code === 'P2002') {
            //Unique constraint failed on the fields: (`userId`,`staffId`)
            return 'ok';
        }
        if (error.code === 'P2003' || error.code === 'P2025') {
            return 'notfound';
        }
        if (retryCounter < 2) {
            await new Promise(resolve => setTimeout(resolve, _transactionRetryDelay));
            retryCounter++;
            return await addUserStats_followStaff(userId, statType, id, isRemove, retryCounter);
        }
        saveError(error);
        return 'error';
    }
}

async function removeUserStats_followStaff(userId, id) {
    return prisma.$transaction(async (prisma) => {
        let res = await Promise.all([
            prisma.followStaff.delete({
                where: {
                    userId_staffId: {
                        userId: userId,
                        staffId: id,
                    },
                },
                select: {
                    type: true,
                }
            }),
            prisma.staff.update({
                where: {
                    id: id,
                },
                data: {
                    follow_count: {decrement: 1}
                },
                select: {
                    follow_count: true,
                }
            })
        ]);
        return res[0];
    });
}

//-----------------------------------------------------
//-----------------------------------------------------

export async function addUserStats_favoriteCharacter(userId, statType, id, isRemove, retryCounter = 0) {
    try {
        id = Number(id);
        if (isRemove) {
            return await removeUserStats_favoriteCharacter(userId, id);
        }

        return await prisma.$transaction(async (prisma) => {
            let res = await Promise.all([
                prisma.favoriteCharacter.create({
                    data: {
                        userId: userId,
                        characterId: id,
                        date: new Date(),
                    },
                    select: {
                        date: true,
                    }
                }),
                prisma.character.update({
                    where: {
                        id: id,
                    },
                    data: {
                        favorite_count: {increment: 1}
                    },
                    select: {
                        favorite_count: true,
                    }
                })
            ]);
            return res[0];
        });
    } catch (error) {
        if (error.code === 'P2002') {
            //Unique constraint failed on the fields: (`userId`,`characterId`)
            return 'ok';
        }
        if (error.code === 'P2003' || error.code === 'P2025') {
            return 'notfound';
        }
        if (retryCounter < 2) {
            await new Promise(resolve => setTimeout(resolve, _transactionRetryDelay));
            retryCounter++;
            return await addUserStats_favoriteCharacter(userId, statType, id, isRemove, retryCounter);
        }
        saveError(error);
        return 'error';
    }
}

async function removeUserStats_favoriteCharacter(userId, id) {
    return prisma.$transaction(async (prisma) => {
        let res = await Promise.all([
            prisma.favoriteCharacter.delete({
                where: {
                    userId_characterId: {
                        userId: userId,
                        characterId: id,
                    },
                },
                select: {
                    date: true,
                }
            }),
            prisma.character.update({
                where: {
                    id: id,
                },
                data: {
                    favorite_count: {decrement: 1}
                },
                select: {
                    favorite_count: true,
                }
            })
        ]);
        return res[0];
    });
}

//-----------------------------------------------------
//-----------------------------------------------------

export async function addUserStats_followMovie(userId, id, watch_season, watch_episode, score, isRemove, retryCounter = 0) {
    try {
        if (isRemove) {
            return await removeUserStats_followMovie(userId, id);
        }

        let removeWatchlistResult = null;
        try {
            removeWatchlistResult = await removeUserStats_watchListMovie(userId, id);
        } catch (error2) {
            if (error2.code === 'P2025') {
                removeWatchlistResult = null;
            } else {
                saveError(error2);
                return 'error';
            }
        }

        let checkWatched = null;
        let isReWatch = false;
        if (removeWatchlistResult === null) {
            //doesn't exist in watchList, maybe exist in watched list
            //integrity: followMovie/watchListMovie/watchedMovie
            checkWatched = await prisma.watchedMovie.findFirst({
                where: {
                    userId: userId,
                    movieId: id,
                },
                select: {
                    dropped: true,
                    favorite: true,
                    score: true,
                    watch_season: true,
                    watch_episode: true,
                }
            });
            if (checkWatched) {
                if (!checkWatched.dropped) {
                    return 'already watched';
                }
                try {
                    await removeUserStats_finishedMovie(userId, id);
                    isReWatch = true;
                } catch (error2) {
                    saveError(error2);
                    return 'error';
                }
            }
        }

        return await prisma.$transaction(async (prisma) => {
            let res = await Promise.all([
                prisma.followMovie.create({
                    data: {
                        userId: userId,
                        movieId: id,
                        score: score || (removeWatchlistResult?.score ?? checkWatched?.score ?? 0),
                        watch_season: watch_season ?? checkWatched?.watch_season ?? 0,
                        watch_episode: watch_episode ?? checkWatched?.watch_episode ?? 0,
                        date: new Date(),
                    },
                    select: {
                        date: true,
                    }
                }),
                prisma.movie.update({
                    where: {
                        movieId: id,
                    },
                    data: {
                        follow_count: {increment: 1},
                        continue_count: {increment: isReWatch ? 1 : 0},
                    },
                    select: {
                        follow_count: true,
                    }
                })
            ]);
            return res[0];
        });
    } catch (error) {
        if (error.code === 'P2002') {
            //Unique constraint failed on the fields: (`userId`,`movieId`)
            return 'ok';
        }
        if (error.code === 'P2003' || error.code === 'P2025') {
            return 'notfound';
        }
        if (retryCounter < 2) {
            await new Promise(resolve => setTimeout(resolve, _transactionRetryDelay));
            retryCounter++;
            return await addUserStats_followMovie(userId, id, score, isRemove, retryCounter);
        }
        saveError(error);
        return 'error';
    }
}

async function removeUserStats_followMovie(userId, id) {
    try {
        return prisma.$transaction(async (prisma) => {
            let res = await Promise.all([
                prisma.followMovie.delete({
                    where: {
                        userId_movieId: {
                            userId: userId,
                            movieId: id,
                        },
                    },
                    select: {
                        date: true,
                        score: true,
                        watch_season: true,
                        watch_episode: true,
                    }
                }),
                prisma.movie.update({
                    where: {
                        movieId: id,
                    },
                    data: {
                        follow_count: {decrement: 1},
                    },
                    select: {
                        follow_count: true,
                    }
                })
            ]);
            return res[0];
        });
    } catch (error) {
        if (error.code !== 'P2025') {
            saveError(error);
        }
        return null;
    }
}

//-----------------------------------------------------
//-----------------------------------------------------

export async function addUserStats_watchListMovie(userId, id, score, isRemove, retryCounter = 0) {
    try {
        if (isRemove) {
            return await removeUserStats_watchListMovie(userId, id);
        }

        let checkExists = await Promise.allSettled([
            prisma.watchedMovie.findFirst({
                where: {
                    userId: userId,
                    movieId: id,
                },
                select: {
                    date: true,
                }
            }),
            prisma.followMovie.findFirst({
                where: {
                    userId: userId,
                    movieId: id,
                },
                select: {
                    date: true,
                }
            }),
        ]);
        if (checkExists[0].value || checkExists[1].value) {
            return 'already following or watched';
        }

        return await prisma.$transaction(async (prisma) => {
            let res = await Promise.all([
                prisma.watchListMovie.create({
                    data: {
                        userId: userId,
                        movieId: id,
                        score: score || 0,
                        date: new Date(),
                    },
                    select: {
                        date: true,
                    }
                }),
                prisma.movie.update({
                    where: {
                        movieId: id,
                    },
                    data: {
                        watchlist_count: {increment: 1},
                    },
                    select: {
                        watchlist_count: true,
                    }
                })
            ]);
            return res[0];
        });
    } catch (error) {
        if (error.code === 'P2002') {
            //Unique constraint failed on the fields: (`userId`,`movieId`)
            return 'ok';
        }
        if (error.code === 'P2003' || error.code === 'P2025') {
            return 'notfound';
        }
        if (retryCounter < 2) {
            await new Promise(resolve => setTimeout(resolve, _transactionRetryDelay));
            retryCounter++;
            return await addUserStats_watchListMovie(userId, id, score, isRemove, retryCounter);
        }
        saveError(error);
        return 'error';
    }
}

async function removeUserStats_watchListMovie(userId, id) {
    try {
        return prisma.$transaction(async (prisma) => {
            let res = await Promise.all([
                prisma.watchListMovie.delete({
                    where: {
                        userId_movieId: {
                            userId: userId,
                            movieId: id,
                        },
                    },
                    select: {
                        date: true,
                        score: true,
                    }
                }),
                await prisma.movie.update({
                    where: {
                        movieId: id,
                    },
                    data: {
                        watchlist_count: {decrement: 1},
                    },
                    select: {
                        watchlist_count: true,
                    }
                })
            ]);
            return res[0];
        });
    } catch (error) {
        if (error.code !== 'P2025') {
            saveError(error);
        }
        return null;
    }
}

//-----------------------------------------------------
//-----------------------------------------------------

export async function addUserStats_finishedMovie(userId, id, startDate, endDate, score, drop, favorite, isRemove, retryCounter = 0) {
    try {
        if (isRemove) {
            return await removeUserStats_finishedMovie(userId, id);
        }

        let removeFollowResult = null;
        try {
            removeFollowResult = await removeUserStats_followMovie(userId, id);
        } catch (error2) {
            if (error2.code === 'P2025') {
                removeFollowResult = null;
            } else {
                saveError(error2);
                return 'error';
            }
        }

        let removeWatchlistResult = null;
        if (removeFollowResult === null) {
            //doesn't exist in follow, maybe exist in watchList
            //integrity: followMovie/watchListMovie/watchedMovie
            try {
                removeWatchlistResult = await removeUserStats_watchListMovie(userId, id);
            } catch (error2) {
                if (error2.code === 'P2025') {
                    removeWatchlistResult = null;
                } else {
                    saveError(error2);
                    return 'error';
                }
            }
        }

        let checkExist = await prisma.watchedMovie.findFirst({
            where: {
                userId: userId,
                movieId: id,
            },
            select: {
                dropped: true,
                favorite: true,
                score: true,
            }
        });

        if (checkExist) {
            return checkExist;
        } else {
            if (startDate) {
                startDate = new Date(startDate);
            }
            if (endDate) {
                endDate = new Date(endDate);
            }

            return await prisma.$transaction(async (prisma) => {
                let res = await Promise.all([
                    prisma.watchedMovie.create({
                        data: {
                            userId: userId,
                            movieId: id,
                            startDate: startDate ?? removeFollowResult?.date ?? new Date(),
                            date: endDate ?? new Date(),
                            favorite: favorite,
                            dropped: drop,
                            score: score || (removeFollowResult?.score ?? removeWatchlistResult?.score ?? 0),
                            watch_season: removeFollowResult?.watch_season ?? 0,
                            watch_episode: removeFollowResult?.watch_episode ?? 0,
                        },
                        select: {
                            date: true,
                            score: true,
                            favorite: true,
                            dropped: true,
                        }
                    }),
                    prisma.movie.update({
                        where: {
                            movieId: id,
                        },
                        data: {
                            dropped_count: {increment: drop ? 1 : 0},
                            finished_count: {increment: !drop ? 1 : 0},
                            favorite_count: {increment: favorite ? 1 : 0},
                        },
                        select: {
                            dropped_count: true,
                            finished_count: true,
                            favorite_count: true,
                        }
                    })
                ]);
                return res[0];
            });
        }
    } catch (error) {
        if (error.code === 'P2003' || error.code === 'P2025') {
            return 'notfound';
        }
        if (retryCounter < 2) {
            await new Promise(resolve => setTimeout(resolve, _transactionRetryDelay));
            retryCounter++;
            return await addUserStats_finishedMovie(userId, id, startDate, endDate, score, drop, favorite, isRemove, retryCounter);
        }
        saveError(error);
        return 'error';
    }
}

async function removeUserStats_finishedMovie(userId, id) {
    return prisma.$transaction(async (prisma) => {
        let deleteResult = await prisma.watchedMovie.delete({
            where: {
                userId_movieId: {
                    userId: userId,
                    movieId: id,
                },
            },
            select: {
                dropped: true,
                favorite: true,
                score: true,
            }
        });
        let updateResult = await prisma.movie.update({
            where: {
                movieId: id,
            },
            data: {
                dropped_count: {decrement: deleteResult.dropped ? 1 : 0},
                finished_count: {decrement: !deleteResult.dropped ? 1 : 0},
                favorite_count: {decrement: deleteResult.favorite ? 1 : 0},
            },
            select: {
                dropped_count: true,
                finished_count: true,
                favorite_count: true,
            }
        });

        return deleteResult;
    });
}

export async function addUserStats_handleFavoriteMovie(userId, id, favorite, retryCounter = 0) {
    try {
        let checkExist = await prisma.watchedMovie.findFirst({
            where: {
                userId: userId,
                movieId: id,
            },
            select: {
                favorite: true,
            }
        });

        if (!checkExist) {
            //movie must already exist in watchedMovie table
            return 'notfound';
        }

        if (checkExist.favorite === favorite) {
            return 'ok';
        }

        return await prisma.$transaction(async (prisma) => {
            let res = await Promise.all([
                prisma.watchedMovie.update({
                    where: {
                        userId_movieId: {
                            userId: userId,
                            movieId: id,
                        }
                    },
                    data: {
                        favorite: favorite,
                    },
                    select: {
                        favorite: true,
                    }
                }),
                prisma.movie.update({
                    where: {
                        movieId: id,
                    },
                    data: {
                        favorite_count: {
                            increment: favorite ? 1 : -1,
                        },
                    },
                    select: {
                        dropped_count: true,
                        finished_count: true,
                        favorite_count: true,
                    }
                })
            ]);
            return res[0];
        });
    } catch (error) {
        if (error.code === 'P2003' || error.code === 'P2025') {
            return 'notfound';
        }
        if (retryCounter < 2) {
            await new Promise(resolve => setTimeout(resolve, _transactionRetryDelay));
            retryCounter++;
            return await addUserStats_handleFavoriteMovie(userId, id, favorite, retryCounter);
        }
        saveError(error);
        return 'error';
    }
}

//-----------------------------------------------------
//-----------------------------------------------------

export async function addUserStats_updateScore(userId, id, score, stat_list_type, retryCounter = 0) {
    try {
        if (stat_list_type === 'finish_movie') {
            return await prisma.watchedMovie.update({
                where: {
                    userId_movieId: {
                        userId: userId,
                        movieId: id,
                    }
                },
                data: {
                    score: score,
                },
                select: {
                    date: true,
                }
            });
        } else if (stat_list_type === 'follow_movie') {
            return await prisma.followMovie.update({
                where: {
                    userId_movieId: {
                        userId: userId,
                        movieId: id,
                    }
                },
                data: {
                    score: score,
                },
                select: {
                    date: true,
                }
            });
        } else if (stat_list_type === 'watchlist_movie') {
            return await prisma.watchListMovie.update({
                where: {
                    userId_movieId: {
                        userId: userId,
                        movieId: id,
                    }
                },
                data: {
                    score: score,
                },
                select: {
                    date: true,
                }
            });
        }
    } catch (error) {
        if (error.code === 'P2003' || error.code === 'P2025') {
            return 'notfound';
        }
        if (retryCounter < 2) {
            await new Promise(resolve => setTimeout(resolve, _transactionRetryDelay));
            retryCounter++;
            return await addUserStats_updateScore(userId, id, score, stat_list_type, retryCounter);
        }
        saveError(error);
        return 'error';
    }
}

export async function addUserStats_updateWatchState(userId, id, watch_season, watch_episode, stat_list_type, retryCounter = 0) {
    try {
        if (stat_list_type === 'finish_movie') {
            return await prisma.watchedMovie.update({
                where: {
                    userId_movieId: {
                        userId: userId,
                        movieId: id,
                    }
                },
                data: {
                    watch_season: watch_season,
                    watch_episode: watch_episode,
                },
                select: {
                    date: true,
                }
            });
        } else if (stat_list_type === 'follow_movie') {
            return await prisma.followMovie.update({
                where: {
                    userId_movieId: {
                        userId: userId,
                        movieId: id,
                    }
                },
                data: {
                    watch_season: watch_season,
                    watch_episode: watch_episode,
                },
                select: {
                    date: true,
                }
            });
        }
    } catch (error) {
        if (error.code === 'P2003' || error.code === 'P2025') {
            return 'notfound';
        }
        if (retryCounter < 2) {
            await new Promise(resolve => setTimeout(resolve, _transactionRetryDelay));
            retryCounter++;
            return await addUserStats_updateWatchState(userId, id, watch_season, watch_episode, stat_list_type, retryCounter);
        }
        saveError(error);
        return 'error';
    }
}

//-----------------------------------------------------
//-----------------------------------------------------

export async function getUserStatsListDB(userId, statType, skip, limit, noUserStats) {
    try {
        if (statType === 'like_staff' || statType === 'dislike_staff') {
            const type = statType === 'like_staff' ? 'like' : 'dislike';
            return await getUserStatsList_likeDislikedStaff(userId, type, skip, limit, noUserStats);
        }
        if (statType === 'follow_staff') {
            return await getUserStatsList_followStaff(userId, skip, limit, noUserStats);
        }

        if (statType === 'like_character' || statType === 'dislike_character') {
            const type = statType === 'like_character' ? 'like' : 'dislike';
            return await getUserStatsList_likeDislikedCharacter(userId, type, skip, limit, noUserStats);
        }
        if (statType === 'favorite_character') {
            return await getUserStatsList_favoriteCharacter(userId, skip, limit, noUserStats);
        }

        if (statType === 'like_movie' || statType === 'dislike_movie') {
            const type = statType === 'like_movie' ? 'like' : 'dislike';
            return await getUserStatsList_likeDislikedMovies(userId, type, skip, limit, noUserStats);
        }
        if (statType === 'finish_movie') {
            return await getUserStatsList_finishedMovies(userId, skip, limit, noUserStats);
        }
        if (statType === 'watchlist_movie') {
            return await getUserStatsList_watchlistMovies(userId, skip, limit, noUserStats);
        }
        if (statType === 'follow_movie') {
            return await getUserStatsList_followMovies(userId, skip, limit, noUserStats);
        }
        return [];
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

async function getUserStatsList_likeDislikedStaff(userId, type, skip, limit, noUserStats) {
    try {
        return await prisma.likeDislikeStaff.findMany({
            where: {
                userId: userId,
                type: type,
            },
            skip: skip,
            take: limit,
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        rawName: true,
                        gender: true,
                        likes_count: !noUserStats,
                        dislikes_count: !noUserStats,
                        follow_count: !noUserStats,
                        followStaff: noUserStats ? undefined : {
                            where: {
                                userId: userId,
                            },
                            select: {
                                date: true,
                            }
                        },
                        imageData: {
                            select: {
                                size: true,
                                url: true,
                                originalUrl: true,
                                thumbnail: true,
                                vpnStatus: true,
                            }
                        },
                    }
                },
            },
            orderBy: {date: 'desc'},
        });
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

async function getUserStatsList_followStaff(userId, skip, limit, noUserStats) {
    try {
        return await prisma.followStaff.findMany({
            where: {
                userId: userId,
            },
            skip: skip,
            take: limit,
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        rawName: true,
                        gender: true,
                        likes_count: !noUserStats,
                        dislikes_count: !noUserStats,
                        follow_count: !noUserStats,
                        likeDislikeStaff: noUserStats ? undefined : {
                            where: {
                                userId: userId,
                            },
                            select: {
                                date: true,
                            }
                        },
                        imageData: {
                            select: {
                                size: true,
                                url: true,
                                originalUrl: true,
                                thumbnail: true,
                                vpnStatus: true,
                            }
                        },
                    }
                },
            },
            orderBy: {date: 'desc'},
        });
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

async function getUserStatsList_likeDislikedCharacter(userId, type, skip, limit, noUserStats) {
    try {
        return await prisma.likeDislikeCharacter.findMany({
            where: {
                userId: userId,
                type: type,
            },
            skip: skip,
            take: limit,
            include: {
                character: {
                    select: {
                        id: true,
                        name: true,
                        rawName: true,
                        gender: true,
                        likes_count: !noUserStats,
                        dislikes_count: !noUserStats,
                        favorite_count: !noUserStats,
                        favoriteCharacter: noUserStats ? undefined : {
                            where: {
                                userId: userId,
                            },
                            select: {
                                date: true,
                            }
                        },
                        imageData: {
                            select: {
                                size: true,
                                url: true,
                                originalUrl: true,
                                thumbnail: true,
                                vpnStatus: true,
                            }
                        },
                    }
                },
            },
            orderBy: {date: 'desc'},
        });
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

async function getUserStatsList_favoriteCharacter(userId, skip, limit, noUserStats) {
    try {
        return await prisma.favoriteCharacter.findMany({
            where: {
                userId: userId,
            },
            skip: skip,
            take: limit,
            include: {
                character: {
                    select: {
                        id: true,
                        name: true,
                        rawName: true,
                        gender: true,
                        likes_count: !noUserStats,
                        dislikes_count: !noUserStats,
                        favorite_count: !noUserStats,
                        likeDislikeCharacter: noUserStats ? undefined : {
                            where: {
                                userId: userId,
                            },
                            select: {
                                date: true,
                            }
                        },
                        imageData: {
                            select: {
                                size: true,
                                url: true,
                                originalUrl: true,
                                thumbnail: true,
                                vpnStatus: true,
                            }
                        },
                    }
                },
            },
            orderBy: {date: 'desc'},
        });
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

async function getUserStatsList_likeDislikedMovies(userId, type, skip, limit, noUserStats) {
    try {
        return await prisma.likeDislikeMovie.findMany({
            where: {
                userId: userId,
                type: type,
            },
            skip: skip,
            take: limit,
            include: noUserStats ? undefined : {
                movie: true,
            },
            orderBy: {date: 'desc'},
        });
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

async function getUserStatsList_finishedMovies(userId, skip, limit, noUserStats) {
    try {
        return await prisma.watchedMovie.findMany(
            getUserStatsList_movies_query(userId, skip, limit, noUserStats)
        );
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

async function getUserStatsList_followMovies(userId, skip, limit, noUserStats) {
    try {
        return await prisma.followMovie.findMany(
            getUserStatsList_movies_query(userId, skip, limit, noUserStats)
        );
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

async function getUserStatsList_watchlistMovies(userId, skip, limit, noUserStats) {
    try {
        return await prisma.watchListMovie.findMany(
            getUserStatsList_movies_query(userId, skip, limit, noUserStats)
        );
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

function getUserStatsList_movies_query(userId, skip, limit, noUserStats) {
    return ({
        where: {
            userId: userId,
        },
        skip: skip,
        take: limit,
        include: noUserStats ? undefined : {
            movie: {
                include: {
                    likeDislikeMovies: {
                        where: {
                            userId: userId,
                        },
                        take: 1,
                        select: {
                            type: true,
                        }
                    },
                }
            },
        },
        orderBy: {date: 'desc'},
    });
}

//-----------------------------------------------------
//-----------------------------------------------------

export async function getMovieFullUserStats(userId, movieId) {
    try {
        return await prisma.movie.findFirst({
            where: {
                movieId: movieId,
            },
            take: 1,
            include: {
                likeDislikeMovies: {
                    where: {
                        userId: userId,
                    },
                    take: 1,
                    select: {
                        type: true,
                    }
                },
                followMovies: {
                    where: {
                        userId: userId,
                    },
                    take: 1,
                    select: {
                        watch_season: true,
                        watch_episode: true,
                        score: true,
                    }
                },
                watchedMovies: {
                    where: {
                        userId: userId,
                    },
                    take: 1,
                    select: {
                        score: true,
                        dropped: true,
                        favorite: true,
                        watch_season: true,
                        watch_episode: true,
                        startDate: true,
                        date: true,
                    }
                },
                watchListMovies: {
                    where: {
                        userId: userId,
                    },
                    take: 1,
                    select: {
                        score: true,
                    }
                },
            }
        });
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function getMoviesUserStats_likeDislike(userId, movieIds) {
    try {
        return await prisma.movie.findMany({
            where: {
                movieId: {
                    in: movieIds,
                }
            },
            include: {
                likeDislikeMovies: {
                    where: {
                        userId: userId,
                    },
                    take: 1,
                    select: {
                        type: true,
                    }
                },
            }
        });
    } catch (error) {
        saveError(error);
        return [];
    }
}

export async function getMoviesUserStatsCounts(movieIds) {
    try {
        return await prisma.movie.findMany({
            where: {
                movieId: {
                    in: movieIds,
                }
            },
        });
    } catch (error) {
        saveError(error);
        return [];
    }
}

//----------------------------------------------------------------
//----------------------------------------------------------------

export const defaultUserStats = Object.freeze({
    like: false,
    dislike: false,
    favorite: false,
    dropped: false,
    finished: false,
    follow: false,
    watchlist: false,
    likes_count: 0,
    dislikes_count: 0,
    favorite_count: 0,
    dropped_count: 0,
    finished_count: 0,
    follow_count: 0,
    watchlist_count: 0,
    continue_count: 0,
});

export const defaultUserStats_extra = Object.freeze({
    watch_start: '',
    watch_end: '',
    watch_season: 0,
    watch_episode: 0,
    myScore: 0,
});
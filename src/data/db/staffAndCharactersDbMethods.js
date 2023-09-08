import prisma from "../prisma.js";
import {saveError} from "../../error/saveError.js";


export async function getTodayStaffOrCharactersBirthday(type, userId, followOnly, skip, limit, dataLevel, isGuest) {
    try {
        let now = new Date();
        let monthAndDay = '-' + (now.getMonth() + 1) + '-' + now.getDate();
        monthAndDay = monthAndDay
            .replace(/-\d(-|$)/g, r => r.replace('-', '-0'))
            .replace(/-\d(-|$)/g, r => r.replace('-', '-0'));

        const userStatsQuery = getUserStatsQuery(type, userId, isGuest);
        const fieldsSelectionStage = getFieldsSelectionStage(type, dataLevel, userStatsQuery);

        let result = await prisma[type].findMany({
            where: {
                birthday: {
                    endsWith: monthAndDay,
                },
                followStaff: (followOnly && type === 'staff') ? {
                    some: {
                        userId: userId,
                    }
                } : undefined,
                favoriteCharacter: (followOnly && type === 'character') ? {
                    some: {
                        userId: userId,
                    }
                } : undefined,
            },
            ...fieldsSelectionStage,
            skip: skip,
            take: limit,
            orderBy: {id: 'asc'},
        });

        for (let i = 0; i < result.length; i++) {
            normalizeUserStats(type, result[i]);
        }

        return result;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function searchOnStaffOrCharactersWithFilters(type, userId, filters, skip, limit, dataLevel, isGuest) {
    try {
        const userStatsQuery = getUserStatsQuery(type, userId, isGuest);
        const fieldsSelectionStage = getFieldsSelectionStage(type, dataLevel, userStatsQuery);

        let result = await prisma[type].findMany({
            where: {
                name: filters.name ? {
                    contains: filters.name,
                } : undefined,
                gender: filters.gender,
                country: filters.country,
                hairColor: filters.hairColor,
                eyeColor: filters.eyeColor,
                age: filters.age ? {
                    gte: filters.age[0],
                    lte: filters.age[1],
                } : undefined,
            },
            ...fieldsSelectionStage,
            skip: skip,
            take: limit,
            orderBy: {id: 'asc'},
        });

        for (let i = 0; i < result.length; i++) {
            normalizeUserStats(type, result[i]);
        }

        return result;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

// ----------------------------------------------------------------
// ----------------------------------------------------------------

function getFieldsSelectionStage(type, dataLevel, userStatsQuery) {
    return ({
        select: dataLevel === 'high' ? null : {
            name: true,
            rawName: true,
            gender: true,
            birthday: true,
            imageData: {
                select: {
                    size: true,
                    url: true,
                    originalSize: true,
                    originalUrl: true,
                    thumbnail: true,
                    vpnStatus: true,
                }
            },
            ...userStatsQuery,
            likes_count: true,
            dislikes_count: true,
            follow_count: type === 'staff' ? true : undefined,
            favorite_count: type === 'character' ? true : undefined,
        },
        include: dataLevel !== 'high' ? null : {
            imageData: {
                select: {
                    size: true,
                    url: true,
                    originalSize: true,
                    originalUrl: true,
                    thumbnail: true,
                    vpnStatus: true,
                }
            },
            ...userStatsQuery,
        },
    });
}

function getUserStatsQuery(type, userId, isGuest) {
    if (type === 'staff') {
        return ({
            followStaff: isGuest ? false : {
                take: 1,
                where: {
                    userId: userId,
                },
                select: {
                    date: true,
                }
            },
            likeDislikeStaff: isGuest ? false : {
                take: 1,
                where: {
                    userId: userId,
                },
                select: {
                    date: true,
                    type: true,
                }
            },
        });
    } else {
        return ({
            favoriteCharacter: isGuest ? false : {
                take: 1,
                where: {
                    userId: userId,
                },
                select: {
                    date: true,
                }
            },
            likeDislikeCharacter: isGuest ? false : {
                take: 1,
                where: {
                    userId: userId,
                },
                select: {
                    date: true,
                    type: true,
                }
            },
        });
    }
}

// ----------------------------------------------------------------
// ----------------------------------------------------------------

export async function getStaffById(userId, id, creditsCount, isGuest) {
    try {
        let result = await prisma.staff.findFirst({
            where: {
                id: id,
            },
            include: {
                followStaff: isGuest ? false : {
                    take: 1,
                    where: {
                        userId: userId,
                    },
                    select: {
                        date: true,
                    }
                },
                likeDislikeStaff: isGuest ? false : {
                    take: 1,
                    where: {
                        userId: userId,
                    },
                    select: {
                        date: true,
                        type: true,
                    }
                },
                imageData: {
                    select: {
                        size: true,
                        url: true,
                        originalSize: true,
                        originalUrl: true,
                        thumbnail: true,
                        vpnStatus: true,
                    }
                },
                credits: {
                    take: creditsCount,
                    orderBy: {id: "asc"},
                    select: {
                        id: true,
                        characterRole: true,
                        actorPositions: true,
                        movieId: false,
                        staffId: false,
                        characterId: false,
                        character: {
                            select: {
                                id: true,
                                name: true,
                                gender: true,
                                country: true,
                                imageData: {
                                    select: {
                                        size: true,
                                        thumbnail: true,
                                        url: true,
                                        vpnStatus: true,
                                    }
                                },
                            }
                        },
                        movie: {
                            select: {
                                movieId: true,
                            }
                        }
                    }
                }
            }
        });
        if (result) {
            normalizeUserStats('staff', result);
        }
        return result;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getCharacterById(userId, id, creditsCount, isGuest) {
    try {
        let result = await prisma.character.findFirst({
            where: {
                id: id,
            },
            include: {
                favoriteCharacter: isGuest ? false : {
                    take: 1,
                    where: {
                        userId: userId,
                    },
                    select: {
                        date: true,
                    }
                },
                likeDislikeCharacter: isGuest ? false : {
                    take: 1,
                    where: {
                        userId: userId,
                    },
                    select: {
                        date: true,
                        type: true,
                    }
                },
                imageData: {
                    select: {
                        size: true,
                        url: true,
                        originalSize: true,
                        originalUrl: true,
                        thumbnail: true,
                        vpnStatus: true,
                    }
                },
                credits: {
                    take: creditsCount,
                    orderBy: {id: "asc"},
                    select: {
                        id: true,
                        characterRole: true,
                        actorPositions: true,
                        movieId: false,
                        staffId: false,
                        characterId: false,
                        staff: {
                            select: {
                                id: true,
                                name: true,
                                gender: true,
                                country: true,
                                imageData: {
                                    select: {
                                        size: true,
                                        thumbnail: true,
                                        url: true,
                                        vpnStatus: true,
                                    }
                                },
                            },
                        },
                        movie: {
                            select: {
                                movieId: true,
                            }
                        }
                    }
                }
            }
        });
        if (result) {
            normalizeUserStats('character', result);
        }
        return result;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

// ----------------------------------------------------------------
// ----------------------------------------------------------------

function normalizeUserStats(type, data) {
    if (type === 'staff') {
        data.userStats = {
            likes_count: data.likes_count,
            dislikes_count: data.dislikes_count,
            follow_count: data.follow_count,
        }
        if (data.likeDislikeStaff) {
            data.userStats.like = data.likeDislikeStaff[0]?.type === 'like';
            data.userStats.dislike = data.likeDislikeStaff[0]?.type === 'dislike';
        } else {
            data.userStats.like = false;
            data.userStats.dislike = false;
        }
        if (data.followStaff) {
            data.userStats.followStaff = !!data.followStaff[0];
        } else {
            data.userStats.followStaff = false;
        }
        delete data.likes_count;
        delete data.dislikes_count;
        delete data.follow_count;
        delete data.likeDislikeStaff;
        delete data.followStaff;
    } else {
        data.userStats = {
            likes_count: data.likes_count,
            dislikes_count: data.dislikes_count,
            favorite_count: data.favorite_count,
        }
        if (data.likeDislikeCharacter) {
            data.userStats.like = data.likeDislikeCharacter[0]?.type === 'like';
            data.userStats.dislike = data.likeDislikeCharacter[0]?.type === 'dislike';
        } else {
            data.userStats.like = false;
            data.userStats.dislike = false;
        }
        if (data.favoriteCharacter) {
            data.userStats.favorite = !!data.favoriteCharacter[0];
        } else {
            data.userStats.favorite = false;
        }
        delete data.likes_count;
        delete data.dislikes_count;
        delete data.favorite_count;
        delete data.likeDislikeCharacter;
        delete data.favoriteCharacter;
    }
}

// ----------------------------------------------------------------
// ----------------------------------------------------------------

export async function getStaffAndCharacterOfMovie(movieId, skip, limit) {
    try {
        return await prisma.credit.findMany({
            where: {
                movieId: movieId,
            },
            select: {
                movieId: false,
                staffId: false,
                characterId: false,
                id: true,
                characterRole: true,
                actorPositions: true,
                staff: {
                    select: {
                        id: true,
                        name: true,
                        gender: true,
                        country: true,
                        imageData: {
                            select: {
                                size: true,
                                thumbnail: true,
                                url: true,
                                vpnStatus: true,
                            }
                        },
                    },
                },
                character: {
                    select: {
                        id: true,
                        name: true,
                        gender: true,
                        imageData: {
                            select: {
                                size: true,
                                thumbnail: true,
                                url: true,
                                vpnStatus: true,
                            }
                        },
                    }
                },
            },
            skip: skip,
            take: limit,
            orderBy: {id: 'asc'},
        });
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getCreditsOfStaff(staffId, skip, limit) {
    try {
        return await prisma.credit.findMany({
            where: {
                staffId: staffId,
            },
            select: {
                movieId: false,
                staffId: false,
                characterId: false,
                id: true,
                characterRole: true,
                actorPositions: true,
                character: {
                    select: {
                        id: true,
                        name: true,
                        gender: true,
                        imageData: {
                            select: {
                                size: true,
                                thumbnail: true,
                                url: true,
                                vpnStatus: true,
                            }
                        },
                    }
                },
                movie: {
                    select: {
                        movieId: true,
                    }
                },
            },
            skip: skip,
            take: limit,
            orderBy: {id: 'asc'},
        });
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getCreditsOfCharacter(characterId, skip, limit) {
    try {
        return await prisma.credit.findMany({
            where: {
                characterId: characterId,
            },
            select: {
                movieId: false,
                staffId: false,
                characterId: false,
                id: true,
                characterRole: true,
                actorPositions: true,
                staff: {
                    select: {
                        id: true,
                        name: true,
                        gender: true,
                        imageData: {
                            select: {
                                size: true,
                                thumbnail: true,
                                url: true,
                                vpnStatus: true,
                            }
                        },
                    }
                },
                movie: {
                    select: {
                        movieId: true,
                    }
                },
            },
            skip: skip,
            take: limit,
            orderBy: {id: 'asc'},
        });
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

// ----------------------------------------------------------------
// ----------------------------------------------------------------

export async function upsertStaffDb(name, rawName, data) {
    try {
        return await prisma.staff.upsert({
            where: {
                name: name,
            },
            update: data,
            create: {
                ...data,
                name: name,
                rawName: rawName,
            },
            select: {
                id: true,
                imageData: true,
            }
        });
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function upsertCharacterDb(name, rawName, data) {
    try {
        return await prisma.character.upsert({
            where: {
                name: name,
            },
            update: data,
            create: {
                ...data,
                name: name,
                rawName: rawName,
            },
            select: {
                id: true,
                imageData: true,
            }
        });
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function insertOrUpdateCredit(movieId, staffId, characterId, actorPositions, characterRole) {
    try {
        let checkExist = await prisma.credit.findFirst({
            where: {
                movieId: movieId,
                staffId: staffId || null,
                characterId: characterId || null,
                actorPositions: {
                    equals: actorPositions,
                },
            }
        });
        if (checkExist) {
            return checkExist;
        }
        return await prisma.credit.create({
            data: {
                movieId: movieId,
                staffId: staffId || null,
                characterId: characterId || null,
                actorPositions: actorPositions,
                characterRole: characterRole,
            }
        });
    } catch (error) {
        if (error.code !== "P2002") {
            saveError(error);
        }
        return null;
    }
}

export async function addCastImageDb(id, type, data) {
    try {
        if (type === 'staff') {
            return await prisma.castImage.upsert({
                where: {
                    staffId: id,
                },
                update: data,
                create: {
                    ...data,
                    staffId: id,
                    characterId: null,
                },
            });
        } else {
            return await prisma.castImage.upsert({
                where: {
                    characterId: id,
                },
                update: data,
                create: {
                    ...data,
                    staffId: null,
                    characterId: id,
                },
            });
        }
    } catch (error) {
        saveError(error);
    }
}

// ----------------------------------------------------------------
// ----------------------------------------------------------------

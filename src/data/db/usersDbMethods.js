import prisma from '../prisma.js';
import {saveError} from "../../error/saveError.js";
import {Default_Role_Ids} from "./admin/roleAndPermissionsDbMethods.js";


export const _editableUserDataFields = Object.freeze(['username', 'publicName', 'email', 'bio']);

export async function findUser(username, email, includeSessions = false) {
    try {
        return await prisma.user.findFirst({
            where: {
                OR: [
                    {
                        AND: [
                            {username: {not: ''}},
                            {username: {equals: username.toLowerCase()}},
                        ]
                    },
                    {
                        AND: [
                            {email: {not: ''}},
                            {email: {equals: email.toLowerCase()}},
                        ]
                    }
                ]
            },
            select: {
                userId: true,
                username: true,
                rawUsername: true,
                publicName: true,
                password: true,
                email: true,
                activeSessions: includeSessions,
                roles: {
                    select: {
                        roleId: true,
                        role: {
                            select: {
                                name: true,
                            }
                        }
                    }
                },
            },
        });
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function findUserById(userId, projection = {}) {
    try {
        return await prisma.user.findFirst({
            where: {
                userId: userId,
            },
            select: projection,
        });
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function addUser(username, email, hashedPassword, roleId, emailVerifyToken, emailVerifyToken_expire, defaultProfileImage) {
    try {
        return await prisma.user.create({
            data: {
                username: username.toLowerCase(),
                rawUsername: username,
                publicName: username,
                email: email.toLowerCase(),
                emailVerified: false,
                emailVerifyToken: emailVerifyToken,
                emailVerifyToken_expire: emailVerifyToken_expire,
                password: hashedPassword,
                roles: {
                    create: {
                        roleId: roleId,
                    }
                },
                userTorrent:{
                  create:{
                      torrentLeachGb: 0,
                      torrentSearch: 0,
                  }
                },
                defaultProfile: defaultProfileImage,
                movieSettings: {
                    create: {}
                },
                notificationSettings: {
                    create: {}
                },
                downloadLinksSettings: {
                    create: {}
                },
                userMessageRead: {
                    create: {}
                },
            }
        });
    } catch (error) {
        if (error.code === "P2002") {
            if (error.meta.target[0] === 'email') {
                return 'email exist';
            }
            if (error.meta.target[0] === 'username') {
                return 'username exist';
            }
            if (error.meta.target[0] === 'userId') {
                return 'userId exist';
            }
        }
        saveError(error);
        return null;
    }
}

export async function updateUserByID(userId, updateFields) {
    try {
        let result = await prisma.user.update({
            where: {
                userId: userId,
            },
            data: updateFields,
        });
        if (!result) {
            return 'notfound';
        }
        return result;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

//------------------------------------------------
//------------------------------------------------

export async function getUserActiveSessions(userId) {
    try {
        return await prisma.activeSession.findMany({
            where: {
                userId: userId,
            },
        });
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function addSession(userId, deviceInfo, deviceId, refreshToken) {
    try {
        return await prisma.activeSession.create({
            data: {
                userId: userId,
                deviceId: deviceId,
                appName: deviceInfo.appName || '',
                appVersion: deviceInfo.appVersion || '',
                deviceOs: deviceInfo.os || '',
                notifToken: deviceInfo.notifToken || '',
                deviceModel: deviceInfo.deviceModel || '',
                ipLocation: deviceInfo.ipLocation || '',
                refreshToken: refreshToken,
            }
        });
    } catch (error) {
        if (error.code === "P2002") {
            if (error.meta.target[0] === 'deviceId') {
                return 'deviceId exist';
            }
        }
        saveError(error);
        return null;
    }
}

export async function updateSession(userId, deviceInfo, deviceId, refreshToken) {
    try {
        const now = new Date();
        let res = await prisma.activeSession.upsert({
            where: {
                userId_deviceId: {
                    userId: userId,
                    deviceId: deviceId,
                },
            },
            update: {
                appName: deviceInfo.appName || '',
                appVersion: deviceInfo.appVersion || '',
                deviceOs: deviceInfo.os || '',
                deviceModel: deviceInfo.deviceModel || '',
                notifToken: deviceInfo.notifToken || '',
                ipLocation: deviceInfo.ipLocation || '',
                lastUseDate: now,
                refreshToken: refreshToken,
            },
            create: {
                appName: deviceInfo.appName || '',
                appVersion: deviceInfo.appVersion || '',
                deviceOs: deviceInfo.os || '',
                deviceModel: deviceInfo.deviceModel || '',
                notifToken: deviceInfo.notifToken || '',
                ipLocation: deviceInfo.ipLocation || '',
                loginDate: now,
                lastUseDate: now,
                refreshToken: refreshToken || '',
                deviceId: deviceId,
                userId: userId,
            },
            include: {
                user: {
                    select: {
                        email: true,
                    }
                }
            }
        });
        return {
            email: res.user.email,
            isNewDevice: res.loginDate.toString() === now.toString(),
        };
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function updateSessionRefreshToken(userId, deviceInfo, refreshToken, prevRefreshToken, includeProfileImages) {
    try {
        return await prisma.activeSession.update({
            where: {
                userId: userId,
                refreshToken: prevRefreshToken,
            },
            data: {
                appName: deviceInfo.appName || '',
                appVersion: deviceInfo.appVersion || '',
                deviceOs: deviceInfo.os || '',
                deviceModel: deviceInfo.deviceModel || '',
                ipLocation: deviceInfo.ipLocation || '',
                lastUseDate: new Date(),
                refreshToken: refreshToken,
            },
            include: {
                user: includeProfileImages ? {
                    select: {
                        profileImages: true,
                        rawUsername: true,
                    }
                } : false,
            },
        });
    } catch (error) {
        if (error.meta?.cause === 'Record to update not found.') {
            return 'cannot find device';
        }
        saveError(error);
        return null;
    }
}

export async function removeSession(userId, prevRefreshToken) {
    try {
        return await prisma.activeSession.delete({
            where: {
                userId: userId,
                refreshToken: prevRefreshToken,
            },
            select: {
                refreshToken: true,
            },
        });
    } catch (error) {
        if (error.meta?.cause === 'Record to delete does not exist.') {
            return 'cannot find device';
        }
        saveError(error);
        return null;
    }
}

//----------------------------
//----------------------------

export async function getUserSettingsDB(userId, settingSectionName) {
    try {
        if (settingSectionName === 'movie') {
            return await prisma.movieSettings.findFirst({
                where: {
                    userId: userId,
                },
            });
        }
        if (settingSectionName === 'downloadLinks') {
            return await prisma.downloadLinksSettings.findFirst({
                where: {
                    userId: userId,
                },
            });
        }
        if (settingSectionName === 'notification') {
            return await prisma.notificationSettings.findFirst({
                where: {
                    userId: userId,
                }
            });
        }
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

//----------------------------
//----------------------------

export async function getTotalAndActiveUsersCount() {
    try {
        let prevDay = new Date();
        prevDay.setDate(prevDay.getDate() - 1);
        let res = await Promise.allSettled([
            prisma.user.count({}),
            prisma.user.count({
                where: {
                    activeSessions: {
                        some: {
                            lastUseDate: {gte: prevDay}
                        }
                    }
                }
            }),
        ]);
        if (res[0].status !== 'fulfilled' || res[1].status !== 'fulfilled') {
            return null;
        }
        return {
            total: res[0].value,
            active: res[1].value
        };
    } catch (error) {
        saveError(error);
        return null;
    }
}

//----------------------------
//----------------------------

export async function removeUserById(id) {
    try {
        return await prisma.$transaction(async (prisma) => {
            const removedUser = await prisma.user.delete({
                where: {
                    userId: id,
                    roles: {
                        none: {
                            roleId: Default_Role_Ids.mainAdmin,
                        }
                    },
                },
                include: {
                    activeSessions: {
                        select: {
                            refreshToken: true,
                        }
                    },
                    favoriteCharacters: {
                        select: {
                            characterId: true,
                        }
                    },
                    followStaff: {
                        select: {
                            staffId: true,
                        }
                    },
                    likeDislikeStaff: {
                        select: {
                            staffId: true,
                            type: true,
                        }
                    },
                    likeDislikeCharacter: {
                        select: {
                            userId: true,
                            type: true,
                        }
                    },
                    watchListMovies: {
                        select: {
                            movieId: true,
                        }
                    },
                    watchedMovies: {
                        select: {
                            movieId: true,
                            dropped: true,
                            favorite: true,
                        }
                    },
                    profileImages: {
                        select: {
                            url: true,
                        }
                    },
                    likeDislikeMovies: {
                        select: {
                            movieId: true,
                            type: true,
                        }
                    },
                    followMovies: {
                        select: {
                            movieId: true,
                        }
                    },
                },
            });

            // movie counts update
            let likeMovieIds = []
            let dislikeMovieIds = [];
            for (let i = 0; i < removedUser.likeDislikeMovies.length; i++) {
                if (removedUser.likeDislikeMovies[i].type === 'like') {
                    likeMovieIds.push(removedUser.likeDislikeMovies[i].movieId);
                } else {
                    dislikeMovieIds.push(removedUser.likeDislikeMovies[i].movieId);
                }
            }
            delete removedUser.likeDislikeMovies;
            let followMovieIds = removedUser.followMovies.map(m => m.movieId);
            delete removedUser.followMovies;
            let watchListMovieIds = removedUser.watchListMovies.map(m => m.movieId);
            delete removedUser.watchListMovies;
            let droppedMovieIds = [];
            let finishedMovieIds = [];
            let favoriteMovieIds = [];
            for (let i = 0; i < removedUser.watchedMovies.length; i++) {
                if (removedUser.watchedMovies[i].dropped) {
                    droppedMovieIds.push(removedUser.watchedMovies[i].movieId);
                } else {
                    finishedMovieIds.push(removedUser.watchedMovies[i].movieId);
                }
                if (removedUser.watchedMovies[i].favorite) {
                    favoriteMovieIds.push(removedUser.watchedMovies[i].movieId);
                }
            }
            delete removedUser.watchedMovies;
            const updateMovieCounts = await Promise.allSettled([
                prisma.movie.updateMany({
                    where: {
                        id: {
                            in: likeMovieIds,
                        }
                    },
                    data: {
                        likes_count: {decrement: 1},
                    }
                }),
                prisma.movie.updateMany({
                    where: {
                        id: {
                            in: dislikeMovieIds,
                        }
                    },
                    data: {
                        dislikes_count: {decrement: 1},
                    }
                }),
                prisma.movie.updateMany({
                    where: {
                        id: {
                            in: followMovieIds,
                        }
                    },
                    data: {
                        follow_count: {decrement: 1},
                    }
                }),
                prisma.movie.updateMany({
                    where: {
                        id: {
                            in: watchListMovieIds,
                        }
                    },
                    data: {
                        watchlist_count: {decrement: 1},
                    }
                }),
                prisma.movie.updateMany({
                    where: {
                        id: {
                            in: droppedMovieIds,
                        }
                    },
                    data: {
                        dropped_count: {decrement: 1},
                    }
                }),
                prisma.movie.updateMany({
                    where: {
                        id: {
                            in: finishedMovieIds,
                        }
                    },
                    data: {
                        finished_count: {decrement: 1},
                    }
                }),
                prisma.movie.updateMany({
                    where: {
                        id: {
                            in: favoriteMovieIds,
                        }
                    },
                    data: {
                        favorite_count: {decrement: 1},
                    }
                })
            ]);
            likeMovieIds = null;
            dislikeMovieIds = null;
            followMovieIds = null;
            watchListMovieIds = null;
            droppedMovieIds = null;
            finishedMovieIds = null;
            favoriteMovieIds = null;

            // staff counts update
            let followStaffIds = removedUser.followStaff.map(f => f.staffId);
            delete removedUser.followStaff;
            let likeStaffIds = [];
            let dislikeStaffIds = [];
            for (let i = 0; i < removedUser.likeDislikeStaff.length; i++) {
                if (removedUser.likeDislikeStaff[i].type === 'like') {
                    likeStaffIds.push(removedUser.likeDislikeStaff[i].staffId);
                } else {
                    dislikeStaffIds.push(removedUser.likeDislikeStaff[i].staffId);
                }
            }
            delete removedUser.likeDislikeStaff;
            const updateStaffCounts = await Promise.all([
                prisma.staff.updateMany({
                    where: {
                        id: {
                            in: followStaffIds,
                        }
                    },
                    data: {
                        follow_count: {decrement: 1},
                    }
                }),
                prisma.staff.updateMany({
                    where: {
                        id: {
                            in: likeStaffIds,
                        }
                    },
                    data: {
                        likes_count: {decrement: 1},
                    }
                }),
                prisma.staff.updateMany({
                    where: {
                        id: {
                            in: dislikeStaffIds,
                        }
                    },
                    data: {
                        dislikes_count: {decrement: 1},
                    }
                })
            ]);
            followStaffIds = null;
            likeStaffIds = null;
            dislikeStaffIds = null;

            // character counts update
            let favoriteCharacterIds = removedUser.favoriteCharacters.map(f => f.characterId);
            delete removedUser.favoriteCharacters;
            let likeCharacterIds = [];
            let dislikeCharacterIds = [];
            for (let i = 0; i < removedUser.likeDislikeCharacter.length; i++) {
                if (removedUser.likeDislikeCharacter[i].type === 'like') {
                    likeCharacterIds.push(removedUser.likeDislikeCharacter[i].characterId);
                } else {
                    dislikeCharacterIds.push(removedUser.likeDislikeCharacter[i].characterId);
                }
            }
            delete removedUser.likeDislikeCharacter;
            const updateCharacterCounts = await Promise.all([
                prisma.character.updateMany({
                    where: {
                        id: {
                            in: favoriteCharacterIds,
                        }
                    },
                    data: {
                        favorite_count: {decrement: 1},
                    }
                }),
                prisma.character.updateMany({
                    where: {
                        id: {
                            in: likeCharacterIds,
                        }
                    },
                    data: {
                        likes_count: {decrement: 1},
                    }
                }),
                prisma.character.updateMany({
                    where: {
                        id: {
                            in: dislikeCharacterIds,
                        }
                    },
                    data: {
                        dislikes_count: {decrement: 1},
                    }
                })
            ]);
            favoriteCharacterIds = null;
            likeCharacterIds = null;
            dislikeCharacterIds = null;

            return removedUser;
        }, {
            timeout: 15000,
            maxWait: 15000,
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return 'notfound';
        }
        saveError(error);
        return 'error';
    }
}

//----------------------------
//----------------------------

export const mbtiTypes = Object.freeze([
    'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
    'ISTP', 'ISFP', 'INFP', 'INTP',
    'ESTP', 'ESFP', 'ENFP', 'ENTP',
    'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
]);

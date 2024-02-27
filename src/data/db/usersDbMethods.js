import prisma from '../prisma.js';
import {saveError} from "../../error/saveError.js";


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
                role: true,
                email: true,
                activeSessions: includeSessions,
            },
        });
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getUserProfile(userId, refreshToken, isMyProfile) {
    try {
        return await prisma.user.findFirst({
            where: {
                userId: userId,
            },
            select: {
                password: false,
                emailVerifyToken: false,
                emailVerifyToken_expire: false,
                emailVerified: isMyProfile,
                rawUsername: true,
                email: true,
                role: true,
                publicName: true,
                userId: true,
                bio: true,
                defaultProfile: true,
                profileImages: true,
                registrationDate: true,
                favoriteGenres: true,
                mbtiType: true,
                activeSessions: isMyProfile ? {
                    where: {
                        refreshToken: refreshToken
                    },
                    take: 1,
                    select: {
                        refreshToken: false,
                        deviceId: true,
                        appName: true,
                        appVersion: true,
                        deviceModel: true,
                        deviceOs: true,
                        ipLocation: true,
                        loginDate: true,
                        lastUseDate: true,
                    }
                } : undefined,
                computedFavoriteGenres: isMyProfile ? {
                    select: {
                        genre: true,
                        count: true,
                        percent: true,
                    }
                } : undefined,
                ComputedStatsLastUpdate: isMyProfile,
                movieSettings: isMyProfile,
                downloadLinksSettings: isMyProfile,
                notificationSettings: isMyProfile,
                _count: {
                    select: {
                        followers: true,
                        following: true,
                    }
                }
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

export async function addUser(username, email, hashedPassword, role, emailVerifyToken, emailVerifyToken_expire, defaultProfileImage) {
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
                role: role || 'user',
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

export async function verifyUserEmail(userId, token) {
    try {
        return await prisma.user.update({
            where: {
                userId: userId,
                emailVerifyToken: token,
                emailVerifyToken_expire: {gte: Date.now()}
            },
            data: {
                emailVerifyToken: '',
                emailVerifyToken_expire: 0,
                emailVerified: true,
            },
            select: {
                emailVerified: true,
            }
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return 'notfound';
        }
        saveError(error);
        return 'error';
    }
}

export async function checkDeleteAccountToken(userId, token) {
    try {
        return await prisma.user.update({
            where: {
                userId: userId,
                deleteAccountVerifyToken: token,
                deleteAccountVerifyToken_expire: {gte: Date.now()}
            },
            data: {
                deleteAccountVerifyToken: '',
                deleteAccountVerifyToken_expire: 0,
            },
            select: {
                deleteAccountVerifyToken: true,
                deleteAccountVerifyToken_expire: true,
            }
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return 'notfound';
        }
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

export async function removeAuthSession(userId, deviceId, prevRefreshToken) {
    try {
        const checkRefreshTokenExist = await prisma.activeSession.findFirst({
            where: {
                userId: userId,
                refreshToken: prevRefreshToken,
            },
            select: {
                refreshToken: true,
            },
        });
        if (checkRefreshTokenExist) {
            return await prisma.activeSession.delete({
                where: {
                    userId: userId,
                    deviceId: deviceId,
                },
                select: {
                    refreshToken: true,
                },
            });
        } else {
            return 'cannot find device';
        }
    } catch (error) {
        if (error.meta?.cause === 'Record to delete does not exist.') {
            return 'cannot find device';
        }
        saveError(error);
        return null;
    }
}

export async function removeAllAuthSession(userId, prevRefreshToken) {
    try {
        const checkRefreshTokenExist = await prisma.activeSession.findFirst({
            where: {
                userId: userId,
                refreshToken: prevRefreshToken,
            },
            select: {
                refreshToken: true,
            },
        });
        if (checkRefreshTokenExist) {
            let sessions = await prisma.activeSession.findMany({
                where: {
                    userId: userId,
                    refreshToken: {not: prevRefreshToken}
                },
                select: {
                    refreshToken: true,
                }
            });
            let {count} = await prisma.activeSession.deleteMany({
                where: {
                    userId: userId,
                    refreshToken: {not: prevRefreshToken}
                },
            });
            if (count > 0) {
                return sessions;
            }
            return [];
        } else {
            return 'cannot find device';
        }
    } catch (error) {
        saveError(error);
        return null;
    }
}

//------------------------------------------------
//------------------------------------------------

export async function getProfileImagesCount(userId) {
    try {
        return await prisma.profileImage.count({
            where: {
                userId: userId,
            },
        });
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function uploadProfileImageDB(userId, imageData) {
    try {
        let createResult = await prisma.profileImage.create({
            data: {
                userId: userId,
                originalSize: imageData.originalSize,
                size: imageData.size,
                url: imageData.url,
                thumbnail: imageData.thumbnail,
                addDate: new Date(),
            },
            select: {
                userId: true,
            },
        });
        if (!createResult) {
            return 'error';
        }
        return await prisma.profileImage.findMany({
            where: {
                userId: userId,
            },
        });
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function removeProfileImageDB(userId, fileName) {
    try {
        let {count} = await prisma.profileImage.deleteMany({
            where: {
                userId: userId,
                url: {endsWith: fileName}
            }
        });
        if (count === 0) {
            return null;
        }
        return await prisma.profileImage.findMany({
            where: {
                userId: userId,
            },
        });
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

//----------------------------
//----------------------------

export async function getAllUserSettingsDB(userId) {
    try {
        let res = await Promise.allSettled([
            prisma.movieSettings.findFirst({
                where: {
                    userId: userId,
                },
            }),
            prisma.downloadLinksSettings.findFirst({
                where: {
                    userId: userId,
                },
            }),
            prisma.notificationSettings.findFirst({
                where: {
                    userId: userId,
                },
            })
        ]);

        if (res.find(item => item.status !== 'fulfilled')) {
            return 'error';
        }
        if (res.every(item => !item.value)) {
            return null;
        }
        return {
            movieSettings: res[0].value,
            downloadLinksSettings: res[1].value,
            notificationSettings: res[2].value,
        }
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

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

export async function changeUserSettingsDB(userId, settings, settingSectionName) {
    try {
        if (settingSectionName === 'movie') {
            return await prisma.movieSettings.upsert({
                where: {
                    userId: userId,
                },
                update: settings,
                create: {
                    userId: userId,
                    ...settings,
                }
            });
        }
        if (settingSectionName === 'downloadLinks') {
            return await prisma.downloadLinksSettings.upsert({
                where: {
                    userId: userId,
                },
                update: settings,
                create: {
                    userId: userId,
                    ...settings,
                }
            });
        }
        if (settingSectionName === 'notification') {
            return await prisma.notificationSettings.upsert({
                where: {
                    userId: userId,
                },
                update: settings,
                create: {
                    userId: userId,
                    ...settings,
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

export async function addUserFollowToDB(userId, followId) {
    try {
        return await prisma.follow.create({
            data: {
                followerId: userId,
                followingId: followId,
                addDate: new Date(),
            },
        });
    } catch (error) {
        if (error.code === "P2002") {
            return 'already exist';
        }
        if (error.code === 'P2022' || error.code === 'P2025') {
            return 'notfound';
        }
        saveError(error);
        return 'error';
    }
}

export async function removeUserFollowFromDB(userId, followId) {
    try {
        return await prisma.follow.delete({
            where: {
                followerId_followingId: {
                    followerId: userId,
                    followingId: followId,
                },
            },
            select: {
                followerId: true,
                followingId: true,
            }
        });
    } catch (error) {
        if (error.code === 'P2022' || error.code === 'P2025') {
            return 'notfound';
        }
        saveError(error);
        return 'error';
    }
}

export async function getUserFollowersDB(userId, skip, limit) {
    try {
        return await prisma.follow.findMany({
            where: {
                followingId: userId,
            },
            select: {
                followerUser: {
                    select: {
                        userId: true,
                        username: true,
                        rawUsername: true,
                        publicName: true,
                        bio: true,
                        profileImages: {
                            select: {
                                url: true,
                                size: true,
                                thumbnail: true,
                            }
                        },
                    }
                },
            },
            skip: skip,
            take: limit,
            orderBy: {
                addDate: 'desc',
            }
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return 'notfound';
        }
        saveError(error);
        return 'error';
    }
}

export async function getUserFollowingsDB(userId, skip, limit) {
    try {
        return await prisma.follow.findMany({
            where: {
                followerId: userId,
            },
            select: {
                followingUser: {
                    select: {
                        userId: true,
                        username: true,
                        rawUsername: true,
                        publicName: true,
                        bio: true,
                        profileImages: {
                            select: {
                                url: true,
                                size: true,
                                thumbnail: true,
                            }
                        },
                    }
                },
            },
            skip: skip,
            take: limit,
            orderBy: {
                addDate: 'desc',
            }
        });
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
                    role: {not: 'admin'},
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

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

export async function getUserProfile(userId, refreshToken) {
    try {
        return await prisma.user.findFirst({
            where: {
                userId: userId,
            },
            select: {
                password: false,
                emailVerifyToken: false,
                emailVerifyToken_expire: false,
                emailVerified: true,
                rawUsername: true,
                email: true,
                role: true,
                publicName: true,
                userId: true,
                username: true,
                bio: true,
                defaultProfile: true,
                profileImages: true,
                registrationDate: true,
                favoriteGenres: true,
                activeSessions: {
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
                },
                computedFavoriteGenres: true,
                ComputedStatsLastUpdate: true,
                movieSettings: true,
                downloadLinksSettings: true,
                notificationSettings: true,

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
                }
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
                userId: userId,
                deviceId: deviceId,
            },
            update: {
                appName: deviceInfo.appName || '',
                appVersion: deviceInfo.appVersion || '',
                deviceOs: deviceInfo.os || '',
                deviceModel: deviceInfo.deviceModel || '',
                ipLocation: deviceInfo.ipLocation || '',
                lastUseDate: now,
                refreshToken: refreshToken,
            },
            create: {
                appName: deviceInfo.appName || '',
                appVersion: deviceInfo.appVersion || '',
                deviceOs: deviceInfo.os || '',
                deviceModel: deviceInfo.deviceModel || '',
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

import prisma from "../prisma.js";
import * as moviesDbMethods from "./moviesDbMethods.js";
import {saveError} from "../../error/saveError.js";

export async function getNotComputedUsersId(limit = 10) {
    try {
        let lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 6);
        lastWeek.setHours(0, 0, 0, 0);

        return await prisma.user.findMany({
            where: {
                OR: [
                    {ComputedStatsLastUpdate: {lte: lastWeek.getTime()}},
                    {ComputedStatsLastUpdate: 0},
                ],
            },
            select: {
                userId: true,
            },
            take: limit,
        });
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function updateComputedFavoriteGenres(userId, genres) {
    try {
        return await prisma.user.update({
            where: {
                userId: userId,
            },
            data: {
                ComputedStatsLastUpdate: Date.now(),
                computedFavoriteGenres: {
                    deleteMany: {
                        userId: userId,
                    },
                    createMany: {
                        data: genres,
                    }
                }
            },
            select: {
                userId: true,
            }
        });
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getGenresFromUserStats(userId) {
    try {
        let res = await Promise.allSettled([
            prisma.watchedMovie.findMany({
                where: {
                    userId: userId,
                    OR: [
                        {dropped: false},
                        {favorite: true},
                    ]
                },
                take: 300,
                orderBy: {
                    date: 'desc'
                },
                select: {
                    movieId: true,
                }
            }),
            prisma.likeDislikeMovie.findMany({
                where: {
                    userId: userId,
                    type: 'like',
                },
                take: 150,
                orderBy: {
                    date: 'desc'
                },
                select: {
                    movieId: true,
                }
            }),
            prisma.followMovie.findMany({
                where: {
                    userId: userId,
                },
                take: 50,
                orderBy: {
                    date: 'desc'
                },
                select: {
                    movieId: true,
                }
            })
        ]);
        if (res.find(item => !item.value)) {
            return 'error';
        }

        let recentMoviesIds = [...res[0].value, ...res[1].value, ...res[2].value].map(item => item.movieId.toString());
        let uniqueMovieIds = [];
        for (let i = 0; i < recentMoviesIds.length; i++) {
            if (!uniqueMovieIds.includes(recentMoviesIds[i])) {
                uniqueMovieIds.push(recentMoviesIds[i]);
            }
        }

        let allGenres = [];
        let moviesData = await moviesDbMethods.getMoviesDataInBatch(recentMoviesIds, {genres: 1});
        for (let i = 0; i < moviesData.length; i++) {
            allGenres.push(moviesData[i].genres);
        }
        allGenres = allGenres.flat(1);
        let groupGenres = allGenres.reduce((groups, genre) => {
            let groupData = groups.find(g => g.genre === genre);
            if (groupData) {
                groupData.count++;
            } else {
                groups.push({
                    genre: genre,
                    count: 1,
                });
            }
            return groups;
        }, []);

        const allGenresLength = allGenres.length;
        for (let i = 0; i < groupGenres.length; i++) {
            groupGenres[i].percent = Number((groupGenres[i].count / allGenresLength).toFixed(1));
        }

        return groupGenres.sort((a, b) => b.count - a.count).slice(0, 8);
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

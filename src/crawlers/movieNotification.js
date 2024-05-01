import * as userStatsDbMethods from "../data/db/userStatsDbMethods.js";
import * as rabbitmqPublisher from "../../rabbitmq/publish.js";
import {movieNotificationTypes} from "../../rabbitmq/publish.js";
import {changePageLinkStateFromCrawlerStatus, linkStateMessages} from "./status/crawlerStatus.js";
import {saveError} from "../error/saveError.js";


export async function handleNewInsertedMovieNotification(movieId, posters, pageLink) {
    try {
        changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.notification.start);
        changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.notification.finishedListSpinOffSequel);
        let moviePoster = posters?.[0]?.url || posters?.[0]?.thumbnail || "";
        let users = await userStatsDbMethods.getUsersWatchedRelatedTitle(movieId);
        let userIds = users.map(item => {
            return [
                ...item.movie.watchedMovies.map(m => m.user.userId),
                ...item.movie.followMovies.map(m => m.user.userId),
                ...item.movie.watchListMovies.map(m => m.user.userId),
            ];
        }).flat(1);
        userIds = [...new Set(userIds)];

        let message = "";
        for (let i = 0; i < userIds.length; i++) {
            await rabbitmqPublisher.addMovieNotificationToQueue(movieId, moviePoster, movieNotificationTypes.finishedListSpinOffSequel, userIds[i], message);
        }
    } catch (error) {
        saveError(error);
    }
}

export async function handleMovieNotification(dbData, pageLink) {
    try {
        //todo : implement followMovieSubtitle
        //todo : implement futureListSubtitle

        changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.notification.start);
        if (!dbData.latestData) {
            return;
        }

        let moviePoster = dbData.posters?.[0]?.url || dbData.posters?.[0]?.thumbnail || "";

        if (dbData.latestData.updateReason === "season" || dbData.latestData.updateReason === "episode") {
            let message = `S${dbData.latestData.season}E${dbData.latestData.episode}`;

            // check season ended
            let episodesNumOfSeason = (dbData.seasonEpisode || []).find(s => s.seasonNumber === dbData.latestData.season)?.episodes || 0;
            let seasonEnded = episodesNumOfSeason > 0 && episodesNumOfSeason === dbData.latestData.episode;
            if (seasonEnded) {
                // futureListSerialSeasonEnd
                changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.notification.futureListSerialSeasonEnd);
                let watchListingUsers = await userStatsDbMethods.getWatchListingUsers(dbData._id);
                for (let i = 0; i < watchListingUsers.length; i++) {
                    await rabbitmqPublisher.addMovieNotificationToQueue(dbData._id, moviePoster, movieNotificationTypes.futureListSerialSeasonEnd, watchListingUsers[i].userId, message);
                }
            } else {
                // futureList
                changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.notification.futureList);
                let watchListingUsers = await userStatsDbMethods.getWatchListingUsers(dbData._id);
                for (let i = 0; i < watchListingUsers.length; i++) {
                    await rabbitmqPublisher.addMovieNotificationToQueue(dbData._id, moviePoster, movieNotificationTypes.futureList, watchListingUsers[i].userId, message);
                }
            }

            // followMovie
            changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.notification.followingMovie);
            let followingUsers = await userStatsDbMethods.getUsersFollowingTitle(dbData._id);
            for (let i = 0; i < followingUsers.length; i++) {
                await rabbitmqPublisher.addMovieNotificationToQueue(dbData._id, moviePoster, movieNotificationTypes.followingMovie, followingUsers[i].userId, message);
            }
        } else if (dbData.latestData.updateReason === "quality") {
            let quality = dbData.latestData.quality.split(' - ')[0].split('.').slice(0, 4).join('.');
            let message = dbData.type.includes('serial')
                ? `S${dbData.latestData.season}E${dbData.latestData.episode}: ${quality}`
                : `${quality}`;

            // followMovieQuality
            changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.notification.followMovieBetterQuality);
            if (dbData.type.includes('serial')) {
                let followingUsers = await userStatsDbMethods.getUsersFollowingTitle(dbData._id);
                for (let i = 0; i < followingUsers.length; i++) {
                    await rabbitmqPublisher.addMovieNotificationToQueue(dbData._id, moviePoster, movieNotificationTypes.followMovieBetterQuality, followingUsers[i].userId, message);
                }
            }
        }
    } catch (error) {
        saveError(error);
    }
}

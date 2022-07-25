import getCollection from './mongoDB.js';
import {saveError} from "../error/saveError.js";


// run this method to create collections and their indexes

export async function createCollectionsAndIndexes() {
    try {
        console.log('creating mongodb collection and indexes');

        let userStats = await getCollection('userStats');
        await userStats.createIndex({userId: 1, pageNumber: 1});
        //usage: userId, $or{[statType],[statType2]}
        //usage: userId, [statCounterField], sort:{pageNumber: 1} --more usage
        //usage: userId, [statType],
        //usage: userId, pageNumber, sort:{pageNumber: -1} --more usage
        //usage: userId, [statCounterField], sort:{pageNumber: -1}


        let moviesCollection = await getCollection('movies');
        //also add searchIndex --> path: ['title', 'alternateTitles', 'titleSynonyms']
        await moviesCollection.createIndex({title: 1, type: 1, year: 1});
        await moviesCollection.createIndex({alternateTitles: 1});
        await moviesCollection.createIndex({titleSynonyms: 1});
        await moviesCollection.createIndex({jikanID: 1});
        await moviesCollection.createIndex({type: 1, releaseState: 1, 'rating.imdb': 1, 'rating.myAnimeList': 1});
        await moviesCollection.createIndex({year: -1, insert_date: -1});
        await moviesCollection.createIndex({update_date: -1, year: -1});
        await moviesCollection.createIndex({'userStats.like_movie': -1, _id: -1});
        await moviesCollection.createIndex({
            type: 1, //index prefix
            'rank.animeTopComingSoon': 1,
            'rank.animeTopAiring': 1,
            'rank.comingSoon': 1,
            'rank.inTheaters': 1,
            'rank.boxOffice': 1,
            'rank.top': 1,
            'rank.popular': 1,
            'rating.imdb': 1,
            'rating.myAnimeList': 1
        });
        await moviesCollection.createIndex({status: 1, releaseDay: 1});
        await moviesCollection.createIndex({genres: 1});
        //usage: title, **alternateTitles**, **titleSynonyms**, type, year
        //usage: jikanID
        //usage: relatedTitles.jikanID
        //usage: imdbID
        //usage: releaseState, type, rating.imdb, rating.myAnimeList, (sort: year, insert_date)
        //usage: releaseState, type, rating.imdb, rating.myAnimeList, (sort: update_date, year)
        //usage: releaseState, type, rating.imdb, rating.myAnimeList, (sort: 'userStats.like_movie', _id)
        //usage: releaseState, type, rating.imdb, rating.myAnimeList, trailers, (sort: year, add_date)
        //usage: rank.*, type, rating.imdb, rating.myAnimeList, (sort: rank)
        //usage: status, nextEpisode.releaseStamp, update_date, endYear, releaseDay, type, rating.imdb, rating.myAnimeList (sort: rating.imdb, rating.myAnimeList, _id)
        //usage: genres, type, rating.imdb, rating.myAnimeList, (sort: year, insert_date)


        const staffAndCharactersCollections = ['staff', 'characters'];
        for (let i = 0; i < staffAndCharactersCollections.length; i++) {
            let collection = await getCollection(staffAndCharactersCollections[i]);
            //also add searchIndex --> path: ['name', 'rawName']
            await collection.createIndex({name: 1});
            //usage: name, **tvmazePersonID**, **jikanPersonID**
        }


        let usersCollection = await getCollection('users');
        await usersCollection.createIndex({username: 1, email: 1});
        await usersCollection.createIndex({'activeSessions.refreshToken': 1, _id: 1});
        //usage: username, email
        //usage: emailVerifyToken, emailVerifyToken_expire
        //usage: activeSessions.refreshToken
        //usage: _id, activeSessions.refreshToken
        console.log('creating mongodb collection and indexes --done!');
        console.log();
    } catch (error) {
        saveError(error);
    }
}

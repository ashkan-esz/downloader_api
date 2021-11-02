export function getEpisodeModel(title, released, releaseStamp, duration, season, episode, imdbRating, imdbID) {
    return {
        title: title || 'unknown',
        released: released || '',
        releaseStamp: releaseStamp || '',
        duration: duration || '0 min',
        season: season || 0,
        episode: episode || 0,
        imdbRating: imdbRating || '0',
        imdbID: imdbID || '',
    };
}

export function getEpisodeModel(title, released, releaseStamp, duration, season, episode, imdbRating, imdbID) {
    return {
        title: title || 'unknown',
        released: released || '',
        releaseStamp: releaseStamp || '',
        duration: duration || '0 min',
        season: Number(season) || 0,
        episode: Number(episode) || 0,
        imdbRating: imdbRating || '0',
        imdbID: imdbID || '',
    };
}

export function getEpisodeModel_placeholder(season, episode) {
    return {
        title: 'unknown',
        released: 'unknown',
        releaseStamp: '',
        duration: '0 min',
        season: Number(season) || 0,
        episode: Number(episode) || 0,
        imdbRating: '0',
        imdbID: '',
    };
}

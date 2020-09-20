const getCollection = require( "./mongoDB");

let movie_titles = []; //500
let serial_titles = [];//500

let movie_news = [];//100 olds too
let serial_news = [];//50

let movie_updates = [];//100 olds too
let serial_updates = [];//50

let movie_likes = []; //50
let serial_likes = [];//50

//-------------------------------
//-------------TITLES------------
function search_cached_titles(type, searching_title) {
    let titles_array = (type === 'serial') ? serial_titles : movie_titles;
    if (titles_array.length > 0) {
        for (const thisTitle of titles_array) {
            if (thisTitle.title === searching_title) {
                return thisTitle;
            }
        }
    }

    let cached_news = get_cached_news(type, 0);
    if (cached_news !== null) {
        for (const cachedNew of cached_news) {
            if (cachedNew.title === searching_title) {
                return cachedNew;
            }
        }
    }

    let cached_updates = get_cached_updates(type, 0);
    if (cached_updates !== null) {
        for (const cachedUpdate of cached_updates) {
            if (cachedUpdate.title === searching_title) {
                return cachedUpdate;
            }
        }
    }

    let cached_likes = get_cached_likes(type, 0);
    if (cached_likes !== null) {
        for (const cachedLike of cached_likes) {
            if (cachedLike.title === searching_title) {
                return cachedLike;
            }
        }
    }

    return null;
}

function add_cached_titles(type, title_doc) {
    let titles_array = (type === 'serial') ? serial_titles : movie_titles;
    titles_array.unshift(title_doc[0]);
    while (titles_array.length > 500) {
        titles_array.pop();
    }
    if (type === 'serial') {
        serial_titles = titles_array;
    } else {
        movie_titles = titles_array;
    }
}

function update_cached_titles(type, title_doc) {
    let titles_array = (type === 'serial') ? serial_titles : movie_titles;
    for (let i = 0; i < titles_array.length; i++) {
        if (titles_array[i].title === title_doc.title) {
            titles_array[i] = title_doc;
            break;
        }
    }
    if (type === 'serial') {
        serial_titles = titles_array;
    } else {
        movie_titles = titles_array;
    }
}

//-------------------------------
//-------------NEWS--------------
function get_cached_news(type, count) {
    let news_array = (type === 'serial') ? serial_news : movie_news;
    if (news_array.length === 0 || news_array.length < count) {
        return null;
    }
    return news_array;
}

async function set_cached_news() {
    let serials_collection = await getCollection('serials');
    serial_news = await serials_collection.find({}).sort({insert_date: -1}).limit(50).toArray();
    let movies_collection = await getCollection('movies');
    movie_news = await movies_collection.find({}).sort({insert_date: -1}).limit(100).toArray();
}

function update_cached_news(type, news_doc) {
    if (type === 'serial') {
        for (let i = 0; i < serial_news.length; i++) {
            if (serial_news[i].title === news_doc.title) {
                serial_news[i] = news_doc;
                break;
            }
        }
    } else {
        for (let i = 0; i < movie_news.length; i++) {
            if (movie_news[i].title === news_doc.title) {
                movie_news[i] = news_doc;
                break;
            }
        }
    }
}

//-------------------------------
//------------UPDATES------------
function get_cached_updates(type, count) {
    let news_array = (type === 'serial') ? serial_updates : movie_updates;
    if (news_array.length === 0 || news_array.length < count) {
        return null;
    }
    return news_array;
}

async function set_cached_updates() {
    let serials_collection = await getCollection('serials');
    serial_updates = await serials_collection.find({}).sort({update_date: -1}).limit(50).toArray();
    let movies_collection = await getCollection('movies');
    movie_updates = await movies_collection.find({}).sort({update_date: -1}).limit(100).toArray();
}

function update_cached_updates(type, news_doc) {
    if (type === 'serial') {
        for (let i = 0; i < serial_updates.length; i++) {
            if (serial_updates[i].title === news_doc.title) {
                serial_updates[i] = news_doc;
                break;
            }
        }
    } else {
        for (let i = 0; i < movie_updates.length; i++) {
            if (movie_updates[i].title === news_doc.title) {
                movie_updates[i] = news_doc;
                break;
            }
        }
    }
}

//-------------------------------
//-------------LIKES-------------
function get_cached_likes(type, count) {
    let likes_array = (type === 'serial') ? serial_likes : movie_likes;
    if (likes_array.length === 0 || likes_array.length < count) {
        return null;
    }
    return likes_array;
}

function update_cached_likes(type, like_docs) {
    let likes_array = (type === 'serial') ? serial_likes : movie_likes;

    for (let k = 0; k < like_docs.length; k++) {
        let exist = false;
        for (let i = 0; i < likes_array.length; i++) {
            if (likes_array[i].title === like_docs[k].title) {
                exist = true;
                likes_array[i] = like_docs[k];
                break;
            }
        }

        if (!exist) {
            likes_array.unshift(like_docs[k]);
        }
    }

    likes_array = likes_array.sort((a, b) => b.like - a.like);

    while (likes_array.length > 50) {
        likes_array.pop();
    }

    if (type === 'serial') {
        serial_likes = likes_array;
    } else {
        movie_likes = likes_array;
    }
}

//---------------------------------------------------------
module.exports.search_cached_titles = search_cached_titles;
module.exports.add_cached_titles = add_cached_titles ;
module.exports.update_cached_titles = update_cached_titles;
module.exports.get_cached_news = get_cached_news;
module.exports.set_cached_news = set_cached_news;
module.exports.update_cached_news = update_cached_news;
module.exports.get_cached_updates = get_cached_updates;
module.exports.set_cached_updates = set_cached_updates;
module.exports.update_cached_updates = update_cached_updates;
module.exports.get_cached_likes = get_cached_likes;
module.exports.update_cashed_likes = update_cached_likes;

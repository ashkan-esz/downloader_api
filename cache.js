let movie_titles = []; //500
let serial_titles = [];//500

let movie_news = [];//50
let serial_news = [];//50

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

function add_cached_titles (type, title_doc) {
    let titles_array = (type === 'serial') ? serial_titles : movie_titles;
    titles_array.unshift(title_doc);
    while (titles_array.length > 500) {
        titles_array.pop();
    }
}

function update_cached_titles (type, title_doc) {
    let titles_array = (type === 'serial') ? serial_titles : movie_titles;
    for (let i = 0; i < titles_array.length; i++) {
        if (titles_array[i].title === title_doc.title) {
            titles_array[i] = title_doc;
            break;
        }
    }
}

//-------------------------------
//-------------NEWS--------------
function get_cached_news(type,count) {
    let news_array = (type === 'serial') ? serial_news : movie_news;
    if (news_array.length < count) {
        return null;
    }
    return news_array;
}

function add_cached_news(type,title_doc) {
    let news_array = (type === 'serial') ? serial_news : movie_news;
    news_array.unshift(title_doc);
    while (news_array.length > 50) {
        news_array.pop();
    }
}

function update_cached_news(type, news_doc, set = false) {
    let news_array = (type === 'serial') ? serial_news : movie_news;
    if (set) { //reset array with new result
        news_array = news_doc;
    } else {
        for (let i = 0; i < news_array.length; i++) {
            if (news_array[i].title === news_doc.title) {
                news_array[i] = news_doc;
                break;
            }
        }
    }
}

//-------------------------------
//-------------LIKES-------------
function get_cached_likes(type, count) {
    let likes_array = (type === 'serial') ? serial_likes : movie_likes;
    if (likes_array.length < count) {
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
}

//---------------------------------------------------------
module.exports.search_cached_titles = search_cached_titles;
module.exports.add_cached_titles = add_cached_titles ;
module.exports.update_cached_titles = update_cached_titles;
module.exports.get_cached_news = get_cached_news;
module.exports.add_cached_news = add_cached_news;
module.exports.update_cached_news = update_cached_news;
module.exports.get_cached_likes = get_cached_likes;
module.exports.update_cashed_likes = update_cached_likes;

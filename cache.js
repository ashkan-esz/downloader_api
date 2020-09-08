let movie_titles = [];
let serial_titles = [];

let movie_likes = [];
let serial_likes = [];


function search_cached_titles(type, searching_title) {
    let titles_array = (type === 'serial') ? serial_titles : movie_titles;
    if (titles_array.length > 0) {
        for (const thisTitle of titles_array) {
            if (thisTitle.title === searching_title) {
                return thisTitle;
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
            break
        }
    }
}


//-----------------------------
//-----------------------------

function get_cached_likes(type, count) {
    let likes_array = (type === 'serial') ? serial_likes : movie_likes;
    if (likes_array.length < count) {
        return null;
    }
    return likes_array;
}

function update_cached_likes(type, like_docs, updateType) {
    let likes_array = (type === 'serial') ? serial_likes : movie_likes;

    if (updateType === 'likeUpdate') {

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
                likes_array = likes_array.sort((a, b) => b.like - a.like);
            }
        }


        while (likes_array.length > 26) {
            likes_array.pop()
        }

    } else if (updateType === 'sourceUpdate') {
        for (let i = 0; i < likes_array.length; i++) {
            if (likes_array[i].title === like_docs[0].title) {
                likes_array[i] = like_docs[0];
                break;
            }
        }
    }
}

//---------------------------------------------------------
module.exports.search_cached_titles = search_cached_titles;
module.exports.add_cached_titles = add_cached_titles ;
module.exports.update_cached_titles = update_cached_titles;
module.exports.get_cached_likes = get_cached_likes;
module.exports.update_cashed_likes = update_cached_likes;

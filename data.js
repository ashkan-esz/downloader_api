const fs = require('fs');

let serial_files = [];
let movie_files = [];
let serial_likes = [];
let movie_likes = [];
let serial_updates = [];
let movie_updates = [];

// open files into memory again after saving changes to files in crawlers
function openFilesAgain() {
    serial_files = getFiles('serial');
    movie_files = getFiles('movie');
    serial_likes = [];
    getSerialLikes();
    movie_likes = [];
    getMovieLikes();
    serial_updates = [];
    getSerialUpdates();
    movie_updates = [];
    getMovieUpdates();
}

// get titles from files
function getSerialFiles() {
    if (serial_files.length === 0) {
        serial_files = getFiles('serial');
    }
    return serial_files;
}

function getMovieFiles() {
    if (movie_files.length === 0) {
        movie_files = getFiles('movie');
    }
    return movie_files;
}

function getFiles(type) {
    let dir = (type === 'serial') ? './crawlers/serial_files/' : './crawlers/movie_files/';
    let files = fs.readdirSync(dir);
    files = files.filter(value => value !== 'serial_likes.json' && value !== 'movie_likes.json' &&
        value !== 'serial_updates.json' && value !== 'movie_updates.json')
    files = files.sort((a, b) => a.match(/(\d+)/)[0] - b.match(/(\d+)/)[0]);
    let result = [];
    for (let k = files.length - 1; k >= 0; k--) {
        let address = dir + files[k];
        let json_file = fs.readFileSync(address, 'utf8')
        let saved_array = JSON.parse(json_file);
        let thisFile = [];
        for (let i = 0; i < saved_array.length; i++) {
            thisFile.push(saved_array[i]);
        }
        result.push(thisFile);
    }
    return result;
}

// get title like/dislike from files
function getSerialLikes() {
    if (serial_likes.length === 0) {
        let json_file = fs.readFileSync('./crawlers/serial_files/serial_likes.json', 'utf8')
        serial_likes = JSON.parse(json_file);
    }
    return serial_likes;
}

function getMovieLikes() {
    if (movie_likes.length === 0) {
        let json_file = fs.readFileSync('./crawlers/movie_files/movie_likes.json', 'utf8')
        movie_likes = JSON.parse(json_file);
    }
    return movie_likes;
}

function updateLikes(likes, type) {
    let address = (type === 'serial') ? './crawlers/serial_files/serial_likes.json' :
        './crawlers/movie_files/movie_likes.json'
    let stringify = JSON.stringify(likes);
    fs.writeFileSync(address, stringify, 'utf8');
}

// get updates from file
function getSerialUpdates() {
    if (serial_updates.length === 0) {
        let json_file = fs.readFileSync('./crawlers/serial_files/serial_updates.json', 'utf8')
        serial_updates = JSON.parse(json_file);
    }
    return serial_updates;
}

function getMovieUpdates() {
    if (movie_updates.length === 0) {
        let json_file = fs.readFileSync('./crawlers/movie_files/movie_updates.json', 'utf8')
        movie_updates = JSON.parse(json_file);
    }
    return movie_updates;
}


module.exports.openFilesAgain = openFilesAgain;
module.exports.getSerialFiles = getSerialFiles;
module.exports.getMovieFiles = getMovieFiles;
module.exports.getSerialLikes = getSerialLikes;
module.exports.getMovieLikes = getMovieLikes;
module.exports.updateLikes = updateLikes;
module.exports.getSerialUpdates = getSerialUpdates;
module.exports.getMovieUpdates = getMovieUpdates;
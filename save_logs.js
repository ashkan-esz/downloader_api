const fs = require('fs');

module.exports.save_error = function (data) {
    handle_file('error.json', 'save_error', data);
}

module.exports.get_saved_error = async function (count) {
    return await get_file_data('error.json', count);
}

module.exports.save_crawling_time = function (data) {
    handle_file('crawling_time.json', 'save_crawling_time', data);
}

module.exports.get_saved_crawling_time = async function (count) {
    return await get_file_data('crawling_time.json', count);
}


function handle_file(fileName, func, data) {
    fs.readFile(`logs/${fileName}`, 'utf8', function (error, json_array) {
        if (error) {
            if (error.code === 'ENOENT') { //file doesnt exist
                return fs.writeFile(`logs/${fileName}`, JSON.stringify([data]), function (err) {
                    if (err) {
                        console.log(`module :save_logs.js >> ${func} > fileDoesntExist > writeFile > ${data}`, error);
                    }
                });
            }
            return console.log(`module :save_logs.js >> ${func} > readFile > ${data}`, error);
        }
        let array = JSON.parse(json_array);
        array.push(data);
        while (array.length > 500) {
            array.shift();
        }
        fs.writeFile(`logs/${fileName}`, JSON.stringify(array), 'utf8', function (err) {
            if (err) {
                console.log(`module :save_logs.js >> ${func} > writeFile > ${data}`, error);
            }
        });
    });
}

async function get_file_data(fileName, count) {
    try {
        let json_array = fs.readFileSync(`logs/${fileName}`, 'utf8');
        let array = JSON.parse(json_array);
        if (count === 0) {
            return array;
        } else {
            return array.slice(Math.max(0, array.length - count));
        }
    } catch (error) {
        if (error.code === 'ENOENT') { //file doesnt exist
            return ['no file'];
        }
        return error;
    }
}
const fs = require('fs');

module.exports.save_error = function (data) {

    handle_file('error.json', 'save_error', data);

}

module.exports.save_crawling_time = function (data) {

    handle_file('crawling_time.json', 'save_crawling_time', data);

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
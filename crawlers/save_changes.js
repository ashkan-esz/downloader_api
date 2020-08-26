const {sort_links} = require('./search_tools');
const fs = require('fs');

module.exports = function save(title_array, page_link, save_link, persian_plot, mode) {
    try {
        let startTime = new Date();
        let year = (mode === 'movie') ? getYear(page_link, save_link) : '';
        let title = title_array.join(' ').trim();
        let result = {
            title: title,
            persian_plot: persian_plot,
            sources: [{
                url: page_link,
                links: save_link
            }],
            year: year
        };

        let dir = (mode === 'serial') ? './crawlers/serial_files/' : './crawlers/movie_files/';
        let files = fs.readdirSync(dir);
        files = files.filter(value => value !== 'serial_likes.json' && value !== 'movie_likes.json' &&
            value !== 'serial_updates.json' && value !== 'movie_updates.json')
        files = files.sort((a, b) => a.match(/(\d+)/)[0] - b.match(/(\d+)/)[0])
        let title_exist = false;
        F : for (let k = files.length-1; k >=0 ; k--) {
            let address = dir + files[k];
            let json_file = fs.readFileSync(address, 'utf8')
            let saved_array = JSON.parse(json_file);
            for (let i = 0; i < saved_array.length; i++) { //check title exist
                if (saved_array[i].title === title &&
                    ((saved_array[i].year) ? saved_array[i].year === year : true)) { // this title exist // no need to search anymore
                    title_exist = true

                    let thisSources = saved_array[i].sources;
                    let source_exist = false;
                    for (let j = 0; j < thisSources.length; j++) {//check source exist

                        let source_name = thisSources[j].url.replace('https://', '')
                            .replace('www.', '')
                            .split('.')[0];
                        let new_source_name = page_link.replace('https://', '')
                            .replace('www.', '')
                            .split('.')[0];

                        if (source_name === new_source_name) { // this source exist // no need to search anymore
                            source_exist = true;
                            let thisLinks = thisSources[j].links;
                            if (mode === 'movie') { //movie
                                handle_movie_changes(save_link, thisLinks, saved_array, i, j, dir, address);
                            } else { //serial
                                handle_serial_changes(save_link, thisLinks, saved_array, i, j, dir, address);
                            }
                            break F;
                        }
                    }

                    if (!source_exist) {//new source
                        console.log('-----new source')
                        saved_array[i].sources.push(result.sources[0])
                        updateFile(saved_array, address);
                        update_update_file(dir, saved_array[i], mode);
                    }
                    break F;
                }
            }
        }

        if (!title_exist) {//new title
            console.log('-----new title')
            let lastFile = files[files.length - 1];
            let lastFile_dest = dir + lastFile;
            let lastFile_size = fs.statSync(lastFile_dest).size / 1024 / 1024;
            let json_file = fs.readFileSync(lastFile_dest, 'utf8')
            let saved_array = JSON.parse(json_file);
            saved_array.push(result);
            updateFile(saved_array,lastFile_dest)
            if (lastFile_size > 1.5) {//create new file if needed
                let filePath = dir + mode + (files.length + 1) + '.json';
                fs.writeFileSync(filePath, JSON.stringify([]), 'utf8');
            }
            // add this title to like file
            update_likes_file(dir, result, mode);
            // add this title to update file
            update_update_file(dir, result, mode);
        }

        let endTime = new Date();
        console.log('-------------- time : ', (endTime.getTime() - startTime.getTime()))

    } catch (e) {
        console.error(e)
    }
}

function handle_movie_changes(save_link, thisLinks, saved_array, i, j, dir, address) {
    for (let l = 0; l < save_link.length; l++) {//check links exist
        let link_exist = false;
        for (let k = 0; k < thisLinks.length; k++) {
            if (thisLinks[k].link === save_link[l].link &&
                thisLinks[k].info === save_link[l].info) { //this link exist
                link_exist = true;
                break;
            }
        }
        if (!link_exist) {//movie new link
            console.log('-----movie new link')
            saved_array[i].sources[j].links.push(save_link[l]);
            updateFile(saved_array, address);
            update_update_file(dir, saved_array[i], 'movie')
        }
    }
}

function handle_serial_changes(save_link, thisLinks, saved_array, i, j, dir, address) {
    for (let s = 0; s < save_link.length; s++) {//check links exist
        let season1 = Number(save_link[s][0].link.toLowerCase().match(/s\d\de\d\d/g)[0].slice(1, 3));
        let season_exist = false;
        for (let l = 0; l < save_link[s].length; l++) {
            let link_exist = false;
            E :for (let k = 0; k < thisLinks.length; k++) {
                let season2 = Number(thisLinks[k][0].link.toLowerCase().match(/s\d\de\d\d/g)[0].slice(1, 3));
                for (let h = 0; h < thisLinks[k].length; h++) {
                    if (thisLinks[k][h].link === save_link[s][l].link &&
                        thisLinks[k][h].info === save_link[s][l].info) { //this link exist
                        link_exist = true;
                        if (season1 === season2)
                            season_exist = true;
                        break E;
                    }
                }
                if (!link_exist && season1 === season2) {//serial season new link
                    console.log('------serial season new link')
                    season_exist = true;
                    saved_array[i].sources[j].links[k].push(save_link[s][l]);
                    updateFile(saved_array, address);
                    update_update_file(dir, saved_array[i], 'serial')
                    break;
                }
            }
        }//end of checking all of this season links
        if (!season_exist) {//serial new season
            console.log('------serial new season')
            saved_array[i].sources[j].links.push(save_link[s]);
            saved_array[i].sources[j].links = sort_links(saved_array[i].sources[j].links.flat(1))
            updateFile(saved_array, address);
            update_update_file(dir, saved_array[i], 'serial')
        }
    }//end of seasons
}

function getYear(page_link, save_link) {
    let url_array = page_link.replace(/[-/]/g, ' ').split(' ').filter(value => Number(value) > 1800 && Number(value) < 2100);
    if (url_array.length > 0) {
        return url_array.pop();
    }

    let link = save_link[0].link;
    let link_array = link.replace(/[-_()]/g, '.').split('.').filter(value => Number(value) > 1800 && Number(value) < 2100);
    if (link_array.length > 0) {
        return link_array.pop()
    } else return '';
}

function updateFile(saved_array, address) {
    let stringify = JSON.stringify(saved_array);
    fs.writeFileSync(address, stringify, 'utf8');
}

function update_likes_file(dir, result, mode) {
    let fileName = (mode === 'serial') ? 'serial_likes.json' : 'movie_likes.json';
    let likeFile_dest = dir + fileName;
    let saved_likes_json = fs.readFileSync(likeFile_dest, 'utf8');
    let saved_likes = JSON.parse(saved_likes_json);
    let result2 = {
        title: result.title,
        year: result.year,
        like: 0,
        dislike: 0
    }
    saved_likes.push(result2);
    let stringify2 = JSON.stringify(saved_likes);
    fs.writeFileSync(likeFile_dest, stringify2, 'utf8');
}

function update_update_file(dir, entry, mode) {
    let fileName = (mode === 'serial') ? 'serial_updates.json' : 'movie_updates.json';
    let updateFile_dest = dir + fileName;
    let saved_updates_json = fs.readFileSync(updateFile_dest, 'utf8');
    let saved_updates = JSON.parse(saved_updates_json);

    saved_updates = saved_updates.filter(thisTitle => thisTitle.title !== entry.title);
    saved_updates.unshift(entry);

    if (saved_updates.length === 51) {//keep size on 50
        saved_updates.pop()
    }

    let stringify = JSON.stringify(saved_updates);
    fs.writeFileSync(updateFile_dest, stringify, 'utf8');
}
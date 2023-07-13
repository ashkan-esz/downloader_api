import http from "http";
import config from "./src/config/index.js";

const t = `http://localhost:${config.port}/movies/news/movie-serial-anime_movie-anime_serial/low/0-10/0-10/1`;

const healthCheck = http.request(t, (res) => {
    console.log(`HEALTHCHECK STATUS: ${res.statusCode}`);
    if (res.statusCode === 200) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});

healthCheck.on('error', function (err) {
    console.error('ERROR');
    process.exit(1);
});

healthCheck.end();

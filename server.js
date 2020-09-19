require('dotenv').config({path: './.env'});
import express from 'express';
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const port = process.env.PORT || 3000;
import {get_saved_crawling_time, get_saved_error, save_crawling_time, save_error} from './save_logs';
//-------------------------------------
import likes from './routes/likes';
import titles from './routes/titles';
import updates from './routes/updates';
import start_crawling from "./crawlers/start_crawling";
//--------------------------------------
app.use(helmet());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use(compression());
//--------------------------------------
//--------------------------------------

const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: 'https://ashkanaz2828.eu.auth0.com/.well-known/jwks.json'
    }),

    // Validate the audience and the issuer.
    audience: 'https://downloader-auth-api',
    issuer: 'https://ashkanaz2828.eu.auth0.com/',
    algorithms: ['RS256']
});

// app.use(checkJwt);// todo


let crawling_flag = false;
app.post('/start/crawling/:password', async (req, res) => {
    let password = req.params.password;
    if (!crawling_flag) {
        if (password === process.env["UPDATE_PASSWORD"]) {
            crawling_flag = true;
            await start_crawling();
            crawling_flag = false;
            return res.json('crawling ended');
        }
    } else {
        return res.json('another crawling is running');
    }
    return res.json('wrong password!');
});


app.get('/logs/:type/:count?', async (req, res) => {
    let type = req.params.type;
    let count = Number(req.params.count) || 0;

    let data = (type === 'error') ? await get_saved_error(count) : await get_saved_crawling_time(count);
    return res.json(data);
});



app.use('/titles', titles);
app.use('/likes', likes);
app.use('/updates', updates);


app.use(function(req, res) {
    res.status(404).send({url: req.originalUrl + ' not found'})
});


app.listen(port, () => {
    console.log(`http://localhost:${port}`)
})
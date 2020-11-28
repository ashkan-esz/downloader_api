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
import {set_cached_news, set_cached_updates} from "./cache";
import {save_error} from "./save_logs";
//---------------Routes-----------------
import crawling from './routes/crawling';
import logs from './routes/logs';
import likes from './routes/likes';
import titles from './routes/titles';
import search from './routes/search';
import updates from './routes/updates';
//--------------middleware--------------
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

//init data
set_cached_news().then(()=>{});
set_cached_updates().then(()=>{});



app.use('/start/crawling', crawling);
app.use('/logs', logs);
app.use('/titles', titles);
app.use('/search', search);
app.use('/likes', likes);
app.use('/updates', updates);


app.use(function(req, res) {
    res.status(404).send({url: req.originalUrl + ' not found'})
});

app.use(async (err, req, res, next) => {

    await save_error({
        massage: "module: server.js >> Internal Server Error ",
        time: new Date()
    });

    res.status(500);
    res.send('Internal Server Error');
});

app.listen(port, () => {
    console.log(`http://localhost:${port}`)
})

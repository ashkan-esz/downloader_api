require('dotenv').config({path: './.env'});
import express from 'express';
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const port = process.env.PORT || 3000;
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
app.use(morgan('combined'));
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


app.post('/start/crawling/:password', async (req, res) => {
    let password = req.params.password;
    if (password === process.env["UPDATE_PASSWORD"]) {
        await start_crawling();
        return res.json('crawling ended');
    }
    return res.json('wrong password!');
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
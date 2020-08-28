import express from 'express';
const http = require('http');
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
import like from './routes/like';
import title from './routes/title';
import update from './routes/update';
import {getMovieUpdates, getSerialUpdates} from "./data";
import router from "./routes/update";
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

// openFilesAgain();// todo

app.get('/test', (req, res) => {
    res.json('test route happend');
});

app.use(update);
// app.get('/:type/:count?', (req, res) => { //this works
//     let type = req.params.type;
//     let count = req.params.count || 50;
//     res.json(type);
// });

// app.use('/titles', title);
// app.use('/likes', like);
// app.use('/updates', update);


app.use(function(req, res) {
    res.status(404).send({url: req.originalUrl + ' not found'})
});


// const server = http.createServer(app);
// server.listen(port, () => {
//     console.log(`http://localhost:${port}`)
// })

app.listen(port, () => {
    console.log(`http://localhost:${port}`)
})
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
import cron from "node-cron";
import getDatabase from './mongoDB';
//-------------------------------------
import like from './routes/like';
import title from './routes/title';
import update from './routes/update';
import start_crawling from "./start_crawling";
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


let search_flag = true;
cron.schedule("0-29 */3 * * *", () => {
    if (search_flag) {
        console.log(`this message logs every minute`);//todo
    }
    search_flag = false;
}, {});

cron.schedule("30-59 */3 * * *", () => {
    search_flag = true;
}, {});

//--------------------------------
//--------------------------------
app.get('/test/db/:count',async (req,res)=>{
    let count = Number(req.params.count);
    let startTime = new Date();
    const database = await getDatabase();
    const collection = await database.collection("movies").find({},{limit:count}).toArray();
    let endTime = new Date();
    console.log('======= time : ',(endTime.getTime()-startTime.getTime()))
    return res.json(collection);
});
//---------------------------------
//---------------------------------



app.use('/titles', title);
app.use('/likes', like);
app.use('/updates', update);


app.use(function(req, res) {
    res.status(404).send({url: req.originalUrl + ' not found'})
});


app.listen(port, () => {
    console.log(`http://localhost:${port}`)
})
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
const MongoClient = require('mongodb').MongoClient;
const fs = require('fs');
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
// todo : update movie/serial files
// todo : push new files
// todo : insert this titles to mongodb from heroku with api
// todo : rebuild 'save_changes.js' file to work with database not files
// todo : rebuild 'data.js' file to work with database not files
// todo : rebuild api end points
//------------------------------------------------
//------------------------------------------------
app.get('/test/db/insert/:type',async (req,res)=> {
    let type = req.params.type;
    const uri = "mongodb://ashkanaz2828:AshkAnAz2828@cluster0-shard-00-00.hbba0.mongodb.net:27017,cluster0-shard-00-01.hbba0.mongodb.net:27017,cluster0-shard-00-02.hbba0.mongodb.net:27017/download?ssl=true&replicaSet=atlas-10ry9r-shard-0&authSource=admin&retryWrites=true&w=majority";
    let connection = await MongoClient.connect(uri, {useUnifiedTopology: true, useNewUrlParser: true});

    let dir = (type === 'serial') ? './crawlers/serial_files/' : './crawlers/movie_files/';
    let collection_name = (type === 'serial') ? 'serials' : 'movies';
    let files = fs.readdirSync(dir);
    files = files.filter(value => value !== 'serial_likes.json' && value !== 'movie_likes.json' &&
        value !== 'serial_updates.json' && value !== 'movie_updates.json')
    files = files.sort((a, b) => a.match(/(\d+)/)[0] - b.match(/(\d+)/)[0])

    for (let k = files.length - 1; k >= 0; k--) {

        let address = dir + files[k];
        let json_file = fs.readFileSync(address, 'utf8')
        let saved_array = JSON.parse(json_file);

        let startTime = new Date();
        await connection.db().collection(collection_name).insertMany(saved_array).then(response => {
            let endTime = new Date();
            console.log(`---------time ${address} : `, (endTime.getTime() - startTime.getTime()))
        })

    }

    return res.json(`inserting ${type} done!`);
});
//------------------------------------------------
//------------------------------------------------



app.use('/titles', title);
app.use('/likes', like);
app.use('/updates', update);


app.use(function(req, res) {
    res.status(404).send({url: req.originalUrl + ' not found'})
});


app.listen(port, () => {
    console.log(`http://localhost:${port}`)
})
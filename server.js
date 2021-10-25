require('dotenv').config({path: './.env'});
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
// const jwt = require('express-jwt');
// const jwksRsa = require('jwks-rsa');
const cron = require('node-cron');
const {crawler} = require('./crawlers/crawler');
const port = process.env.PORT || 3000;
const {setCache_all} = require("./cache");
//---------------Routes-----------------
import crawling from './routes/crawling';
import search from './routes/search';
import news from './routes/news';
import update from './routes/update';
import tops from './routes/tops';
import trailers from './routes/trailers';
import timeLine from './routes/timeLine';
//--------------middleware--------------
Sentry.init({
    dsn: process.env.SENTRY_DNS,
    integrations: [
        new Sentry.Integrations.Http({tracing: true}),
        new Tracing.Integrations.Express({app}),
    ],
    tracesSampleRate: 1.0,
});
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
app.use(helmet());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors());
app.use(compression());
//--------------------------------------
//--------------------------------------

app.use('/crawler', crawling);
app.use('/search', search);
app.use('/news', news);
app.use('/updates', update);
app.use('/tops', tops);
app.use('/trailers', trailers);
app.use('/timeLine', timeLine);


setCache_all();

cron.schedule('0 */3 * * *', async () => {
    await crawler('', 0);
}, {
    scheduled: true,
    timezone: "Asia/Tehran",
});


app.use(Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
        // Capture all 404 and 500+ errors
        return error.status === 404 || error.status >= 500;
    },
}));

app.use(function (req, res) {
    res.status(404).send({url: req.originalUrl + ' not found'})
});

app.use((err, req, res, next) => {
    res.statusCode = 500;
    res.send(`Internal Server Error (${res.sentry})`);
});

app.listen(port, () => {
    console.log(`http://localhost:${port}`)
});

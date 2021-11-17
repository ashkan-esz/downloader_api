import config from "./config";
import * as Sentry from "@sentry/node";
import Tracing from "@sentry/tracing";
import express from "express";
const app = express();
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
// import jwt from "express-jwt";
// import jwksRsa from "jwks-rsa";
import cron from "node-cron";
import {crawler} from "./crawlers/crawler";
//---------------Routes-----------------
import routes from './api/routes';
//--------------middleware--------------
Sentry.init({
    dsn: config.sentryDns,
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

app.use('/crawler', routes.crawlersRouters);
app.use('/movies', routes.moviesRouters);


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

app.listen(config.port, () => {
    console.log(`http://localhost:${config.port}`)
});

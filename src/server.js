import config from "./config/index.js";
import * as Sentry from "@sentry/node";
import Tracing from "@sentry/tracing";
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import {loadAgenda} from './loaders/index.js';
import {saveError} from "./error/saveError.js";
//--------------------------------------
const app = express();
//---------------Routes-----------------
import routes from './api/routes/index.js';
//--------------middleware--------------
Sentry.init({
    dsn: config.sentryDns,
    integrations: [
        new Sentry.Integrations.Http({tracing: true}),
        new Tracing.Integrations.Express({app}),
    ],
    tracesSampleRate: 0.2,
});
app.set('trust proxy', 1);
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
app.use(helmet());
app.use(bodyParser.urlencoded({extended: false, limit: '10mb'}));
app.use(bodyParser.json({limit: '10mb'}));
app.use(cookieParser());
app.use(cors());
app.use(compression());
app.use(rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 600 // limit each IP to 600 requests per windowMs
}));
//--------------------------------------
//--------------------------------------

await loadAgenda();

//--------------------------------------
//--------------------------------------

app.use('/crawler', routes.crawlersRouters);
app.use('/movies', routes.moviesRouters);
app.use('/users', routes.usersRouters);


app.use(Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
        if (config.nodeEnv !== 'production' || config.printErrors === 'true') {
            console.log(error);
        }
        return true;
    }
}));

app.use(function (req, res) {
    res.status(404).json({
        errorMessage: 'url: ' + req.originalUrl + ' not found',
        code: 404,
        sentryErrorId: res.sentry,
    });
});

app.use((err, req, res, next) => {
    let fileError = (err.message === 'File too large' || (err.message && err.message.includes('Not an jpg image')));
    res.status(500).json({
        errorMessage: fileError ? err.message : err.code || 'Internal Server Error',
        code: fileError ? 400 : 500,
        sentryErrorId: res.sentry,
    });
});

app.listen(config.port, () => {
    console.log(`http://localhost:${config.port}`)
});

process
    .on('unhandledRejection', async (reason, p) => {
        // Use your own logger here
        console.error(reason, 'Unhandled Rejection at Promise', p);
        reason.pp = p;
        await saveError(reason);
    })
    .on('uncaughtException', async err => {
        console.error(err, 'Uncaught Exception thrown');
        await saveError(err);
        // Optional: Ensure process will stop after this
        process.exit(1);
    });


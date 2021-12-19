import config from "./config";
import * as Sentry from "@sentry/node";
import Tracing from "@sentry/tracing";
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import {loadAgenda} from './loaders';
//--------------------------------------
const app = express();
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
app.set('trust proxy', 1);
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
app.use(helmet());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors());
app.use(compression());
app.use(rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 500 // limit each IP to 500 requests per windowMs
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
        // todo : check what this do , why not send error to sentry
        console.log(error);
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

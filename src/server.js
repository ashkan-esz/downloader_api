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
import {loadAgenda} from './loaders';
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
await loadAgenda();

//--------------------------------------
//--------------------------------------

app.use('/crawler', routes.crawlersRouters);
app.use('/movies', routes.moviesRouters);


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

import config from "./config/index.js";
import * as Sentry from "@sentry/node";
import Tracing from "@sentry/tracing";
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "./api/middlewares/cors.js";
import developmentFaze from "./api/middlewares/developmentFaze.js";
import {preStart} from "./preStart.js";
import {loadAgenda} from './loaders/index.js';
import {saveError} from "./error/saveError.js";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import fs from "fs";
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

app.set('trust proxy', true);
// app.set('trust proxy', 1);

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
app.use(helmet());
app.use(bodyParser.urlencoded({extended: false, limit: '10mb'}));
app.use(bodyParser.json({limit: '10mb'}));
app.use(cookieParser());
app.use(cors);
app.use(rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 600 // limit each IP to 600 requests per windowMs
}));
app.use(developmentFaze);
app.use("/docs",
    swaggerUi.serve,
    swaggerUi.setup(YAML.parse(fs.readFileSync('./docs/swagger.yaml', 'utf8')), {
        explorer: true,
        // customCssUrl: "https://cdn.jsdelivr.net/npm/swagger-ui-themes@3.0.0/themes/3.x/theme-newspaper.css",
    })
);

//--------------------------------------
//--------------------------------------

await preStart();
await loadAgenda();

//--------------------------------------
//--------------------------------------

app.use('/admin', routes.adminRouters);
app.use('/movies', routes.moviesRouters);
app.use('/users', routes.usersRouters);
app.use('/utils', routes.utilsRouters);
app.use('/bots', routes.botsRouters);


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
        isGuest: false,
        isCacheData: false,
    });
});

app.use((err, req, res, next) => {
    const fileError = (err.message === 'File too large' || (err.message && err.message.includes('Not an supported format')));
    const corsError = err.message && err.message.includes('Not allowed by CORS');
    if (!fileError && !corsError) {
        saveError(err);
    }
    res.status(500).json({
        errorMessage: (fileError || corsError) ? err.message : err.code || 'Internal Server Error',
        code: (fileError || corsError) ? 400 : 500,
        sentryErrorId: res.sentry,
        isGuest: false,
        isCacheData: false,
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

export default app;

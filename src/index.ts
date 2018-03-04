import * as express from "express";
import * as morgan from 'morgan';
import * as compression from 'compression';
import * as bodyParser from 'body-parser';
import * as mysqllib from "./lib/mysqllib/mysqllib";
import { initRoute } from "./lib/httplib/router";

import * as swig from 'swig';

const config = require("../config.json");

const app: express.Application = express();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

swig.setDefaults({
    cache: false
})
app.set('view cache', false);

app.set('views', './views/');
app.set('view engine', 'html');
app.engine('html', swig.renderFile);


app.use(morgan('combined'))
app.use(compression())


//const db = config.db;
//mysqllib.CreateDbConnection(mysqllib.DB_DEFAULT, db.host, db.port, db.user, db.password, db.database, db.connectionLimit);

initRoute(app, __dirname + "/route");

app.listen(config.http.port, "127.0.0.1", (host: string, port: number) => {
    console.log("server listen on port ", config.http.port);
});

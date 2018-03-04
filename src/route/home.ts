import * as express from "express";
import { Route } from "../lib/httplib/router";
import { IReq, IRes, INext } from "../lib/httplib/def";
import * as ctrl from "../controller/home_ctrl";

module.exports = new Route(1, "ReportRoute",
    (app: express.Application) => {
        app.get("/", (req: IReq, res: IRes, next: INext) => {
            ctrl.hello(req, res, next);
        })
    }
);

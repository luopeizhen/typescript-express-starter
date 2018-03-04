import * as express from "express";
import * as fs from "fs";
//import * as _ from "underscore";

export interface IRegister{
    (app:express.Application):void;
}

export class Route {
    public order: number;
    public register: any;
    public name: string;
    constructor(order: number, name: string, register: IRegister) {
        this.order = order;
        this.register = register;
        this.name = name;
    }
}

export function initRoute(app: express.Application, dir: string) {
    let routes: Route[] = [];
    fs.readdirSync(dir).forEach(function (routeConfig: string) {
        if (routeConfig.substr(-3) === '.js') {
            let route = require(dir + '/' + routeConfig) as Route;
            routes.push(route);
        }
    });
    //const routesExecutes:Array<Route> = _.sortBy(routes, "order");
    routes.forEach((route:Route) => {
        route.register(app)
    });
}
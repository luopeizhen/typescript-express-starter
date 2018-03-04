import { IReq, IRes, INext } from "../lib/httplib/def";

//import * as mysqllib from "../lib/mysqllib/mysqllib";

const config = require("../../config.json");

export const hello = async (req: IReq, res: IRes, next: INext) => {
    try {
        //db example
        //const qb = new mysqllib.QueryBuilder(TABLE_NAME);
        //const items = await mysqllib.p_findAll<any>(qb);

        const {name} = req.query;

        res.render('home_hello',{
            title:'Home Page',
            name,
        })

    } catch (err) {
        console.error(err.stack);
        res.status(500).json({ errmsg: err })
    }

}
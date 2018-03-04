
//transaction写错了, 还没时间改

//
//2017-12-05 fix: compile error
//2017-11-21 fix: makeWhere array string\
//2017-07-13 fix: toUpdateStr not replace \
//2017-07-7 add: addObj, setObj
//2017-06-27 fix: DbConnection.query get wrong this(not use ()=>)
//2017-06-27 add: raw value to set
//2017-04-06 change: makeXXx no sort now
//2017-03-15 add: where support array value
//2017-03-01 fix: forget escape \ in string

//
//2016-12-24 fix: p_update use insert sql
//2016-12-01 fix: p_insert, p_update, p_delete no parameter

import * as mysql from "mysql";
//import { QueryBuilder } from "./query_builder";

//let mysql = require('mysql');
//let printf = require('printf');

export const DB_DEFAULT = 'default';

const DbConnMap = new Map<string, DbConnection>();

class DbConnection {
    name: string;
    pool: mysql.IPool;
    transactionConn: mysql.IConnection;

    constructor(name: string, host: string, port: number, user: string, passwd: string, database: string, connectionLimit: number) {
        this.name = name;
        this.pool = mysql.createPool({
            host: host,
            port: port,
            user: user,
            password: passwd,
            database: database,
            connectionLimit: connectionLimit,
        });

    }

    getValidConn() : mysql.IConnection|mysql.IPool{
        if (this.transactionConn && this.transactionConn != null) {
            return this.transactionConn;
        }
        return this.pool;
    }

    async query<T>(queryStr: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.getValidConn().query(queryStr, (err: Error, res: T) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }

    async findAll<T>(qb: QueryBuilder): Promise<Array<T>> {
        return new Promise<Array<T>>((resolve, reject) => {
            let str = qb.toQueryStr();
            this.getValidConn().query(str, function (err: Error, res: any) {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }

    async findOne<T>(qb: QueryBuilder): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.findAll(qb).then((queryRes: Array<T>) => {
                if (queryRes.length > 0) {
                    resolve(queryRes[0]);
                } else {
                    resolve();
                }
            });
        });
    }

    async insert(qb: QueryBuilder): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const str = qb.toInsertStr();
            this.getValidConn().query(str, (err: Error, res: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res.insertId);
                }
            });
        });
    }

    async update(qb: QueryBuilder): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const str = qb.toUpdateStr();
            this.getValidConn().query(str, (err: Error, res: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res.affectedRows);
                }
            });
        });
    }

    async delete(qb: QueryBuilder): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const str = qb.toDeleteStr();
            this.getValidConn().query(str, (err: Error, res: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res.affectedRows);
                }
            });
        });
    }

    async beginTransaction(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.pool.getConnection((err, conn) => {
                if (err) {
                    reject(err);
                    return;
                }

                conn.beginTransaction((err: Error) => {
                    if (err) {
                        reject(err);
                    } else {
                        this.transactionConn = conn;
                        resolve();
                    }
                });
            });
        });
    }
    
    async commit(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.transactionConn.commit(() => {
                //this.transactionConn = null;
                resolve();
            });
        });
    }
    
    async rollback(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.transactionConn.rollback(() => {
                //this.transactionConn = null;
                resolve();
            });
        });
    }
}

export function getDb(name: string) : DbConnection {
    const rs = DbConnMap.get(name)
    if (!rs) {
        throw new Error(`DBConnection not found, name:${name}`)
    }
    return rs
}

export function getDefDb() : DbConnection{
    return getDb(DB_DEFAULT);
}

//let g_pool: mysql.IPool = null;

export function CreateDbConnection(name: string, host: string, port: number, user: string, passwd: string, database: string, connectionLimit: number) {
    const dbConn = new DbConnection(name, host, port, user, passwd, database, connectionLimit);
    DbConnMap.set(name, dbConn);
}

export function initDb(host: string, port: number, user: string, passwd: string, database: string, connectionLimit: number) {
    CreateDbConnection(DB_DEFAULT, host, port, user, passwd, database, connectionLimit);
}

export function p_query<T>(queryStr: string): Promise<T> {
    return getDefDb().query(queryStr);
}

export async function p_findAll<T>(qb: QueryBuilder): Promise<Array<T>> {
    return getDefDb().findAll<T>(qb);
}

export async function p_findOne<T>(qb: QueryBuilder): Promise<T> {
    return getDefDb().findOne<T>(qb);
}

export async function p_insert(qb: QueryBuilder): Promise<number> {
    return getDefDb().insert(qb);
}

export async function p_update(qb: QueryBuilder): Promise<number> {
    return getDefDb().update(qb);
}

export async function p_delete(qb: QueryBuilder): Promise<number> {
    return getDefDb().delete(qb);
}



interface IQueryLimit {
    offset: number;
    count: number;
}
interface ColValuePair {
    col: string;
    value: any;
    isRaw?: boolean;
}
interface OrderPair {
    col: string;
    direction: string;
}

interface IQueryWhere {
    col: string;
    op: string;
    value: any;
}

export class QueryBuilder {
    table: string;
    isDistinct: boolean;
    queryFields: string = "";
    queryAdds: Array<ColValuePair> = new Array<ColValuePair>();
    querySets: Array<ColValuePair> = new Array<ColValuePair>();
    queryOrders: Array<OrderPair> = new Array<OrderPair>();;
    queryGroup: string = "";
    queryLimit: IQueryLimit = { offset: 0, count: 0 };
    queryWheres: Array<IQueryWhere> = new Array<IQueryWhere>();;

    constructor(table: string) {
        this.table = table;
    }

    add(col: string, value: any) {
        if (value == undefined) {
            console.log("warning: QueryBuilder add undefined at ", col)
            return this;
        }
        this.queryAdds.push({
            col: col,
            value: value,
        });
        return this;
    }

    addObj(obj: any) {
        for (let key in obj) {
            this.add(key, obj[key]);
        }
        return this;
    }

    set(col: string, value: any) {
        if (value == undefined) {
            console.log("warning: QueryBuilder set undefined at ", col)
            return this;
        }
        this.querySets.push({
            col: col,
            value: value,
        });
        return this;
    }

    setObj(obj: any, excepts: Array<string>) {
        for (let key in obj) {
            if (excepts.indexOf(key) < 0) {
                this.set(key, obj[key]);
            }
        }
        return this;
    }

    rawSet(col: string, value: any) {
        if (value == undefined) {
            console.log("warning: QueryBuilder set undefined at ", col)
            return this;
        }
        this.querySets.push({
            col: col,
            value: value,
            isRaw: true,
        });
        return this;
    }

    fields(cols: string) {
        this.queryFields = cols;
        return this;
    }

    group(cols: string) {
        this.queryGroup = cols;
        return this;
    }


    order(col: string, direction: string) {
        this.queryOrders.push({
            col: col,
            direction: direction,
        });
        return this;
    }

    limit(offset: number, count: number) {
        this.queryLimit.offset = offset;
        this.queryLimit.count = count;
        return this;
    }

    nextPage() {
        this.queryLimit.offset += this.queryLimit.count;
        return this;
    }

    where(col: string, op: string, value: any) {
        if (value == undefined) {
            console.log("warning: QueryBuilder where undefined at ", col)
            return this;
        }
        this.queryWheres.push({
            col: col,
            op: op,
            value: value,
        });
        return this;
    }

    makeWhereStr(): string {
        const whereArr = new Array<string>();
        for (let i = 0; i < this.queryWheres.length; i++) {
            let qw = this.queryWheres[i];
            let str = "";
            if (qw.value === "null") {
                str = ["`", qw.col, "`", qw.op, qw.value].join("");
            }
            else if (typeof (qw.value) === "string") {
                let value = qw.value.replace(/'/g, "''");
                value = value.replace(/\\/g, "\\\\");
                str = ["`", qw.col, "`", qw.op, "'", value, "'"].join("");
            } else if (Array.isArray(qw.value)) {
                if (qw.value.length == 0) {
                    str = ["`", qw.col, "`", qw.op, '()'].join("");
                } else {
                    if (typeof (qw.value[0]) === "string") {
                        const tmpVals = new Array<string>()
                        for (const v of qw.value) {
                            let tmpVal = v.replace(/'/g, "''");
                            tmpVal = tmpVal.replace(/\\/g, "\\\\");
                            tmpVal = ["'", tmpVal, "'"].join('');
                            tmpVals.push(tmpVal)
                        }
                        str = ["`", qw.col, "`", qw.op, "(", tmpVals.join(','), ")"].join("");
                    } else if (typeof (qw.value[0]) === "number") {
                        const tmpVals = new Array<number>()
                        for (const v of qw.value) {
                            tmpVals.push(v)
                        }
                        str = ["`", qw.col, "`", qw.op, "(", tmpVals.join(','), ")"].join("");
                    }
                }

            } else {
                str = ["`", qw.col, "`", qw.op, qw.value].join("");
            }
            whereArr.push(str);
        }
        let whereStr = "";
        if (whereArr.length > 0) {
            //whereArr.sort();
            whereStr = " WHERE " + whereArr.join(" AND ");
        }
        return whereStr;
    }

    toInsertStr(): string {
        const addColArr = new Array<string>();
        const addValArr = new Array<string>();

        for (let i = 0; i < this.queryAdds.length; i++) {
            let qa = this.queryAdds[i];
            addColArr.push('`' + qa.col + '`');
            if (typeof (qa.value) == "string") {
                let value = qa.value.replace(/'/g, "''");
                value = value.replace(/\\/g, "\\\\");
                addValArr.push(["'", value, "'"].join(""));
            } else {
                addValArr.push(qa.value);
            }
        }
        return ["INSERT INTO ", "`", this.table, "` (", addColArr.join(","), ") VALUES(", addValArr.join(","), ")"].join("");
    }

    toUpdateStr() {
        let setArr = new Array<string>();
        for (let i = 0; i < this.querySets.length; i++) {
            let qs = this.querySets[i];
            if (qs.isRaw) {
                const str = ["`", qs.col, "`=", qs.value].join("");
                setArr.push(str);
            } else {
                if (typeof (qs.value) == "string") {
                    let value = qs.value.replace(/'/g, "''");
                    value = value.replace(/\\/g, "\\\\");
                    const str = ["`", qs.col, "`='", value, "'"].join("");
                    setArr.push(str);
                } else {
                    const str = ["`", qs.col, "`=", qs.value].join("");
                    setArr.push(str);
                }
            }
        }
        let setStr = "";
        if (setArr.length > 0) {
            setStr = " SET " + setArr.join(",");
        }

        let whereStr = this.makeWhereStr();
        return ["UPDATE `", this.table, "`", setStr, whereStr].join("");
    }

    toDeleteStr(): string {
        let whereStr = this.makeWhereStr();
        return ["DELETE FROM `", this.table, , "`", whereStr].join("");
    }

    makeOrderStr(): string {
        let orderArr = new Array<string>();
        for (let i = 0; i < this.queryOrders.length; i++) {
            let qo = this.queryOrders[i];
            orderArr.push(["`", qo.col, "` ", qo.direction].join(""));
        }
        let orderStr = "";
        if (orderArr.length > 0) {
            //orderArr.sort();
            orderStr = " ORDER BY " + orderArr.join(",");
        }
        return orderStr;
    }

    makeLimitStr(): string {
        let limitStr = "";
        if (this.queryLimit.count > 0) {
            limitStr = [" LIMIT ", this.queryLimit.offset, ",", this.queryLimit.count].join("");
        }
        return limitStr;
    }

    makeGroupStr(): string {
        let groupStr = "";
        if (this.queryGroup != "") {
            groupStr = " GROUP BY `" + this.queryGroup.replace(/,/g, "`,`") + "`";
        }
        return groupStr;
    }

    toQueryStr(): string {
        const whereStr = this.makeWhereStr();

        const limitStr = this.makeLimitStr();

        const orderStr = this.makeOrderStr();

        let fieldStr = "*";
        if (this.queryFields != "" && this.queryFields != fieldStr) {
            const fieldArr = this.queryFields.split(",");
            for (let i = 0; i < fieldArr.length; i++) {
                let col = fieldArr[i];
                if (col.indexOf('(') > 0 && col.indexOf(')') > 0) {
                    continue;
                } else {
                    fieldArr[i] = "`" + col + "`";
                }
            }
            fieldStr = fieldArr.join(',');
            if (this.isDistinct) {
                fieldStr = "DISTINCT " + fieldStr;
            }
        }

        const groupStr = this.makeGroupStr();
        return ["SELECT ", fieldStr, " FROM `", this.table, "`", whereStr, groupStr, orderStr, limitStr].join("").trim();
    }

}

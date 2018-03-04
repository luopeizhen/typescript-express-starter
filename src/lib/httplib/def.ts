import * as express from "express";

export interface IReq extends express.Request{}
export interface IRes extends express.Response{}
export interface INext extends express.NextFunction{}
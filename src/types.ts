import { Request, Response, NextFunction } from 'express';

export type req = Request;
export type res = Response;
export type next = NextFunction;

export interface UserInterface {
	username: string,
	password: string,
	email: string,
	nickname: string,
}

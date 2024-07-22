import asyncHandler from 'express-async-handler';
import passport from 'passport';
import { req, res, next } from '../types';

export const login = (req: req, res: res, next: next): res | next | void => {
	passport.authenticate('local', function (err: unknown, user: any): res | next | void {
		if (err) { return next(err); }
		if (!user) {
			return res.sendStatus(404);
		}

		req.login(user, (err) => {
			if (err) {
				return next(err);
			}

			return res.sendStatus(200);
		});
	})(req, res, next);
};

export const logout = (req: req, res: res, next: next) => {
	req.logout(function (err) {
		if (err) return next(err);
		return res.sendStatus(200);
	});
};

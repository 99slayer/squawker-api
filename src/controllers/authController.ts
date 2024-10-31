import passport from 'passport';
import { req, res, next, UserInterface } from '../types';
import asyncHandler from 'express-async-handler';
import { RequestHandler } from 'express';
import User from '../models/user';

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

			const data: object = {
				username: user.username,
				nickname: user.nickname,
				pfp: user.pfp
			};

			return res.send(data).status(200);
		});
	})(req, res, next);
};

export const logout = (req: req, res: res, next: next) => {
	req.logout(function (err) {
		if (err) return next(err);
		return res.sendStatus(200);
	});
};

export const verify: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next): Promise<void> => {
		const user: UserInterface = await User
			.findOne({ username: req.params.username })
			.orFail(new Error('404'));

		const isUser = Boolean(String(res.locals.user._id) === String(user._id));

		res.send(isUser).status(200);
	});

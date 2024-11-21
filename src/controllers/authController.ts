import passport from 'passport';
import { req, res, next, UserInterface } from '../types';
import asyncHandler from 'express-async-handler';
import { RequestHandler } from 'express';
import User from '../models/user';

export const login = (req: req, res: res, next: next): res | next | void => {
	passport.authenticate('local', function (err: Error, user: any): res | next | void {
		if (err) {
			if (err.message === 'Query failed.') {
				res.locals.validationErrors = { usernameErrors: ['User does not exist.'] };
			} else if (err.message === 'Invalid user input.') {
				res.locals.validationErrors = { passwordErrors: ['Incorrect password.'] };
			}
			return next(err);
		}
		if (!user) throw new Error('Unacceptable request.');

		req.login(user, (err) => {
			if (err) {
				return next(err);
			}

			const data: object = {
				username: user.username,
				nickname: user.nickname,
				pfp: user.pfp
			};

			return res.status(200).send(data);
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
			.orFail(new Error('Query failed.'));

		const isUser = Boolean(String(res.locals.user._id) === String(user._id));

		res.status(200).send(isUser);
	});

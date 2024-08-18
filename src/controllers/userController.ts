import asyncHandler from 'express-async-handler';
import { body, validationResult, ValidationChain } from 'express-validator';
import bcrypt from 'bcryptjs';
import {
	req,
	res,
	next,
	doc,
	UserInterface
} from '../types';
import User from '../models/user';
import Post from '../models/post';
import Comment from '../models/comment';
import { Document, HydratedDocument, PopulatedDoc } from 'mongoose';
import { RequestHandler } from 'express';

const innerWhitespace = (string: string) => {
	if (/\s/.test(string)) {
		throw new Error('There must not be any inner whitespace.');
	}

	return true;
};

export const getUser: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next): Promise<void> => {
		const user: PopulatedDoc<UserInterface> | null = await User
			.findOne({ username: req.params.username })
			.populate('post_count comment_count like_count')
			.orFail(new Error('404'));

		res.send({ user }).status(200);
	});

export const createUser: (RequestHandler | ValidationChain)[] = [
	body('username')
		.trim()
		.custom(innerWhitespace)
		.withMessage('Username should not have any spaces.')
		.notEmpty()
		.isLength({ max: 50 })
		.withMessage('Username should not be longer than 50 characters.')
		.custom(async (value, { req }) => {
			// Checks for duplicate usernames.
			const users: Document<UserInterface>[] = await User
				.find({ username: req.body.username });

			if (users.length > 0) throw new Error('Username already exists.');

			return true;
		}),
	body('password')
		.trim()
		.matches(/\d+/)
		.withMessage('Password must contain at least one number.')
		.matches(/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]+/)
		.withMessage('Password must contain at least one special character.')
		.custom(innerWhitespace)
		.withMessage('Password cannot have any spaces.')
		.isLength({ min: 8, max: 100 })
		.withMessage('Password should be between 8-100 characters.'),
	body('password-confirm')
		.trim()
		.custom((value, { req }) => {
			// Checks if passwords match.
			if (value !== req.body.password) throw new Error('Passwords must match.');

			return true;
		}),
	body('email')
		.trim()
		.isEmail()
		.withMessage('Invalid email.')
		.isLength({ min: 10, max: 150 })
		.withMessage('Email length is invalid.')
		.custom(async (value, { req }) => {
			// Checks for duplicate emails.
			const users: Document<UserInterface>[] = await User
				.find({ email: req.body.email });

			if (users.length > 0) throw new Error('Email already exists.');

			return true;
		}),

	asyncHandler(
		async (req: req, res: res, next: next) => {
			const errors = validationResult(req);

			if (!errors.isEmpty()) throw new Error('400');

			bcrypt.hash(req.body.password, 10, async (err, hashedPswd) => {
				if (err) throw err;

				const user: HydratedDocument<UserInterface> = new User({
					username: req.body.username,
					password: hashedPswd,
					email: req.body.email,
					join_date: new Date,
				});

				await user.save();
				res.sendStatus(200);
			});
		}),
];

export const updateUser: (RequestHandler | ValidationChain)[] = [
	asyncHandler(
		async (req, res, next) => {
			if (res.locals.user.username !== req.params.username) throw new Error('401');
			next();
		}),

	body('username')
		.if((value, { req }) => {
			return req.body.username;
		})
		.trim()
		.custom(innerWhitespace)
		.withMessage('Username should not have any spaces.')
		.notEmpty()
		.isLength({ max: 50 })
		.withMessage('Username should not be longer than 50 characters.')
		.custom(async (value, { req }) => {
			// Checks for duplicate usernames.
			const users: Document<UserInterface>[] = await User
				.find({ username: req.body.username });

			if (users.length > 0) throw new Error('Username already exists.');

			return true;
		}),
	body('password')
		.if((value, { req }) => {
			return req.body.password;
		})
		.trim()
		.matches(/\d+/)
		.withMessage('Password must contain at least one number.')
		.matches(/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]+/)
		.withMessage('Password must contain at least one special character.')
		.custom(innerWhitespace)
		.withMessage('Password cannot have any spaces.')
		.isLength({ min: 8, max: 100 })
		.withMessage('Password should be between 8-100 characters.'),
	body('password-confirm')
		.custom((value, { req }) => {
			if (req.body.password && !req.body['password-confirm']) {
				throw new Error('Password confirmation field is missing.');
			} else {
				return true;
			}
		})
		.if((value, { req }) => {
			return req.body['password-confirm'];
		})
		.trim()
		.custom((value, { req }) => {
			// Checks if password and password-confirm match.
			if (value !== req.body.password) throw new Error('Passwords must match.');

			return true;
		}),
	body('email')
		.if((value, { req }) => {
			return req.body.email;
		})
		.trim()
		.isEmail()
		.withMessage('Invalid email.')
		.isLength({ min: 10, max: 150 })
		.withMessage('Email length is invalid.')
		.custom(async (value, { req }) => {
			// Checks for duplicate emails.
			const users: Document<UserInterface>[] = await User
				.find({ email: req.body.email });

			if (users.length > 0) throw new Error('Email already exists.');

			return true;
		}),
	body('nickname')
		.if((value, { req }) => {
			return req.body.nickname;
		})
		.trim()
		.isLength({ min: 1, max: 50 })
		.withMessage('Nickname must be between 1-50 characters long.'),
	body('profile_text')
		.if((value, { req }) => {
			return req.body.profile_text;
		})
		.trim()
		.isLength({ max: 1000 })
		.withMessage('Profile text exceeds character limit.'),
	body('profile_header')
		.if((value, { req }) => {
			return req.body.profile_header;
		})
		.trim()
		.isLength({ max: 100 })
		.withMessage('Profile header url exceeds character limit.'),

	asyncHandler(
		async (req: req, res: res, next: next): Promise<void> => {
			const errors = validationResult(req);

			if (!errors.isEmpty()) throw new Error('400');

			let updatedUser: doc<UserInterface>;
			let updatedUserPosts;
			let updatedUserComments;

			if (!req.body.password) {
				updatedUser = await User.findOneAndUpdate(
					{ _id: res.locals.user._id },
					{ [`${req.params.update}`]: req.body[req.params.update] },
					{ new: true },
				);
			} else {
				bcrypt.hash(req.body.password, 10, async (err, hashedPswd) => {
					if (err) throw err;

					updatedUser = await User.findOneAndUpdate(
						{ _id: res.locals.user._id },
						{ password: hashedPswd },
						{ new: true },
					);

					res.sendStatus(200);
					return;
				});

				return;
			}

			if (
				req.params.update === 'username' ||
				req.params.update === 'nickname' ||
				req.params.update === 'pfp'
			) {
				updatedUserPosts = await Post.updateMany(
					{ 'user.id': res.locals.user._id },
					{ [`user.${req.params.update}`]: req.body[req.params.update] }
				);
				updatedUserComments = await Comment.updateMany(
					{ 'user.id': res.locals.user._id },
					{ [`user.${req.params.update}`]: req.body[req.params.update] }
				);
			}

			Promise.all([
				updatedUser,
				updatedUserPosts,
				updatedUserComments
			]);

			res.sendStatus(200);
		}),
];

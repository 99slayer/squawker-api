import asyncHandler from 'express-async-handler';
import {
	body,
	validationResult,
	ValidationChain,
	Result,
	ValidationError,
	oneOf
} from 'express-validator';
import bcrypt from 'bcryptjs';
import {
	req,
	res,
	next,
	doc,
	UserInterface,
	followData,
	LocalUser,
	GuestInterface,
	PostInterface,
	CommentInterface
} from '../types';
import User from '../models/user';
import Guest from '../models/guest';
import Post from '../models/post';
import Comment from '../models/comment';
import { HydratedDocument, Types } from 'mongoose';
import { RequestHandler } from 'express';
import passport from 'passport';
import { getValidationErrors } from '../util';

const innerWhitespace = (string: string) => {
	if (/\s/.test(string)) {
		throw new Error('There must not be any inner whitespace.');
	}

	return true;
};

export const getUser: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next): Promise<void> => {
		const userDoc: doc<UserInterface> = await User
			.findOne({ username: req.params.username })
			.select('-password -email')
			.populate('post_count comment_count like_count')
			.orFail(new Error('Query failed.'));

		let user = userDoc;
		if (user.followers.includes(res.locals.user._id)) {
			user = userDoc.toObject();
			user.isFollowing = true;
		}

		res.status(200).send(user);
	}
);

export const getUsers: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next): Promise<void> => {
		const userCount: number = Number(req.query.userCount);
		const batchSize: number = 20;

		if ((!userCount && userCount !== 0) || Number.isNaN(userCount)) throw new Error('Invalid request query.');

		const users: doc<UserInterface>[] = await User
			.find({
				username: { $ne: res.locals.user.username },
				user_type: { $ne: 'Guest' }
			})
			.skip(userCount)
			.limit(batchSize)
			.select('-password -email')
			.sort({ username: 1 });

		const userList: doc<UserInterface>[] = [];
		for (let i = 0; i < users.length; i++) {
			let user: doc<UserInterface> = users[i];

			if (user?.username === res.locals.user.username) continue;
			if (user?.followers.includes(res.locals.user._id)) {
				user = users[i]!.toObject();
				user.isFollowing = true;
			}

			userList.push(user);
		}
		res.status(200).send(userList);
	}
);

export const getFollowers: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next): Promise<void> => {
		const userCount: number = Number(req.query.userCount);
		const batchSize: number = 20;

		if ((!userCount && userCount !== 0) || Number.isNaN(userCount)) throw new Error('Invalid request query.');

		const followers: UserInterface[] = await User
			.findOne({ username: req.params.username })
			.populate<{ followers: UserInterface[] }>({
				path: 'followers',
				options: {
					limit: batchSize,
					skip: userCount
				}
			})
			.transform(doc => { return doc?.followers; })
			.orFail(new Error('Query failed.'));

		const followerData: followData[] = followers.map(doc => {
			const data: followData = {
				_id: doc._id,
				username: doc.username,
				nickname: doc.nickname,
				pfp: doc.pfp,
				profileText: doc.profile_text,
				isFollowing: doc.followers.includes(res.locals.user._id)
			};
			return data;
		});

		res.status(200).send(followerData);
	}
);

export const getFollowing: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next): Promise<void> => {
		const userCount: number = Number(req.query.userCount);
		const batchSize: number = 20;

		if ((!userCount && userCount !== 0) || Number.isNaN(userCount)) throw new Error('Invalid request query.');

		const following: UserInterface[] = await User
			.findOne({ username: req.params.username })
			.populate<{ following: UserInterface[] }>({
				path: 'following',
				options: {
					limit: batchSize,
					skip: userCount
				}
			})
			.transform(doc => { return doc?.following; })
			.orFail(new Error('Query failed.'));

		const followingData: followData[] = following.map(doc => {
			const data: followData = {
				_id: doc._id,
				username: doc.username,
				nickname: doc.nickname,
				pfp: doc.pfp,
				profileText: doc.profile_text,
				isFollowing: doc.followers.includes(res.locals.user._id)
			};
			return data;
		});

		res.status(200).send(followingData);
	}
);

export const follow: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next): Promise<void> => {
		if (req.params.username === res.locals.user.username) throw new Error('Unacceptable request.');

		const user: doc<UserInterface> = await User
			.findOne({ username: req.params.username })
			.orFail(new Error('Query failed.'));

		if (user.user_type === 'Guest') throw new Error('Unacceptable request.');
		if (user?.followers.includes(res.locals.user._id)) {
			res.sendStatus(200);
			return;
		}

		await User.findOneAndUpdate(
			{ _id: res.locals.user._id },
			{ $push: { following: user?._id } },
			{ new: true },
		);

		await user?.updateOne({ $push: { followers: res.locals.user._id } });
		res.sendStatus(200);
	}
);

export const unfollow: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next): Promise<void> => {
		const user: doc<UserInterface> = await User
			.findOne({ username: req.params.username })
			.orFail(new Error('Query failed.'));

		if (user.user_type === 'Guest') throw new Error('Unacceptable request.');
		if (!user?.followers.includes(res.locals.user._id)) {
			res.sendStatus(200);
			return;
		}

		await User.findOneAndUpdate(
			{ _id: res.locals.user._id },
			{ $pull: { following: user._id } },
			{ new: true },
		);
		await user.updateOne({ $pull: { followers: res.locals.user._id } });

		res.sendStatus(200);
	}
);

export const createUser: (RequestHandler | ValidationChain)[] = [
	body('username')
		.isString()
		.trim()
		.custom(innerWhitespace)
		.withMessage('Username should not have any spaces.')
		.notEmpty()
		.isLength({ max: 50 })
		.withMessage('Username should not be longer than 50 characters.')
		.custom(async (value, { req }) => {
			// Checks for duplicate usernames.
			const users: UserInterface[] = await User
				.find({ username: req.body.username });

			if (users.length > 0) throw new Error('Username already exists.');

			return true;
		}),
	body('password')
		.isString()
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
		.isString()
		.trim()
		.custom((value, { req }) => {
			// Checks if passwords match.
			if (value !== req.body.password) throw new Error('Passwords must match.');

			return true;
		}),
	body('email')
		.isString()
		.trim()
		.isEmail()
		.withMessage('Invalid email.')
		.isLength({ min: 10, max: 150 })
		.withMessage('Email length is invalid.')
		.custom(async (value, { req }) => {
			// Checks for duplicate emails.
			const users: UserInterface[] = await User
				.find({ email: req.body.email });

			if (users.length > 0) throw new Error('Email already exists.');

			return true;
		}),

	asyncHandler(
		async (req: req, res: res, next: next) => {
			const errors: Result<ValidationError> = validationResult(req);

			if (!errors.isEmpty()) {
				const errArr: Record<string, string[]> = getValidationErrors(errors);
				res.locals.validationErrors = errArr;
				throw new Error('Invalid user input.');
			}

			bcrypt.hash(req.body.password, 10, async (err, hashedPswd) => {
				if (err) throw err;

				const user: HydratedDocument<UserInterface> = new User({
					username: req.body.username,
					password: hashedPswd,
					email: req.body.email,
					join_date: new Date,
				});

				await user.save();

				// authenticates and serializes user
				passport.authenticate(
					'local',
					function (err: unknown, user: LocalUser): res | next | void {
						if (err) { return next(err); }
						if (!user) {
							return res.sendStatus(404);
						}

						req.login(user, (err) => {
							if (err) {
								return next(err);
							}

							const data: {
								username: string,
								nickname: string
							} = {
								username: user.username,
								nickname: user.nickname
							};

							return res.status(200).send(data);
						});
					})(req, res, next);
			});
		}),
];

export const createGuestUser: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next) => {
		req.body.password = 'password';
		bcrypt.hash(req.body.password, 10, async (err, hashedPswd) => {
			if (err) throw err;
			const guestCount = await Guest.countDocuments({});
			req.body.username = `guest-${guestCount + 1}`;

			const user: HydratedDocument<GuestInterface> = new Guest({
				username: req.body.username,
				nickname: 'guest',
				password: hashedPswd,
				email: `guest${guestCount + 1}@tempmail.com`,
				join_date: new Date,
			});

			const users = await User
				.aggregate([
					{ $sample: { size: 10 } },
					{ $match: { user_type: { $ne: 'Guest' } } },
				]);

			user.following = users;
			await user.save();

			// authenticates and serializes user
			passport.authenticate(
				'local',
				function (err: unknown, user: LocalUser): res | next | void {
					if (err) { return next(err); }
					if (!user) {
						return res.sendStatus(404);
					}

					req.login(user, (err) => {
						if (err) {
							return next(err);
						}

						const data: {
							username: string,
							nickname: string,
							pfp: string
						} = {
							username: user.username,
							nickname: user.nickname,
							pfp: user.pfp
						};

						return res.status(200).send(data);
					});
				})(req, res, next);
		});
	}
);

export const updateUserAccount: (RequestHandler | ValidationChain)[] = [
	asyncHandler(
		async (req, res, next) => {
			if (res.locals.user.username !== req.params.username) throw new Error('Unauthorized');
			next();
		}
	),
	body('username')
		.if((value, { req }) => {
			return req.body.username;
		})
		.isString()
		.trim()
		.custom(innerWhitespace)
		.withMessage('Username should not have any spaces.')
		.notEmpty()
		.isLength({ max: 50 })
		.withMessage('Username should not be longer than 50 characters.')
		.custom(async (value, { req }) => {
			// Checks for duplicate usernames.
			const users: UserInterface[] = await User
				.find({ username: req.body.username });

			if (users.length > 0) throw new Error('Username already exists.');

			return true;
		}),
	body('email')
		.if((value, { req }) => {
			return req.body.email;
		})
		.isString()
		.trim()
		.isEmail()
		.withMessage('Invalid email.')
		.isLength({ min: 10, max: 150 })
		.withMessage('Email length is invalid.')
		.custom(async (value, { req }) => {
			// Checks for duplicate emails.
			const users: UserInterface[] = await User
				.find({ email: req.body.email });

			if (users.length > 0) throw new Error('Email already exists.');

			return true;
		}),
	body('nickname')
		.if((value, { req }) => {
			return req.body.nickname;
		})
		.isString()
		.trim()
		.isLength({ min: 1, max: 50 })
		.withMessage('Nickname must be between 1-50 characters long.'),
	body('profile_text')
		.if((value, { req }) => {
			return req.body.profile_text;
		})
		.isString()
		.trim()
		.isLength({ max: 1000 })
		.withMessage('Profile text exceeds character limit.'),
	oneOf([
		body('header')
			.if((value, { req }) => {
				return req.body.header;
			})
			.isURL(),
		body('header')
			.if((value, { req }) => {
				return req.body.header;
			})
			.custom((value, { req }) => {
				if (value === 'clear') {
					return true;
				} else return false;
			}),
	]),
	oneOf([
		body('pfp')
			.if((value, { req }) => {
				return req.body.pfp;
			})
			.isURL(),
		body('pfp')
			.if((value, { req }) => {
				return req.body.pfp;
			})
			.custom((value, { req }) => {
				if (value === 'clear') {
					return true;
				} else return false;
			}),
	]),

	asyncHandler(
		async (req, res, next) => {
			const errors: Result<ValidationError> = validationResult(req);

			if (!errors.isEmpty()) {
				const errArr: Record<string, string[]> = getValidationErrors(errors);
				res.locals.validationErrors = errArr;
				throw new Error('Invalid user input.');
			}
			if (req.body.pfp === 'clear') req.body.pfp = null;
			if (req.body.header === 'clear') req.body.header = null;

			const originalUser: UserInterface = await User
				.findById(res.locals.user._id)
				.orFail(new Error('Query failed.'));

			const newUser: doc<UserInterface> = await User
				.findOneAndUpdate(
					{ _id: res.locals.user._id },
					{
						username: req.body.username ? req.body.username : originalUser.username,
						password: originalUser.password,
						email: req.body.email ? req.body.email : originalUser.email,
						nickname: req.body.nickname ? req.body.nickname : originalUser.nickname,
						join_date: originalUser.join_date,
						pfp: req.body.pfp || req.body.pfp === null ? req.body.pfp : originalUser.pfp,
						profile_header: req.body.header || req.body.header === null ? req.body.header : originalUser.profile_header,
						profile_text: req.body.profile_text ? req.body.profile_text : originalUser.profile_text,
						following: originalUser.following,
						followers: originalUser.followers
					},
					{ new: true },
				).orFail(new Error('Query failed.'));

			if (
				req.body.username ||
				req.body.nickname ||
				req.body.pfp !== undefined
			) {
				await Post.bulkWrite([
					// update posts
					{
						updateMany: {
							filter: { 'post_data.user.id': res.locals.user._id },
							update: {
								$set: {
									'post_data.user.username': req.body.username ?? originalUser.username,
									'post_data.user.nickname': req.body.nickname ?? originalUser.nickname,
									'post_data.user.pfp': req.body.pfp !== undefined ? req.body.pfp : originalUser.pfp
								}
							},
						}
					},
					{
						updateMany: {
							filter: { 'post.user.id': res.locals.user._id },
							update: {
								$set: {
									'post.user.username': req.body.username ?? originalUser.username,
									'post.user.nickname': req.body.nickname ?? originalUser.nickname,
									'post.user.pfp': req.body.pfp !== undefined ? req.body.pfp : originalUser.pfp
								}
							},
						}
					},
					// update quotePosts
					{
						updateMany: {
							filter: { 'quoted_post.post_data.user.id': res.locals.user._id },
							update: {
								$set: {
									'quoted_post.post_data.user.username': req.body.username ?? originalUser.username,
									'quoted_post.post_data.user.nickname': req.body.nickname ?? originalUser.nickname,
									'quoted_post.post_data.user.pfp': req.body.pfp !== undefined ? req.body.pfp : originalUser.pfp
								}
							},
						}
					},
					{
						updateMany: {
							filter: { 'quoted_post.post.user.id': res.locals.user._id },
							update: {
								$set: {
									'quoted_post.post.user.username': req.body.username ?? originalUser.username,
									'quoted_post.post.user.nickname': req.body.nickname ?? originalUser.nickname,
									'quoted_post.post.user.pfp': req.body.pfp !== undefined ? req.body.pfp : originalUser.pfp
								}
							},
						}
					}
				]).catch((err) => {
					throw err;
				});

				await Comment.bulkWrite([
					// update comments
					{
						updateMany: {
							filter: { 'post_data.user.id': res.locals.user._id },
							update: {
								$set: {
									'post_data.user.username': req.body.username ?? originalUser.username,
									'post_data.user.nickname': req.body.nickname ?? originalUser.nickname,
									'post_data.user.pfp': req.body.pfp !== undefined ? req.body.pfp : originalUser.pfp
								}
							},
						}
					},
					{
						updateMany: {
							filter: { 'post.user.id': res.locals.user._id },
							update: {
								$set: {
									'post.user.username': req.body.username ?? originalUser.username,
									'post.user.nickname': req.body.nickname ?? originalUser.nickname,
									'post.user.pfp': req.body.pfp !== undefined ? req.body.pfp : originalUser.pfp,
								}
							},
						}
					},
					{
						updateMany: {
							filter: { 'root_post.post.user.id': res.locals.user._id },
							update: {
								$set: {
									'root_post.post.user.username': req.body.username ?? originalUser.username,
									'root_post.post.user.nickname': req.body.nickname ?? originalUser.nickname,
									'root_post.post.user.pfp': req.body.pfp !== undefined ? req.body.pfp : originalUser.pfp,
								},
							},
						}
					},
					{
						updateMany: {
							filter: { 'root_post.post_data.user.id': res.locals.user._id },
							update: {
								$set: {
									'root_post.post_data.user.username': req.body.username ?? originalUser.username,
									'root_post.post_data.user.nickname': req.body.nickname ?? originalUser.nickname,
									'root_post.post_data.user.pfp': req.body.pfp !== undefined ? req.body.pfp : originalUser.pfp,
								},
							},
						}
					},
					{
						updateMany: {
							filter: { 'parent_post.post.user.id': res.locals.user._id },
							update: {
								$set: {
									'parent_post.post.user.username': req.body.username ?? originalUser.username,
									'parent_post.post.user.nickname': req.body.nickname ?? originalUser.nickname,
									'parent_post.post.user.pfp': req.body.pfp !== undefined ? req.body.pfp : originalUser.pfp,
								}
							},
						}
					},
					{
						updateMany: {
							filter: { 'parent_post.post_data.user.id': res.locals.user._id },
							update: {
								$set: {
									'parent_post.post_data.user.username': req.body.username ?? originalUser.username,
									'parent_post.post_data.user.nickname': req.body.nickname ?? originalUser.nickname,
									'parent_post.post_data.user.pfp': req.body.pfp !== undefined ? req.body.pfp : originalUser.pfp,
								}
							},
						}
					}
				]).catch((err) => {
					throw err;
				});

				// update comment root/parent quote posts
				const rqp: doc<CommentInterface>[] = await Comment
					.find({ 'root_post.quoted_post': { $ne: null } });
				const pqp: doc<CommentInterface>[] = await Comment
					.find({ 'parent_post.quoted_post': { $ne: null } });

				const userRQP: doc<CommentInterface>[] = rqp.filter((doc) => {
					const id: Types.ObjectId = doc?.get('root_post.quoted_post.post.user.id');
					return id.toString() === res.locals.user._id.toString();
				});
				const userPQP: doc<CommentInterface>[] = pqp.filter((doc) => {
					const id: Types.ObjectId = doc?.get('parent_post.quoted_post.post.user.id');
					return id.toString() === res.locals.user._id.toString();
				});

				setQP(userRQP, 'root');
				setQP(userPQP, 'parent');
			}

			async function setQP(
				arr: doc<CommentInterface>[],
				type: 'root' | 'parent',
			): Promise<void> {
				for (let i = 0; i < arr.length; i++) {
					if (arr.length === 0) break;

					const post: doc<CommentInterface> = arr[i];
					const qp: PostInterface | CommentInterface = post!.get(`${type}_post.quoted_post`);

					post!.set(
						`${type}_post.quoted_post`,
						{
							post_data: qp.post_data,
							post: {
								user: {
									id: qp.post.user.id,
									username: req.body.username ?? originalUser.username,
									nickname: req.body.nickname ?? originalUser.nickname,
									pfp: req.body.pfp !== undefined ? req.body.pfp : originalUser.pfp,
								},
								timestamp: qp.post.timestamp,
								text: qp.post.text,
								post_image: qp.post.post_image,
							},
							liked: qp.liked,
							_id: qp._id,
							post_type: qp.post_type,
						}
					);

					await post!.save();
				}
			}

			const normalizeResData = () => {
				return {
					...(req.body.username && { username: newUser.username }),
					...(req.body.nickname && { nickname: newUser.nickname }),
					...((req.body.pfp || req.body.pfp === null) && { pfp: newUser.pfp }),
					...((req.body.header || req.body.header === null) && { header: newUser.profile_header })
				};
			};

			const data = normalizeResData();
			res.status(200).send(data);
		}
	)
];

export const updateUserSecurity: (RequestHandler | ValidationChain)[] = [
	asyncHandler(
		async (req, res, next) => {
			if (res.locals.user.username !== req.params.username) throw new Error('Unauthorized');
			next();
		}
	),
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

	asyncHandler(
		async (req, res, next) => {
			const errors: Result<ValidationError> = validationResult(req);

			if (!errors.isEmpty()) {
				const errArr: Record<string, string[]> = getValidationErrors(errors);
				res.locals.validationErrors = errArr;
				throw new Error('Invalid user input.');
			}

			bcrypt.hash(req.body.password, 10, async (err, hashedPswd) => {
				if (err) throw err;

				await User.findOneAndUpdate(
					{ _id: res.locals.user._id },
					{ password: hashedPswd },
					{ new: true },
				);

				res.sendStatus(200);
				return;
			});
		}
	)
];

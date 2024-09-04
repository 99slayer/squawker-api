import { RequestHandler } from 'express';
import asyncHandler from 'express-async-handler';
import {
	body,
	Result,
	ValidationChain,
	ValidationError,
	validationResult
} from 'express-validator';
import {
	req,
	res,
	next,
	doc,
	UserInterface,
	PostInterface,
	BaseInterface,
} from '../types';
import Base from '../models/base';
import Post from '../models/post';
import User from '../models/user';
import { PopulatedDoc, HydratedDocument, Types } from 'mongoose';

// Something like an in memory database would help to scale this query.
export const home: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next) => {
		const postCount: number = Number(req.query.postCount);
		const batchSize: number = 10;

		if ((!postCount && postCount !== 0) || Number.isNaN(postCount)) throw new Error('400');

		const userPosts: doc<UserInterface> = await User
			.findById(res.locals.user._id)
			.select('posts')
			.populate({
				path: 'posts',
				select: 'post_data',
				transform: (doc, id) => {
					return { _id: doc._id, post_data: doc.post_data };
				}
			}).orFail(new Error('404'));

		const user: doc<UserInterface> = await User
			.findById(res.locals.user._id)
			.select('following')
			.populate({
				path: 'following',
				select: 'posts',
				populate: {
					path: 'posts',
					select: 'post_data',
					transform: (doc, id) => {
						return { _id: doc._id, post_data: doc.post_data };
					}
				},
			}).orFail(new Error('404'));

		const posts: PopulatedDoc<PostInterface>[] | [] = [...(userPosts?.posts ?? [])];
		for (let i: number = 0; i < user.following.length; i++) {
			const followedUser: PopulatedDoc<UserInterface> = user.following[i];

			if (followedUser instanceof Types.ObjectId) return;
			posts.push(...(followedUser?.posts ?? []));
		}

		if (posts.length === 0) {
			res.send({ postBatch: [] }).status(200);
			return;
		}

		if (posts.length === 1) {
			const postBatch: PopulatedDoc<PostInterface> = await Post
				.findById(posts[0]!._id)
				.orFail(new Error('404'));

			res.send({ postBatch }).status(200);
			return;
		} else {
			posts.sort((
				a: PopulatedDoc<PostInterface>,
				b: PopulatedDoc<PostInterface>
			) => {
				if (a instanceof Types.ObjectId || b instanceof Types.ObjectId) {
					throw new Error('Problems populating posts.');
				} else {
					return a!.post_data.timestamp.getTime() - b!.post_data.timestamp.getTime();
				}
			});

			const batchIds = posts.slice(postCount, postCount + batchSize);
			const postBatch = await Post
				.find({ _id: { $in: batchIds } })
				.populate('comment_count repost_count like_count');

			res.send({ postBatch }).status(200);
		}
	});

export const getUserPosts: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next) => {
		const postCount: number = Number(req.query.postCount);
		const batchSize: number = 10;

		if ((!postCount && postCount !== 0) || Number.isNaN(postCount)) throw new Error('400');

		const user: doc<UserInterface> = await User
			.findOne({ username: req.params.username })
			.select('posts')
			.populate('posts')
			.populate({
				path: 'posts',
				populate: 'comment_count repost_count like_count',
				options: {
					skip: postCount,
					limit: batchSize
				}
			}).orFail(new Error('404'));

		res.send({ posts: user.posts }).status(200);
	});

export const getPost: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next) => {
		const post: doc<BaseInterface> = await Base
			.findById(req.params.postId)
			.populate('comment_count repost_count like_count')
			.orFail(new Error('404'));

		res.send({ post }).status(200);
	});

export const createPost: (RequestHandler | ValidationChain)[] = [
	body('text')
		.trim()
		.notEmpty()
		.isLength({ min: 1, max: 300 })
		.withMessage('should be 300 chars or under.'),

	asyncHandler(
		async (req: req, res: res, next: next) => {
			const errors: Result<ValidationError> = validationResult(req);

			if (!errors.isEmpty()) throw new Error('400');

			const post: HydratedDocument<PostInterface> = new Post({
				post_data: {
					timestamp: new Date,
					user: {
						id: res.locals.user._id,
						username: res.locals.user.username,
						nickname: res.locals.user.nickname,
						pfp: res.locals.user.pfp,
					},
				},
				post: {
					timestamp: new Date,
					text: req.body.text,
					user: {
						id: res.locals.user._id,
						username: res.locals.user.username,
						nickname: res.locals.user.nickname,
						pfp: res.locals.user.pfp,
					},
				},
			});

			if (req.params.quotedPostId) {
				const quotedPost: doc<BaseInterface> = await Base
					.findById(req.params.quotedPostId)
					.orFail(new Error('404'));

				post.quoted_post = quotedPost;
			}

			if (req.body.image) post.post.post_image = req.body.image;

			await post.save();
			res.sendStatus(200);
		}),
];

export const createRepost: RequestHandler | ValidationChain =
	asyncHandler(
		async (req: req, res: res, next: next) => {
			const post: doc<BaseInterface> = await Post
				.findById(req.params.postId)
				.orFail(new Error('404'));

			const repost: HydratedDocument<PostInterface> = new Post({
				post_data: {
					timestamp: new Date,
					repost: post._id,
					user: {
						id: res.locals.user._id,
						username: res.locals.user.username,
						nickname: res.locals.user.nickname,
						pfp: res.locals.user.pfp,
					}
				},
				post: post.post,
			});

			if (post.quoted_post) repost.quoted_post = post.quoted_post;

			await post.save();
			res.sendStatus(200);
		});

export const updatePost: (RequestHandler | ValidationChain)[] = [
	asyncHandler(
		async (req: req, res: res, next: next) => {
			const post: doc<PostInterface> = await Post
				.findById(req.params.postId)
				.orFail(new Error('404'));

			if (!res.locals.user._id.equals(post.post_data?.user.id)) throw new Error('401');

			next();
		}),

	body('text')
		.trim()
		.notEmpty()
		.isLength({ min: 1, max: 300 })
		.withMessage('should be 300 chars or under.'),

	asyncHandler(
		async (req: req, res: res, next: next) => {
			const errors: Result<ValidationError> = validationResult(req);

			if (!errors.isEmpty()) {
				console.log(errors);
				throw new Error('400');
			}

			await Post.bulkWrite([
				{
					updateOne: {
						filter: { _id: req.params.postId },
						update: { 'post.text': req.body.text }
					}
				},
				{
					updateMany: {
						filter: { 'quoted_post._id': req.params.postId },
						update: { 'quoted_post.post.text': req.body.text }
					}
				},
				{
					updateMany: {
						filter: { 'post_data.repost': req.params.postId },
						update: { 'post.text': req.body.text }
					}
				}
			]).catch((err) => {
				throw err;
			});

			res.sendStatus(200);
		}),
];

export const deletePost: RequestHandler[] = [
	asyncHandler(
		async (req, res, next) => {
			const post: doc<PostInterface> = await Post
				.findById(req.params.postId)
				.orFail(new Error('404'));

			if (!res.locals.user._id.equals(post.post_data?.user.id)) throw new Error('401');

			next();
		}),

	asyncHandler(
		async (req: req, res: res, next: next) => {
			await Post.bulkWrite([
				{
					deleteOne: {
						filter: { _id: req.params.postId }
					}
				},
				{
					updateMany: {
						filter: { 'quoted_post._id': req.params.postId },
						update: { 'quoted_post.post.text': 'POST WAS REMOVED' }
					}
				},
				{
					deleteMany: {
						filter: { 'post_data.repost': req.params.postId },
					}
				}
			]).catch((err) => {
				throw err;
			});

			res.sendStatus(200);
		}),
];

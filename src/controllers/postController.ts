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
	BaseInterface
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
				select: 'timestamp user.id'
			}).orFail(new Error('404'));

		const user: doc<UserInterface> = await User
			.findById(res.locals.user._id)
			.select('following')
			.populate({
				path: 'following',
				select: 'posts',
				populate: {
					path: 'posts',
					select: 'timestamp user.id'
				}
			}).orFail(new Error('404'));

		const posts = [...(userPosts?.posts ?? [])];
		for (let i: number = 0; i < user.following.length; i++) {
			const followedUser: PopulatedDoc<UserInterface> = user.following[i];

			if (followedUser instanceof Types.ObjectId) return;
			posts.push(...(followedUser?.posts ?? []));
		}

		posts.sort((
			a: PopulatedDoc<PostInterface>,
			b: PopulatedDoc<PostInterface>
		) => {
			if (a instanceof Types.ObjectId || b instanceof Types.ObjectId) {
				throw new Error('Problems populating posts.');
			} else {
				return a!.timestamp.getTime() - b!.timestamp.getTime();
			}
		});

		const batchIds = posts.slice(postCount, postCount + batchSize);
		const postBatch = await Post
			.find({ _id: { $in: batchIds } })
			.populate('comment_count repost_count like_count');

		res.send({ postBatch }).status(200);
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
		const post: doc<PostInterface> = await Post
			.findById(req.params.postId)
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
				text: req.body.text,
				timestamp: new Date,
				user: {
					id: res.locals.user._id,
					username: res.locals.user.username,
					nickname: res.locals.user.nickname,
					pfp: res.locals.user.pfp,
				}
			});

			if (req.params.quotedPostId) {
				const quotedPost: doc<BaseInterface> | null = await Base
					.findById(req.params.quotedPostId)
					.select('-comment_slice')
					.orFail(new Error('404'));

				post.quoted_post = {
					post_id: quotedPost._id,
					doc_model: quotedPost.post_type
				};
			}

			if (req.body.image) post.post_image = req.body.image;

			await post.save();
			res.sendStatus(200);
		}),
];

export const updatePost: (RequestHandler | ValidationChain)[] = [
	asyncHandler(
		async (req, res, next) => {
			const post: doc<PostInterface> = await Post
				.findById(req.params.postId)
				.orFail(new Error('404'));

			if (!res.locals.user._id.equals(post.user.id)) throw new Error('401');

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

			if (!errors.isEmpty()) throw new Error('400');

			await Post.findByIdAndUpdate(
				{ _id: req.params.postId },
				{ text: req.body.text },
				{ new: true }
			).orFail(new Error('404'));

			res.sendStatus(200);
		}),
];

export const deletePost: RequestHandler[] = [
	asyncHandler(
		async (req, res, next) => {
			const post: doc<PostInterface> = await Post
				.findById(req.params.postId)
				.orFail(new Error('404'));

			if (!res.locals.user._id.equals(post.user.id)) throw new Error('401');

			next();
		}),

	asyncHandler(
		async (req: req, res: res, next: next) => {
			await Post
				.findByIdAndDelete(req.params.postId)
				.orFail(new Error('404'));

			res.sendStatus(200);
		}),
];

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
	PostInterface
} from '../types';
import Post from '../models/post';
import User from '../models/user';
import { PopulatedDoc, HydratedDocument, Types } from 'mongoose';

// Something like an in memory database would help to scale this query.
export const home: RequestHandler = asyncHandler(async (req: req, res: res, next: next) => {
	const postCount: number = Number(req.query.postCount);
	const batchSize: number = 10;

	if ((!postCount && postCount !== 0) || Number.isNaN(postCount)) {
		res.sendStatus(400);
		return;
	}

	const userPosts: doc<UserInterface> = await User
		.findById(res.locals.user._id)
		.select('posts')
		.populate({
			path: 'posts',
			select: 'timestamp user.id'
		});

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
		});

	if (!userPosts || !user) {
		res.sendStatus(400);
		return;
	}

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
			throw new Error('unpopulated id');
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

export const getUserPosts: RequestHandler = asyncHandler(async (req: req, res: res, next: next) => {
	const postCount: number = Number(req.query.postCount);
	const batchSize: number = 10;

	if ((!postCount && postCount !== 0) || Number.isNaN(postCount)) {
		res.sendStatus(400);
		return;
	}

	const user: doc<UserInterface> = await User
		.findOne({ username: req.params.username })
		.select('posts')
		.populate('posts')
		.populate({
			path: 'posts',
			populate: 'comment_count repost_count like_count'
		});

	if (!user) {
		res.sendStatus(404);
		return;
	}

	const posts: PopulatedDoc<PostInterface>[] = user.posts ?? [];
	const postBatch: PopulatedDoc<PostInterface>[] = posts.slice(postCount, postCount + batchSize);

	res.send({ postBatch }).status(200);
});

export const getPost: RequestHandler = asyncHandler(async (req: req, res: res, next: next) => {
	const post: doc<PostInterface> = await Post
		.findById(req.params.postId);

	if (!post) {
		res.sendStatus(404);
		return;
	}

	res.send({ post }).status(200);
});

export const createPost: (RequestHandler | ValidationChain)[] = [
	body('text')
		.trim()
		.notEmpty()
		.isLength({ min: 1, max: 300 })
		.withMessage('should be 300 chars or under.'),

	asyncHandler(async (req: req, res: res, next: next) => {
		const errors: Result<ValidationError> = validationResult(req);

		if (!errors.isEmpty()) {
			res.sendStatus(400);
			return;
		}

		const quotedPost: doc<PostInterface> = await Post
			.findById(req.body.quotedPost)
			.select('-comment_slice')
			.exec();

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

		if (quotedPost) post.quoted_post = {
			post_id: quotedPost._id,
			doc_model: 'root_post' in quotedPost ? 'Comment' : 'Post'
		};
		if (req.body.image) post.post_image = req.body.image;

		await post.save();
		res.sendStatus(200);
	}),
];

export const updatePost: (RequestHandler | ValidationChain)[] = [
	asyncHandler(async (req, res, next) => {
		const post = await Post.findById(req.params.postId);

		if (!post) {
			res.sendStatus(404);
			return;
		}

		if (!res.locals.user._id.equals(post.user.id)) {
			res.sendStatus(401);
			return;
		}

		next();
	}),

	body('text')
		.trim()
		.notEmpty()
		.isLength({ min: 1, max: 300 })
		.withMessage('should be 300 chars or under.'),

	asyncHandler(async (req: req, res: res, next: next) => {
		const errors: Result<ValidationError> = validationResult(req);

		if (!errors.isEmpty()) {
			res.sendStatus(400);
			return;
		}

		await Post.findByIdAndUpdate(
			{ _id: req.params.postId },
			{ text: req.body.text },
			{ new: true }
		);

		res.sendStatus(200);
	}),
];

export const deletePost: RequestHandler[] = [
	asyncHandler(async (req, res, next) => {
		const post = await Post.findById(req.params.postId);

		if (!post) {
			res.sendStatus(404);
			return;
		}

		if (!res.locals.user._id.equals(post.user.id)) {
			res.sendStatus(401);
			return;
		}

		next();
	}),

	asyncHandler(async (req: req, res: res, next: next) => {
		await Post.findByIdAndDelete(req.params.postId);

		res.sendStatus(200);
	}),
];

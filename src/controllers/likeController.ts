import { RequestHandler } from 'express';
import asyncHandler from 'express-async-handler';
import {
	req,
	res,
	next,
	doc,
	UserInterface,
	BaseInterface,
	LikeInterface,
} from '../types';
import User from '../models/user';
import Base from '../models/base';
import Like from '../models/like';

export const getUserLikes: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next) => {
		const likeCount: number = Number(req.query.likeCount);
		const batchSize: number = 10;

		if ((!likeCount && likeCount !== 0) || Number.isNaN(likeCount)) throw new Error('400');

		const user: doc<UserInterface> = await User
			.findOne({ username: req.params.username })
			.select('likes')
			.populate('likes')
			.orFail(new Error('404'));

		if (user.likes && user.likes.length <= 0) {
			res.sendStatus(204);
			return;
		}

		const likeIds = user.likes?.map((like) => {
			const postId = 'post' in like! ? like.post : null;
			return postId;
		});

		const batchIds = likeIds?.slice(
			likeCount,
			likeCount + batchSize
		);

		const likeBatch = await Base
			.find({ _id: { $in: batchIds } })
			.populate('comment_count repost_count like_count')
			.orFail(new Error('404'));

		res.send({ likeBatch }).status(200);
	});

export const createLike: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next) => {
		const post: doc<BaseInterface> = await Base
			.findById(req.params.postId)
			.select('post_type')
			.populate({
				path: 'likes',
				select: 'user'
			})
			.orFail(new Error('404'));

		const userLikes = post?.likes?.map((like) => {
			if (!like) return;
			const userId = 'user' in like ? like.user.toString() : null;
			return userId;
		});

		// User already likes post.
		if (userLikes?.includes(res.locals.user._id.toString())) throw new Error('400');

		const like = new Like({
			timestamp: new Date,
			user: res.locals.user._id,
			post: req.params.postId,
			doc_model: post?.post_type,
		});

		await like.save();
		res.sendStatus(200);
	});

export const deleteLike: RequestHandler[] = [
	asyncHandler(
		async (req, res, next) => {
			const like: doc<LikeInterface> = await Like
				.findById(req.params.likeId)
				.orFail(new Error('404'));

			if (!res.locals.user._id.equals(like.user)) throw new Error('401');

			next();
		}),

	asyncHandler(
		async (req: req, res: res, next: next) => {
			await Like
				.findByIdAndDelete(req.params.likeId)
				.orFail(new Error('404'));

			res.sendStatus(200);
		})
];

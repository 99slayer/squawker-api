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
	PostInterface,
} from '../types';
import User from '../models/user';
import Base from '../models/base';
import Like from '../models/like';
import { PopulatedDoc, Types } from 'mongoose';

export const getUserLikes: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next) => {
		const likeCount: number = Number(req.query.likeCount);
		const batchSize: number = 10;

		if ((!likeCount && likeCount !== 0) || Number.isNaN(likeCount)) throw new Error('400');

		const user: doc<UserInterface> = await User
			.findOne({ username: req.params.username })
			.select('likes')
			.populate({
				path: 'likes',
				populate: {
					path: 'post',
					populate: 'comment_count repost_count like_count'
				},
				options: {
					skip: likeCount,
					limit: batchSize
				}
			})
			.orFail(new Error('404'));

		const likeBatch: PopulatedDoc<PostInterface>[] = user.likes!.map((like) => {
			if (like instanceof Types.ObjectId) return;
			return like?.post;
		});

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

		const userLikes = post.likes?.map((like) => {
			if (like instanceof Types.ObjectId) return;
			return like?.user!.toString();
		});

		// Checks if user already likes post.
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

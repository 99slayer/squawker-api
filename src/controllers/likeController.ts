import { RequestHandler } from 'express';
import asyncHandler from 'express-async-handler';
import {
	req,
	res,
	next,
	LikeInterface,
} from '../types';
import Like from '../models/like';
import { HydratedDocument } from 'mongoose';

export const createLike: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next) => {
		const liked: LikeInterface | null = await Like
			.findOne({ user: res.locals.user._id, post: req.params.postId });

		if (liked) {
			res.sendStatus(200);
			return;
		}

		const like: HydratedDocument<LikeInterface> = new Like({
			timestamp: new Date,
			user: res.locals.user._id,
			post: req.params.postId,
		});

		await like.save();
		res.sendStatus(200);
	});

export const deleteLike: RequestHandler =
	asyncHandler(
		async (req: req, res: res, next: next) => {
			await Like
				.findOneAndDelete({ user: res.locals.user._id, post: req.params.postId })
				.orFail(new Error('Query failed.'));

			res.sendStatus(200);
		}
	);

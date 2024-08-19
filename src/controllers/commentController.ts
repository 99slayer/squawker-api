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
	CommentInterface,
	BaseInterface
} from '../types';
import User from '../models/user';
import Base from '../models/base';
import Comment from '../models/comment';
import { RequestHandler } from 'express';
import { HydratedDocument, PopulatedDoc } from 'mongoose';

export const getUserComments: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next) => {
		const commentCount: number = Number(req.query.commentCount);
		const batchSize: number = 10;

		if ((!commentCount && commentCount !== 0) || Number.isNaN(commentCount)) throw new Error('400');

		const user: doc<UserInterface> = await User
			.findOne({ username: req.params.username })
			.select('comments')
			.populate('comments')
			.populate({
				path: 'comments',
				populate: 'comment_count repost_count like_count',
				options: {
					skip: commentCount,
					limit: batchSize
				}
			}).orFail(new Error('404'));

		res.send({ comments: user.comments }).status(200);
	});

export const getComment: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next) => {
		const comment: doc<CommentInterface> = await Comment
			.findById(req.params.commentId)
			.orFail(new Error('404'));

		res.send({ comment }).status(200);
	});

export const createComment: (RequestHandler | ValidationChain)[] = [
	body('text')
		.trim()
		.notEmpty()
		.isLength({ min: 1, max: 300 })
		.withMessage('should be 300 chars or under.'),

	asyncHandler(
		async (req: req, res: res, next: next) => {
			const errors: Result<ValidationError> = validationResult(req);

			if (!errors.isEmpty()) throw new Error('400');

			const parent: doc<BaseInterface> = await Base
				.findById(req.params.parentId)
				.orFail(new Error('404'));

			const comment: HydratedDocument<CommentInterface> = new Comment({
				text: req.body.text,
				timestamp: new Date,
				user: {
					id: res.locals.user._id,
					username: res.locals.user.username,
					nickname: res.locals.user.nickname,
					pfp: res.locals.user.pfp,
				},
				root_post:
					'root_post' in parent ?
						parent?.root_post :
						parent?._id,
				parent_post: {
					post_id: parent?._id,
					doc_model: parent.post_type
				}
			});

			if (req.body.image) comment.post_image = req.body.image;

			await comment.save();
			res.sendStatus(200);
		})
];

export const updateComment: (RequestHandler | ValidationChain)[] = [
	asyncHandler(
		async (req, res, next) => {
			const comment: doc<CommentInterface> = await Comment
				.findById(req.params.commentId)
				.orFail(new Error('404'));

			if (!res.locals.user._id.equals(comment.user.id)) throw new Error('401');

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

			await Comment
				.findByIdAndUpdate(
					{ _id: req.params.commentId },
					{ text: req.body.text },
					{ new: true }
				).orFail(new Error('404'));

			res.sendStatus(200);
		})
];

export const deleteComment: RequestHandler[] = [
	asyncHandler(
		async (req, res, next) => {
			const comment: doc<CommentInterface> = await Comment
				.findById(req.params.commentId)
				.orFail(new Error('404'));

			if (!res.locals.user._id.equals(comment.user.id)) throw new Error('401');

			next();
		}),

	asyncHandler(
		async (req: req, res: res, next: next) => {
			await Comment
				.findByIdAndDelete(req.params.commentId)
				.orFail(new Error('404'));

			res.sendStatus(200);
		}),
];

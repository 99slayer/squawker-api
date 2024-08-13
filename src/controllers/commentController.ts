import asyncHandler from 'express-async-handler';
import {
	body,
	Result,
	ValidationChain,
	ValidationError,
	validationResult
} from 'express-validator';
import { req, res, next, doc, UserInterface, CommentInterface, PostInterface } from '../types';
import User from '../models/user';
import Post from '../models/comment';
import Comment from '../models/comment';
import { RequestHandler } from 'express';
import { HydratedDocument, PopulatedDoc } from 'mongoose';

export const getUserComments: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next) => {
		const commentCount: number = Number(req.query.commentCount);
		const batchSize: number = 10;

		if ((!commentCount && commentCount !== 0) || Number.isNaN(commentCount)) {
			res.sendStatus(400);
			return;
		}

		const user: doc<UserInterface> = await User
			.findOne({ username: req.params.username })
			.select('comments')
			.populate('comments')
			.populate({
				path: 'comments',
				populate: 'comment_count repost_count like_count'
			});

		if (!user) {
			res.sendStatus(404);
			return;
		}

		const comments: PopulatedDoc<CommentInterface>[] = user.comments ?? [];
		const commentBatch: PopulatedDoc<CommentInterface>[] = comments?.slice(
			commentCount, commentCount + batchSize
		);

		res.send({ commentBatch }).status(200);
	});

export const getComment: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next) => {
		const comment: doc<CommentInterface> = await Comment
			.findById(req.params.commentId);

		if (!comment) {
			res.sendStatus(404);
			return;
		}

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

			if (!errors.isEmpty()) {
				res.sendStatus(400);
				return;
			}

			let parent;
			let type;

			switch (req.params.parentType) {
				case 'post':
					const getPost: doc<PostInterface> = await Post
						.findById(req.params.parentId);
					parent = getPost;
					type = 'Post';
					break;

				case 'comment':
					const getComment: doc<CommentInterface> = await Comment
						.findById(req.params.parentId);
					parent = getComment;
					type = 'Comment';
					break;

				default:
					break;
			}

			if (!parent) {
				res.sendStatus(404);
				return;
			}

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
					doc_model: type
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
				.findById(req.params.commentId);

			if (!comment) {
				res.sendStatus(404);
				return;
			}

			if (!res.locals.user._id.equals(comment.user.id)) {
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

	asyncHandler(
		async (req: req, res: res, next: next) => {
			const errors: Result<ValidationError> = validationResult(req);

			if (!errors.isEmpty()) {
				res.sendStatus(400);
				return;
			}

			const updatedComment = await Comment
				.findByIdAndUpdate(
					{ _id: req.params.commentId },
					{ text: req.body.text },
					{ new: true }
				);

			if (!updatedComment) {
				res.sendStatus(404);
				return;
			}

			res.sendStatus(200);
		})
];

export const deleteComment: RequestHandler[] = [
	asyncHandler(
		async (req, res, next) => {
			const comment: doc<CommentInterface> = await Comment
				.findById(req.params.commentId);

			if (!comment) {
				res.sendStatus(404);
				return;
			}

			if (!res.locals.user._id.equals(comment.user.id)) {
				res.sendStatus(401);
				return;
			}

			next();
		}),

	asyncHandler(
		async (req: req, res: res, next: next) => {
			const deletedComment: doc<CommentInterface> = await Comment
				.findByIdAndDelete(req.params.commentId);

			if (!deletedComment) {
				res.sendStatus(404);
				return;
			}

			res.sendStatus(200);
		}),
];

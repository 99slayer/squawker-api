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
	CommentInterface,
	BaseInterface
} from '../types';
import Base from '../models/base';
import Post from '../models/post';
import Comment from '../models/comment';
import Like from '../models/like';
import { RequestHandler } from 'express';
import { HydratedDocument } from 'mongoose';
import { checkCommentLikes, getValidationErrors } from '../util';

export const getUserComments: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next) => {
		const commentCount: number = Number(req.query.commentCount);
		const batchSize: number = 10;

		if ((!commentCount && commentCount !== 0) || Number.isNaN(commentCount)) throw new Error('Invalid request query.');

		const comments: CommentInterface[] = await Comment
			.find({
				'post_data.user.username': req.params.username,
				'post_data.repost': false
			})
			.skip(commentCount)
			.limit(batchSize)
			.populate('direct_comment_count repost_count like_count root_post.direct_comment_count root_post.repost_count root_post.like_count parent_post.direct_comment_count parent_post.repost_count parent_post.like_count')
			.sort({ 'post_data.timestamp': -1 });

		await checkCommentLikes(comments, res.locals.user._id);
		res.send(comments).status(200);
	});

export const getPostReplies: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next) => {
		const commentCount: number = Number(req.query.commentCount);
		const batchSize: number = 2;

		if ((!commentCount && commentCount !== 0) || Number.isNaN(commentCount)) throw new Error('Invalid request query.');

		const comments: CommentInterface[] = await Comment
			.find({
				'parent_post._id': req.params.postId,
				'post_data.repost': false
			})
			.skip(commentCount)
			.limit(batchSize)
			.populate('direct_comment_count repost_count like_count');

		await checkCommentLikes(comments, res.locals.user._id);
		res.send(comments).status(200);
	}
);

export const getCommentReplies: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next) => {
		const commentCount: number = Number(req.query.commentCount);
		const batchSize: number = 10;

		if ((!commentCount && commentCount !== 0) || Number.isNaN(commentCount)) throw new Error('Invalid request query.');

		const comments: CommentInterface[] = await Comment
			.find({
				'parent_post._id': req.params.postId,
				'post_data.repost': false
			})
			.skip(commentCount)
			.limit(batchSize)
			.populate('direct_comment_count repost_count like_count');

		await checkCommentLikes(comments, res.locals.user._id);
		res.send(comments).status(200);
	}
);

export const getCommentGroup: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next) => {
		const comment: CommentInterface = await Comment
			.findById(req.params.commentId)
			.populate('direct_comment_count repost_count like_count root_post.direct_comment_count root_post.repost_count root_post.like_count parent_post.direct_comment_count parent_post.repost_count parent_post.like_count')
			.orFail(new Error('Query failed.'));

		await checkCommentLikes(comment, res.locals.user._id);
		res.send(comment).status(200);
	}
);

export const createComment: (RequestHandler | ValidationChain)[] = [
	body('text')
		.if((value, { req }) => {
			return req.body.text;
		})
		.trim()
		.isLength({ min: 1, max: 300 })
		.withMessage('should be 300 chars or under.'),
	body('image')
		.if((value, { req }) => {
			return req.body.image;
		})
		.isURL(),

	asyncHandler(
		async (req: req, res: res, next: next) => {
			const errors: Result<ValidationError> = validationResult(req);

			if (!errors.isEmpty()) {
				const errArr: Record<string, string[]> = getValidationErrors(errors);
				res.locals.validationErrors = errArr;
				throw new Error('Invalid user input.');
			}
			if (!req.body.text && !req.body.image) throw new Error('Invalid user input.');

			const parent: BaseInterface = await Base
				.findById(req.params.parentId)
				.orFail(new Error('Query failed.'));

			const comment: HydratedDocument<CommentInterface> = new Comment({
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
					post_image: req.body.image ?? null,
					user: {
						id: res.locals.user._id,
						username: res.locals.user.username,
						nickname: res.locals.user.nickname,
						pfp: res.locals.user.pfp,
					},
				},

				parent_post: parent,
				root_post: parent.root_post || parent.parent_post || null
			});

			comment.post_data.post_id = comment._id;
			if (req.body.image) comment.post!.post_image = req.body.image;

			await comment.save();
			res.send({ _id: comment._id }).status(200);
		})
];

export const createRepost: RequestHandler | ValidationChain =
	asyncHandler(
		async (req: req, res: res, next: next) => {
			const post: CommentInterface = await Comment
				.findById(req.params.commentId)
				.orFail(new Error('Query failed.'));

			const repost: HydratedDocument<CommentInterface> = new Comment({
				post_data: {
					post_id: post.post_data.post_id,
					timestamp: new Date,
					repost: true,
					user: {
						id: res.locals.user._id,
						username: res.locals.user.username,
						nickname: res.locals.user.nickname,
						pfp: res.locals.user.pfp,
					}
				},
				post: post.post,
				parent_post: post.parent_post,
				root_post: post.root_post,
			});

			await repost.save();
			res.send({ _id: repost._id }).status(201);
		}
	);

export const updateComment: (RequestHandler | ValidationChain)[] = [
	asyncHandler(
		async (req, res, next) => {
			const comment: CommentInterface = await Comment
				.findById(req.params.commentId)
				.orFail(new Error('Query failed.'));

			if (!res.locals.user._id.equals(comment.post_data?.user.id)) throw new Error('Unauthorized');
			if (!comment.post.text) throw new Error('Unacceptable request.');
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
				const errArr: Record<string, string[]> = getValidationErrors(errors);
				res.locals.validationErrors = errArr;
				throw new Error('Invalid user input.');
			}

			await Comment
				.findByIdAndUpdate(
					{ _id: req.params.commentId },
					{ 'post.text': req.body.text },
					{ new: true }
				).orFail(new Error('Query failed.'));

			await Post.bulkWrite([
				{
					updateMany: {
						filter: { 'quoted_post._id': req.params.commentId },
						update: { 'quoted_post.post.text': req.body.text }
					}
				},
				{
					updateMany: {
						filter: { 'post_data.post_id': req.params.commentId },
						update: { 'post.text': req.body.text }
					}
				}
			]).catch((err) => {
				throw err;
			});

			res.sendStatus(200);
		})
];

export const deleteComment: RequestHandler[] = [
	asyncHandler(
		async (req, res, next) => {
			const comment: CommentInterface = await Comment
				.findById(req.params.commentId)
				.orFail(new Error('Query failed.'));

			if (!res.locals.user._id.equals(comment.post_data?.user.id)) throw new Error('Unauthorized');
			next();
		}),

	asyncHandler(
		async (req: req, res: res, next: next) => {

			await Comment.bulkWrite([
				// delete comment
				{
					deleteOne: {
						filter: { _id: req.params.commentId }
					}
				},
				// delete comment reposts
				{
					deleteMany: {
						filter: { 'post_data.post_id': req.params.commentId }
					}
				},
				// update child comment parent posts
				{
					updateMany: {
						filter: { 'parent_post._id': req.params.commentId },
						update: {
							'parent_post': {
								'post_data': null,
								'post': null,
							}
						}
					}
				},
			]).catch((err) => {
				throw err;
			});

			// update quote posts
			await Post.updateMany(
				{ 'quoted_post._id': req.params.commentId },
				{
					'quoted_post': {
						'post_data': null,
						'post': null
					}
				}
			);

			// delete comment likes
			await Like.deleteMany({ post: req.params.commentId });

			res.sendStatus(200);
		}),
];

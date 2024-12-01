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
	PostInterface,
	BaseInterface,
	CommentInterface,
} from '../types';
import User from '../models/user';
import Base from '../models/base';
import Post from '../models/post';
import Comment from '../models/comment';
import Like from '../models/like';
import { HydratedDocument, Types } from 'mongoose';
import { checkPostLikes, getValidationErrors } from '../util';

export const home: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next) => {
		const postCount: number = Number(req.query.postCount);
		const batchSize: number = 10;

		if ((!postCount && postCount !== 0) || Number.isNaN(postCount)) throw new Error('Invalid request query.');

		const following: Types.ObjectId[] = await User
			.findById(res.locals.user._id)
			.select('following')
			.transform(doc => {
				return doc?.following;
			}).orFail(new Error('Query failed.'));

		const posts: BaseInterface[] = await Base
			.find({
				$or: [
					{
						'post_data.user.id': res.locals.user._id,
						$or: [
							{ 'post_data.repost': true },
							{ post_type: 'Post' }
						]
					},
					{
						'post_data.user.id': { $in: following },
						$or: [
							{ 'post_data.repost': true },
							{ post_type: 'Post' }
						]
					}
				]
			})
			.skip(postCount)
			.limit(batchSize)
			.populate('direct_comment_count repost_count like_count')
			.sort({ 'post_data.timestamp': -1 });

		await checkPostLikes(posts, res.locals.user._id);
		res.status(200).send(posts);
	});

export const getUserPosts: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next) => {
		const postCount: number = Number(req.query.postCount);
		const batchSize: number = 10;

		if ((!postCount && postCount !== 0) || Number.isNaN(postCount)) throw new Error('Invalid request query.');

		const posts: PostInterface[] = await Post
			.find({ 'post_data.user.username': req.params.username })
			.skip(postCount)
			.limit(batchSize)
			.populate('direct_comment_count repost_count like_count')
			.sort({ 'post_data.timestamp': -1 });

		await checkPostLikes(posts, res.locals.user._id);
		res.status(200).send(posts);
	});

export const getPost: RequestHandler = asyncHandler(
	async (req: req, res: res, next: next) => {
		const post: PostInterface = await Post
			.findById(req.params.postId)
			.populate('direct_comment_count repost_count like_count')
			.orFail(new Error('Query failed.'));

		await checkPostLikes(post, res.locals.user._id);
		res.status(200).send(post);
	});

export const createPost: (RequestHandler | ValidationChain)[] = [
	body('text')
		.if((value, { req }) => {
			return req.body.text;
		})
		.isString()
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
					post_image: req.body.image ?? null,
					user: {
						id: res.locals.user._id,
						username: res.locals.user.username,
						nickname: res.locals.user.nickname,
						pfp: res.locals.user.pfp,
					},
				},
			});

			post.post_data.post_id = post._id;

			if (req.params.quotedPostId) {
				const quotedPost: BaseInterface = await Base
					.findById(req.params.quotedPostId)
					.orFail(new Error('Query failed.'));

				if (quotedPost.post_type === 'Post') {
					post.quoted_post = quotedPost as PostInterface;
				} else {
					post.quoted_post = quotedPost as CommentInterface;
				}
			}
			if (req.body.image) post.post.post_image = req.body.image;

			await post.save();
			res.status(201).send({ _id: post._id });
		}),
];

export const createRepost: RequestHandler | ValidationChain =
	asyncHandler(
		async (req: req, res: res, next: next) => {
			const post: PostInterface = await Post
				.findById(req.params.postId)
				.orFail(new Error('Query failed.'));

			const repost: HydratedDocument<PostInterface> = new Post({
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
				quoted_post: post.quoted_post
			});

			await repost.save();
			res.status(201).send({ _id: repost._id });
		}
	);

export const updatePost: (RequestHandler | ValidationChain)[] = [
	asyncHandler(
		async (req: req, res: res, next: next) => {
			const post: PostInterface = await Post
				.findById(req.params.postId)
				.orFail(new Error('Query failed.'));

			if (!res.locals.user._id.equals(post.post_data?.user.id)) throw new Error('Unauthorized');
			if (post.post_data.repost || !post.post.text) throw new Error('Unacceptable request.');
			next();
		}),

	body('text')
		.isString()
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
						filter: { 'post_data.post_id': req.params.postId },
						update: { 'post.text': req.body.text }
					}
				}
			]).catch((err) => {
				throw err;
			});

			res.sendStatus(200);
		}
	),
];

export const deletePost: RequestHandler[] = [
	asyncHandler(
		async (req, res, next) => {
			const post: PostInterface = await Post
				.findById(req.params.postId)
				.orFail(new Error('Query failed.'));

			if (!res.locals.user._id.equals(post.post_data?.user.id)) throw new Error('Unauthorized');
			next();
		}),

	asyncHandler(
		async (req: req, res: res, next: next) => {
			await Post.bulkWrite([
				// delete post
				{
					deleteOne: {
						filter: { _id: req.params.postId }
					}
				},
				// update quote posts
				{
					updateMany: {
						filter: { 'quoted_post._id': req.params.postId },
						update: {
							'quoted_post': {
								'post_data': null,
								'post': null,
							}
						}
					}
				},
				// delete reposts
				{
					deleteMany: {
						filter: { 'post_data.post_id': req.params.postId },
					}
				}
			]).catch((err) => {
				throw err;
			});

			await Comment.bulkWrite([
				// update comment root posts
				{
					updateMany: {
						filter: { 'root_post._id': req.params.postId },
						update: {
							'root_post': {
								'post_data': null,
								'post': null
							}
						}
					}
				},
				// update comment parent posts
				{
					updateMany: {
						filter: { 'parent_post._id': req.params.postId },
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

			// delete post likes
			await Like.deleteMany({ post: req.params.postId });

			res.sendStatus(200);
		}),
];

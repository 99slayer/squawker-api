import mongoose, { AnyObject, FilterQuery } from 'mongoose';
import Debug from 'debug';
const debug = Debug('model:post');
import { doc, PostInterface } from '../types';
import Base from './base';
import Comment from './comment';
import Like from './like';
const Schema = mongoose.Schema;

const PostSchema = new Schema<PostInterface>(
	{
		post_data: {
			timestamp: { type: Date, required: true },
			repost: {
				type: Schema.Types.ObjectId,
				required: false
			},
			user: {
				id: {
					type: Schema.Types.ObjectId,
					ref: 'User',
					required: true
				},
				username: { type: String, required: true },
				nickname: { type: String, required: true },
				pfp: { type: String, required: false }
			},
		},
		quoted_post: {
			type: {
				post_data: {
					timestamp: { type: Date, required: true },
					repost: {
						type: Schema.Types.ObjectId,
						required: false
					},
					user: {
						id: {
							type: Schema.Types.ObjectId,
							ref: 'User',
							required: true
						},
						username: { type: String, required: true },
						nickname: { type: String, required: true },
						pfp: { type: String, required: false }
					},
				},
				post: {
					timestamp: { type: Date, required: true },
					text: { type: String },
					post_image: { type: String },
					user: {
						id: {
							type: Schema.Types.ObjectId,
							ref: 'User',
							required: true
						},
						username: { type: String, required: true },
						nickname: { type: String, required: true },
						pfp: { type: String, required: false }
					},
				},
				quoted_post: { type: Schema.Types.ObjectId }
			},
			required: false
		},
	}
);

// HOOKS
PostSchema.pre('findOneAndDelete', async function (next) {
	const query: FilterQuery<AnyObject> = this.getQuery();
	const post: doc<PostInterface> = await this.model
		.findOne(query)
		.orFail(new Error('404'));

	const likesDeleted: mongoose.mongo.DeleteResult = await Like
		.deleteMany({ post: post?._id });

	debug(likesDeleted);
	next();
});

PostSchema.pre('deleteMany', async function (next) {
	const query: FilterQuery<AnyObject> = this.getQuery();
	const post: doc<PostInterface> = await this.model
		.findOne(query)
		.orFail(new Error('404'));

	const commentsDeleted: mongoose.mongo.DeleteResult = await Comment
		.deleteMany({ root_post: post?._id });
	const likesDeleted: mongoose.mongo.DeleteResult = await Like
		.deleteMany({ post: post?._id });

	debug(commentsDeleted);
	debug(likesDeleted);
	next();
});

// VIRTUALS
PostSchema.virtual('direct_replies', {
	ref: 'Comment',
	localField: '_id',
	foreignField: 'parent_post.post_id'
});

PostSchema.virtual('quoted', {
	ref: 'Post',
	localField: '_id',
	foreignField: 'quoted_post._id'
});

export default Base.discriminator<PostInterface>('Post', PostSchema);

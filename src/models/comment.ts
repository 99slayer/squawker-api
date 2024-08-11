import mongoose, { AnyObject, FilterQuery } from 'mongoose';
import { doc, CommentInterface } from '../types';
import Like from './like';
const Schema = mongoose.Schema;

export const CommentSchema = new Schema<CommentInterface>(
	{
		text: { type: String, required: true },
		timestamp: { type: Date, required: true },
		user: {
			id: {
				type: Schema.Types.ObjectId,
				ref: 'User',
				required: true
			},
			username: { type: String, required: true },
			nickname: { type: String, required: true },
			pfp: { type: String, required: false },
		},
		root_post: {
			type: Schema.Types.ObjectId,
			ref: 'Post',
			required: true
		},
		parent_post: {
			_id: false,
			type: {
				post_id: {
					type: Schema.Types.ObjectId,
					refPath: 'doc_model',
					required: true
				},
				doc_model: {
					type: String,
					enum: ['Post', 'Comment'],
					required: true
				}
			},
			required: true
		},
		post_image: { type: String, required: false },
	},
	{
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
		id: false,
	}
);

// HOOKS
CommentSchema.pre('findOneAndDelete', async function (next) {
	const query: FilterQuery<AnyObject> = this.getQuery();
	const comment: doc<CommentInterface> = await this.model.findOne(query);

	await Like.deleteMany({ post: comment?._id });

	next();
});

CommentSchema.pre('deleteMany', async function (next) {
	const query: FilterQuery<AnyObject> = this.getQuery();
	const comment: doc<CommentInterface> = await this.model.findOne(query);

	await mongoose.model<CommentInterface>('Comment', CommentSchema)
		.deleteMany({ parent_post: comment?._id });
	await Like.deleteMany({ post: comment?._id });

	next();
});

// VIRTUALS
CommentSchema.virtual('comments', {
	ref: 'Comment',
	localField: '_id',
	foreignField: 'parent_post.post_id'
});

CommentSchema.virtual('reposts', {
	ref: 'Post',
	localField: '_id',
	foreignField: 'quoted_post.post_id'
});

CommentSchema.virtual('likes', {
	ref: 'Like',
	localField: '_id',
	foreignField: 'post'
});

CommentSchema.virtual('comment_count', {
	ref: 'Comment',
	localField: '_id',
	foreignField: 'parent_post.post_id',
	count: true
});

CommentSchema.virtual('repost_count', {
	ref: 'Post',
	localField: '_id',
	foreignField: 'quoted_post.post_id',
	count: true
});

CommentSchema.virtual('like_count', {
	ref: 'Like',
	localField: '_id',
	foreignField: 'post',
	count: true
});

export default mongoose.model<CommentInterface>('Comment', CommentSchema);

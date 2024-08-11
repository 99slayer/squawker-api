import mongoose, { AnyObject, FilterQuery } from 'mongoose';
import { doc, PostInterface } from '../types';
import Comment from './comment';
import Like from './like';
const Schema = mongoose.Schema;

const PostSchema = new Schema<PostInterface>(
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
			pfp: { type: String, required: false }
		},
		quoted_post: {
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
			required: false
		},
		post_image: { type: String, required: false }
	},
	{
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
		id: false
	}
);

// HOOKS
PostSchema.pre('findOneAndDelete', async function (next) {
	const query: FilterQuery<AnyObject> = this.getQuery();
	const post: doc<PostInterface> = await this.model.findOne(query);

	await Like.deleteMany({ post: post?._id });

	next();
});

PostSchema.pre('deleteMany', async function (next) {
	const query: FilterQuery<AnyObject> = this.getQuery();
	const post: doc<PostInterface> = await this.model.findOne(query);

	await Comment.deleteMany({ root_post: post?._id });
	await Like.deleteMany({ post: post?._id });

	next();
});

// VIRTUALS
PostSchema.virtual('comments', {
	ref: 'Comment',
	localField: '_id',
	foreignField: 'root_post'
});

PostSchema.virtual('direct_replies', {
	ref: 'Comment',
	localField: '_id',
	foreignField: 'parent_post.post_id'
});

PostSchema.virtual('reposts', {
	ref: 'Post',
	localField: '_id',
	foreignField: 'quoted_post.post_id'
});

PostSchema.virtual('likes', {
	ref: 'Like',
	localField: '_id',
	foreignField: 'post'
});

PostSchema.virtual('comment_count', {
	ref: 'Comment',
	localField: '_id',
	foreignField: 'root_post',
	count: true
});

PostSchema.virtual('repost_count', {
	ref: 'Post',
	localField: '_id',
	foreignField: 'quoted_post.post_id',
	count: true
});

PostSchema.virtual('like_count', {
	ref: 'Like',
	localField: '_id',
	foreignField: 'post',
	count: true
});

export default mongoose.model<PostInterface>('Post', PostSchema);

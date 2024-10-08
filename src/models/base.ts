import mongoose from 'mongoose';
import { BaseInterface } from '../types';
import PostDataSchema from './postdata';
import PostBodySchema from './postbody';
const Schema = mongoose.Schema;

export const BaseSchema = new Schema<BaseInterface>(
	{
		post_data: PostDataSchema,
		post: PostBodySchema,
		liked: { type: Boolean, default: false }
	},
	{
		discriminatorKey: 'post_type',
		collection: 'posts',
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
		id: false
	}
);

// VIRTUALS
BaseSchema.virtual('direct_comments', {
	ref: 'Comment',
	localField: 'post_data.post_id',
	foreignField: 'parent_post._id',
	match: { 'post_data.repost': false }
});

BaseSchema.virtual('reposts', {
	ref: 'Base',
	localField: 'post_data.post_id',
	foreignField: 'post_data.post_id',
	match: { 'post_data.repost': true }
});

BaseSchema.virtual('likes', {
	ref: 'Like',
	localField: 'post_data.post_id',
	foreignField: 'post'
});

BaseSchema.virtual('direct_comment_count', {
	ref: 'Comment',
	localField: 'post_data.post_id',
	foreignField: 'parent_post._id',
	match: { 'post_data.repost': false },
	count: true
});

BaseSchema.virtual('repost_count', {
	ref: 'Base',
	localField: 'post_data.post_id',
	foreignField: 'post_data.post_id',
	match: { 'post_data.repost': true },
	count: true
});

BaseSchema.virtual('like_count', {
	ref: 'Like',
	localField: 'post_data.post_id',
	foreignField: 'post',
	count: true
});

export default mongoose.model<BaseInterface>('Base', BaseSchema);

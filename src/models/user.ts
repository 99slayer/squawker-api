import mongoose from 'mongoose';
import { UserInterface } from '../types';
const Schema = mongoose.Schema;

const UserSchema = new Schema<UserInterface>(
	{
		username: { type: String, required: true },
		password: { type: String, required: true },
		email: { type: String, required: true },
		nickname: {
			type: String,
			default: function () {
				return this.username;
			}
		},
		join_date: { type: Date, required: true },
		pfp: { type: String, required: false },
		profile_header: { type: String, required: false },
		profile_text: { type: String, required: false },
		following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
		followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
	},
	{
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
		id: false
	}
);

// VIRTUALS
UserSchema.virtual('posts', {
	ref: 'Post',
	localField: '_id',
	foreignField: 'post_data.user.id',
});

UserSchema.virtual('comments', {
	ref: 'Comment',
	localField: '_id',
	foreignField: 'post.user.id',
});

UserSchema.virtual('likes', {
	ref: 'Like',
	localField: '_id',
	foreignField: 'user',
});

UserSchema.virtual('post_count', {
	ref: 'Post',
	localField: '_id',
	foreignField: 'post_data.user.id',
	count: true
});

UserSchema.virtual('comment_count', {
	ref: 'Comment',
	localField: '_id',
	foreignField: 'post.user.id',
	count: true
});

UserSchema.virtual('like_count', {
	ref: 'Like',
	localField: '_id',
	foreignField: 'user',
	count: true
});

export default mongoose.model<UserInterface>('User', UserSchema);

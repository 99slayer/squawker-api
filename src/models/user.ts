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
		pfp: { type: String },
		profile_header: { type: String },
		profile_text: { type: String },
		following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
		followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
		posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
		comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
		likes: [{ type: Schema.Types.ObjectId, ref: 'Like' }]
	},
	{
		toJSON: { virtuals: true }
	}
);

// VIRTUALS
UserSchema.virtual('following_count').get(function () {
	const count: number = this.following.length;
	return count;
});

UserSchema.virtual('follower_count').get(function () {
	const count: number = this.followers.length;
	return count;
});

export default mongoose.model<UserInterface>('User', UserSchema);

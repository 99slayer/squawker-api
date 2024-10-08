import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const PostDataSchema = new Schema(
	{
		post_id: {
			type: Schema.Types.ObjectId,
			ref: 'Base',
			required: true
		},
		timestamp: { type: Date, required: true },
		repost: { type: Boolean, default: false },
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
	{ _id: false }
);

export default PostDataSchema;

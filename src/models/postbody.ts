import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const PostBodySchema = new Schema(
	{
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
	}, { _id: false }
);

export default PostBodySchema;

import mongoose from 'mongoose';
import { UserInterface } from '../types';
const Schema = mongoose.Schema;

const UserSchema = new Schema<UserInterface>(
	{
		username: { type: String },
		password: { type: String },
		email: { type: String },
		nickname: { type: String },
	}
);

export default mongoose.model<UserInterface>('User', UserSchema);

import mongoose from 'mongoose';
import { GuestInterface } from '../types';
import User from './user';
const Schema = mongoose.Schema;

const GuestSchema = new Schema<GuestInterface>(
	{
		expireAt: { type: Date, expires: 300 }
	}
);

export default User.discriminator<GuestInterface>('Guest', GuestSchema);

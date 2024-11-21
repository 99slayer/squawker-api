import mongoose from 'mongoose';
import { GuestInterface } from '../types';
import User from './user';
const Schema = mongoose.Schema;

const current = new Date();
const currentMS = current.getTime();
const expireDate = new Date(currentMS + 60 * 60 * 1000);

const GuestSchema = new Schema<GuestInterface>(
	{
		expireAt: { type: Date, default: expireDate }
	}
);

export default User.discriminator<GuestInterface>('Guest', GuestSchema);

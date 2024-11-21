const LocalStrategy = require('passport-local').Strategy;
import User from './models/user';
import passport, { DoneCallback as dcb } from 'passport';
import bcrypt from 'bcryptjs';
import { PopulatedDoc } from 'mongoose';
import { UserInterface } from './types';

export function initialize(passport: passport.PassportStatic) {
	const authenticateUser = async (
		username: string,
		password: string,
		done: dcb
	): Promise<void> => {
		const user: UserInterface | null = await User.findOne({ username: username });

		if (!user) {
			const err = new Error('Query failed.');
			return done(err, false);
		}

		try {
			if (!('password' in user)) return done(null, false);
			if (await bcrypt.compare(password, user.password)) {
				return done(null, user);
			} else {
				const err = new Error('Invalid user input.');
				return done(err, false);
			}
		} catch (error) {
			return done(error);
		}
	};

	passport.use(
		new LocalStrategy(authenticateUser)
	);

	passport.serializeUser((user: any, done: dcb): void => {
		done(null, user._id);
	});

	passport.deserializeUser(async (id: string, done: dcb): Promise<void> => {
		const user: PopulatedDoc<UserInterface> | null = await User.findById(id);
		done(null, user);
	});
}

const LocalStrategy = require('passport-local').Strategy;
import User from './models/user';
import passport, { DoneCallback as dcb } from 'passport';

export function initialize(passport: passport.PassportStatic) {
	const authenticateUser = async (username: string, password: string, done: dcb): Promise<void> => {
		const user = await User.findOne({ username: username });

		if (!user) {
			console.log('user does not exist');
			return done(null, false);
		}

		try {
			if (password === user.password) {
				console.log('authenticated');
				console.log(user);
				return done(null, user);
			} else {
				console.log('wrong password');
				return done(null, false);
			}
		} catch (error) {
			return done(error);
		}
	};

	passport.use(
		new LocalStrategy(authenticateUser)
	);

	passport.serializeUser((user: any, done: dcb): void => {
		console.log('serialize');

		done(null, user.id);
	});

	passport.deserializeUser(async (id: string, done: dcb): Promise<void> => {
		console.log('deserialize');

		const user = await User.findById(id);
		done(null, user);
	});
}

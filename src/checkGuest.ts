import {
	req,
	res,
	next
} from './types';

function checkGuest(req: req, res: res, next: next) {
	if (res.locals.user.guest) throw new Error('401');
	next();
}

export default checkGuest;

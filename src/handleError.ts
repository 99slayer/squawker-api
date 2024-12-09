import {
	req,
	res,
	next
} from './types';
import Debug from 'debug';
const debug = Debug('error');

function handleError(
	err: Error,
	req: req,
	res: res,
	next: next
) {
	debug(err.message);

	if (res.locals.validationErrors) {
		debug('[VALIDATION ERRORS]');
		debug(res.locals.validationErrors);
	}

	let code;
	switch (err.message) {
		case 'Invalid user input.':
		case 'Invalid request query.':
			code = 400;
			break;
		case 'Unauthorized.':
			code = 403;
			break;
		case 'Query failed.':
			code = 404;
			break;
		case 'Unacceptable request.':
			code = 406;
			break;
		default:
			code = 500;
			break;
	}

	if (res.locals.validationErrors) {
		res.status(code).send({ errors: res.locals.validationErrors });
	} else {
		res.sendStatus(code);
	}
}

export default handleError;

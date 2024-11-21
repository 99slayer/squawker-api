import {
	req,
	res,
	next
} from './types';

function handleError(
	err: Error,
	req: req,
	res: res,
	next: next
) {
	console.log('[ERROR MESSAGE] ' + err.message);
	if (res.locals.validationErrors) {
		console.log('[VALIDATION ERRORS]' + res.locals.validationErrors);
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

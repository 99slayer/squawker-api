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
	const code: number = parseInt(err.message);
	res.sendStatus(Number.isNaN(code) ? 500 : code);
}

export default handleError;

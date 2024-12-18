import express from 'express';
require('dotenv').config();
import path from 'path';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import { initialize } from './passportConfig';
import { req, res, next } from './types';
import http, { Server } from 'http';
import logger from 'morgan';
import Debug from 'debug';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import limit from 'express-rate-limit';
const debug = Debug('server');
import err from './handleError';

import apiRouter from './routes/api';

const isDev = process.env.NODE_ENV === 'development';

const app = express();
app.enable('trust proxy');

import mongoose from 'mongoose';
mongoose.set('strictQuery', false);

type db = string | undefined;
const db: db = isDev ? process.env.TEST_DB : process.env.PROD_DB;

main().catch((err) => console.log(err));
async function main(): Promise<void> {
	if (!db) throw new Error('db undefined.');
	await mongoose.connect(db);
}

app.use(compression());
app.use(helmet());

const limiter = limit({
	windowMs: 60000, // 1 min
	max: 400
});
app.use(limiter);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
	cors({
		origin: [
			`${isDev ? process.env.DEV_ORIGIN_1 : process.env.PROD_ORIGIN_1}`,
			`${isDev ? process.env.DEV_ORIGIN_2 : process.env.PROD_ORIGIN_2}`,
		],
		methods: ['GET', 'POST', 'PUT', 'DELETE'],
		credentials: true,
		preflightContinue: false
	}),
);
app.use(express.static(path.join(__dirname, 'public')));

initialize(passport);

const prodCookie: object = {
	httpOnly: false,
	secure: true,
	sameSite: 'none'
};

const devCookie: object = {
	httpOnly: false,
	secure: false,
	sameSite: false
};

app.use(session({
	secret: process.env.SESSION_SECRET as string,
	resave: false,
	saveUninitialized: false,
	store: MongoStore.create({ mongoUrl: db }),
	cookie: isDev ? devCookie : prodCookie
}));
app.use(passport.initialize());
app.use(passport.session());

app.use((req: req, res: res, next: next): res | next | void => {
	if (
		req.url === '/login' ||
		req.url === '/signup' ||
		req.url === '/signup-guest'
	) return next();
	if (!req.isAuthenticated()) throw new Error('Unauthorized.');

	const userData: Express.User = {
		_id: req.user._id,
		username: req.user.username,
		nickname: req.user.nickname,
		email: req.user.email,
		password: req.user.password,
		pfp: req.user.pfp,
		guest: req.user.user_type === 'Guest' ? true : false
	};

	res.locals.user = userData;
	next();
});

// Validates image urls.
app.use((req: req, res: res, next: next): res | next | void => {
	if (req.body.image || req.body.pfp || req.body.header) {
		const imageUrl: string = req.body.image || req.body.pfp || req.body.header;

		if (!process.env.SUPA_URL) throw new Error('500');
		if (imageUrl.startsWith(process.env.SUPA_URL)) return next();
		if (imageUrl === 'clear') return next();

		throw new Error('Invalid request query.');
	} else next();
});

app.use(err);
app.use('/', apiRouter);

// ---------------
type port = string | number | boolean;
const port: port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

const server: Server = http.createServer(app);

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function normalizePort(val: string): string | number | boolean {
	const port = parseInt(val, 10);

	if (isNaN(port)) {
		// named pipe
		return val;
	}

	if (port >= 0) {
		// port number
		return port;
	}

	return false;
}

function onError(error: NodeJS.ErrnoException): void {
	if (error.syscall !== 'listen') {
		throw error;
	}

	const bind = typeof port === 'string'
		? 'Pipe ' + port
		: 'Port ' + port;

	console.log(error.code);
	// handle specific listen errors with friendly messages
	switch (error.code) {
		case 'EACCES':
			console.error(bind + ' requires elevated privileges');
			process.exit(1);
			break;
		case 'EADDRINUSE':
			console.error(bind + ' is already in use');
			process.exit(1);
			break;
		default:
			throw error;
	}
}

function onListening(): void {
	const addr = server.address();
	const bind: string = typeof addr === 'string'
		? 'pipe ' + addr
		: 'port ' + addr?.port;
	debug('Listening on ' + bind);
}

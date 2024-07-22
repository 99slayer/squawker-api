import express from 'express';
import path from 'path';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import { initialize } from './passportConfig';
import { req, res, next } from './types';
import http, { Server } from 'http';
import https from 'https';
require('dotenv').config();
import logger from 'morgan';
import Debug from 'debug';
import cors from 'cors';
const debug = Debug('server');

const apiRouter = require('./routes/api');

const app = express();

import mongoose from 'mongoose';
mongoose.set('strictQuery', false);

const db: string | undefined = process.env.PROD_DB || process.env.TEST_DB;

main().catch((err) => console.log(err));
async function main(): Promise<void> {
	if (!db) throw new Error('db undefined.');
	await mongoose.connect(db);
}

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
	cors({
		origin: [
			'http://localhost:5173',
			'http://127.0.0.1:5173'
		],
		credentials: true,
	}),
);
app.use(express.static(path.join(__dirname, 'public')));

initialize(passport);

app.use(session({
	secret: 'secret',
	resave: false,
	saveUninitialized: false,
	store: MongoStore.create({ mongoUrl: db }),
	cookie: {
		httpOnly: true,
		secure: true,
		sameSite: 'none'
	}
}));
app.use(passport.initialize());
app.use(passport.session());

app.use((req: req, res: res, next: next): res | next | void => {
	console.log('user is authenticated:', req.isAuthenticated());
	console.log('user =>', req.user);

	if (req.url === '/login') return next();
	if (!req.isAuthenticated()) {
		console.log('user not authenticated');
		return res.sendStatus(401);
	}

	next();
});

app.use('/', apiRouter);

// ---------------
const port: string | number | boolean = normalizePort(process.env.PORT || '3000');
app.set('port', port);

const server: Server = https.createServer(
	{
		key: process.env.KEY,
		cert: process.env.CERT
	},
	app
);
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

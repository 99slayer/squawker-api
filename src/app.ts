import express from 'express';
import path from 'path';
import http, { Server } from 'http';
require('dotenv').config();
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import Debug from 'debug';
import cors from 'cors';
const debug = Debug('server');

const testRouter = require('./routes/test');

const app = express();

import mongoose from 'mongoose';
mongoose.set('strictQuery', false);

const db: string | undefined = process.env.PROD_DB || process.env.TEST_DB;

main().catch((err) => console.log(err));
async function main() {
	if (!db) throw new Error('db undefined.');
	await mongoose.connect(db);
}

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
	cors({
		origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
		credentials: true,
	}),
);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', testRouter);

// ---------------
const port: string | number | boolean = normalizePort(process.env.PORT || '3000');
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
	const bind = typeof addr === 'string'
		? 'pipe ' + addr
		: 'port ' + addr?.port;
	debug('Listening on ' + bind);
}

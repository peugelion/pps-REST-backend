#!/usr/bin/env node

'use strict';

require('dotenv').config() // https://github.com/motdotla/dotenv

//var env = process.env.NODE_ENV || 'dev';
var production = process.env.NODE_ENV === 'production'
if (production) {
	// returns an instance of node-greenlock with additional helper methods
	var lex = require('greenlock-express').create({
		// set to https://acme-v01.api.letsencrypt.org/directory in production
		// server: 'https://acme-staging.api.letsencrypt.org/directory'
		// server: 'https://acme-v01.api.letsencrypt.org/directory'

		version: 'draft-12',
		// https://acme-staging-v02.api.letsencrypt.org/directory
		server: 'https://acme-v02.api.letsencrypt.org/directory',
		// , server: 'https://acme-staging-v02.api.letsencrypt.org/directory'
		// Where the certs will be saved, MUST have write access
		configDir: './ssl',
		// , store: require('le-store-certbot').create({ webrootPath: './ssl/acme-challenges' })
		email: 'millllan@gmail.com',
		agreeTos: true,
		// , approveDomains: approveDomains
		approveDomains: ['supervisor.apdoo.com'],
		// If you wish to replace the default plugins, you may do so here
		//
		challenges: {
			'http-01': require('le-challenge-fs').create({
				webrootPath: './ssl/acme-challenges'
			})
		}
	});

	// handles acme-challenge and redirects to https
	// require('http').createServer(lex.middleware(require('redirect-https')())).listen(80, function () {
	// 	console.log("Listening for ACME http-01 challenges on", this.address());
	// });
}

var express = require("express"),
	app = express(),
	bodyParser = require('body-parser'),
	path = require('path'),
	fs = require('fs'),
	flash = require('connect-flash'),
	methodOverride = require('method-override'),
	session = require('express-session'),
	cookieParser = require('cookie-parser'),
	// cors 			= require('cors'),
	compression = require('compression');

var staticRoot = __dirname + '/public/';

var indexRoutes = require('./app/routes/index'),
	dashboard = require('./app/routes/dashboard');
// taskRoutes   = require('./routes/tasks'),

// body-parser provides req.body object
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());

// methodOverride provides the override for PUT and DELETE HTTP methods
app.use(methodOverride("_method"));

app.use(session({
	secret: "Once upon a time...!",
	resave: false,
	saveUninitialized: false,
	cookie: {
		path: '/',
		httpOnly: true,
		secure: false,
		// maxAge: 30 * 60 * 1000,
		maxAge: 7 * 24 * 60 * 60 * 1000, // 5 days
	}
}));

app.use(cookieParser());
app.use(compression()); // gzip html\js\css response
// app.use(compression({filter: shouldCompress}));  // gzip html\js\css response
// function shouldCompress (req, res) {
// 	if (req.headers['x-no-compression']) {
// 		console.log('x-no-compression');
// 	  return false // don't compress responses with this request header
// 	}
// 	return compression.filter(req, res)// fallback to standard filter function
// }

// var corsWhitelist = ['http://localhost', 'http://localhost:4200', 'http://127.0.0.1', 'http://127.0.0.1:3000',  'http://127.0.0.1:4200', 'http://10.11.2.178:4200', 'http://10.11.2.178', 'https://10.11.2.178:443', 'http://10.11.2.178:3000']
// var corsOptions = {
// 	origin: function (origin, callback) {
// 	  if (corsWhitelist.indexOf(origin) !== -1 || !origin) {
// 		callback(null, true)
// 	  } else {
// 		callback(new Error('Not allowed by CORS'))
// 		// callback	(null, true)
// 	  }
// 	},
// 	credentials: true
// }
// app.use(cors(corsOptions));

// for success/error messages between two requests
app.use(flash());

// templating engine ejs - embedded javascript
// app.set("view engine", "ejs");

// use the REST routes
app.use(indexRoutes);
app.use("/api/dashboard", dashboard); /* da se ng ruta i proxy api putanja razlikuju, sve api pozive sam prebacio na /api/ */
//app.use("/tasks", taskRoutes);


// middleware to use on every request
/* https://stackoverflow.com/questions/49640365/mean-nodejs-server-for-angular-app-how-do-i-serve-angular-routes */
app.use(function (req, res, next) {
	res.locals.currentUser = req.session.currentUser;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	//if the request is not html then move along
	var accept = req.accepts('html', 'json', 'xml');
	if (accept !== 'html') {
		return next();
	}
	// if the request has a '.' assume that it's for a file, move along
	var ext = path.extname(req.path);
	if (ext !== '') {
		return next();
	}
	if (fs.existsSync(staticRoot + '/index.html')) {
		fs.createReadStream(staticRoot + '/index.html').pipe(res);
	}
});

// with this I'm serving the public directory
const maxAge = 99 * 24 * 3600 * 1000; // 7 days, 3600000msec == 1hour
app.use(express.static(__dirname + "/public", {
	maxAge: maxAge
}));

// Start the web server
if (production) {
	// handles your app
	require('https').createServer(lex.httpsOptions, lex.middleware(app)).listen(process.env.HTTPS_PORT || 443, function () {
		console.log("Listening for ACME tls-sni-01 challenges and serve app on", this.address());
	});
	const server = app.listen(process.env.HTTP_PORT || 3000, function () {
		const host = server.address().address
		const port = server.address().port
		console.log(`PPS supervisor server started! Listening at http://${host}:${port}`);
	});
} else {
	const server = app.listen(process.env.HTTP_PORT || 3000, function () {
		const host = server.address().address
		const port = server.address().port
		console.log(`PPS supervisor server started! Listening at http://${host}:${port}`);
	});
	const serverHttps = app.listen(process.env.HTTPS_PORT || 443, function () {
		const host = serverHttps.address().address
		const port = serverHttps.address().port
		console.log(`PPS supervisor server started! Listening at http://${host}:${port}`);
	});
}
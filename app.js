#!/usr/bin/env node
var express 	 		 = require("express"),
		app				 		 = express(),
		bodyParser 		 = require('body-parser'),
		flash	 				 = require('connect-flash'),
		methodOverride = require('method-override'),
		session				 = require('express-session'),
		cookieParser	 = require('cookie-parser');
		cors = require('cors');


var indexRoutes  = require('./routes/index'),
		dashboard 	 = require('./routes/dashboard');
		// taskRoutes   = require('./routes/tasks'),
		// ticketRoutes = require('./routes/tickets');

// body-parser provides req.body object
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
// app.use(cors());
var corsWhitelist = [
	'http://localhost', 'http://localhost:4200', 'http://127.0.0.1', 'http://127.0.0.1:4200', 'http://10.11.2.178:4200', 'http://10.11.2.178', 'https://10.11.2.178:443'
]
var corsOptions = {
	origin: function (origin, callback) {
	  if (corsWhitelist.indexOf(origin) !== -1 || !origin) {
		callback(null, true)
	  } else {
		callback(new Error('Not allowed by CORS'))
		// callback	(null, true)
	  }
	},
	credentials: true
  }
app.use(cors(corsOptions));

// with this I'm serving the public directory
const maxAge = 7 * 24 * 3600 * 1000;    // 7 days, 3600000msec == 1hour
app.use(express.static(__dirname + "/public", { maxAge: maxAge }));

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
		maxAge: 30 * 24 * 60 * 60 * 1000,   // 30 days
	}
}));

app.use(cookieParser());

// for success/error messages between two requests
app.use(flash());

// templating engine ejs - embedded javascript
app.set("view engine", "ejs");

// middleware to use on every request
app.use(function(req, res, next) {
		res.locals.currentUser = req.session.currentUser;
		res.locals.error = req.flash("error");
		res.locals.success = req.flash("success");
		next();
});

// use the REST routes
app.use(indexRoutes); 
// app.use("/dashboard", dashboard);
app.use("/api/dashboard", dashboard); /* da se ng ruta i proxy api putanja razlikuju, sve api pozive sam prebacio na /api/ */
//app.use("/tasks", taskRoutes); 
//app.use("/tickets", ticketRoutes); 

//app.use(router);

app.listen(3000, function() {
	console.log('TaskManager app started!');
});
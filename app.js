#!/usr/bin/env node
var express 	 		 = require("express"),
		app				 		 = express(),
		bodyParser 		 = require('body-parser'),
		flash	 				 = require('connect-flash'),
		methodOverride = require('method-override'),
		session				 = require('express-session'),
		cookieParser	 = require('cookie-parser');
		

var indexRoutes  = require('./routes/index'),
		dashboard 	 = require('./routes/dashboard');
		// taskRoutes   = require('./routes/tasks'),
		// ticketRoutes = require('./routes/tickets');

// body-parser provides req.body object
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// with this I'm serving the public directory
app.use(express.static(__dirname + "/public"));

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
		maxAge: 30 * 60 * 1000,
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
app.use("/dashboard", dashboard); 
//app.use("/tasks", taskRoutes); 
//app.use("/tickets", ticketRoutes); 

//app.use(router);

app.listen(3000, function() {
	console.log('TaskManager app started!');
});
let express 	 = require('express'),
		router  	 = express.Router(),
		middleware = require('../middleware');

// ===== ORDER OF ROUTES IS IMPORTANT!!! =====
// root route
router.get("/", function(req, res) {
	if(req.cookies.hubieLoginUsername && req.cookies.hubieLoginPassword) {
		middleware.handleLogin(req, res);
	} else {
		res.redirect('login');
	}
});

// show login page
router.get("/login", function(req, res) {
	if(req.sessionID && req.session.fk_appUser) {
		(req.query.forTicketing !== undefined) ? res.redirect('tickets/ticketOverview') : res.redirect('tasks/taskOverview');
	} else {
		res.render('login', {style: req.cookies.style, forTicketing: req.query.forTicketing});
	}
});

// handle login
// router.post("/login", callback);
router.post('/login', function(req, res) {
	middleware.handleLogin(req, res, req.body.forTicketing);
});

// logout
router.get("/logout", function(req, res) {
	req.session.destroy(err => {
		if(err) console.log("You are not logged out. Reason : " + err);
	});
	res.clearCookie("hubieLoginUsername");
	res.clearCookie("hubieLoginPassword");
	if(req.query.forTicketing) res.redirect('login?forTicketing=true'); 
	else res.redirect('login');
});

module.exports = router;
let express = require('express'),
	router = express.Router(),
	middleware = require('../middleware');

// ===== ORDER OF ROUTES IS IMPORTANT!!! =====
// root route
// router.get("/", function(req, res) {
// 	if(req.cookies.hubieLoginUsername && req.cookies.hubieLoginPassword) {
// 		middleware.handleLogin(req, res);
// 	} else {
// 		res.redirect('login');
// 	}
// });

// handle login
// router.post("/login", callback);
router.post('/api/login', function (req, res) {
	middleware.handleLogin(req, res);
});

// logout
router.get("/api/logout", function (req, res) {
	req.session.destroy(err => {
		if (err) console.log("You are not logged out. Reason : " + err);
	});
	res.clearCookie("hubieLoginUsername");
	res.clearCookie("hubieLoginPassword");
	res.send();
});

// router.get('*', (req, res) => { 
// 	res.sendFile(path.resolve('dist/pps-supervisor-webapp/index.html')); 
// });

module.exports = router;
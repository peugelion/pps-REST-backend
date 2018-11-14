let hubieApi 			= require('../models/hubie-interface').connect(),
		moment 		    = require('moment'),
		middlewareObj = {};

moment.locale('sr');

middlewareObj.isLoggedIn = function(req, res, next) {
	// console.log('middlewareObj.isLoggedIn req.sessionID', req.sessionID);
	// if(req.sessionID && req.session.fk_appUser) {
	if(req.sessionID && req.session.Fk_Radnik) {
		return next();
	}
	// req.flash("error", "You need to be logged in to do that!");
	// if (req.baseUrl.includes("tickets")) {
	// 	res.redirect('/login?forTicketing=true');
	// } else {
	// 	res.redirect('/login');
	// }
	// res.json({ success: 'false' })
	console.log('isLoggedIn false, ', req.session);
	res.sendStatus(401); // Unauthorized
}

// middlewareObj.handleLogin = function(req, res, forTicketing) {
middlewareObj.handleLogin = async (req, res) => {
	try {
		let username = req.body.username || req.cookies.hubieLoginUsername;
		let password = req.body.password || req.cookies.hubieLoginPassword;

		// console.log("req.body", req.body);
		// console.log("req.cookies", req.cookies);

		// req.session.email = "asd@asd";

		// // if (req.body.remember_me) {
		// 	console.log('remember_me', req.body.remember_me);
		// 	let cookieOptions = {
		// 		// path: '/',
		// 		httpOnly: true,
		// 		maxAge: 30 * 24 * 60 * 60 * 1000,   // 30 days
		// 	}
		// 	res.cookie("hubieLoginUsername", username, cookieOptions);
		// 	res.cookie("hubieLoginPassword", password, cookieOptions);
		// // }
		// req.session.username = username;
		// res.send();

		result = await hubieApi.login(username, password);  // GO

		req.session.username = username;
		req.session.Fk_Radnik		  = result.recordsets[0][0].Fk_Radnik;
		req.session.SifraPreduzeca    = result.recordsets[0][0].SifraPreduzeca;
		req.session.Fk_PoslovnaGodina = result.recordsets[0][0].Fk_PoslovnaGodina;
		req.session.Fk_Jezik		  = result.recordsets[0][0].Fk_Jezik;
		// console.log('login',result.recordsets[0][0]);

		if (req.body.remember_me) {
			let cookieOptions = {
				path: '/',
				httpOnly: true,
				maxAge: 30 * 24 * 60 * 60 * 1000,   // 30 days
			}
			// res.cookie("hubieLoginUsername", username, cookieOptions);
			// res.cookie("hubieLoginPassword", password, cookieOptions);
		} else {
			req.session.taskStatuses = result.recordsets[3];
			// res.redirect('tasks/taskOverview');
		}
		res.json(await {
			// 'env' : result.recordsets[0][0],
			'supervizor' : result.recordsets[1][0],
			'subordinates' : result.recordsets[2]
		});
		res.send();
	} catch (err) {
	  	// next(err);
		// console.log('login err', err)
		if (err.originalError) {
			console.log('login err msg', err.originalError.info.message);
		}
		req.flash("error", err.message);
		// res.redirect('/login');
		// res.send(400, 'missing authorization header');
		res.sendStatus(401); // Unauthorized
		// res.send(err);
	};
}

module.exports = middlewareObj;
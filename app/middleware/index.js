// let hubieApi 			= require('../models/hubie-interface').connect(),
let hubieApi 			= require('../models/hubie-interface'),
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

		console.log('pre login');
		result = await hubieApi.login(username, password);  // GO

		req.session.username = username;
		req.session.Fk_Radnik		  = result.recordsets[0][0].Fk_Radnik;
		req.session.SifraPreduzeca    = result.recordsets[0][0].SifraPreduzeca;
		req.session.Fk_PoslovnaGodina = result.recordsets[0][0].Fk_PoslovnaGodina;
		req.session.Fk_Jezik		  = result.recordsets[0][0].Fk_Jezik;
		// console.log('login',result.recordsets[1][0]);
		// console.log('login sve 0',result.recordsets[0]);
		// console.log('login sve 1',result.recordsets[1]);
		// console.log('login sve 2',result.recordsets[2]);
		// console.log('login sve 3',result.recordsets[3]);
		
		if (result.recordsets[1].lenght) {
			// console.log('recordsets[1]', result.recordsets[1].lenght, result.recordsets[1]);
			req.session.Supervizor		  = result.recordsets[1][0].Sifra;
		}


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
			'subordinates' : result.recordsets[2],
			'permissions' : result.recordsets[3][0][''],
		});
		res.send();
	} catch (err) {
		console.log('login err', err.message);
		// next(err);
		req.flash("error", err.message);
		if (err.message === 'IncorrectLoginData') {
			console.log('login 401', err.message);
			res.sendStatus(401); // Unauthorized
		} else if (err.message === 'Connection is closed.') {
			console.log('login: Connection is closed', err.message);
			// await hubieApi.connect();
			// console.log('login: retry sql connection ...', req);
			// await hubieApi.login(username, password);  // GO
			// this.handleLogin(req, res);
			middlewareObj.handleLogin(req, res);
		} else {
			if (err.message === 'UserNotAuthorized') {
				console.log('login 400', err.message)
			}
			// res.send(400, err.message);
			res.status(400).send(err.message)
		}
	};
}

module.exports = middlewareObj;
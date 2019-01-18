// let hubieApi 			= require('../models/hubie-interface').connect(),
let hubieApi = require('../models/hubie-interface'),
	moment = require('moment'),
	middlewareObj = {};

moment.locale('sr');

middlewareObj.isLoggedIn = async (req, res, next) => {
	// console.log('middlewareObj.isLoggedIn req.sessionID', req.sessionID);
	// if(req.sessionID && req.session.fk_appUser) {
	if (req.sessionID && req.session.Fk_Radnik) {
		return next();
	}
	// req.flash("error", "You need to be logged in to do that!");
	// if (req.baseUrl.includes("tickets")) {
	// 	res.redirect('/login?forTicketing=true');
	// } else {
	// 	res.redirect('/login');
	// }
	// res.json({ success: 'false' })

	console.log('	isLoggedIn, no session, try to login with credentials from cookie ->');
	let userData = await middlewareObj.authenticate(req, res);
	if (userData) {
		return next();
	}

	console.log('  isLoggedIn false, no session ... send 401 ... . ');
	res.redirect('/login');
	res.sendStatus(401); // Unauthorized
}

// middlewareObj.handleLogin = function(req, res, forTicketing) {
middlewareObj.handleLogin = async (req, res) => {
	try {
		console.log('	handleLogin ->');
		let userData = await middlewareObj.authenticate(req, res);
		if (!userData) {
			throw err;
		}
		res.json(await {
			// 'env' : result.recordsets[0][0],
			'supervizor': userData[1][0],
			'subordinates': userData[2],
			'permissions': userData[3][0][''],
		});
		res.send();
	} catch (err) {
		console.log('err in middlewareObj.handleLogin', err.message);
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

//

/* authenticate and start session */
middlewareObj.authenticate = async (req, res) => {
	try {
		let username = req.body.username || req.cookies.hubieLoginUsername;
		let password = req.body.password || req.cookies.hubieLoginPassword;

		console.log("middlewareObj.authenticate req.body", req.body);
		console.log("middlewareObj.authenticate req.cookies", req.cookies);

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

		result = await hubieApi.login(username, password); // GO
		req.session.username = username;
		req.session.Fk_Radnik = result.recordsets[0][0].Fk_Radnik;
		req.session.SifraPreduzeca = result.recordsets[0][0].SifraPreduzeca;
		req.session.Fk_PoslovnaGodina = result.recordsets[0][0].Fk_PoslovnaGodina;
		req.session.Fk_Jezik = result.recordsets[0][0].Fk_Jezik;
		// console.log('login sve 0',result.recordsets[0]);
		// console.log('login sve 1', result.recordsets[1], result.recordsets[1]);
		// console.log('login sve 1 length', result.recordsets[1].length);
		// console.log('login sve 2',result.recordsets[2]);
		// console.log('login sve 3', result.recordsets[3]);

		if (result.recordsets[1].length) {
			req.session.Supervizor = result.recordsets[1][0].Sifra;
		}

		if (req.body.remember_me) {
			let cookieOptions = {
				path: '/',
				httpOnly: true,
				maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
			}
			// res.cookie("hubieLoginUsername", username, cookieOptions);
			// res.cookie("hubieLoginPassword", password, cookieOptions);
		} else {
			req.session.taskStatuses = result.recordsets[3];
			// res.redirect('tasks/taskOverview');
		}
		return result.recordsets;
	} catch (err) {
		console.log('err in middlewareObj.authenticate', err.message);
		res.sendStatus(401); // Unauthorized
		// res.redirect('/');
	};
}

module.exports = middlewareObj;
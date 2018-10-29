let hubieApi 			= require('../models/hubie-interface').connect(),
		moment 		    = require('moment'),
		middlewareObj = {};

moment.locale('sr');

middlewareObj.isLoggedIn = function(req, res, next) {
	if(req.sessionID && req.session.fk_appUser) {
		return next();
	}
	req.flash("error", "You need to be logged in to do that!");
	if (req.baseUrl.includes("tickets")) {
		res.redirect('/login?forTicketing=true');
	} else {
		res.redirect('/login');
	}
}

middlewareObj.handleLogin = function(req, res, forTicketing) {
	let username = req.body.username || req.cookies.hubieLoginUsername;
	let password = req.body.password || req.cookies.hubieLoginPassword;

	//console.log(req.cookies.style);

	hubieApi.login(username, password, forTicketing)
		.then(result => {
			// for (i = 0; i < result.recordsets.length; i++) {
			// 	console.log("recordsets" + i + " === ", result.recordsets[i]);
			// }
			let companyCode = result.recordsets[0][0].Sifra;
			let lang_id			= result.recordsets[1][0].FK_Jezik;
			let fk_appUser	= result.recordsets[2][0].fk_korisnikApl;
			let fk_radnik	  = result.recordsets[2][0].fk_radnik;
			req.session.companyCode  = companyCode;
			req.session.fk_appUser	 = fk_appUser;
			req.session.fk_radnik	   = fk_radnik;
			req.session.lang_id			 = lang_id;
			req.session.currentUser	 = result.recordsets[2][0].ime + " " + result.recordsets[2][0].prezime;
			// req.session.taskStatuses = result.recordsets[3];
			if (req.body.remember_me) {
				let cookieOptions = {
					path: '/',
					httpOnly: true,
					maxAge: 30 * 24 * 60 * 60 * 1000,   // 30 days
				}
				res.cookie("hubieLoginUsername", username, cookieOptions);
				res.cookie("hubieLoginPassword", password, cookieOptions);
			}
			if (forTicketing !== undefined && forTicketing !== "") {
				req.session.email 		   = result.recordsets[2][0].Email;
				req.session.fk_partner   = result.recordsets[2][0].fk_Partner;
				req.session.nazivPP 	   = result.recordsets[2][0].NazivPP;
				req.session.ulicaPP 	   = result.recordsets[2][0].UlicaPP;
				req.session.mestoPP 	   = result.recordsets[2][0].MestoPP;
				req.session.ticketStatuses = result.recordsets[3];
				res.redirect('tickets/ticketOverview');
			} else {
				req.session.taskStatuses = result.recordsets[3];
				res.redirect('tasks/taskOverview');
			}
		})
		.catch(err => {
			req.flash("error", err.message);
			res.redirect('/login');
		});
}

module.exports = middlewareObj;
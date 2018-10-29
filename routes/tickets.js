let express    = require('express'),
		router  	 = express.Router(),
		middleware = require('../middleware'),
		hubieApi 	 = require('../models/hubie-interface').connect(),
		multer		 = require('multer'),
		fileCtrl	 = multer(),
		moment 		 = require('moment'),
		fs        = require('fs');

moment.locale('sr');

// show login page for ticketing
// router.get("/login", function(req, res) {
// 	hubieApi.login('task', 'task', true)
// 		.then(result => {
// 			let recordsets = result.recordsets;
// 			for(i = 0; i < recordsets.length; i++) {
// 				console.log("recordset" + i + " === ", recordsets[i]);
// 			}
// 		})
// 		.catch(err => {
// 			console.log("Error ==== ", err);
// 		});
// });

// show login page
// router.get("/login", function(req, res) {
// 	if(req.sessionID && req.session.fk_appUser) {
// 		res.redirect('forma');
// 	} else {
// 		res.render('login', {style: req.cookies.style});
// 	}
// });

// handle login
// router.post('/login', function(req, res) {
// 	middleware.handleLogin(req, res, true);
// });

// show landing page
router.get('/ticketOverview', middleware.isLoggedIn, function(req, res) {
	let session = req.session;

	hubieApi.loadTickets(session.companyCode, session.fk_appUser, session.fk_partner, session.lang_id)
		.then(result => {
			res.render('tickets/ticketOverview', 
				{ tickets: result.recordset,
					bussinessPartner: session.nazivPP,
					moment: moment,
					style: req.cookies.style
				}
			);
		})
		.catch(err => {
			console.log(err);
		});
});

// load the form for new ticket
router.get('/new', middleware.isLoggedIn, function(req, res) {
	let data = {
		namePP: req.session.nazivPP,
		ticketDate: moment(Date.now()).format('DD. MM. YYYY')
	}
	res.render('tickets/newTicket', data);
});

// show specific ticket
router.get('/:id', middleware.isLoggedIn, function(req, res) {
	let session = req.session;
	hubieApi.getTicket(session.companyCode, session.lang_id, req.params.id)
		.then(result => {
			result.recordset[0].Datum = moment(result.recordset[0].Datum).format('DD. MM. YYYY');
			res.render('tickets/viewTicket', {ticketRecord: result.recordset[0], attachedDocs: result.recordsets[1], selectOptions: req.session.ticketStatuses});
		})
		.catch(err => {
			console.log(err);
		});
});

// create ticket
router.post('/', middleware.isLoggedIn, fileCtrl.single('attachedFile'), function(req, res) {
	//console.log("req ==== ", req.body);
	//console.log("req.file ==== ", req.file);
	let session = req.session;
  let newTicket = req.body;
	hubieApi.createTicket(session.companyCode, session.fk_appUser, session.fk_partner, newTicket, req.file)
		.then(result => {
			req.flash("success", `Uspešno ste kreirali prijavu pod rednim brojem ${result.returnValue}.`);
			res.redirect('/tickets/ticketOverview');
		})
		.catch(err => {
			console.log(err);
		});
});

module.exports = router;
let express    = require('express'),
		router  	 = express.Router(),
		middleware = require('../middleware'),
		hubieApi 	 = require('../models/hubie-interface').connect(),
		moment 		 = require('moment');

moment.locale('sr');

// show landing page
router.get('/', function(req, res) {
	//let session = req.session;

  hubieApi.sp_VratiPodredjeneRadnike(1, 4, 350950)
		.then(result => {
			console.log(result);
		})
		.catch(err => {
			console.log(err);
		});



	// hubieApi.sp_VratiRS(1, 4, '350950', 'm_radnik_SisPosao', 52)
	// 	.then(result => {
  //     console.log("result = " + result);
  //     console.log("error = " + hubieApi.getErrorObj());
	// 		res.json(result);
	// 		// res.render('tasks/taskOverview', 
	// 		// 	{ moment: moment, 
	// 		// 		assignedTasks: assignedTasks,
	// 		// 		groupedTasksByPartner : groupedTasksByPartner,
	// 		// 		taskStatuses: req.session.taskStatuses,
	// 		// 		style: req.cookies.style
	// 		// 	}
	// 		// );
	// 	})
	// 	.catch(err => {
  //     console.log("error = " + hubieApi.getErrorObj());
  //     console.log("pool = " + hubieApi.getPoolObj());
	// 		console.log(err);
	// 	});
});



// search parters api
router.get("/searchpartners/:searchstr", middleware.isLoggedIn, function(req, res) {
	let session = req.session;
	hubieApi.loadPartners(session.companyCode, session.lang_id, req.params.searchstr )
		.then(result => {
			var resp = {};
			//resp["success"] = true;
			resp["results"] = result.recordset;
			res.json(resp);
		})
		.catch(err => {
			console.log(err);
		});
});

// show specific task
router.get('/:id', function(req, res) {
});

// load the form to update task
router.get("/:id/edit", middleware.isLoggedIn, function(req, res) {
	let session = req.session;
	hubieApi.getTask(session.companyCode, session.lang_id, req.params.id)
		.then(result => {
			result.recordset[0].Datum = moment(result.recordset[0].Datum).format('DD. MM. YYYY');
			res.render('tasks/editTask', {taskRecord: result.recordset[0], taskStatuses: req.session.taskStatuses, logged_fk_radnik: req.session.fk_radnik, style: req.cookies.style});
		})
		.catch(err => {
			console.log(err);
		});
});

// update the task
router.put("/:id", middleware.isLoggedIn, function(req, res) {
	let task = req.body.task;
	hubieApi.updateTask(req.session.companyCode, req.session.fk_appUser, req.session.lang_id, task)
		.then(result => {
			req.flash("success", "Uspešno ste izmenili task.");
			res.redirect('/tasks/taskOverview');
		})
		.catch(err => {
			// req.flash("error", err.message);
			// res.redirect('back');
			console.log(err);
		});
});

module.exports = router;
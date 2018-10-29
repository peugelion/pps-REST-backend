let express    = require('express'),
		router  	 = express.Router(),
		middleware = require('../middleware'),
		hubieApi 	 = require('../models/hubie-interface').connect(),
		pushSubApi = require('../models/subscription-store'),
		moment 		 = require('moment');

moment.locale('sr');

// show landing page
router.get('/taskOverview', middleware.isLoggedIn, function(req, res) {
	let session = req.session;

	hubieApi.loadTasks(session.companyCode, session.fk_appUser, session.lang_id)
		.then(result => {
			let assignedTasks = [];
			let groupedTasksByPartner = {};

			for (task of result.recordset) {
				if (task.Fk_radnik === null) {
					let partnerName = task.naziv;
					if (groupedTasksByPartner.hasOwnProperty(partnerName)) {
						groupedTasksByPartner[partnerName].push(task); 
					} else {
						groupedTasksByPartner[partnerName] = [task];
					}
				} else {
					assignedTasks.push(task);
				}
			}
			res.render('tasks/taskOverview', 
				{ moment: moment, 
					assignedTasks: assignedTasks,
					groupedTasksByPartner : groupedTasksByPartner,
					taskStatuses: req.session.taskStatuses,
					style: req.cookies.style
				}
			);
		})
		.catch(err => {
			console.log(err);
		});
});

// load form to create new task \ new task page
router.get('/new', middleware.isLoggedIn, function(req, res) {
	let session = req.session;
	let opisActiveTab = req.cookies.newTask_opisActiveTab ? req.cookies.newTask_opisActiveTab : '';
	res.render('tasks/newTask', {taskStatuses: req.session.taskStatuses, style: req.cookies.style, opisActiveTab: opisActiveTab});
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

// create task
router.post('/', middleware.isLoggedIn, function(req, res) {
	let session = req.session;

  var newTask = req.body;
	hubieApi.createTask(session.companyCode, session.lang_id, session.fk_appUser, session.fk_radnik, newTask)
		.then(result => {
			var resp = {};
			resp["success"] = true;
			resp["results"] = result.recordset;
			res.json(resp);
			console.log(result);

			// send push messages
			const dataToSend = {
			  title: 'Novi Task',
			  body: `Korisnik ${req.session.currentUser} je kreirao novi task za partnera ${newTask.nazivPartnera}.\n Opis taska - ${newTask.Subject}`,
			  icon: 'assets/images/europos.png'
			};
			pushSubApi.sendPushMsgs(JSON.stringify(dataToSend))
				.then(() => {
					console.log('Uspesno poslate poruke!');
	      })
	      .catch(function(err) {
	      	console.log('Neuspesno poslate poruke!');
	      	console.log('error === ', err);
	      });
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

// user subscription specific routes
// save users subscription to db
router.post('/api/save-subscription/', function (req, res) {
  if (!pushSubApi.isValidSaveRequest(req, res)) {
    return;
  }

  return pushSubApi.saveSubscriptionToDatabase(req.body)
	  .then(function(subscriptionId) {
	    res.setHeader('Content-Type', 'application/json');
	    res.send(JSON.stringify({ 
	    	data: { 
	    		success: true, 
	    		subscriptionId: subscriptionId 
	    	}
	    }));
	  })
	  .catch(function(err) {
	    res.status(500);
	    res.setHeader('Content-Type', 'application/json');
	    res.send(JSON.stringify({
	      error: {
	        id: 'unable-to-save-subscription',
	        message: 'The subscription was received but we were unable to save it to the database.'
	      }
	    }));
	  });
});
// end of subscription specific routes

module.exports = router;
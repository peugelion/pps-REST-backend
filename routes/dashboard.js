let express    = require('express'),
		router  	 = express.Router(),
		middleware = require('../middleware'),
		hubieApi 	 = require('../models/hubie-interface').connect(),
		moment 		 = require('moment');

moment.locale('sr');

// show landing page
router.get('/', function(req, res) {
	let resultObj = {};

  hubieApi.vratiRS(1, 4, '350950', 'm_radnik_SisPosao', 52)
		.then(result => {
			resultObj.supervisorData = result.recordset[0];
			// calling hubieApi.vratiPodredjeneRadnike() returns a new Promise
			return hubieApi.vratiPodredjeneRadnike(1, 4, 350950);
		})
		.then(result => {
			resultObj.subordinates = result.recordset;
			res.json(resultObj);
		})
		.catch(err => {
			console.log(err);
		});
});

// return selected-user routes
router.get('/workerRoutes', function(req, res) {
	console.log('req query = ', req.query);
	 hubieApi.rptDnevniPregledRute(1, 16, 4, req.query.Fk_Radnik, req.query.datum)
	//hubieApi.rptDnevniPregledRute(1, 16, 4, '1455', '2018-05-29 00:00:00')
		.then(result => {
			res.json(result);
		})
		.catch(err => {
			console.log(err);
		});
});

module.exports = router;
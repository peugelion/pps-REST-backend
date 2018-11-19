let express		= require('express'),
	router		= express.Router(),
	authMW		= require('../middleware'),
	mcacheMW	= require('../middleware/memmory-cache.js'),
	hubieApi 	= require('../models/hubie-interface').connect(),
	moment 		= require('moment'),
	fs			= require('fs');

moment.locale('sr');

/* brisanje svih fajlova iz foldera */ 
rmDir = (dirPath) => {
	try { var files = fs.readdirSync(dirPath); }
	catch(e) { return; }
	if (files.length > 0)
	  for (var i = 0; i < files.length; i++) {
		var filePath = dirPath + '/' + files[i];
		if (fs.statSync(filePath).isFile())
		  fs.unlinkSync(filePath);
		else
		  rmDir(filePath);
	  }
	/* brisanje root foldera */
	// fs.rmdirSync(dirPath); 
};

/* ulaz date u srpskoj ili full ISO formi, vraca short ISO, eg. '2018-05-29' */
parseSrbDateParam = (date) => {
	if (date && date.includes(' ')) {
		return date.split(' ')[0].split('.').reverse().join('-');     // eg '29.05.2018' ili '29.05.2018 10:30:45'
	} else if (date && date.includes('T')) {
		return date.split('T')[0].split('.').reverse().join('-');     // eg '2018-05-28T00:00:00.000Z'
	} else {
		return date ? date : new Date().toISOString().split('T')[0];  // eg '2018-05-29', today if no input
	}
};

// show landing page
// router.get('/', middleware.isLoggedIn, function(req, res) {
// 	let resultObj = {};
// 	// console.log(' / ruta ', req.query);

//   hubieApi.vratiRS(1, 4, '350950', 'm_radnik_SisPosao', 52)
// 		.then(result => {
// 			resultObj.supervisorData = result.recordset[0];
// 			// calling hubieApi.vratiPodredjeneRadnike() returns a new Promise
// 			return hubieApi.vratiPodredjeneRadnike(1, 4, 350950);
// 		})
// 		.then(result => {
// 			resultObj.subordinates = result.recordset;
// 			res.json(resultObj);
// 		})
// 		.catch(err => {
// 			console.log(err);
// 		});
// });

// return selected-user routes
router.get('/workerRoutes', authMW.isLoggedIn, mcacheMW.cache(15), function(req, res) {
	const SifraPreduzeca = req.session.SifraPreduzeca, Fk_PoslovnaGodina = req.session.Fk_PoslovnaGodina, Fk_Jezik = req.session.Fk_Jezik;
	const parsedDate = moment(req.query.datum).format('YYYY-MM-DD');
	hubieApi.rptDnevniPregledRute(SifraPreduzeca, Fk_PoslovnaGodina, Fk_Jezik, req.query.Fk_Radnik, parsedDate)
		.then(result => {
			for (var i=0; i < result.recordset.length; i++) {
				let route = result.recordset[i];
				route.DatumPocetka = moment(route.DatumPocetka).utc().format('DD.MM.YYYY HH:mm:ss');
				route.DatumZavrsetka = moment(route.DatumZavrsetka).utc().format('DD.MM.YYYY HH:mm:ss');
				route.DuzinaPosete = moment(route.DuzinaPosete).utc().format('HH:mm:ss');
			}			
			res.json({"workerRoutes": result.recordset});
		})
		.catch(err => {
			console.log(err);
			res.json(err);
		});
});

router.get('/route-details/:Fk_Partner', authMW.isLoggedIn, mcacheMW.cache(15), async (req, res) => { // Fk_Partner iz 'rptDnevniPregledRute' rute
	try {
		const SifraPreduzeca = req.session.SifraPreduzeca, Fk_PoslovnaGodina = req.session.Fk_PoslovnaGodina, Fk_Jezik = req.session.Fk_Jezik;
		let result;
		const Fk_Partner = req.params.Fk_Partner;
		if (req.query.Fk_Pozicija) {
			rmDir(__dirname + `/../public/images/`);	 // brisi stare slike
			result = await hubieApi.getPodaciPartnerPozicijaSlikeNew(SifraPreduzeca, Fk_Jezik, Fk_Partner, req.query.Fk_Pozicija, req.query.date) // BORCA
			result.recordset.forEach((entry, i) => {
				if (entry.Slika) {
					const fileName = req.params.Fk_Partner + `_` +entry.Fk_PartnerPozicija+ `_` +i+ `.jpg`
					const filePath = __dirname + `/../public/images/` + fileName;
					fs.writeFileSync(filePath, entry.Slika); // save binary image from DB as file in /public/images/
					entry.Slika = `/images/` + fileName;     // replace sql binary buffer with URL path
				// } else {
				// 	entry.Slika = `/assets/404.svg`;
				}
			});
		} else if (req.query.Zalihe) {
			result = await hubieApi.vratiZalihePartnerOS(SifraPreduzeca, Fk_PoslovnaGodina, Fk_Jezik, Fk_Partner, req.query.date); // TODO input fiskalna godina (16)
		} else {
			result = await hubieApi.getPodaciPartnerPozicija(SifraPreduzeca, Fk_Jezik, Fk_Partner, req.query.date) // BORČA
		}
		res.json(await result.recordset);
	} catch (err) {
		console.log('route-detail err', err);
		res.json(err);
	  // next(err);
	}
});

// insertKomercijalistaPravo (SifraPreduzeca, username, Fk_Radnik,  Fk_Partner, date, Fk_St_670)
router.post('/insertKomercijalistaPravo/', authMW.isLoggedIn, async (req, res) => {
	try {
		const SifraPreduzeca = req.session.SifraPreduzeca,
			username         = req.session.username;
			// Supervizor		 = req.session.Supervizor,
		const Fk_RadnikSifra = req.body.Fk_RadnikSifra,
			Fk_Partner       = req.body.Fk_Partner,
			date             = parseSrbDateParam(req.body.date).toString(),	// date          = req.body.date,
			Fk_St_670        = parseInt(req.body.Fk_St_670, 10);
		
		console.log('insertKomercijalistaPravo INPUT');
		console.log(SifraPreduzeca, username || Supervizor, Fk_RadnikSifra, Fk_Partner, date, Fk_St_670);

		const result = await hubieApi.insertKomercijalistaPravo(SifraPreduzeca, username,   Fk_RadnikSifra, Fk_Partner, date, Fk_St_670);
		console.log('result', result, result.length);
		res.json(await result.recordset);
	} catch (err) {
		console.log('route-insertKomercijalistaPravo err', err);
		res.json(err);
	}
});

router.get('/dailySalesKPIsReportByCustomerBySKU/', authMW.isLoggedIn, mcacheMW.cache(15), async (req, res) => {
	try {
		console.log('dailySalesKPIsReportByCustomerBySKU USO');
		const SifraPreduzeca = req.session.SifraPreduzeca, Fk_Jezik = req.session.Fk_Jezik, Fk_PoslovnaGodina = req.session.Fk_PoslovnaGodina;
		const Datum_do = req.params.Datum_do, SifraPARTNER = req.params.SifraPARTNER;
		const Dali8OZ = 0;
		if (!Datum_do || !SifraPARTNER) {
			res.json({'success': 'false'});
			return
		}
		console.log('inpputs', Datum_do, SifraPARTNER);
		let result = await hubieApi.rptProdaja_DailySalesKPIsReportByCustomerBySKU(SifraPreduzeca, Fk_Jezik,Fk_PoslovnaGodina, Datum_do, SifraPARTNER, Dali8OZ);
		console.log('result.recordset', result.recordset);
		res.json(await result.recordset);
	} catch (err) {
		console.log('dailySalesKPIsReportByCustomerBySKU err', err);
		res.json(err);
	}
});

module.exports = router;

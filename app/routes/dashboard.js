let express = require('express'),
	router = express.Router(),
	authMW = require('../middleware'),
	mcacheMW = require('../middleware/memmory-cache.js'),
	// hubieApi 	= require('../models/hubie-interface').connect(),
	hubieApi = require('../models/hubie-interface'),
	moment = require('moment'),
	fs = require('fs');
const sharp = require('sharp');

moment.locale('sr');

/* brisanje svih fajlova iz foldera */
const rmDir = (dirPath) => {
	try { var files = fs.readdirSync(dirPath); }
	catch (e) { return; }
	if (files.length > 0) {
		for (var i = 0; i < files.length; i++) {
			var filePath = dirPath + '/' + files[i];
			if (fs.statSync(filePath).isFile())
				fs.unlinkSync(filePath);
			else
				rmDir(filePath);
		}
		// fs.rmdirSync(dirPath); /* brisanje root foldera */
	}
};

/* input jpg buffer, output .webp or .jpg, return filePath */
const parseImage = (jpgBuffer, filePath, fileName) => {
	const startTime = new Date(); // timer start
	const end = () => {
		const timeDiff = new Date() - startTime; //in ms
		console.log('Img resize\\convert takes ' + timeDiff + ' ms ' + fileName + '.webp');
	};

	// console.log('pre jpg');
	//   fs.writeFileSync(filePath + `.jpg`, entry.Slika); // save binary image from DB as file in /public/images/
	//   console.log('polse jpg');
	//   end(); /* merim vreme potrebno za image resize + convert to .webp */
	//   return `/images/` + fileName+ `.jpg`;     // replace sql binary buffer with URL path
	return sharp(jpgBuffer)
		.resize(830, 1106, { fit: "inside" })
		.sharpen()
		.toFile(filePath + `.webp`)
		.then(info => {			// console.log('resize', info);
			end(); /* merim vreme potrebno za image resize + convert to .webp */
			return `/images/` + fileName + `.webp`;     // replace sql binary buffer with URL path
		})
		.catch(err => {
			console.log('err', err);
			fs.writeFileSync(filePath + `.jpg`, entry.Slika); // save binary image from DB as file in /public/images/
			return `/images/` + fileName + `.jpg`;     // replace sql binary buffer with URL path
		});
};


/* ulaz date u srpskoj ili full ISO formi, vraca short ISO, eg. '2018-05-29' */
const parseSrbDateParam = (date) => {
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
router.get('/workerRoutes', authMW.isLoggedIn, mcacheMW.cache(9915), function (req, res) {
	const SifraPreduzeca = req.session.SifraPreduzeca, Fk_PoslovnaGodina = req.session.Fk_PoslovnaGodina, Fk_Jezik = req.session.Fk_Jezik;
	const parsedDate = moment(req.query.datum).format('YYYY-MM-DD');
	hubieApi.rptDnevniPregledRute(SifraPreduzeca, Fk_PoslovnaGodina, Fk_Jezik, req.query.Fk_Radnik, parsedDate)
		.then(result => {
			// console.log('req.query.parsirano', req.query.parsirano);
			// if (req.query.parsirano) {
			// 	console.log('WR parsirano');
			// 	for (var i=0; i < result.recordset.length; i++) {
			// 		let route = result.recordset[i];
			// 		route.DatumPocetka = moment(route.DatumPocetka).utc().format('HH:mm');
			// 		route.DatumZavrsetka = moment(route.DatumZavrsetka).utc().format('HH:mm');
			// 		route.DuzinaPosete = moment(route.DuzinaPosete).utc().format('H:mm:ss');
			// 	}
			// } else {
			for (var i = 0; i < result.recordset.length; i++) {
				let route = result.recordset[i];
				// route.DatumPocetka = moment(route.DatumPocetka).utc().format('DD.MM.YYYY HH:mm:ss');
				// route.DatumZavrsetka = moment(route.DatumZavrsetka).utc().format('DD.MM.YYYY HH:mm:ss');
				// route.DuzinaPosete = moment(route.DuzinaPosete).utc().format('HH:mm:ss');
				route.Naziv = route.Naziv.split(route.Mesto)[0].trim();
				route.DatumPocetka = moment(route.DatumPocetka).utc().format('HH:mm');
				route.DatumZavrsetka = moment(route.DatumZavrsetka).utc().format('HH:mm');
				route.DuzinaPosete = moment(route.DuzinaPosete).utc().format('mm:ss');
			}
			// }
			res.json({ "workerRoutes": result.recordset });
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
			// rmDir(__dirname + `/../public/images/`);	 // brisi stare slike
			rmDir(__dirname + `/../public/images/`);	 // brisi stare slike
			result = await hubieApi.getPodaciPartnerPozicijaSlikeNew(SifraPreduzeca, Fk_Jezik, Fk_Partner, req.query.Fk_Pozicija, req.query.date) // BORCA
			for (const [i, entry] of result.recordset.entries()) {
				entry.DatumPosete = moment(entry.DatumPosete).utc().format('HH:mm');
				if (entry.Slika) {
					const fileName = req.params.Fk_Partner + `_` + entry.Fk_PartnerPozicija + `_` + i;
					const filePath = __dirname + `/../../public/images/` + fileName;
					entry.Slika = await parseImage(entry.Slika, filePath, fileName); // img resize
				}
			}
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
router.post('/route-details/:Fk_Partner', authMW.isLoggedIn, async (req, res) => {
	try {
		const SifraPreduzeca = req.session.SifraPreduzeca,
			username = req.session.username;
		const Fk_RadnikSifra = req.body.Fk_RadnikSifra,
			Fk_Partner = req.params.Fk_Partner,
			date = parseSrbDateParam(req.body.date).toString(),
			Fk_St_670 = parseInt(req.body.Fk_St_670, 10);

		console.log('insertKomercijalistaPravo INPUT', req.session);		// console.log(SifraPreduzeca, username || Supervizor, Fk_RadnikSifra, Fk_Partner, date, Fk_St_670);
		const result = await hubieApi.insertKomercijalistaPravo(SifraPreduzeca, username, Fk_RadnikSifra, Fk_Partner, date, Fk_St_670);
		console.log('result', result, result.length);
		res.json(await result);
	} catch (err) {
		console.log('route-insertKomercijalistaPravo err', err);
		res.json(err);
	}
});

/* KPIs report */

router.get('/KPIsReport/dailySalesByCustomerBySKU/:SifraPARTNER', authMW.isLoggedIn, mcacheMW.cache(60 * 5), async (req, res) => {
	try {
		// console.log('dailySalesKPIsReportByCustomerBySKU USO', req.query);
		const SifraPreduzeca = req.session.SifraPreduzeca, Fk_Jezik = req.session.Fk_Jezik, Fk_PoslovnaGodina = req.session.Fk_PoslovnaGodina;
		const SifraPARTNER = req.params.SifraPARTNER;
		const Datum_do = parseSrbDateParam(req.query.Datum_do).toString();
		const Dali8OZ = 0;
		if (!SifraPARTNER) {
			res.json({ 'success': 'false' });
			return
		};
		let result = await hubieApi.rptProdaja_DailySalesKPIsReportByCustomerBySKU(SifraPreduzeca, Fk_Jezik, Fk_PoslovnaGodina, Datum_do, SifraPARTNER, Dali8OZ);
		// console.log('result.recordset', result.recordset);
		res.json(await result.recordset);
	} catch (err) {
		console.log('dailySalesKPIsReportByCustomerBySKU err', err.message);
		res.json(err.message);
	}
});

router.get('/KPIsReport/radnikPodredjenPartner/:searchQuery', authMW.isLoggedIn, mcacheMW.cache(60 * 5), async (req, res) => {
	try {
		console.log('radnikPodredjenPartner USO', req.query, req.session.Supervizor);
		const SifraPreduzeca = req.session.SifraPreduzeca, Fk_Jezik = req.session.Fk_Jezik;
		// const Sifra_Radnika = parseInt(req.session.Sifra_Radnika, 10);
		const Sifra_Radnika = req.session.Supervizor;
		const searchQuery = req.params.searchQuery;
		if (!Sifra_Radnika) {
			res.json({ 'success': 'false' });
			return
		};
		let result = await hubieApi.vratiRadnikPodredjenPartner(SifraPreduzeca, Fk_Jezik, Sifra_Radnika, searchQuery);
		// result.recordset = result.recordset.map((entry, i) => {
		// 	entry.Naziv = entry.Naziv.join(', ');
		// 	delete entry.Sifra;
		// 	delete entry.Ulica_i_Broj;
		// 	return entry;
		// });
		res.json(await result.recordset.splice(0, 40).map(({ FK_Partner, ...result }) => {
			if (result.Ulica_i_Broj === "NEMA") {
				result.Ulica_i_Broj = result.Naziv[1];        // grad
			} else {
				result.Ulica_i_Broj += ', ' + result.Naziv[1]; // ulica, grad
			}
			result.Naziv = result.Naziv[0]; // spajam ime prodavnice i grad
			return result;
		}));
	} catch (err) {
		console.log('vratiRadnikPodredjenPartner err', err.message);
		res.json(err.message);
	}
});

/* Odblokiraj unos porudzbine */

// return selected-user partners (odblokiraj unos porudzbine)
router.get('/workerPartners/:Fk_Radnik/:searchQuery', authMW.isLoggedIn, mcacheMW.cache(60 * 5), async (req, res) => {
	try {
		const SifraPreduzeca = req.session.SifraPreduzeca,
			Fk_Jezik = req.session.Fk_Jezik;
		let result = await hubieApi.vratiPartnereRadnikaDashBoard(SifraPreduzeca, Fk_Jezik, req.params.Fk_Radnik, req.params.searchQuery);
		// res.json(await result.recordset);
		console.log('workerPartners r', result);
		res.json(await result.recordset.splice(0, 40).map(({ pk_id, ...result }) => {
			if (result.Ulica_i_Broj === "NEMA") {
				result.Ulica_i_Broj = result.Naziv;        // grad
			}
			result.Naziv = result.naziv; // spajam ime prodavnice i grad
			delete result.naziv;
			return result;
		}));
	} catch (err) {
		console.log('vratiPartnereRadnikaDashBoard err', err.message);
		res.json(err.message);
	}
});

/* tlnr */

// sv_VratiPartnerOpremaIzuzetak  (@sifra_preduzeca int, @jezik_id int, @SifraRadnik INT)
router.get('/tlnr/VratiPartnerOpremaIzuzetak', authMW.isLoggedIn, async (req, res) => {
	try {
		const SifraPreduzeca = req.session.SifraPreduzeca,
			Fk_Jezik = req.session.Fk_Jezik;
		Fk_Radnik = req.session.Fk_Radnik; console.log('VratiPartnerOpremaIzuzetak INPUT', req.session);
		const result = await hubieApi.vratiPartnerOpremaIzuzetak(SifraPreduzeca, Fk_Jezik, Fk_Radnik);
		console.log('result.length', result.length);
		// result.recordset.forEach(element => {
		// 	if (element.Sifra === 34612) {
		// 		console.log(element.Sifra, '    ', element.Pk_Id);
		// 		console.log(element);
		// 	}
		// });
		const data = result.recordset.map(({ Pk_Id, Fk_St_670, ...result }) => {
			if (result.Sifra === 34612) {
				console.log(result.Sifra, '    ', result.Pk_Id);
				console.log(result);
			}
			if (result.Ulica_i_Broj === "NEMA") {
				result.Ulica_i_Broj = result.Naziv;        // grad
			}
			/* izbaci grad iz naziva */
			const cutStart = result.Naziv.toLowerCase().lastIndexOf(result.NazivMesto.toLowerCase());
			// console.log('result.Naziv 0 ->', result.Naziv, '<- ', cutStart, ' - ', result.NazivMesto, );
			if (cutStart != -1) {
				const cutEnd = cutStart + result.NazivMesto.length + 1;
				result.Naziv = (result.Naziv.slice(0, cutStart) + result.Naziv.slice(cutEnd, result.Naziv.length)).trim();
				// console.log('result.Naziv 1 ->', result.Naziv, '<-', cutStart, cutEnd);
			}

			// if (result.Sifra === 34612) {
			// 	console.log(result.Sifra, '    ', result.Pk_Id);
			// 	console.log(result);
			// }
			// result["Naziv partnera"] = result.Naziv
			// delete result.Naziv;
			result.NazivMesto = result.NazivMesto.toLowerCase().replace(/^\w/, chr => chr.toUpperCase()); // grad, veliko prvo slovo
			result['Adresa'] = `${result.NazivMesto}, ${result.Ulica_i_Broj}`;
			delete result.Ulica_i_Broj;
			delete result.NazivMesto;
			result['Naziv_S'] = result.Naziv_Stavke;
			delete result.Naziv_Stavke;
			// result["Datum posete"] = moment(result.DatumPosete).format('YYYY.MM.DD.');
			// result["Datum posete"] = result.DatumPosete.toISOString().split('T')[0];
			result['DatumP'] = moment(result.DatumPosete).format('YYYY.MM.DD.');
			delete result.DatumPosete;
			return result;
		});
		console.log('Object.keys(data[0])', Object.keys(data[0]));
		let displayedColumns = result.recordset.length ? Object.keys(data[0]).filter(e => e !== 'Fk_Partner') : [];
		let resp = {
			'displayedColumns': displayedColumns,
			// 'columnLabels' : ['Sifra', 'Naziv Partnera', 'Adresa', 'Razlog posete', 'Datum Posete'],
			'data': data
		}
		// res.json(await result);
		res.json({
			'displayedColumns': displayedColumns,
			// 'columnLabels' : ['Sifra', 'Naziv Partnera', 'Adresa', 'Razlog posete', 'Datum Posete'],
			'data': data
		});
	} catch (err) {
		console.log('route-tlnr-VratiPartnerOpremaIzuzetak err', err);
		res.json(err);
	}
});

module.exports = router;

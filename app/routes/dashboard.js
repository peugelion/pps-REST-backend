let express = require('express'),
	router = express.Router(),
	authMw = require('../middleware'),
	mcacheMw = require('../middleware/memmory-cache.js'),
	// hubieApi 	= require('../models/hubie-interface').connect(),
	hubieApi = require('../models/hubie-interface'),
	moment = require('moment'),
	fs = require('fs');
const sharp = require('sharp');

moment.locale('sr');

/* brisanje svih fajlova iz foldera */
const rmDir = (dirPath) => {
	try {
		var files = fs.readdirSync(dirPath);
	} catch (e) {
		return;
	}
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
const parseImage = (jpgBuffer, fileName) => {
	const startTime = new Date(); // timer start
	const end = (ext) => console.log(`Img resize\\convert takes xxx x ${new Date() - startTime}ms ${fileName}${ext}`)
	const filePath = `${__dirname}/../../public/images/${fileName}`; // no file ext.

	fs.writeFileSync(`${filePath}.jpg`, jpgBuffer); // save binary image from DB as file in /public/images/
	end('.jpg'); /* merim vreme potrebno za image resize + convert to .webp */
	// return parseJpgtoWebp(jpgBuffer, filePath, fileName); // testiram webp
	return `/images/${fileName}.jpg`; // replace sql binary buffer with URL path
};

const parseJpgtoWebp = (jpgBuffer, filePath, fileName) => sharp(jpgBuffer)
	.resize(830, 1106, {
		fit: "inside"
	})
	.sharpen()
	.toFile(`${filePath}.webp`)
	.then(info => { // console.log('resize', info);
		end('.webp') /* merim vreme potrebno za image resize + convert to .webp */
		return `/images/${fileName}.webp` // replace sql binary buffer with URL path
	})
	.catch(err => {
		console.log(`err ${err}`)
		fs.writeFileSync(`${filePath}.jpg`, jpgBuffer) // save binary image from DB as file in /public/images/
		return `/images/${fileName}.jpg` // replace sql binary buffer with URL path
	});


/* ulaz date u srpskoj ili full ISO formi, vraca short ISO, eg. '2018-05-29' */
const parseSrbDateParam = (date) => {
	if (date && date.includes(' ')) {
		return date.split(' ')[0].split('.').reverse().join('-'); // eg '29.05.2018' ili '29.05.2018 10:30:45'
	} else if (date && date.includes('T')) {
		return date.split('T')[0].split('.').reverse().join('-'); // eg '2018-05-28T00:00:00.000Z'
	} else {
		return date ? date : new Date().toISOString().split('T')[0]; // eg '2018-05-29', today if no input
	}
};

//

// const parsePercentCollumnsOLD = (entry) => {
// 	const tableColumns = Object.keys(entry);
// 	// console.log('dailySalesByAreaBySKU tableColumns', tableColumns);
// 	// console.log(' --- row --- ');
// 	tableColumns.map(column => {
// 		const TYvsLY = column.includes('vs'); // kolone sa poredjenjem meseca ove i prosle godine
// 		if (TYvsLY) {
// 			// console.log(column, column.length, entry[column]);
// 			// pretvori u procente
// 			// entry[column] *= 100;
// 			entry[column] = +(entry[column] * 100).toFixed(0);
// 		}
// 	});
// 	return entry
// }

/* pomnozi sa 100 vrednosti iz 'VS' kolona (kolone sa poredjenjem meseca ove i prosle godine), eg. 0.33  -> 33% */
// tableRecordset.map(obj => {
// 	Object.keys(obj)
// 		.filter(column => column.includes('vs'))
// 		.forEach(column => obj[column] = +(obj[column] * 100).toFixed(0));
// 	return obj
// })

/* pomnozi sa 100 vrednosti iz 'VS' kolona (kolone sa poredjenjem meseca ove i prosle godine), eg. 0.33  -> 33% */
const parseTablePercents = tableRecordset => {
	// if (!tableRecordset.length) return tableRecordset;
	const onlyVsColumns = Object.keys(tableRecordset[0]).filter(col => col.includes('vs'));
	return tableRecordset.map(obj => {
		onlyVsColumns.forEach(vsCol => obj[vsCol] = +(obj[vsCol] * 100).toFixed());
		return obj
	})
}

//

// return selected-user routes
router.get('/workerRoutes', authMw.isLoggedIn, mcacheMw.cache(10), async (req, res) => {
	try {
		const SifraPreduzeca = req.session.SifraPreduzeca,
			Fk_Jezik = req.session.Fk_Jezik,
			Fk_PoslovnaGodina = req.session.Fk_PoslovnaGodina,
			parsedDate = moment(req.query.datum).format('YYYY-MM-DD')
		result = await hubieApi.rptDnevniPregledRute(SifraPreduzeca, Fk_PoslovnaGodina, Fk_Jezik, req.query.Fk_Radnik, parsedDate)
		res.json({
			'workerRoutes': result.recordset.map(route => {
				route.Naziv = route.Naziv.split(route.Mesto)[0].trim()
				route.DatumPocetka = moment(route.DatumPocetka).utc().format('HH:mm')
				route.DatumZavrsetka = moment(route.DatumZavrsetka).utc().format('HH:mm')
				route.DuzinaPosete = moment(route.DuzinaPosete).utc().format('mm:ss')
				if (route.PauzaMinuta === '00:00') {
					// route.PauzaMinuta = ''
					delete route.PauzaMinuta
				}
				return route
			})
		});
	} catch (err) {
		console.log(`/workerRoutes err ${err}`)
		res.json(err)
	}
});

/* GET detalji rute */
router.get('/route-details/:Fk_Partner', authMw.isLoggedIn, mcacheMw.cache(20), async (req, res) => { // Fk_Partner iz 'rptDnevniPregledRute' rute
	try {
		const SifraPreduzeca = req.session.SifraPreduzeca,
			Fk_Jezik = req.session.Fk_Jezik,
			Fk_PoslovnaGodina = req.session.Fk_PoslovnaGodina;
		const Fk_Partner = req.params.Fk_Partner
		let result;
		if (req.query.Fk_Pozicija) {
			// rmDir(__dirname + `/../public/images/`)	 // brisi stare slike
			rmDir(__dirname + `/../../public/images/`) // brisi stare slike
			result = await hubieApi.getPodaciPartnerPozicijaSlikeNew(SifraPreduzeca, Fk_Jezik, Fk_Partner, req.query.Fk_Pozicija, req.query.date) // BORCA
			// console.log(`route-details Fk_Pozicija result`, result);
			for (const [i, entry] of result.recordset.entries()) {
				entry.DatumPosete = moment(entry.DatumPosete).utc().format('HH:mm');
				if (entry.Slika) {
					const fileName = `${Fk_Partner}_${entry.Fk_PartnerPozicija}_${req.query.date}_${i}`;
					entry.Slika = await parseImage(entry.Slika, fileName); // img resize
				}
			}
			if (!result.recordset.length) {
				console.log(`route-details Fk_Pozicija result prazan ?`, result);
				result.recordset = [{}];
			}
		} else if (req.query.Zalihe) {
			result = await hubieApi.vratiZalihePartnerOS(SifraPreduzeca, Fk_PoslovnaGodina, Fk_Jezik, Fk_Partner, req.query.date); // TODO input fiskalna godina (16)
		} else {
			result = await hubieApi.getPodaciPartnerPozicija(SifraPreduzeca, Fk_Jezik, Fk_Partner, req.query.date) // BORČA
		}
		res.json(await result.recordset);
	} catch (err) {
		console.log(`route-detail err ${err}`);
		res.json(err);
		// next(err);
	}
});

/* GET Odblokiraj unos porudzbine - Pretraga partnera */

// return selected-user partners (odblokiraj unos porudzbine)
router.get('/workerPartners/:Fk_Radnik/:searchQuery', authMw.isLoggedIn, mcacheMw.cache(3), async (req, res) => {
	try {
		const SifraPreduzeca = req.session.SifraPreduzeca,
			Fk_Jezik = req.session.Fk_Jezik;
		let result = await hubieApi.vratiPartnereRadnikaDashBoard(SifraPreduzeca, Fk_Jezik, req.params.Fk_Radnik, req.params.searchQuery);
		// res.json(await result.recordset);
		res.json(await result.recordset.splice(0, 40).map(({
			pk_id,
			...result
		}) => {
			if (result.Ulica_i_Broj === "NEMA") {
				result.Ulica_i_Broj = result.Naziv; // grad
			}
			result.Naziv = result.naziv; // spajam ime prodavnice i grad
			delete result.naziv;
			return result;
		}));
	} catch (err) {
		console.log(`vratiPartnereRadnikaDashBoard err ${err.message}`);
		res.json(err.message);
	}
});


/* POST Odblokiraj unos porudzbine - odblokiraj rutu */

// insertKomercijalistaPravo (SifraPreduzeca, username, Fk_Radnik,  Fk_Partner, date, Fk_St_670)
router.post('/route-details/:Fk_Partner', authMw.isLoggedIn, async (req, res) => {
	try {
		const SifraPreduzeca = req.session.SifraPreduzeca,
			username = req.session.username;
		const Fk_RadnikSifra = req.body.Fk_RadnikSifra,
			Fk_Partner = req.params.Fk_Partner,
			date = parseSrbDateParam(req.body.date).toString(),
			Fk_St_670 = parseInt(req.body.Fk_St_670, 10);

		// console.log('insertKomercijalistaPravo INPUT', req.session); // console.log(SifraPreduzeca, username || Supervizor, Fk_RadnikSifra, Fk_Partner, date, Fk_St_670);
		const result = await hubieApi.insertKomercijalistaPravo(SifraPreduzeca, username, Fk_RadnikSifra, Fk_Partner, date, Fk_St_670);
		// console.log('result, length', result, result.length);
		res.json(await result);
	} catch (err) {
		console.log(`route-insertKomercijalistaPravo err ${err}`);
		res.json(err);
	}
});

/* KPIs report: ByCustomerBySKU */
router.get('/KPIsReport/dailySalesByCustomerBySKU/:SifraPARTNER', authMw.isLoggedIn, mcacheMw.cache(60 * 5), async (req, res) => {
	try {
		// console.log('dailySalesKPIsReportByCustomerBySKU USO', req.query);
		const SifraPreduzeca = req.session.SifraPreduzeca,
			Fk_Jezik = req.session.Fk_Jezik,
			Fk_PoslovnaGodina = req.session.Fk_PoslovnaGodina;
		const SifraPARTNER = req.params.SifraPARTNER;
		Datum_do = parseSrbDateParam(req.query.Datum_do).toString();
		if (!SifraPARTNER) {
			res.json({
				'success': 'false'
			});
			return
		};
		let result = await hubieApi.rptProdaja_DailySalesKPIsReportByCustomerBySKU(SifraPreduzeca, Fk_Jezik, Fk_PoslovnaGodina, Datum_do, SifraPARTNER, 0);
		// res.json(await result.recordset);
		res.json(await parseTablePercents(result.recordset))
	} catch (err) {
		console.log(`dailySalesKPIsReportByCustomerBySKU err ${err.message}`);
		res.json(err.message);
	}
});

router.get('/KPIsReport/radnikPodredjenPartner/:searchQuery', authMw.isLoggedIn, mcacheMw.cache(60 * 5), async (req, res) => {
	try {
		const SifraPreduzeca = req.session.SifraPreduzeca,
			Fk_Jezik = req.session.Fk_Jezik,
			Sifra_Radnika = req.session.Supervizor;
		const searchQuery = req.params.searchQuery;
		if (!Sifra_Radnika) {
			res.json({
				'success': 'false'
			});
			return
		};
		let result = await hubieApi.vratiRadnikPodredjenPartner(SifraPreduzeca, Fk_Jezik, Sifra_Radnika, searchQuery);
		// result.recordset = result.recordset.map((entry, i) => {
		// 	entry.Naziv = entry.Naziv.join(', ');
		// 	delete entry.Sifra;
		// 	delete entry.Ulica_i_Broj;
		// 	return entry;
		// });
		res.json(await result.recordset.splice(0, 40).map(({
			FK_Partner,
			...result
		}) => {
			if (result.Ulica_i_Broj === "NEMA") {
				result.Ulica_i_Broj = result.Naziv[1] // grad
			} else {
				result.Ulica_i_Broj += ', ' + result.Naziv[1] // ulica, grad
			}
			result.Naziv = result.Naziv[0] // spajam ime prodavnice i grad
			return result
		}));
	} catch (err) {
		console.log(`vratiRadnikPodredjenPartner err ${err.message}`)
		res.json(err.message)
	}
});

/* KPIs reports : ByAreaBySKU [4 Reports, 1 & 2 u Hubie].  CSD or Lipton;  Dali8OZ: true\false */
router.get('/KPIsReport/dailySalesByAreaBySKU/:Sifra_Radnika', authMw.isLoggedIn, mcacheMw.cache(60 * 10), async (req, res) => {
	try {
		console.log(`req.session.Supervizor: ${req.session.Supervizor}, req.params.Sifra_Radnika: ${req.params.Sifra_Radnika}`, req.session.Supervizor === parseInt(req.params.Sifra_Radnika, 10));
		if (req.session.Supervizor.toString() !== req.params.Sifra_Radnika) {
			res.json({
				'success': 'false'
			});
			return
		};
		const SifraPreduzeca = req.session.SifraPreduzeca,
			Fk_Jezik = req.session.Fk_Jezik,
			Fk_PoslovnaGodina = req.session.Fk_PoslovnaGodina,
			Sifra_Radnika = req.session.Supervizor;
		const Datum_do = parseSrbDateParam(req.query.Datum_do).toString(),
			isCSD = parseInt(req.query.isCsd, 2), // CSD or Lipton, 1 or 0
			Dali8OZ = req.query.Dali8OZ ? parseInt(req.query.Dali8OZ, 2) : 0;
		console.log(`CsdOrLipton boolean ${isCSD} Dali8OZ ${Dali8OZ}`);
		let result = await hubieApi.rptProdaja_DailySalesKPIsReportByAreaBySKU(isCSD, SifraPreduzeca, Fk_Jezik, Fk_PoslovnaGodina, Datum_do, Sifra_Radnika, Dali8OZ);
		res.json(await parseTablePercents(result.recordset));
	} catch (err) {
		console.log(`dailySalesKPIsReportByAreaBySKU_CSD err ${err.message}`);
		res.json(err.message);
	}
});

/* KPIs reports : ByArea [6 reports - 3,4,5,6 u Hubie].  CSD or Lipton;  Dali8OZ: true\false */
router.get('/KPIsReport/dailySalesByArea', authMw.isLoggedIn, mcacheMw.cache(60 * 10), async (req, res) => {
	try {
		const SifraPreduzeca = req.session.SifraPreduzeca,
			Fk_Jezik = req.session.Fk_Jezik,
			Fk_PoslovnaGodina = req.session.Fk_PoslovnaGodina
		const Datum_do = parseSrbDateParam(req.query.Datum_do).toString(),
			isCSD = parseInt(req.query.isCsd, 2), // CSD, Lipton or Orange, 1 or 0
			isLipton = parseInt(req.query.isLipton, 2), // CSD, Lipton or Orange, 1 or 0
			isOrange = parseInt(req.query.isOrange, 2), // CSD, Lipton or Orange, 1 or 0
			Dali8OZ = parseInt(req.query.Dali8OZ, 2),
			pending = req.query.pending ? parseInt(req.query.pending, 2) : 0
		console.log(`CsdOrLiptonOrOrange boolean ${isCSD} ${isLipton} ${isOrange} Dali8OZ ${Dali8OZ} pending ${pending}, req.query`, req.query)
		let result = await hubieApi.rptProdaja_DailySalesKPIsReportByArea(isCSD, isLipton, isOrange, SifraPreduzeca, Fk_Jezik, Fk_PoslovnaGodina, Datum_do, Dali8OZ, pending)
		res.json(await parseTablePercents(result.recordset))
	} catch (err) {
		console.log(`dailySalesKPIsReportByArea err ${err.message}`)
		res.json(err.message)
	}
});

/* KPIs reports : ByCustomer [x reports - 7, 8, 9 u Hubie].  CSD or Lipton;  Dali8OZ: true\false */
router.get('/KPIsReport/dailySalesByCustomer/:Sifra_Radnika', authMw.isLoggedIn, mcacheMw.cache(60 * 10), async (req, res) => {
	try {
		if (req.session.Supervizor.toString() !== req.params.Sifra_Radnika) {
			res.json({
				'success': 'false'
			})
			return
		}
		const SifraPreduzeca = req.session.SifraPreduzeca,
			Fk_Jezik = req.session.Fk_Jezik,
			Fk_PoslovnaGodina = req.session.Fk_PoslovnaGodina
		const Datum = parseSrbDateParam(req.query.Datum).toString(),
			Sifra_Radnika = req.session.Supervizor,
			isCSD = parseInt(req.query.isCsd, 2), // CSD, Lipton or Orange, 1 or 0
			Dali8OZ = parseInt(req.query.Dali8OZ, 2),
			isOutlet = parseInt(req.query.isOutlet, 2) // rpt 9 or not (rpt 7\8);
		console.log(`CsdOrLiptonOrOrange boolean ${isCSD} Sifra_Radnika ${Sifra_Radnika} Dali8OZ ${Dali8OZ}`)
		let result = isOutlet ?
			await hubieApi.rptProdaja_DailySalesKPIsReportByOutlet(SifraPreduzeca, Fk_Jezik, Fk_PoslovnaGodina, Datum, Sifra_Radnika, Dali8OZ) :
			await hubieApi.rptProdaja_DailySalesKPIsReportByCustomer(isCSD, SifraPreduzeca, Fk_Jezik, Fk_PoslovnaGodina, Datum, Sifra_Radnika, Dali8OZ)
		res.json(await parseTablePercents(result.recordset))
	} catch (err) {
		console.log(`dailySalesKPIsReportByArea err ${err.message}`)
		res.json(err.message)
	}
});



/* GET tlnr */

// sv_VratiPartnerOpremaIzuzetak  (@sifra_preduzeca int, @jezik_id int, @SifraRadnik INT)
router.get('/tlnr/VratiPartnerOpremaIzuzetak', authMw.isLoggedIn, async (req, res) => {
	try {
		const SifraPreduzeca = req.session.SifraPreduzeca,
			Fk_Jezik = req.session.Fk_Jezik,
			Fk_Radnik = req.session.Fk_Radnik
		const result = await hubieApi.vratiPartnerOpremaIzuzetak(SifraPreduzeca, Fk_Jezik, Fk_Radnik)
		const data = result.recordset.map(({
			Pk_Id,
			Fk_St_670,
			...result
		}) => {
			if (result.Ulica_i_Broj === "NEMA") {
				result.Ulica_i_Broj = result.Naziv // grad
			}
			/* izbaci grad iz naziva */
			const cutStart = result.Naziv.toLowerCase().lastIndexOf(result.NazivMesto.toLowerCase())
			if (cutStart != -1) {
				const cutEnd = cutStart + result.NazivMesto.length + 1
				result.Naziv = (result.Naziv.slice(0, cutStart) + result.Naziv.slice(cutEnd, result.Naziv.length)).trim()
			}
			result.NazivMesto = result.NazivMesto.toLowerCase().replace(/^\w/, chr => chr.toUpperCase()) // grad, veliko prvo slovo
			result['Adresa'] = `${result.NazivMesto}, ${result.Ulica_i_Broj}`
			delete result.Ulica_i_Broj
			delete result.NazivMesto
			result['Naziv_S'] = result.Naziv_Stavke
			delete result.Naziv_Stavke
			result['DatumP'] = moment(result.DatumPosete).format('YYYY.MM.DD.')
			delete result.DatumPosete
			return result
		});
		let displayedColumns = result.recordset.length ? Object.keys(data[0]).filter(e => e !== 'Fk_Partner') : []
		res.json({
			'displayedColumns': displayedColumns,
			// 'columnLabels' : ['Sifra', 'Naziv Partnera', 'Adresa', 'Razlog posete', 'Datum Posete'],
			'data': data
		});
	} catch (err) {
		console.log(`route-tlnr-VratiPartnerOpremaIzuzetak err ${err}`)
		res.json(err)
	}
});

module.exports = router
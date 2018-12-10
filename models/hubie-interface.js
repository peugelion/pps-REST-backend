var sql = require('mssql');

const configHubie = {
	user:     process.env.DB_USER  || 'sa',
	password: process.env.DB_PASS  || 'password',
	server:   process.env.DB_HOST  || '127.0.0.1',
  	database: process.env.DB_HUBIE || 'Hubie',
  	connectionTimeout: 45000,
  	requestTimeout: 100000,
  	pool: {
  		max: 15,
  		idleTimeoutMillis: 60000
	},
	options: {
		// encrypt: true,
		instanceName: process.env.DB_INSTANCE || ''
	}
}
const configHubie_irb = Object.assign({}, configHubie);
const configHubie_web = Object.assign({}, configHubie);
configHubie_irb.database = process.env.DB_HUBIE_IRB || 'Hubie_IRB';
configHubie_web.database = process.env.DB_HUBIE_WEB || 'Hubie_Web';


module.exports = function() {
	let connError = {};
	let poolHubie, poolHubie_irb, poolHubie_web = null;
	return {
		connect: function() {
			// console.log('poolHubie', poolHubie);
			poolHubie = new sql.ConnectionPool(configHubie, err => {
				if (err) {
					connError.hasError = true;
					connError.error = err.originalError;
					poolHubie.close();
				}
			});
			poolHubie_irb = new sql.ConnectionPool(configHubie_irb, err => {
				if (err) {
					connError.hasError = true;
					connError.error = err.originalError;
					poolHubie_irb.close();
				}
			});
			poolHubie_web = new sql.ConnectionPool(configHubie_web, err => {
				if (err) {
					connError.hasError = true;
					connError.error = err.originalError;
					poolHubie_web.close();
				}
			});

			poolHubie.on('error', err => console.log('sql errors', new Date(), err.message));
			poolHubie_irb.on('error', err => console.log('sql errors', new Date(), err.message));
			poolHubie_web.on('error', err => console.log('sql errors', new Date(), err.message));

			// console.log('connError', connError, 'connError.hasError', connError.hasError, 'poolHubie posle', poolHubie);

			/* reconnect In case of connection error */
			if (Object.keys(connError).length !== 0) {
				console.log('error length:', connError.length, Object.keys(connError).length);
				console.log('connError:', connError);
				connError = {};
				this.connect();
			} else {
				console.log('no connError, poolHubie._connected:', poolHubie._connected, '\ _connecting:', poolHubie._connecting);
				return this;
			}
		},
		// login: function(user, pass, forTicketing) {
		// 	let procedure = 'task_LogIn';
		// 	if (forTicketing !== undefined && forTicketing !== "") procedure = 'Prijava_LogIn'; 
		// 	return pool.request()
		// 						 .input('username', sql.NVarChar, user)
		// 						 .input('password', sql.NVarChar, pass)
		// 				.execute(procedure);
		// },
		// logout: function() {
		// 	return "logout f()";
		// },

		login: function(user, pass) {
			console.log('hube-interface.js login', user, pass);
			return poolHubie_web.request()
								 .input('Username', sql.NVarChar, user)
								 .input('Password', sql.NVarChar, pass)
						.execute('sv_LogIn');
		},
		// vratiRS: function(companyCode, lang_id, appUser, whichTable, FkStSt) {
		// 	return poolHubie.request()
		// 						 .input('Sifra_Preduzeca', sql.Int, companyCode)
		// 						 .input('jezik_id', sql.Int, lang_id)
		// 						 .input('sifra_nvar', sql.NVarChar(16), appUser)
		// 						 .input('KojaTabela', sql.NVarChar(64), whichTable)
		// 						 .input('FkStSt', sql.Int, FkStSt)
		// 				.execute('sp_VratiRS');
		// },

		// vratiPodredjeneRadnike: function(companyCode, lang_id, fk_appUser) {
		// 	return poolHubie.request()
		// 						 .input('Sifra_Preduzeca', sql.Int, companyCode)
		// 						 .input('Jezik_Id', sql.Int, lang_id)
		// 						 .input('Sifra_Radnika', sql.Int, fk_appUser)
		// 				.execute('sp_VratiPodredjeneRadnike');
		// },
		// ova procedura vraca konkretne podatke o ruti za izabranog radnika - prodavca, podatke o njegovim posetama u danu
		rptDnevniPregledRute: function(companyCode, fiscalYear, lang_id, fk_seller, date) {
			return poolHubie.request()
								.input('SifraPreduzeca', sql.Int, companyCode)
								.input('fk_poslovna_Godina', sql.Int, fiscalYear)
								.input('Jezik_id', sql.Int, lang_id)
								.input('Fk_Prodavac', sql.Int, fk_seller)
								.input('datum', sql.NVarChar, date)
						.execute('sp_RptDnevniPregledRute');
		},
		// ova procedura vraca za konkretnog partnera na ruti, njegove pozicije
		// @Sifra_Preduzeca=1,@Jezik_Id=4,@Fk_Partner=63999,@Datum='2018-05-29 00:00:00'
		getPodaciPartnerPozicija: function(companyCode, lang_id, fk_partner, date) {
			return poolHubie_irb.request()
								.input('Sifra_Preduzeca', sql.Int, companyCode)
								.input('Jezik_Id', sql.Int, lang_id)
								.input('Fk_Partner', sql.Int, fk_partner)
								.input('Datum', sql.NVarChar, date)
						.execute('sp_GetPodaciPartnerPozicija');
		},
		// ova procedura vraca za konkretnog partnera na ruti, i poziciju slike pozicije.
		// @Sifra_Preduzeca=1,@Jezik_Id=4,@Fk_Partner=63999,@Fk_Pozicija=6,@Datum='2018-05-29 00:00:00'
		getPodaciPartnerPozicijaSlikeNew: function(companyCode, lang_id, fk_partner, fk_position, date) {
			return poolHubie_irb.request()
								.input('Sifra_Preduzeca', sql.Int, companyCode)
								.input('Jezik_Id', sql.Int, lang_id)
								.input('Fk_Partner', sql.Int, fk_partner)
								.input('Fk_Pozicija', sql.Int, fk_position)
								.input('Datum', sql.NVarChar, date)
						.execute('sp_GetPodaciPartnerPozicijaSlikeNew');
		},
		// vraca stanje osnovnih sredstava kod kupca
		// @Sifra_Predizece=1,@Jezik_Id=4,@Fk_PoslovnaGodina=16,@Fk_Partner=63999,@Datum='2018-05-29 00:00:00'
		vratiZalihePartnerOS: function(companyCode, lang_id, fiscalYear, fk_partner, date) {
			return poolHubie.request()
								.input('Sifra_Predizece', sql.Int, companyCode)
								.input('Jezik_Id', sql.Int, lang_id)
								.input('Fk_PoslovnaGodina', sql.Int, fiscalYear)
								.input('Fk_Partner', sql.Int, fk_partner)
								.input('Datum', sql.NVarChar, date)
						.execute('sp_VratiZalihePartnerOS');
		},
		// odblokiraj partnera
		insertKomercijalistaPravo: function(SifraPreduzeca, user, Fk_Radnik, Fk_Partner, date, Fk_St_670) {
			// console.log('hube-interface.js login', user, pass);
			return poolHubie_web.request()
								.input('SifraPreduzeca', sql.Int, SifraPreduzeca)
								 .input('Korisnik', sql.NVarChar, user)
								 .input('SifraRadnik', sql.Int, Fk_Radnik)
								 .input('SifraPartnera', sql.Int, Fk_Partner) // Fk_Partner
								 .input('DatumPosete', sql.NVarChar, date)
								 .input('Fk_St_670', sql.Int, Fk_St_670)
						.execute('sv_InsertKomercijalistaPravo');
		},
		// KPIs report page 1/2
		rptProdaja_DailySalesKPIsReportByCustomerBySKU: function(SifraPreduzeca, Fk_Jezik, Fk_PoslovnaGodina, Datum_do, SifraPARTNER, Dali8OZ) {
			console.log('hube-interface.js rptProdaja_DailySalesKPIsReportByCustomerBySKU');
			console.log(SifraPreduzeca, Fk_Jezik, Fk_PoslovnaGodina, Datum_do, SifraPARTNER, Dali8OZ);
			return poolHubie.request()
								.input('Sifra_Preduzeca', sql.Int, SifraPreduzeca)
								.input('Jezik_id', sql.NVarChar, Fk_Jezik)
								.input('Fk_PoslovnaGodina', sql.Int, Fk_PoslovnaGodina)
								.input('Datum_do', sql.NVarChar, Datum_do)
								.input('SifraPARTNER', sql.NVarChar, SifraPARTNER) // Fk_Partner
								.input('Dali8OZ', sql.Int, Dali8OZ)
						.execute('sp_RptProdaja_DailySalesKPIsReportByCustomerBySKU');
		},
		// KPIs report page 2/2
		vratiRadnikPodredjenPartner: function(SifraPreduzeca, Fk_Jezik, Sifra_Radnika, searchQuery) {
			console.log('hube-interface.js vratiRadnikPodredjenPartner');
			console.log(SifraPreduzeca, Fk_Jezik, Sifra_Radnika, searchQuery);
			return poolHubie.request()
								.input('Sifra_Preduzeca', sql.Int, SifraPreduzeca)
								.input('Jezik_id', sql.NVarChar, Fk_Jezik)
								.input('Sifra_Radnika', sql.Int, Sifra_Radnika)
								.input('Search', sql.NVarChar, searchQuery)
						.execute('sp_VratiRadnikPodredjenPartner');
		},
		// odblokiraj unos porudzbine za partnera page
		// ova procedura vraca podatke o partnerima za izabranog radnika - prodavca
		vratiPartnereRadnikaDashBoard: function(SifraPreduzeca, lang_id, Fk_Radnik, searchQuery) {
			return poolHubie.request()
								.input('Sifra_Preduzeca', sql.Int, SifraPreduzeca)
								.input('Jezik_id', sql.Int, lang_id)
								.input('SifraRadnik', sql.Int, Fk_Radnik)
								.input('Search', sql.NVarChar, searchQuery)
						.execute('sp_VratiPartnereRadnikaDashBoard');
		},
		
	}
}();
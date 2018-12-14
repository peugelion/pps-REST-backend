const sql = require('mssql');

const configHubie = {
	'user':     process.env.DB_USER  || 'sa',
	'password': process.env.DB_PASS  || 'password',
	'server':   process.env.DB_HOST  || '127.0.0.1',
  	'database': process.env.DB_HUBIE || 'Hubie',
  	'connectionTimeout': 45000,
  	'requestTimeout': 100000,
  	'pool': {
  		max: 15,
  		idleTimeoutMillis: 60000
	},
	'options': {
		appName: 'pepsi-nodejs-app',
		// encrypt: true,
		instanceName: process.env.DB_INSTANCE || ''
	}
}
const configHubie_irb = Object.assign({}, configHubie, {
	'database': process.env.DB_HUBIE_IRB || 'Hubie_IRB'
});
const configHubie_web = Object.assign({}, configHubie, {
	'database': process.env.DB_HUBIE_WEB || 'Hubie_Web'
});

/* https://stackoverflow.com/questions/30356148/how-can-i-use-a-single-mssql-connection-pool-across-several-routes-in-an-express */
/* https://medium.com/@Abazhenov/using-async-await-in-express-with-node-8-b8af872c0016 */
const poolHubie = new sql.ConnectionPool(configHubie).connect()
  .then(pool => { console.log('Connected to MSSQL poolHubie'); return pool })
  .catch(err => console.log('Database Connection Failed! (poolHubie) Bad Config: ', err))

const poolHubie_irb = new sql.ConnectionPool(configHubie_irb).connect()
	.then(pool => { console.log('Connected to MSSQL poolHubie_irb'); return pool })
	.catch(err => console.log('Database Connection Failed! (poolHubie_irb) Bad Config: ', err))
	
const poolHubie_web = new sql.ConnectionPool(configHubie_web).connect()
	.then(pool => { console.log('Connected to MSSQL poolHubie_web'); return pool })
	.catch(err => console.log('Database Connection Failed! (poolHubie_web) Bad Config: ', err))

module.exports = function() {
	return {
		login: async (user, pass) => {
			// try {
				console.log('hube-interface.js login', user, pass);
				const pool = await poolHubie_web
				return await pool.request()
						.input('Username', sql.NVarChar, user)
						.input('Password', sql.NVarChar, pass)   
					.execute('sv_LogIn');
			// } catch (err) {
			//  	console.log('login err (hube-interface.js)', err);
			// }
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
		rptDnevniPregledRute: async (companyCode, fiscalYear, lang_id, fk_seller, date) => {
			const pool = await poolHubie
			return await pool.request()
								.input('SifraPreduzeca', sql.Int, companyCode)
								.input('fk_poslovna_Godina', sql.Int, fiscalYear)
								.input('Jezik_id', sql.Int, lang_id)
								.input('Fk_Prodavac', sql.Int, fk_seller)
								.input('datum', sql.NVarChar, date)
						.execute('sp_RptDnevniPregledRute');
		},
		// ova procedura vraca za konkretnog partnera na ruti, njegove pozicije
		// @Sifra_Preduzeca=1,@Jezik_Id=4,@Fk_Partner=63999,@Datum='2018-05-29 00:00:00'
		getPodaciPartnerPozicija: async (companyCode, lang_id, fk_partner, date) => {
			const pool = await poolHubie_irb
			return await pool.request()
								.input('Sifra_Preduzeca', sql.Int, companyCode)
								.input('Jezik_Id', sql.Int, lang_id)
								.input('Fk_Partner', sql.Int, fk_partner)
								.input('Datum', sql.NVarChar, date)
						.execute('sp_GetPodaciPartnerPozicija');
		},
		// ova procedura vraca za konkretnog partnera na ruti, i poziciju slike pozicije.
		// @Sifra_Preduzeca=1,@Jezik_Id=4,@Fk_Partner=63999,@Fk_Pozicija=6,@Datum='2018-05-29 00:00:00'
		getPodaciPartnerPozicijaSlikeNew: async (companyCode, lang_id, fk_partner, fk_position, date) => {
			const pool = await poolHubie_irb
			return await pool.request()
								.input('Sifra_Preduzeca', sql.Int, companyCode)
								.input('Jezik_Id', sql.Int, lang_id)
								.input('Fk_Partner', sql.Int, fk_partner)
								.input('Fk_Pozicija', sql.Int, fk_position)
								.input('Datum', sql.NVarChar, date)
						.execute('sp_GetPodaciPartnerPozicijaSlikeNew');
		},
		// vraca stanje osnovnih sredstava kod kupca
		// @Sifra_Predizece=1,@Jezik_Id=4,@Fk_PoslovnaGodina=16,@Fk_Partner=63999,@Datum='2018-05-29 00:00:00'
		vratiZalihePartnerOS: async (companyCode, lang_id, fiscalYear, fk_partner, date) => {
			const pool = await poolHubie
			return await pool.request()
								.input('Sifra_Predizece', sql.Int, companyCode)
								.input('Jezik_Id', sql.Int, lang_id)
								.input('Fk_PoslovnaGodina', sql.Int, fiscalYear)
								.input('Fk_Partner', sql.Int, fk_partner)
								.input('Datum', sql.NVarChar, date)
						.execute('sp_VratiZalihePartnerOS');
		},
		// odblokiraj partnera
		insertKomercijalistaPravo: async (SifraPreduzeca, user, Fk_Radnik, Fk_Partner, date, Fk_St_670) => {
			// console.log('hube-interface.js login', user, pass);
			const pool = await poolHubie_web
			return await pool.request()
								.input('SifraPreduzeca', sql.Int, SifraPreduzeca)
								 .input('Korisnik', sql.NVarChar, user)
								 .input('SifraRadnik', sql.Int, Fk_Radnik)
								 .input('SifraPartnera', sql.Int, Fk_Partner) // Fk_Partner
								 .input('DatumPosete', sql.NVarChar, date)
								 .input('Fk_St_670', sql.Int, Fk_St_670)
						.execute('sv_InsertKomercijalistaPravo');
		},
		// KPIs report page 1/2
		rptProdaja_DailySalesKPIsReportByCustomerBySKU: async (SifraPreduzeca, Fk_Jezik, Fk_PoslovnaGodina, Datum_do, SifraPARTNER, Dali8OZ) => {
			console.log('hube-interface.js rptProdaja_DailySalesKPIsReportByCustomerBySKU');
			console.log(SifraPreduzeca, Fk_Jezik, Fk_PoslovnaGodina, Datum_do, SifraPARTNER, Dali8OZ);
			const pool = await poolHubie
			return await pool.request()
								.input('Sifra_Preduzeca', sql.Int, SifraPreduzeca)
								.input('Jezik_id', sql.NVarChar, Fk_Jezik)
								.input('Fk_PoslovnaGodina', sql.Int, Fk_PoslovnaGodina)
								.input('Datum_do', sql.NVarChar, Datum_do)
								.input('SifraPARTNER', sql.NVarChar, SifraPARTNER) // Fk_Partner
								.input('Dali8OZ', sql.Int, Dali8OZ)
						.execute('sp_RptProdaja_DailySalesKPIsReportByCustomerBySKU');
		},
		// KPIs report page 2/2
		vratiRadnikPodredjenPartner: async (SifraPreduzeca, Fk_Jezik, Sifra_Radnika, searchQuery) => {
			console.log('hube-interface.js vratiRadnikPodredjenPartner');
			console.log(SifraPreduzeca, Fk_Jezik, Sifra_Radnika, searchQuery);
			const pool = await poolHubie
			return await pool.request()
								.input('Sifra_Preduzeca', sql.Int, SifraPreduzeca)
								.input('Jezik_id', sql.NVarChar, Fk_Jezik)
								.input('Sifra_Radnika', sql.Int, Sifra_Radnika)
								.input('Search', sql.NVarChar, searchQuery)
						.execute('sp_VratiRadnikPodredjenPartner');
		},
		// odblokiraj unos porudzbine za partnera page
		// ova procedura vraca podatke o partnerima za izabranog radnika - prodavca
		vratiPartnereRadnikaDashBoard: async (SifraPreduzeca, lang_id, Fk_Radnik, searchQuery) => {
			const pool = await poolHubie
			return await pool.request()
								.input('Sifra_Preduzeca', sql.Int, SifraPreduzeca)
								.input('Jezik_id', sql.Int, lang_id)
								.input('SifraRadnik', sql.Int, Fk_Radnik)
								.input('Search', sql.NVarChar, searchQuery)
						.execute('sp_VratiPartnereRadnikaDashBoard');
		},
		// tlnr, [Hubie_Web].[dbo].[sv_VratiPartnerOpremaIzuzetak] (@sifra_preduzeca int, @jezik_id int, @SifraRadnik INT)
		vratiPartnerOpremaIzuzetak: async (SifraPreduzeca, lang_id, Fk_Radnik) => {
			const pool = await poolHubie_web
			return await pool.request()
								.input('Sifra_Preduzeca', sql.Int, SifraPreduzeca)
								.input('Jezik_id', sql.Int, lang_id)
								.input('SifraRadnik', sql.Int, Fk_Radnik)
						.execute('sv_VratiPartnerOpremaIzuzetak');
		},
		
	}
}();
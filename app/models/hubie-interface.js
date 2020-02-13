const sql = require('mssql')

const configHubie = {
	'user': process.env.DB_USER || 'sa',
	'password': process.env.DB_PASS || 'password',
	'server': process.env.DB_HOST || '127.0.0.1',
	'database': 'Hubie',
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
	'database': 'Hubie_IRB'
})
const configHubie_web = Object.assign({}, configHubie, {
	'database': 'Hubie_Web'
})

/* https://stackoverflow.com/questions/30356148/how-can-i-use-a-single-mssql-connection-pool-across-several-routes-in-an-express */
/* https://medium.com/@Abazhenov/using-async-await-in-express-with-node-8-b8af872c0016 */
const poolHubie = new sql.ConnectionPool(configHubie).connect()
	.then(pool => pool, console.log('Connected to MSSQL poolHubie'))
	.catch(err => console.log('Database Connection Failed! (poolHubie) Bad Config: ', err))

const poolHubie_irb = new sql.ConnectionPool(configHubie_irb).connect()
	.then(pool => pool, console.log('Connected to MSSQL poolHubie_irb'))
	.catch(err => console.log('Database Connection Failed! (poolHubie_irb) Bad Config: ', err))

const poolHubie_web = new sql.ConnectionPool(configHubie_web).connect()
	.then(pool => pool, console.log('Connected to MSSQL poolHubie_web'))
	.catch(err => console.log('Database Connection Failed! (poolHubie_web) Bad Config: ', err))

module.exports = function () {
	return {
		login: async (user, pass) => {
			console.log('		hubie-interface.js user is logging in :', user, pass)
			const pool = await poolHubie_web
			return await pool.request()
				.input('Username', sql.NVarChar, user)
				.input('Password', sql.NVarChar, pass)
				.execute('sv_LogIn')
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
				.execute('sp_GetPodaciPartnerPozicijaSlikeNew')
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
				.execute('sp_VratiZalihePartnerOS')
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
				.execute('sp_VratiPartnereRadnikaDashBoard')
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
				.execute('sv_InsertKomercijalistaPravo')
		},

		// KPIs report: ByCustomerBySKU page [1/2]
		rptProdaja_DailySalesKPIsReportByCustomerBySKU: async (SifraPreduzeca, Fk_Jezik, Fk_PoslovnaGodina, Datum_do, SifraPARTNER, Dali8OZ) => {
			console.log('hube-interface.js rptProdaja_DailySalesKPIsReportByCustomerBySKU')
			console.log(SifraPreduzeca, Fk_Jezik, Fk_PoslovnaGodina, Datum_do, SifraPARTNER, Dali8OZ)
			const pool = await poolHubie
			return await pool.request()
				.input('Sifra_Preduzeca', sql.Int, SifraPreduzeca)
				.input('Jezik_id', sql.NVarChar, Fk_Jezik)
				.input('Fk_PoslovnaGodina', sql.Int, Fk_PoslovnaGodina)
				.input('Datum_do', sql.NVarChar, Datum_do)
				.input('SifraPARTNER', sql.NVarChar, SifraPARTNER) // Fk_Partner
				.input('Dali8OZ', sql.Int, Dali8OZ)
				.execute('sp_RptProdaja_DailySalesKPIsReportByCustomerBySKU')
		},
		// KPIs report: ByCustomerBySKU page [2/2]
		vratiRadnikPodredjenPartner: async (SifraPreduzeca, Fk_Jezik, Sifra_Radnika, searchQuery) => {
			console.log('hube-interface.js vratiRadnikPodredjenPartner')
			console.log(SifraPreduzeca, Fk_Jezik, Sifra_Radnika, searchQuery)
			const pool = await poolHubie
			return await pool.request()
				.input('Sifra_Preduzeca', sql.Int, SifraPreduzeca)
				.input('Jezik_id', sql.NVarChar, Fk_Jezik)
				.input('Sifra_Radnika', sql.Int, Sifra_Radnika)
				.input('Search', sql.NVarChar, searchQuery)
				.execute('sp_VratiRadnikPodredjenPartner')
		},

		// KPIs report: ByArea page, CSD or Liptoon [1/1]

		// ByAreaBySKU
		// [1.1] sp_RptProdaja_DailySalesKPIsReportByAreaBySKU_CSD_New        @sifra_preduzeca=1,@jezik_id=4,@fk_poslovnagodina=17,@datum_do='2019-01-05',@sifraradnik=N'350178',@dali8OZ=0
		// [1.2] sp_RptProdaja_DailySalesKPIsReportByAreaBySKU_Lipton_New     @sifra_preduzeca=1,@jezik_id=4,@fk_poslovnagodina=17,@datum_do='2019-01-05',@sifraradnik=N'350178',@dali8OZ=0
		// [2.1] sp_RptProdaja_DailySalesKPIsReportByAreaBySKU_8OZ_CSD_New    @sifra_preduzeca=1,@jezik_id=4,@fk_poslovnagodina=17,@datum_do='2019-01-05',@sifraradnik=N'350178',@dali8OZ=1
		// [2.2] sp_RptProdaja_DailySalesKPIsReportByAreaBySKU_8OZ_Lipton_New @sifra_preduzeca=1,@jezik_id=4,@fk_poslovnagodina=17,@datum_do='2019-01-05',@sifraradnik=N'350178',@dali8OZ=1
		rptProdaja_DailySalesKPIsReportByAreaBySKU: async (isCSD, SifraPreduzeca, Fk_Jezik, Fk_PoslovnaGodina, Datum_do, Sifra_Radnika, Dali8OZ) => {
			console.log(`hube-interface.js rptProdaja_DailySalesKPIsReportByAreaBySKU, isCSD: ${isCSD}, Dali8OZ: ${Dali8OZ}`)
			console.log(isCSD, SifraPreduzeca, Fk_Jezik, Fk_PoslovnaGodina, Datum_do, Sifra_Radnika, Dali8OZ)
			console.log(Dali8OZ ? isCSD ? '[rpt 2.1] ByAreaBySKU_CSD_New' : '[rpt 2.2] ByAreaBySKU_Lipton_New' :
				isCSD ? '[rpt 1.1] ByAreaBySKU_8OZ_CSD_New' : '[rpt 1.2] ByAreaBySKU_8OZ_Lipton_New', ', Dali8OZ ?', Dali8OZ ? Dali8OZ : 0)
			const pool = await poolHubie
			return await pool.request()
				.input('Sifra_Preduzeca', sql.Int, SifraPreduzeca)
				.input('Jezik_id', sql.NVarChar, Fk_Jezik)
				.input('Fk_PoslovnaGodina', sql.Int, Fk_PoslovnaGodina)
				.input('Datum_do', sql.NVarChar, Datum_do)
				.input('SifraRadnik', sql.NVarChar, Sifra_Radnika) // Fk_Partner
				.input('Dali8OZ', sql.Int, Dali8OZ ? Dali8OZ : 0)
				.execute(Dali8OZ ?
					isCSD ?
					'sp_RptProdaja_DailySalesKPIsReportByAreaBySKU_8OZ_CSD_New' :
					'sp_RptProdaja_DailySalesKPIsReportByAreaBySKU_8OZ_Lipton_New' :
					isCSD ?
					'sp_RptProdaja_DailySalesKPIsReportByAreaBySKU_CSD_New' :
					'sp_RptProdaja_DailySalesKPIsReportByAreaBySKU_Lipton_New'
				)
		},

		// ByArea
		// [3.1] sp_RptProdaja_DailySalesKPIsReportByArea_CSD_CNC_New    @sifra_preduzeca=1,@jezik_id=4,@fk_poslovnagodina=17,@datum_do='2019-01-05',@Dali8OZ=0,@pending=1
		// [3.2] sp_RptProdaja_DailySalesKPIsReportByArea_Lipton_New     @sifra_preduzeca=1,@jezik_id=4,@fk_poslovnagodina=17,@datum_do='2019-01-05',@pending=1

		// [4  ] sp_RptProdaja_DailySalesKPIsReportByArea_Orange_New     @sifra_preduzeca=1,@jezik_id=4,@fk_poslovnagodina=17,@datum_do='2019-01-05',@Dali8OZ=0

		// [5.1] sp_RptProdaja_DailySalesKPIsReportByArea_CSD_CNC_New    @sifra_preduzeca=1,@jezik_id=4,@fk_poslovnagodina=17,@datum_do='2019-01-05',@Dali8OZ=1,@pending=1
		// [5.2] sp_RptProdaja_DailySalesKPIsReportByArea_8OZ_Lipton_New @sifra_preduzeca=1,@jezik_id=4,@fk_poslovnagodina=17,@datum_do='2019-01-05',@pending=1

		// [6  ] sp_RptProdaja_DailySalesKPIsReportByArea_Orange_New     @sifra_preduzeca=1,@jezik_id=4,@fk_poslovnagodina=17,@datum_do='2019-01-05',@Dali8OZ=1
		rptProdaja_DailySalesKPIsReportByArea: async (isCSD, isLipton, isOrange, SifraPreduzeca, Fk_Jezik, Fk_PoslovnaGodina, Datum_do, Dali8OZ, pending) => {
			Dali8OZ = Dali8OZ ? Dali8OZ : 0 // Dali8OZ 0 or 1
			console.log(`hube-interface.js ByArea, isCSD: ${isCSD}, isLipton: ${isLipton}, isOrange: ${isOrange}, ...  Dali8OZ: ${Dali8OZ}, pending: ${pending}`)
			const pool = await poolHubie
			if (isCSD) {
				console.log(Dali8OZ ? '[rpt 5.1]' : '[rpt3.1]', '_CSD_CNC_New, Dali8OZ ?', Dali8OZ)
				return await pool.request()
					.input('Sifra_Preduzeca', sql.Int, SifraPreduzeca)
					.input('Jezik_id', sql.NVarChar, Fk_Jezik)
					.input('Fk_PoslovnaGodina', sql.Int, Fk_PoslovnaGodina)
					.input('Datum_do', sql.NVarChar, Datum_do)
					.input('Dali8OZ', sql.Int, Dali8OZ) // Dali8OZ 0 or 1
					.input('pending', sql.Int, 1)
					.execute('sp_RptProdaja_DailySalesKPIsReportByArea_CSD_CNC_New')
			}
			if (isLipton) {
				console.log(Dali8OZ ? '[rpt 5.2] _8OZ_Lipton_New ' : '[rpt 3.2] _Lipton_New', 'Dali8OZ ?', Dali8OZ, 'isCSD ?', isCSD);
				return await pool.request()
					.input('Sifra_Preduzeca', sql.Int, SifraPreduzeca)
					.input('Jezik_id', sql.NVarChar, Fk_Jezik)
					.input('Fk_PoslovnaGodina', sql.Int, Fk_PoslovnaGodina)
					.input('Datum_do', sql.NVarChar, Datum_do)
					// .input('Dali8OZ', sql.Int, Dali8OZ ? Dali8OZ : 0)
					.input('pending', sql.Int, 1) // pending 0 or 1
					.execute(Dali8OZ ?
						'sp_RptProdaja_DailySalesKPIsReportByArea_Lipton_New' :
						'sp_RptProdaja_DailySalesKPIsReportByArea_8OZ_Lipton_New'
					)
			}
			if (isOrange) {
				console.log('_Orange_New (rpt ', Dali8OZ ? '6' : '4', '), Dali8OZ ?', Dali8OZ ? Dali8OZ : 0)
				return await pool.request()
					.input('Sifra_Preduzeca', sql.Int, SifraPreduzeca)
					.input('Jezik_id', sql.NVarChar, Fk_Jezik)
					.input('Fk_PoslovnaGodina', sql.Int, Fk_PoslovnaGodina)
					.input('Datum_do', sql.NVarChar, Datum_do)
					.input('Dali8OZ', sql.Int, Dali8OZ ? Dali8OZ : 0) // Dali8OZ 0 or 1
					// .input('pending', sql.Int, 1) // Fk_Partner
					.execute('sp_RptProdaja_DailySalesKPIsReportByArea_Orange_New')
			}
		},

		// [7.1] sp_RptProdaja_DailySalesKPIsReportByCustomer_CSD_ByChannel_New     @sifra_preduzeca=1,@jezik_id=4,@fk_poslovnagodina=17,@datum='2019-01-05',@PoNadredjenima=1,@SifraRadnik=N'350178',@Dali8OZ=0,@pending=1
		// [7.2] sp_RptProdaja_DailySalesKPIsReportByCustomer_Lipton_ByChannel_New  @sifra_preduzeca=1,@jezik_id=4,@fk_poslovnagodina=17,@datum='2019-01-05',@PoNadredjenima=1,@SifraRadnik=N'350178',@Dali8OZ=0,@pending=1
		// [8.1] sp_RptProdaja_DailySalesKPIsReportByCustomer_CSD_ByChannel_New     @sifra_preduzeca=1,@jezik_id=4,@fk_poslovnagodina=17,@datum='2019-01-05',@PoNadredjenima=1,@SifraRadnik=N'350178',@Dali8OZ=1,@pending=1
		// [8.2] sp_RptProdaja_DailySalesKPIsReportByCustomer_Lipton_ByChannel_New  @sifra_preduzeca=1,@jezik_id=4,@fk_poslovnagodina=17,@datum='2019-01-05',@PoNadredjenima=1,@SifraRadnik=N'350178',@Dali8OZ=1,@pending=1
		rptProdaja_DailySalesKPIsReportByCustomer: async (isCSD, SifraPreduzeca, Fk_Jezik, Fk_PoslovnaGodina, Datum, Sifra_Radnika, Dali8OZ) => {
			Dali8OZ = Dali8OZ ? Dali8OZ : 0 // Dali8OZ 0 or 1
			console.log(Dali8OZ ?
				isCSD ? '[rpt 8.1] ByCustomer_CSD_ByChannel_New' : '[rpt 8.2] ByCustomer_Lipton_ByChannel_New' :
				isCSD ? '[rpt 7.1] ByCustomer_CSD_ByChannel_New' : '[rpt 7.2] ByCustomer_Lipton_ByChannel_New, ')
			const pool = await poolHubie
			return await pool.request()
				.input('Sifra_Preduzeca', sql.Int, SifraPreduzeca)
				.input('Jezik_id', sql.NVarChar, Fk_Jezik)
				.input('Fk_PoslovnaGodina', sql.Int, Fk_PoslovnaGodina)
				.input('Datum', sql.NVarChar, Datum)
				.input('PoNadredjenima', sql.Int, 1)
				.input('SifraRadnik', sql.NVarChar, Sifra_Radnika)
				.input('Dali8OZ', sql.Int, Dali8OZ) // Dali8OZ 0 or 1
				.input('pending', sql.Int, 1)
				.execute(isCSD ?
					'sp_RptProdaja_DailySalesKPIsReportByCustomer_CSD_ByChannel_New' :
					'sp_RptProdaja_DailySalesKPIsReportByCustomer_Lipton_ByChannel_New'
				)
		},

		// [9.1] sp_RptProdaja_DailySalesKPIsReportByOutlet_new  @sifra_preduzeca=1,@jezik_id=4,@fk_poslovnagodina=17,@datum='2019-01-05',@Dali8OZ=0,@PoNadredjenima=1,@Sort=1,@SifraRadnik=N'350178'
		// [9.2] sp_RptProdaja_DailySalesKPIsReportByOutlet_new  @sifra_preduzeca=1,@jezik_id=4,@fk_poslovnagodina=17,@datum='2019-01-05',@Dali8OZ=1,@PoNadredjenima=1,@Sort=1,@SifraRadnik=N'350178'
		rptProdaja_DailySalesKPIsReportByOutlet: async (SifraPreduzeca, Fk_Jezik, Fk_PoslovnaGodina, Datum, Sifra_Radnika, Dali8OZ) => {
			Dali8OZ = Dali8OZ ? Dali8OZ : 0 // Dali8OZ 0 or 1
			console.log(Dali8OZ ? '[rpt 9.1]' : '[rpt 9.2]', ' sp_RptProdaja_DailySalesKPIsReportByOutlet_new, Dali8OZ ?', Dali8OZ)
			const pool = await poolHubie
			return await pool.request()
				.input('Sifra_Preduzeca', sql.Int, SifraPreduzeca)
				.input('Jezik_id', sql.NVarChar, Fk_Jezik)
				.input('Fk_PoslovnaGodina', sql.Int, Fk_PoslovnaGodina)
				.input('Datum', sql.NVarChar, Datum)
				.input('Dali8OZ', sql.Int, Dali8OZ) // Dali8OZ 0 or 1
				.input('PoNadredjenima', sql.Int, 1)
				.input('Sort', sql.Int, 1)
				.input('SifraRadnik', sql.NVarChar, Sifra_Radnika)
				.execute('sp_RptProdaja_DailySalesKPIsReportByOutlet_new')
		},

		// tlnr, [Hubie_Web].[dbo].[sv_VratiPartnerOpremaIzuzetak] (@sifra_preduzeca int, @jezik_id int, @SifraRadnik INT)
		vratiPartnerOpremaIzuzetak: async (SifraPreduzeca, lang_id, Fk_Radnik) => {
			const pool = await poolHubie_web
			return await pool.request()
				.input('Sifra_Preduzeca', sql.Int, SifraPreduzeca)
				.input('Jezik_id', sql.Int, lang_id)
				.input('SifraRadnik', sql.Int, Fk_Radnik)
				.execute('sv_VratiPartnerOpremaIzuzetak')
		},

	}
}();
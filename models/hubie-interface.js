var sql = require('mssql');

const configHubie = {
	user: 'sa',
	password: 'password',
	// server: '10.11.2.138',
  	// database: 'hubie_web',
	//password: 'T1tanstr0ng',
  server: '10.11.2.19',
  database: 'Hubie',
  connectionTimeout: 5000,
  requestTimeout: 10000,
  pool: {
  	max: 15,
  	idleTimeoutMillis: 60000
	},
	options: {
		encrypt: true,
		instanceName: 'sql2008r2d'
	}
}

const configHubie_irb = Object.assign({}, configHubie);
configHubie_irb.database = 'Hubie_irb';


module.exports = function() {
	let connError = {};
	let pool = null;
	let poolHubie_irb = null;
	return {
		connect: function() {
			console.log('configHubie.database', configHubie.database);
			pool = new sql.ConnectionPool(configHubie, err => {
				if(err) {
					connError.hasError = true;
					connError.error = err.originalError;
				}
			});
			poolHubie_irb = new sql.ConnectionPool(configHubie_irb, err => {
				if(err) {
					connError.hasError = true;
					connError.error = err.originalError;
				}
			});
			return this;
		},
		login: function(user, pass, forTicketing) {
			let procedure = 'task_LogIn';
			if (forTicketing !== undefined && forTicketing !== "") procedure = 'Prijava_LogIn'; 
			return pool.request()
								 .input('username', sql.NVarChar, user)
								 .input('password', sql.NVarChar, pass)
						.execute(procedure);
		},
		logout: function() {
			return "logout f()";
		},
		loadTasks: function(companyCode, fk_appUser, lang_id) {
			return pool.request()
								 .input('SifraPreduzeca', sql.Int, companyCode)
								 .input('Fk_korisnikApl', sql.Int, fk_appUser)
								 .input('Jezik_id', sql.Int, lang_id)
						.execute('task_GetOpenTasks');
		},
		getTask: function(companyCode, lang_id, task_id) {
			return pool.request()
								 .input('SifraPreduzeca', sql.Int, companyCode)
								 .input('Jezik_id', sql.Int, lang_id)
								 .input('Fk_Task', sql.Int, task_id)
						.execute('task_GetTask');
		},
		loadPartners: function(companyCode, lang_id, searchstr) {
			return pool.request()
								 .input('Sifra_Preduzeca', sql.Int, companyCode)
								 .input('Jezik_id', sql.Int, lang_id)
								 .input('global', sql.NVarChar, searchstr)
						.execute('sp_GlobalPartner');
		},
		createTask: function(companyCode, lang_id, fk_appUser, fk_radnik, newTask) {
		  	 console.log("newTask");
		  	 console.log(newTask);

			return pool.request()
								 .input('sifra_preduzeca', sql.Int, companyCode)
								 .input('kor_id', sql.Int, fk_appUser)
								 //.input('Datum', sql.DateTime, new Date().toISOString().slice(0, 19).replace('T', ' '))
								 //.input('Datum', sql.DateTime, new Date('05/08/07 12:35 PM'))
								 .input('Datum', sql.DateTime, new Date())
								 .input('Fk_Partner', sql.NVarChar, newTask["Pk_id"])
								 .input('Subject', sql.NVarChar(250), newTask["Subject"].substring(0, 250))
								 .input('Fk_Radnik', sql.Int, newTask["Status"] == 2242 ? null : fk_radnik)  // status "na čekanju" => radnik = null
								 .input('PlanOd', sql.DateTime, null)
								 .input('PlanDo', sql.DateTime, null)
								 .input('PlanVreme', sql.NVarChar(5), "00:00")
								 .input('RealizovanOd', sql.DateTime, null)
								 .input('RealizovanDo', sql.DateTime, null)
								 .input('RealizacijaVreme', sql.NVarChar(5), "00:00")
								 .input('KomentarRadnika', sql.NVarChar(250), null)
								 .input('Fk_St_420', sql.Int, newTask["Status"])
						.execute('task_InsertTask');
		},	
		updateTask: function(companyCode, fk_appUser, lang_id, task) {
			task.RealizovanOdISO  = task.RealizovanOdISO || null;
			task.RealizovanDoISO  = task.RealizovanDoISO || null;
			task.RealizacijaDani  = parseInt(task.RealizacijaDani) || 0;
			task.fk_radnik 				= parseInt(task.fk_radnik) || null;
			return pool.request()
								 .input('SifraPreduzeca', sql.Int, companyCode)
								 .input('Jezik_id', sql.Int, lang_id)
								 .input('fk_KorisnikApl', sql.Int, fk_appUser)
								 .input('RealizovanOd', sql.NVarChar, task.RealizovanOdISO)
								 .input('RealizovanOdVreme', sql.NVarChar, task.RealizovanOdVreme)
								 .input('RealizovanDo', sql.NVarChar, task.RealizovanDoISO)
								 .input('RealizovanDoVreme', sql.NVarChar, task.RealizovanDoVreme)
								 .input('RealizacijaVreme', sql.NVarChar, task.RealizacijaVreme)
								 .input('RealizacijaDani', sql.Int, task.RealizacijaDani)
								 .input('Fk_St_420', sql.Int, task.Naziv_Stavke)
								 .input('KomentarRadnika', sql.NVarChar, task.KomentarRadnika)
								 .input('fk_radnik', sql.Int, task.fk_radnik)
								 .input('Fk_Task', sql.Int, task.Pk_Id)
							.execute('task_UpdateTask');
		},
		loadTickets: function(companyCode, fk_appUser, fk_partner, lang_id) {
			return pool.request()
								 .input('SifraPreduzeca', sql.Int, companyCode)
								 .input('Fk_korisnikApl', sql.Int, fk_appUser)
								 .input('fk_Partner', sql.Int, fk_partner)
								 .input('Jezik_id', sql.Int, lang_id)
						.execute('Prijava_GetOpenTickets');
		},
		createTicket: function(companyCode, fk_appUser, fk_partner, ticket, attachedFile) {
			return pool.request()
								 .input('Sifra_Preduzeca', sql.Int, companyCode)
								 .input('kor_id', sql.Int, fk_appUser)
								 .input('Datum', sql.NVarChar, ticket.ticketDate)
								 .input('fk_Partner', sql.Int, fk_partner)
								 .input('Prijavio', sql.NVarChar(50), "")
								 .input('Fk_St_417', sql.Int, ticket.ticketType)
								 .input('Subject', sql.NVarChar(250), ticket.ticketSubject)
								 .input('Referenca', sql.NVarChar(50), ticket.referenca)
								 .input('Fk_St_418', sql.Int, ticket.ticketPriority)
								 .input('Dokument', sql.Image, attachedFile.buffer)
								 .input('OpisDokumenta', sql.NVarChar(250), attachedFile.originalname)
								 .input('Fk_St_431', sql.Int, 2335)
							.execute('Prijava_InsertTicket');
		},
		getTicket: function(companyCode, lang_id, ticket_id) {
			return pool.request()
								 .input('SifraPreduzeca', sql.Int, companyCode)
								 .input('Jezik_id', sql.Int, lang_id)
								 .input('Fk_Prijava', sql.Int, ticket_id)
						.execute('Prijava_GetTicket');
		},
		vratiRS: function(companyCode, lang_id, appUser, whichTable, FkStSt) {
			return pool.request()
								 .input('Sifra_Preduzeca', sql.Int, companyCode)
								 .input('jezik_id', sql.Int, lang_id)
								 .input('sifra_nvar', sql.NVarChar(16), appUser)
								 .input('KojaTabela', sql.NVarChar(64), whichTable)
								 .input('FkStSt', sql.Int, FkStSt)
						.execute('sp_VratiRS');
		},

		vratiPodredjeneRadnike: function(companyCode, lang_id, fk_appUser) {
			return pool.request()
								 .input('Sifra_Preduzeca', sql.Int, companyCode)
								 .input('Jezik_Id', sql.Int, lang_id)
								 .input('Sifra_Radnika', sql.Int, fk_appUser)
						.execute('sp_VratiPodredjeneRadnike');
		},
		// ova procedura vraca konkretne podatke o ruti za izabranog radnika - prodavca, podatke o njegovim posetama u danu
		rptDnevniPregledRute: function(companyCode, fiscalYear, lang_id, fk_seller, date) {
			return pool.request()
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
			return pool.request()
								.input('Sifra_Predizece', sql.Int, companyCode)
								.input('Jezik_Id', sql.Int, lang_id)
								.input('Fk_PoslovnaGodina', sql.Int, fiscalYear)
								.input('Fk_Partner', sql.Int, fk_partner)
								.input('Datum', sql.NVarChar, date)
						.execute('sp_VratiZalihePartnerOS');
		}
	}
}();
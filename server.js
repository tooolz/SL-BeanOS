/* modules */
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();
const http = require('http');
const url = require('url');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const mysql = require('mysql');
const fs = require("fs");
const { Worker } = require("worker_threads");
const cliProgress = require('cli-progress');
const ytpl = require('ytpl');
const cookieParser = require('cookie-parser');
var unidecode = require('unidecode');
const throttledQueue = require('throttled-queue');
const crypto = require('node:crypto');
/* custom modules */
const ytdl = require('./include/ytdl');
const deezer = require('./include/deezer');
const corrade = require('./include/corrade');
const slScraper = require('./include/sl.profile_scraper');
const slMsgDevice = require('./include/sl.msg_device');
/* globals */
const db_creds = require('./include/db.credentials');
var db_tables = [];
var db_data = [];
var cache_data = [];
var stats_data = [];
var api_throttles = [];
const sl_regex = new RegExp(/[^a-zA-Z 0-9-()]+/g);
const uuid_regex = new RegExp(/^(?!00000000-0000-0000-0000-000000000000)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
/* development restriction setting */
const devMode = false;

/* sql */
var db = mysql.createConnection({
	host: db_creds.ip,
	user: db_creds.user,
	password: db_creds.password,
	database: db_creds.db
});

db.connect(function (error) {
	if(error) {
		console.log('> Can\'t connect to MySQL');
		process.exit();
	} else {
		console.log('[MySQL] Connected to ' + db_creds.ip);
		/* load all tables */
		init.init();
	}
});

var init = {
	/* (A) Globals */
	chunkSize : 10000,
	multibars : [],
	/* (B) Functions */
	init : async function() {
		/* get list of tables */
		await init.load_tablelist();
		
		/* two progress bars, total and current */
		const multibar = new cliProgress.MultiBar({
			clearOnComplete: true,
			hideCursor: true,
			format: ' {bar} | {title} | {value}/{total}',
		}, cliProgress.Presets.shades_grey);
		
		init.multibars[0] = multibar.create(db_tables.length, 0); // total status
		init.multibars[0].update(0, {title: '- loading -'});
		init.multibars[1] = multibar.create(0, 100); // current status
		
		/* make load promise for each */
		for(var i = 0; i < db_tables.length; i++) {
			init.multibars[0].update(i);
			await init.load_db(db_tables[i]);
		}
		
		multibar.stop();
		console.log('[MySQL] Loaded ' + db_tables.length + ' tables!');
		
		
		/* Go public! */
		process.stdout.write('\033c');
		init.make_public();
	},
	
	load_tablelist : async function() {
		return new Promise((resolve, reject) => {
			db.query('SELECT table_name FROM information_schema.tables WHERE table_schema = "sl_BeanOS"', function(err, rows, fields){
				if(err) {
					console.log('[MySQL] An error occoured loading tablelist - ' + err);
					process.exit();
				} else {
					for(var i = 0; i < rows.length; i++) {
						db_tables.push(rows[i]['table_name']);
					}
					
					console.log('[MySQL] Found ' + db_tables.length + ' tables!');
					return resolve();
				}
			});
		});
	},
	
	load_db : async function(tablename) {
		var tableCount = await new Promise((resolve, reject) => {
			db.query('SELECT count(*) as total FROM `' + tablename + '`', function(err, rows, fields){
				if(err) {
					console.log('[MySQL] An error occoured loading db ' + tablename + ' - ' + err);
					process.exit();
				} else {
					if(rows && rows[0]) {
						return resolve(rows[0]['total']);
					}
				}
			});
		});
		
		/* set progress bar */
		init.multibars[1].update(0, {title: tablename});
		init.multibars[1].setTotal(tableCount);
		
		/* load chunks */
		var chunks = Math.ceil(tableCount/init.chunkSize);
		var query = 'SELECT * FROM `' + tablename + '` LIMIT ';
		var promises = [];
		db_data[tablename] = [];
		db_data[tablename]['map'] = [];
		for(var i = 0; i < chunks; i++) {
			var offset = i*init.chunkSize;
			var runQuery = query + offset + "," + init.chunkSize;
			promises.push(new Promise((resolve, reject) => {
				let tmp_counter = offset;
				
				db.query(runQuery, function(err, rows) {
					if(err) {
						console.log('[MySQL] An error occoured loading ' + tablename + ' - ' + err);
						process.exit();
					} else {
						init.multibars[1].update(tmp_counter);
						for(var row = 0; row < rows.length; row++) {
							var tmp_id = Object.values(rows[row])[0];
							db_data[tablename][tmp_id] = Object.assign({}, rows[row]);
							db_data[tablename]['map'].push(tmp_id);
						}
						init.multibars[1].update(tmp_counter + rows.length);
						return resolve();
					}
				});
			}));
		}
		
		await Promise.all(promises);
	},
	
	make_public : async function() {
		/* output motivational banner */
		console.log("╔════════════════════════════════════════════════════════════════════════════╗\n║      ███████████                                ███████     █████████      ║\n║     ░░███░░░░░███                             ███░░░░░███  ███░░░░░███     ║\n║      ░███    ░███  ██████  ██████  ████████  ███     ░░███░███    ░░░      ║\n║      ░██████████  ███░░███░░░░░███░░███░░███░███      ░███░░█████████      ║\n║      ░███░░░░░███░███████  ███████ ░███ ░███░███      ░███ ░░░░░░░░███     ║\n║      ░███    ░███░███░░░  ███░░███ ░███ ░███░░███     ███  ███    ░███     ║\n║      ███████████ ░░██████░░████████████ █████░░░███████░  ░░█████████      ║\n║     ░░░░░░░░░░░   ░░░░░░  ░░░░░░░░░░░░ ░░░░░   ░░░░░░░     ░░░░░░░░░       ║\n╚════════════════════════════════════════════════════════════════════════════╝\n");
		
		/* assets */
		app.use('/assets', express.static(__dirname + '/assets'));

		/* app */
		app.get('/', (req, res) => {
			var visitor_uuid = req.url.substring(2);
			if(uuid_regex.test(visitor_uuid)) {
				console.log('[HTTP] user ' + visitor_uuid + ' connected from ' + req.socket.remoteAddress);
				/* dev mode enabled? */
				if(devMode) {
					if(visitor_uuid == 'b3eb5433-ff0a-44fe-9a59-5615a090ae94') {
						res.sendFile(__dirname + '/index.html');
					} else {
						res.sendFile(__dirname + '/devmode.html');
					}
				} else {
					res.sendFile(__dirname + '/index.html');
				}
				
			} else {
				res.status(400).json({status: 400, message: "Id must be present"})
			}
		});
		
		/* api */
		app.use(bodyParser.json());
		app.post('/api', async function (req, res) {
			console.log('[HTTP] API-call from ' + req.socket.remoteAddress);
			console.log(req.body);
			
			var tmp_req = { 'headers': req.headers };
			tmp_req = Object.assign(req.body, tmp_req);
			
			/* validate uuid */
			if(uuid_regex.test(tmp_req.headers['x-secondlife-owner-key'])) {
				/* validate their queue or create a new */
				if(api_throttles[tmp_req.headers['x-secondlife-owner-key']] == undefined) {
					api_throttles[tmp_req.headers['x-secondlife-owner-key']] = throttledQueue(10, 1000, true);
				} else {
					if(api_throttles[tmp_req.headers['x-secondlife-owner-key']].getQueueLength() < 5) {
						var tmp_res = await api.handle(tmp_req, null);
						if(tmp_res != null) {
							res.status(200).json(tmp_res);
						} else {
							res.status(404);
						}
					} else {
						console.log(tmp_req.headers['x-secondlife-owner-key'] + "> throttled. " + api_throttles[tmp_req.headers['x-secondlife-owner-key']].getQueueLength() + " queue size.");
						res.status(429);
					}
				}
			}
		});

		server.listen(9090, () => {
			console.log('[HTTP] listening on *:9090');
		});
		
		/* background handlers */
		handler.uploader();
		handler.identifier();
		handler.deliveryQueue();
		handler.calcStats();
		
		/* cache containers */
		cache_data['deezer-search'] = [];
		cache_data['music-search'] = [];
		
		/* cache garbage handler */
		handler.cacheCleaner();
	}
}

var sessionMiddleware = session({
	secret: "keyboard cat"
});

io.use(function (socket, next) {
	sessionMiddleware(socket.request, socket.request.res, next);
});

io.on('connection', (socket) => {
	console.log('[IO] someone connected from ' + socket.handshake.address);
	socket.emit('login', { success: false, 'action': 'connected' });
	
	socket.on('disconnect', () => {
		console.log('[IO] user disconnected from ' + socket.handshake.address);
		
		/* were they logged in? */
		if(socket.request.session.userID != undefined) {
			io.to('test_facility').emit('actionList', { 'action': 'logout', 'uuid': socket.request.session.userID });
		}
	});
	
	socket.on('heartbeat', () => {
		socket.emit('heartbeat');
	});
	
	socket.on('login', (data) => {
		/* validate UUID */
		if(uuid_regex.test(data.uuid)) {			
			if(db_data['_userlist_'][data.uuid] != undefined) {
				/* is user validated? */
				if(db_data['_userlist_'][data.uuid].validated_date == undefined) {
					/* are we currently validating? */
					if(data.pin != undefined) {
						/* is it the correct pin? */
						if(db_data['_userlist_'][data.uuid].validationcode == parseInt(data.pin)) {
							/* update validated_date, and set default pin of 1234 */
							db.query('UPDATE _userlist_ SET `validated_date`=current_timestamp(), `keycode`="1234" WHERE uuid="' + data.uuid + '"', function(err){
								if(err) {
									socket.emit('login', { success: 'fatal-error', 'msg': 'Database is currently unavailable. Please try again later.' });
									console.log('[MySQL] Error attempting to validate user - ' + err);
								} else {
									/* update their validation date and pincode in local memory */
									db_data['_userlist_'][data.uuid].validated_date = Date.now();
									db_data['_userlist_'][data.uuid].keycode = 1234;
									/* log them in without a pincode, just this one time */
									socket.request.session.userID = data.uuid;
									socket.request.session.save();
									socket.join("test_facility");
									socket.emit('login', { success: true });
									io.to('test_facility').emit('actionList', { 'action': 'login', 'uuid': data.uuid });
									/* delayed response */
									setTimeout(function() {
										socket.emit('settings', { 'action': 'change-pincode' });
									}, 1000);
								}
							});
							
							/* update user with validation_date */
							var tmp_date = new Date();
							var tmp_obj = {
								'validated_date': tmp_date
							};
							db_data['_userlist_'][data.uuid] = Object.assign(db_data['_userlist_'][data.uuid], tmp_obj);
						} else {
							socket.emit('login', { 'action': 'invalid-pin' });
						}
					} else {
						socket.emit('login', { success: false, 'action': 'validate' });
					}
				} else {
					/* user validated - are we logging in? */
					if(data.pin != undefined) {
						/* is it the correct pincode? */
						if(db_data['_userlist_'][data.uuid].keycode == parseInt(data.pin)) {
							/* login! */
							socket.request.session.userID = data.uuid;
							socket.request.session.save();
							socket.join("test_facility");
							socket.emit('login', { success: true });
							io.to('test_facility').emit('actionList', { 'action': 'login', 'uuid': data.uuid });
						} else {
							socket.emit('login', { success: false, msg: 'Invalid pincode!', 'action': 'invalid-pin' });
						}
					} else {
						socket.emit('login', { success: false, 'action': 'pincode' });
					}
				}
			} else {
				/* register user */
				registerUser(data.uuid, socket.id);
			}
		} else {
			console.log('[IO] user sent invalid UUID from ' + socket.handshake.address + '! disconnecting!');
			socket.emit('alert', { 'action': 'fatal-error', 'msg': 'Invalid UUID provided.' });
			socket.disconnect();
		}
	});
	
	socket.on('api', (data) => {
		/* validate they're logged in with a valid uuid */
		if(socket.request.session.userID != undefined) {
			if(uuid_regex.test(socket.request.session.userID)) {
				/* validate their queue or create a new */
				if(api_throttles[socket.request.session.userID] == undefined) {
					api_throttles[socket.request.session.userID] = throttledQueue(10, 1000);
				} else {
					if(api_throttles[socket.request.session.userID].getQueueLength() < 5) {
						let tmp_socketdata = { 'id': socket.id, 'uuid': socket.request.session.userID };
						api.handle(data, tmp_socketdata);
					} else {
						console.log(socket.request.session.userID + '> throttled. ' + api_throttles[socket.request.session.userID].getQueueLength() + " queue size.");
					}
				}
			} else {
				console.log('[IO] user accessed api with invalid session ' + socket.handshake.address + '! disconnecting!');
				socket.emit('alert', { 'action': 'fatal-error', 'msg': 'Invalid UUID, please clear your cookies.' });
				socket.disconnect();
			}
		}
	});
});

/* functions */

var api = {
	/* (A) Globals */
	
	/* (B) Functions */
	handle : async function(data, socketdata) {
		/* init api throttle */
		let throttle_uuid;
		/* validate we have an sl uuid present */
		if(socketdata == null) {
			if(data.headers['x-secondlife-owner-key'] != undefined) { throttle_uuid = data.headers['x-secondlife-owner-key']; }
		} else {
			throttle_uuid = socketdata.uuid;
		}
		
		if(throttle_uuid != null) {
			/* init throttled request */
			await api_throttles[throttle_uuid]();
						
			let time1 = performance.now();
			var tmp_data = {};
			
			/* serve request, if any */
			if(data.app != undefined) {
				try {
					/* validate inworld devices */
					if(socketdata == null) { await api.devices.validate(data); }
					/* send to app */
					switch(data.app) {
						case 'lookup':
							tmp_data = await api.lookup(data);
							break;
						case 'devices':
							tmp_data = await api.devices.manage(data);
							break;
						case 'music':
							tmp_data = await api.music.handle(data, socketdata);
							break;
						case 'deezer':
							tmp_data = await api.deezer.handle(data, socketdata);
							break;
						case 'system':
							tmp_data = await api.system.handle(data, socketdata);
							break;
						case 'stats':
							tmp_data = stats_data['output'];
							break;
					}
					
					/* include app name */
					Object.assign(tmp_data, { 'app': data.app });
				} catch(err) {
					console.log('[API] error:');
					console.log(err);
					tmp_data = { 'app': data.app, 'error': err.message };
				}
			} else {
				tmp_data = { 'error': 'no app selected' };
			}
			
			/* translate from-to address? */
			if(data.target != undefined && data.source != undefined) {
				Object.assign(tmp_data, { 'target': data.source })
			}
			
			let time2 = performance.now();		
			/* store performance for stats */
			if(stats_data['api-log'].length > 1000) { stats_data['api-log'].pop(); }
			stats_data['api-log'].unshift(time2 - time1);
			var totaltime = time2 - time1;
			console.log("[API]: " + totaltime + "ms");
		} else {
			tmp_data = { 'error': 'no uuid present' };
		}
		
		/* transmit accordingly */
		if(socketdata != null) {
			if(tmp_data != null) {
				io.to(socketdata.id).emit(data.app, tmp_data);
			}
		} else {
			/* include requested app if applicable */
			if(data.app != undefined) {
				Object.assign(tmp_data, { 'app': data.app });
			}
			
			return tmp_data;
		}
	},
	
	devices : {
		validate : function(data) {
			return new Promise((resolve, reject) => {
				/* received through http post - validate headers */
				let ReqHeaders = [
					'x-secondlife-object-key',
					'x-secondlife-object-name',
					'x-secondlife-owner-key',
					'x-secondlife-region',
					'x-secondlife-local-position'
				];
				ReqHeaders.forEach((item) => {
					if(data.headers[item] == undefined) {
							console.log('[API] error, missing header:');
							console.log(item);
							reject('Insufficient SL headers received.')
					} else {
						/* strip html tags so the database doesn't get pwned */
						data.headers[item] = escapeStr(data.headers[item]);
					}
				});
				
				/* validate that the uuid keys are actually uuids */
				if(!uuid_regex.test(data.headers['x-secondlife-owner-key'])) {
					console.log('[API] error, invalid owner UUID: (' + data.headers['x-secondlife-owner-key'] + ')');
					reject('Invalid owner UUID received in headers.')
				}
				
				if(!uuid_regex.test(data.headers['x-secondlife-object-key'])) {
					console.log('[API] error, invalid object UUID: (' + data.headers['x-secondlife-object-key'] + ')');
					reject('Invalid object UUID received in headers.')
				}
				
				/* validate any url given is actually a url */
				let tmp_url = null;
				if(data.device_link != undefined) {
					if(validateURL(data.device_link)) {
						tmp_url = '\'' + data.device_link + '\'';
					} else {
						/* what are you doing step-bro */
						reject('The device URL transmitted is invalid.');
					}
				}
				
				/* does owner user have any devices? */
				if(db_data[data.headers['x-secondlife-owner-key'] + '_devices'] == undefined) {
					let tmp_query = 'CREATE TABLE `' + data.headers['x-secondlife-owner-key'] + '_devices' +'` (`device_uuid` text NOT NULL, `device_name` text DEFAULT NULL, `device_script` text DEFAULT NULL, `device_location_region` text DEFAULT NULL, `device_location_local` text DEFAULT NULL, `device_link` text DEFAULT NULL, `date_added` datetime DEFAULT NULL, `date_lastseen` datetime DEFAULT NULL, `date_approved` datetime DEFAULT NULL, PRIMARY KEY (`device_uuid`(42))) ENGINE=InnoDB DEFAULT CHARSET=latin1;';
					/* create user device table */
					db.query(tmp_query, function(err, rows, fields) {
						if(!err) {
							let tmp_date = Date.now();
							
							/* insert newly discovered device */
							tmp_query = 'INSERT INTO `' + data.headers['x-secondlife-owner-key'] + '_devices' + '` (`device_uuid`, `device_name`, `device_script`, `device_location_region`, `device_location_local`, `device_link`, `date_added`, `date_lastseen`, `date_approved`) VALUES (\'' + data.headers['x-secondlife-object-key'] + '\', \'' + data.headers['x-secondlife-object-name'] + '\', null, \'' + data.headers['x-secondlife-region'] + '\', \'' + data.headers['x-secondlife-local-position'] + '\', ' + tmp_url + ', current_timestamp(), current_timestamp(), null)';
							console.log(tmp_query);
							db.query(tmp_query, function(err) {
								if(!err) {
									/* add to local data */
									db_data[data.headers['x-secondlife-owner-key'] + '_devices'] = [];
									db_data[data.headers['x-secondlife-owner-key'] + '_devices'][data.headers['x-secondlife-object-key']] = {
										'device_name': data.headers['x-secondlife-object-name'],
										'device_script': null,
										'device_location_region': data.headers['x-secondlife-region'],
										'device_location_local': data.headers['x-secondlife-local-position'],
										'device_link': tmp_url,
										'date_added': tmp_date,
										'date_lastseen': tmp_date,
										'date_approved': null,
									};
									reject('Your first ever device has been registered. Please authenticate it in your BeanOS HUD.');
								} else {
									console.log(err);
									reject('The database was unable to store your new device, please try again later.');
								}
							});
						} else {
							reject(err);
						}
					});
				} else {
					/* is this device unregistered? */
					if(db_data[data.headers['x-secondlife-owner-key'] + '_devices'][data.headers['x-secondlife-object-key']] == undefined) {
						let tmp_date = Date.now();
						
						/* insert newly discovered device */
						tmp_query = 'INSERT INTO `' + data.headers['x-secondlife-owner-key'] + '_devices' + '` (`device_uuid`, `device_name`, `device_location_region`, `device_location_local`, `device_link`, `date_added`, `date_lastseen`, `date_approved`) VALUES (\'' + data.headers['x-secondlife-object-key'] + '\', \'' + data.headers['x-secondlife-object-name'] + '\', \'' + data.headers['x-secondlife-region'] + '\', \'' + data.headers['x-secondlife-local-position'] + '\', ' + tmp_url + ', current_timestamp(), current_timestamp(), null)';
						db.query(tmp_query, function(err) {
							if(!err) {
								/* add to local data */
								db_data[data.headers['x-secondlife-owner-key'] + '_devices'][data.headers['x-secondlife-object-key']] = {
									'device_name': data.headers['x-secondlife-object-name'],
									'device_script': null,
									'device_location_region': data.headers['x-secondlife-region'],
									'device_location_local': data.headers['x-secondlife-local-position'],
									'device_link': tmp_url,
									'date_added': tmp_date,
									'date_lastseen': tmp_date,
									'date_approved': null,
								};
								reject('Your new device has been registered, please authenticate it in your BeanOS HUD.');
							} else {
								reject('The database was unable to store your new device, please try again later.');
							}
						});
					} else {
						/* refresh device info */
						api.devices.refresh(data);
						
						/* is this device authenticated? */
						// if(db_data[data.headers['x-secondlife-owner-key'] + '_devices'][data.headers['x-secondlife-object-key']].date_approved == null) {
							// reject('Your device is not yet authenticated, please authenticate it in your BeanOS HUD.');
						// } else {
							// resolve();
						// }
						resolve();
					}
				}
			});
		},
		
		refresh : function(data) {
			let tmp_query = null;
			let tmp_date = Date.now();
			
			/* refresh local info */
			db_data[data.headers['x-secondlife-owner-key'] + '_devices'][data.headers['x-secondlife-object-key']].device_name = data.headers['x-secondlife-object-name'];
			db_data[data.headers['x-secondlife-owner-key'] + '_devices'][data.headers['x-secondlife-object-key']].device_location_region = data.headers['x-secondlife-region'];
			db_data[data.headers['x-secondlife-owner-key'] + '_devices'][data.headers['x-secondlife-object-key']].device_location_local = data.headers['x-secondlife-local-position'];
			db_data[data.headers['x-secondlife-owner-key'] + '_devices'][data.headers['x-secondlife-object-key']].date_lastseen = tmp_date;
			
			/* new url? */
			if(data.device_link != undefined) {
				db_data[data.headers['x-secondlife-owner-key'] + '_devices'][data.headers['x-secondlife-object-key']].device_link = data.device_link;
			}
		},
		
		manage : function(data) {
			return new Promise((resolve, reject) => {
				let tmp_data = null;
				
				resolve(tmp_data);
			});
		}
	},
	
	music : {
		handle : async function (data, socketdata) {
			if(data.action != undefined) {
				/* find uuid */
				let tmp_uuid = null;
				if(socketdata != null) { tmp_uuid = socketdata.uuid; } else { tmp_uuid = data.headers['x-secondlife-owner-key']; }
				
				switch (data.action) {
					case 'add-song':
						let req_list = await api.music.loadRequest(data, tmp_uuid);
						if(req_list.length != 0) {
							let tmp_count = await api.music.addRequest(tmp_uuid, req_list);
							return { action: data.action, success: true, msg: 'Successfully added ' + tmp_count + ' songs for upload!' };
						} else {
							return { action: data.action, success: false, msg: 'No new files added for upload!' };
						}
						break;
					case 'req-song':
						var tmp_data = api.music.addDelivery(tmp_uuid, data.key);
						if(tmp_data.success) {
							return { action: data.action, success: true, msg: 'Successfully issued delivery for ' + db_data['_app_music_requests_'][req_key].yt_title + ' !' };
						} else {
							return { action: data.action, success: false, msg: tmp_data.error };
						}
						break;
					case 'search':
						return api.music.search(data);
						break;
					case 'read':
						return api.music.read(data);
						break;
				}
			} else {
				throw new Error('music data action not specified');
			}
		},
		
		loadRequest : async function(data, tmp_uuid) {
			if(validateURL(data.url)) {
				if(data.url.includes('youtube.com/')) {
					let req_list = [];
					let tmp_url = new URL(data.url);
					let url_params = tmp_url.searchParams;
					
					/* playlist? */
					if(url_params.has('list')) {
						let tmp_data = await ytpl(data.url, { limit: Infinity });
						
						for(var i = 0; i < tmp_data.items.length; i++) {
							/* shorter than 15min? */
							if(tmp_data.items[i].durationSec < 900) {
								/* add to req_list */
								req_list.push({ 'yt_uploader': tmp_data.items[i].author.name, 'yt_title': tmp_data.items[i].title, 'yt_id': tmp_data.items[i].id });
							}
						}
					}
					
					/* single video + empty req_list? */
					if(req_list.length == 0 && url_params.has('v')) {
						let tmp_data = await ytdl.validate(data.url);
						
						if(tmp_data.success) {
							req_list.push({ 'yt_uploader': tmp_data.data.title, 'yt_title': tmp_data.data.title, 'yt_id': tmp_data.data.videoId });
						} else {
							throw new Error('Unavailable link!');
						}
					}
					
					/* did we find anything? */
					if(req_list.length != 0) {			
						let delivery_list = [];
						for(var i = req_list.length - 1; i > -1; i--) {
							/* validate if already added */
							db_data['_app_music_requests_'].some(function (item) {
								if(item.yt_id == req_list[i].yt_id) {
									delivery_list.push(item.key);
									req_list.splice(i, 1);
									return true;
								}
							});
						}
						
						/* announce delivery requests */
						if(delivery_list.length > 0) {
							io.to('test_facility').emit('actionList', { 'action': 'file-request', 'uuid': tmp_uuid, 'title': delivery_list.length + ' files through playlist' });
							delivery_list.forEach(function (item) {
								api.music.addDelivery(tmp_uuid, item);
							});
						}
						
						return req_list;
					} else {
						return req_list;
					}
				} else {
					throw new Error('Invalid URL! Must be from youtube.com!');
				}
			} else {
				throw new Error('Invalid URL! Must be from youtube.com!');
			}
		},
		
		addRequest : async function(tmp_uuid, req_list) {
			var promises = [];
			
			console.log('req_list length: ' + req_list.length);
			
			for(var i = 0; i < req_list.length; i++) {
				/* make the title and uploader sl-friendly */
				var latin_uploader = req_list[i].yt_uploader.toString('utf32');
				latin_uploader = unidecode(latin_uploader);
				latin_uploader = latin_uploader.replaceAll(sl_regex, '');
				var latin_title = req_list[i].yt_title.toString('utf32');
				latin_title = unidecode(latin_title);
				latin_title = latin_title.replaceAll(sl_regex, '');	
				
				/* prepare data to be stored */
				var tmp_date = new Date();
				tmp_date = tmp_date.toString('utf32');
				tmp_date = unidecode(tmp_date);
				let tmp_data = {
					'key': 0,
					'owner': tmp_uuid,
					'request_date': tmp_date,
					'yt_uploader': latin_uploader,
					'yt_title': latin_title,
					'yt_id': req_list[i].yt_id,
					'deezer_id': 0,
					'deezer_artist': 0
				};
				
				/* store in MariaDB */
				let tmp_query = 'INSERT INTO _app_music_requests_ (`owner`, `request_date`, `yt_uploader`, `yt_title`, `yt_id`) VALUES(\'' + tmp_uuid + '\', current_timestamp(), \'' + latin_uploader + '\', \'' + latin_title + '\', \'' + req_list[i].yt_id + '\' )';
				promises.push(new Promise((resolve, reject) => {					
					db.query(tmp_query, function(err, rows, fields){
						if(err) {
							throw new Error('Database is unavailable');
						} else {
							/* find next key available */
							//var tmp_length = db_data['_app_music_requests_']['map'].length;
							//tmp_data.key = db_data['_app_music_requests_']['map'][tmp_length - 1] + 1;
							tmp_data.key = rows.insertId;
							
							/* log */
							console.log('[Handler] adding ' + tmp_data.yt_id + ', key will be: ' + tmp_data.key);		
							console.log(tmp_data);
							
							/* add to local memory */
							db_data['_app_music_requests_'][tmp_data.key] = tmp_data;
							db_data['_app_music_requests_']['map'].push(tmp_data.key);
				
							return resolve();
						}
					});
				}));
			}
			
			await Promise.all(promises);
			/* more civilized announcement */
			if(req_list.length != 0) {
				if(req_list.length == 1) {
					io.to('test_facility').emit('actionList', { 'action': 'add-request', 'uuid': tmp_uuid, 'title': req_list[0].yt_title });
				} else {
					io.to('test_facility').emit('actionList', { 'action': 'add-request', 'uuid': tmp_uuid, 'title': req_list.length + ' tracks through playlist' });
				}
			}
			
			return req_list.length;
		},
		
		addDelivery : function(tmp_uuid, req_key) {
			/* locate if exists */
			if(db_data['_app_music_requests_'][req_key] != undefined) {
				/* is it uploaded? */
				if(db_data['_app_music_requests_'][req_key].forfilled == 'done') {
					/* is it already queued up? */
					if(!handler.deliveryList.some(item => item.key === req_key)) {
						handler.deliveryList.push({ uuid: tmp_uuid, key: req_key });
						return { success: true };
					} else {
						return { success: false, error: 'The requested delivery is already in queue!' };
					}
				} else {
					return { success: false, error: 'The requested delivery is not yet uploaded!' };
				}
			} else {
				return { success: false, error: 'The requested delivery was not found!' };
			}
		},
		
		search : async function(data) {
			/* is page set? otherwise default to page 0 */
			var tmp_page = 0;
			if(data.page != undefined) {
				tmp_page = parseInt(data.page);
			}
			
			/* create building block */
			var tmp_data = {
				action: data.action,
				page: tmp_page,
				data: [],
				length: 0
			}
			
			/* query tag is mandatory */
			if(data.query != undefined) {
				/* convert query tag to latin */
				data.query = data.query.toString('utf32');
				data.query = unidecode(data.query);
				data.query = data.query.replaceAll(sl_regex, '');
				data.query = data.query.toLowerCase();
				Object.assign(tmp_data, { query: data.query });
			}
			
			/* does the query search already exist in cache_data? */
			if(cache_data['music-search'][data.query] != undefined) {
				tmp_data.data = [...cache_data['music-search'][data.query].data];
				cache_data['music-search'][data.query].when = Date.now();
			} else {
				/* build list of indexes matching query */
				db_data['_app_music_requests_'].forEach(function (x, index) {
					if(x.yt_title.toLowerCase().includes(data.query)) { tmp_data.data.push(index); }
				});
				
				/* store in cache_data */
				cache_data['music-search'][data.query] = {
					data: [...tmp_data.data],
					when: Date.now()
				}
			}
			
			/* filters? */
			if(data.filters != undefined) {
				var tmp_filterHash = crypto.createHash('md5').update(JSON.stringify(data.filters)).digest('hex');
			
				/* does a filtered version of the query search exist in cache_data? */
				if(cache_data['music-search'][data.query + tmp_filterHash] != undefined) {
					tmp_data.data = [...cache_data['music-search'][data.query + tmp_filterHash].data];
					cache_data['music-search'][data.query + tmp_filterHash].when = Date.now();
				} else {
					/* build filtered list of indexes matching query + filters */
					
					/* artist filter? */
					if(data.filters.artist != undefined) {
						data.filters.artist = parseInt(data.filters.artist);
						tmp_data.data = tmp_data.data.filter((index) => db_data['_app_music_requests_'][index].deezer_artist == data.filters.artist);
					}
					/* title filter? */
					if(data.filters.title != undefined) {
						data.filters.title = parseInt(data.filters.title);
						tmp_data.data = tmp_data.data.filter((index) => db_data['_app_music_requests_'][index].deezer_id == data.filters.title);
					}
					/* album filter? */
					if(data.filters.album != undefined) {
						data.filters.album = parseInt(data.filters.album);
						for(var index in tmp_data.data) {
							if(db_data['_app_music_requests_'][tmp_data.data[index]].deezer_id > 0) {	
								var tmp_song = db_data['_app_music_songs_'][db_data['_app_music_requests_'][tmp_data.data[index]].deezer_id];
								if(tmp_song != undefined) {
									if(tmp_song.deezer_album != undefined) {
										if(tmp_song.deezer_album != data.filters.album) {
											delete tmp_data.data[index];
										}
									} else {
										delete tmp_data.data[index];
									}
								} else {
									delete tmp_data.data[index];
								}
							} else {
								delete tmp_data.data[index];
							}
						}
					}
					
					/* sanitize the now sparse array */
					tmp_data.data = tmp_data.data.filter(function () { return true });
					
					/* store in cache_data */
					cache_data['music-search'][data.query + tmp_filterHash] = {
						data: [...tmp_data.data],
						when: Date.now()
					}
				}
			}
			
			
			/* store length of total results */
			tmp_data.length = tmp_data.data.length;
			
			/* limit to 9 results per page */
			if(tmp_data.data.length > 9) {
				/* do we have a page param from client? */
				if(tmp_data.page != 0) {
					/* if requested page is too high, return last page */
					if(data.page > tmp_data.length / 9) {
						tmp_data.data = tmp_data.data.slice(tmp_data.length - 9, tmp_data.length);
					} else {
						tmp_data.data = tmp_data.data.slice(data.page * 9, (data.page * 9) + 9);
					}
				} else {
					/* output first page */
					tmp_data.data = tmp_data.data.slice(0, 9);
				}
			}
			
			/* convert indexes into lightweight data */
			for(var index in tmp_data.data) {
				var tmp_song = db_data['_app_music_requests_'][tmp_data.data[index]];
				tmp_data.data[index] = {
					key: tmp_data.data[index],
					id: tmp_song.yt_id,
					channel: tmp_song.yt_uploader,
					title: tmp_song.yt_title,
					req_date: tmp_song.request_date 
				}
			}

			return tmp_data;
		},
		
		read : async function(data) {
			/* ID is mandatory (otherwise why are we here?) */
			if(data.key != undefined) {
				if(db_data['_app_music_requests_'][data.key] != undefined) {
					return {
						action: data.action,
						key: data.key,
						data: db_data['_app_music_requests_'][data.key]
					};
				} else {
					throw new Error('requested music key tag invalid!');
				}
			} else {
				throw new Error('requested music key tag not set!');
			}
		}
	},
	
	deezer : {
		handle : async function(data, socketdata) {
			/* assure we have an action tag */
			if(data.action != undefined) {
				switch(data.action) {
					case 'search':
						return await api.deezer.search(data, socketdata);
						break;
				}
			} else {
				throw new Error('app action not set!');
			}
		},
		
		search : function(data, socketdata) {
			/* validate search-type is set */
			if(data.type != undefined) {
				/* validate query is set */
				if(data.query != undefined) {
					return new Promise((resolve, reject) => {
						/* is page set? otherwise default to page 0 */
						let tmp_page = 0;
						if(data.page != undefined) {
							tmp_page = parseInt(data.page);
						}
						
						/* create building block */
						let tmp_data = {
							type: data.type,
							page: tmp_page,
							data: [],
							length: 0
						}
						
						/* query tag is mandatory */
						if(data.query != undefined) {
							/* convert query tag to latin */
							data.query = data.query.toString('utf32');
							data.query = unidecode(data.query);
							data.query = data.query.replaceAll(sl_regex, '');
							data.query = data.query.toLowerCase();
							Object.assign(tmp_data, { query: data.query });
						}
						
						/* does the search already exist in cache_data? */
						if(cache_data['deezer-search'][data.type + '-' + data.query] != undefined) {
							tmp_data.data = cache_data['deezer-search'][data.type + '-' + data.query].data;
							cache_data['deezer-search'][data.type + '-' + data.query].when = Date.now();
						} else {
							switch(data.type) {
								case 'artist':
									db_data['_app_music_artists_']['map'].every(item => {
										if(db_data['_app_music_artists_'][item].name.toLowerCase().includes(data.query)) {
											tmp_data.data.push({
												deezer_artist: db_data['_app_music_artists_'][item]
											});
										}
										return true;
									});
									break;
								case 'title':
									db_data['_app_music_songs_']['map'].every(item => {
										if(db_data['_app_music_songs_'][item].title.toLowerCase().includes(data.query)) {
											let tmp_obj = db_data['_app_music_songs_'][item];
											
											/* add artist if exists */
											if(db_data['_app_music_songs_'][item].deezer_artist != null) {
												if(db_data['_app_music_artists_'][db_data['_app_music_songs_'][item].deezer_artist] != undefined) {
													tmp_obj.deezer_artist = db_data['_app_music_artists_'][db_data['_app_music_songs_'][item].deezer_artist];
												}
											}
											
											/* add album if exists */
											if(db_data['_app_music_songs_'][item].deezer_album != null) {
												if(db_data['_app_music_albums_'][db_data['_app_music_songs_'][item].deezer_album] != undefined) {
													tmp_obj.deezer_album = db_data['_app_music_albums_'][db_data['_app_music_songs_'][item].deezer_album];
												}
											}
											
											tmp_data.data.push(tmp_obj);
										}
										return true;
									});
									break;
								case 'album':
									db_data['_app_music_albums_']['map'].every(item => {
										if(db_data['_app_music_albums_'][item].title.toLowerCase().includes(data.query)) {
											let tmp_obj = db_data['_app_music_albums_'][item];
											
											/* add artist if exists */
											if(db_data['_app_music_albums_'][item].deezer_artist != null) {
												if(db_data['_app_music_artists_'][db_data['_app_music_albums_'][item].deezer_artist] != undefined) {
													tmp_obj.deezer_artist = db_data['_app_music_artists_'][db_data['_app_music_albums_'][item].deezer_artist];
												}
											}
											
											tmp_data.data.push(tmp_obj);
										}
										return true;
									});
									break;
							}
							
							/* sort alphabetically */
							switch(data.type) {
								case 'artist':
									tmp_data.data.sort(function(a, b) {
										var textA = a.deezer_artist.name.toUpperCase();
										var textB = b.deezer_artist.name.toUpperCase();
										return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
									});
									break;
								case 'title':
									tmp_data.data.sort(function(a, b) {
										var textA = a.title_short.toUpperCase();
										var textB = b.title_short.toUpperCase();
										return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
									});
									break;
								case 'album':
								console.log(tmp_data.data);
									tmp_data.data.sort(function(a, b) {
										var textA = a.title.toUpperCase();
										var textB = b.title.toUpperCase();
										return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
									});
									break;
							}
							
							/* store in cache_data */
							cache_data['deezer-search'][data.type + '-' + data.query] = {
								data: tmp_data.data,
								when: Date.now()
							}
						}
						
						/* store length of total results */
						tmp_data.length = tmp_data.data.length;
						
						/* limit to 9 results per page */
						if(tmp_data.data.length > 9) {
							/* do we have a page param from client? */
							if(tmp_data.page != 0) {
								/* if requested page is too high, return last page */
								if(data.page > tmp_data.length / 9) {
									tmp_data.data = tmp_data.data.slice(tmp_data.length - 9, tmp_data.length);
								} else {
									tmp_data.data = tmp_data.data.slice(data.page * 9, (data.page * 9) + 9);
								}
							} else {
								/* output first page */
								tmp_data.data = tmp_data.data.slice(0, 9);
							}
						}
						
						/* clean data for inworld */
						if(socketdata == null) {
							for(let i = 0; i < tmp_data.data.length; i++) {								
								/* clean artists */
								if(tmp_data.data[i].deezer_artist != undefined) {
									tmp_data.data[i].deezer_artist = {
										deezer_id: tmp_data.data[i].deezer_artist.deezer_id,
										name: tmp_data.data[i].deezer_artist.name
									};
								}
								
								/* clean albums */
								if(tmp_data.data[i].deezer_album != undefined) {
									tmp_data.data[i].deezer_album = {
										deezer_id: tmp_data.data[i].deezer_album.deezer_id,
										deezer_artist: tmp_data.data[i].deezer_album.deezer_artist,
										title: tmp_data.data[i].deezer_album.title,
										genres: tmp_data.data[i].deezer_album.genres,
										release_date: tmp_data.data[i].deezer_album.release_date
									}
								}
							}
						}
						
						resolve(tmp_data);
					});
				} else {
					throw new Error('deezer search query variable not set!');
				}
			} else {
				throw new Error('deezer search type variable not set!');
			}
		}
	},
	
	system : {
		handle : async function (data, socketdata) {
			/* assure we have an action tag */
			if(data.action != undefined) {
				switch(data.action) {
					case 'settings':
						return await api.system.settings(data, socketdata);
						break;
				}
			} else {
				throw new Error('app action not set!');
			}
		},
		
		settings : async function (data, socketdata) {
			return new Promise((resolve, reject) => {
				switch (data.type) {
					case 'change-pin':
						/* new pin? */
						if(data.pin != undefined) {
							db.query('UPDATE _userlist_ SET `keycode`=\'' + parseInt(data.pin) + '\' WHERE uuid=\'' + socketdata.uuid + '\'', function(err){
								if(err) {
									console.log('[MySQL] Error attempting to update users keycode - ' + err);
									resolve({ action: data.type, success: false, msg: 'Database is currently unavailable. Please try again later.' });
								} else {
									/* update their pincode date in local memory */
									db_data['_userlist_'][socketdata.uuid].keycode = parseInt(data.pin);
									resolve({ action: data.type, success: true, msg: 'Successfully changed pincode.' });
								}
							});
						} else {
							resolve({ action: data.type, success: false, msg: 'Pincode change requested, but no new pincode given!' });
						}
						break;
				}
			});
		}
	},
	
	lookup : function(data) {
		return new Promise((resolve, reject) => {
			var tmp_data = null;
			/* user lookup */
			if(data.type == 'user') {						
				if(db_data['_userlist_'][data.uuid] != undefined) {
					tmp_data = { 'action': 'useradd', 'uuid': db_data['_userlist_'][data.uuid].uuid, 'username': db_data['_userlist_'][data.uuid].username, 'userpic': db_data['_userlist_'][data.uuid].userpic };
				}
			}
			
			/* music - artist */
			if(data.type == 'artist_by_id') {
				if(db_data['_app_music_artists_'][data.search] != undefined) {
					tmp_data = { 'action': 'artistadd', 'data': db_data['_app_music_artists_'][data.search] };
				}
			}
			
			/* music - title */
			if(data.type == 'song_by_id') {
				if(db_data['_app_music_songs_'][data.search] != undefined) {
					tmp_data = { 'action': 'songadd', 'data': db_data['_app_music_songs_'][data.search] };
				}
			}
			
			/* music - album */
			if(data.type == 'album_by_id') {
				if(db_data['_app_music_albums_'][data.search] != undefined) {
					tmp_data = { 'action': 'albumadd', 'data': db_data['_app_music_albums_'][data.search] };
				}
			}
			
			/* music - uploads */
			if(data.type == 'upload_by_id') {
				if(db_data['_app_music_requests_'][data.search] != undefined) {
					tmp_data = db_data['_app_music_requests_'][data.search];
					
					/* add song if exists */
					if(db_data['_app_music_songs_'][tmp_data.deezer_id] != undefined) {
						tmp_data = Object.assign(tmp_data, {
							deezer_song: {
								deezer_id: tmp_data.deezer_id,
								duration: db_data['_app_music_songs_'][tmp_data.deezer_id].duration,
								release_date: db_data['_app_music_songs_'][tmp_data.deezer_id].release_date,
								title: db_data['_app_music_songs_'][tmp_data.deezer_id].title,
								bpm: db_data['_app_music_songs_'][tmp_data.deezer_id].bpm
							}
						});
						
						/* add album if exists */
						if(db_data['_app_music_songs_'][tmp_data.deezer_id].deezer_album != undefined) {
							if(db_data['_app_music_albums_'][db_data['_app_music_songs_'][tmp_data.deezer_id].deezer_album] != undefined) {
								let tmp_id = db_data['_app_music_songs_'][tmp_data.deezer_id].deezer_album;
								tmp_data = Object.assign(tmp_data, {
									deezer_album: {
										deezer_id: tmp_id,
										title: db_data['_app_music_albums_'][tmp_id].title,
										genres: db_data['_app_music_albums_'][tmp_id].genres,
										release_date: db_data['_app_music_albums_'][tmp_id].release_date
									}
								});
							}
						}
						
						/* add artist if exists */
						if(db_data['_app_music_artists_'][tmp_data.deezer_artist] != undefined) {
							tmp_data.deezer_artist = {
								deezer_id: tmp_data.deezer_id,
								name: db_data['_app_music_artists_'][tmp_data.deezer_artist].name
							}
						}
					}
				}
			}
			
			resolve(tmp_data);
		});
	}
}

var registerUser = async function (uuid, socketid) {
	try {
		/* new user! */
		/* validate their uuid with linden labs */
		let sl_data = await slScraper.scrape(uuid);
		if(sl_data != 'unavailable') {
			/* generate validation code */
			let tmp_code = Math.floor(100000 + Math.random() * 900000);
			let tmp_query = 'INSERT INTO _userlist_ (`uuid`, `username`, `userpic`, `registered_date`, `lastactive_date`, `validationcode`, `validationcode_date`) VALUES(\'' + uuid + '\', \'' + escapeStr(sl_data[0]) + '\', \'' + sl_data[1] + '\', current_timestamp(), current_timestamp(), \'' + tmp_code + '\', current_timestamp() )';
			validate = await db.query(tmp_query, function(err, rows, fields){
				if(err) {
					console.log('Error trying to register - ' + err);
					validate = 'unavailable';
				}
				
			});
			
			if(validation != 'unavailable') {
				var tmp_date = new Date();
				var tmp_obj = {
					'uuid': uuid,
					'username': sl_data[0],
					'userpic': sl_data[1],
					'registered_date': tmp_date,
					'lastactive_date': tmp_date,
					'validationcode': tmp_code,
				};
				
				db_data['_userlist_'][uuid] = tmp_obj;
				
				io.to(socketid).emit('login', { 'action': 'validate' });
				await corrade.message([uuid, '\n------ EN/US ------\nHello secondlife:///app/agent/' + uuid + '/about\n\nYou\'re about to register with the BeanOS database.\nIn order to validate that you are the rightful owner of this account,\nplease type the following verification code into your HUD:\n\n      ' + tmp_code + '\n\nIf you are currently not in the registration phase of one of my HUDs, please ignore this message, and have a pleasant day. Thank you.']);
				await corrade.message([uuid, '\n------ PT/BR ------\nOla secondlife:///app/agent/' + uuid + '/about\n\nVoce esta prestes a se registrar no Banco de dados BeanOS.\nPara validar que voce e o proprietario legitimo desta conta,\ndigite o seguinte codigo de verificacao em seu HUD:\n\n      ' + tmp_code + '\n\nSe voce nao esta atualmente na fase de registro de um dos meus HUDs, por favor, ignore esta mensagem e tenha um bom dia. Obrigado.']);
			} else {
				io.to(socketid).emit('alert', { 'action': 'fatal-error', 'msg': 'Database is currently unavailable. Please try again later.' });
			}
		} else {
			io.to(socketid).emit('alert', { 'action': 'fatal-error', 'msg': 'Invalid UUID' });
		}
	} catch(err) {
		console.log('[IO] An error occoured during registration of user ' + uuid + '\n' + err);
	}
}

var validateURL = async function(req_url) {
	try {
		new URL(req_url);
		return true;
	} catch (err) {
		return false;
	}
}

function escapeStr(htmlStr) {
   return htmlStr.replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#39;");        

}

var handler = {
	/* (A) Globals */
	fairList : [],
	deliveryList : [],
	maxUploaders : 1,
	currUploaders : 0,
	isBusy : { busy: false, by: 0},
	/* (B) Functions */
	uploader : async function() {
		/* disable while developing */
		if(!devMode) {
			/* validate we're within the limit */
			if(handler.currUploaders < handler.maxUploaders) { 
				/* ==================================== */
				/* Check if any upload requests are due */
				/* ==================================== */
				
				/* begin the process to locate next file to upload */
				var reqIndex = -1;
				
				/* fair queue, locate someone not in the list of recent uploaders */
				db_data['_app_music_requests_']['map'].some(function (item) {
					if(db_data['_app_music_requests_'][item].forfilled == undefined && !handler.fairList.includes(db_data['_app_music_requests_'][item].owner)) {
						console.log("[Uploader] Found request: " + item);
						reqIndex = item;
						return true;
					}
				});
				
				/* still didn't find anything? */
				if(reqIndex == -1) {
					handler.fairList = [];
					db_data['_app_music_requests_']['map'].some(function (item) {
						if(db_data['_app_music_requests_'][item].forfilled == undefined && !handler.fairList.includes(db_data['_app_music_requests_'][item].owner)) {
							console.log("[Uploader] Found request: " + item);
							reqIndex = item;
							return true;
						}
					});
				}
				
				/* any requests available? */
				if(reqIndex != -1) {
					/* add owner uuid to recent uploaders list */
					handler.fairList.push(db_data['_app_music_requests_'][reqIndex].owner);
					handler.currUploaders = handler.currUploaders + 1;
					
					/* invalidate to prevent propetual crashing */
					db.query('UPDATE _app_music_requests_ SET `forfilled`="--"  WHERE yt_id="' + db_data['_app_music_requests_'][reqIndex].yt_id + '"', function(err){
						if(err) {
							console.log('[Uploader] Unable to store unpacker UUID - ' + err);
						}
					});
					db_data['_app_music_requests_'][reqIndex].forfilled = '--';
					
					/* prepare upload params */
					let tmp_params = {
						'key': reqIndex,
						'yt_id': db_data['_app_music_requests_'][reqIndex].yt_id,
						'user_uuid': db_data['_app_music_requests_'][reqIndex].owner,
						'song_title': db_data['_app_music_requests_'][reqIndex].yt_title,
						'song_upload_date': db_data['_app_music_requests_'][reqIndex].request_date,
						'song_cliplength': 0
					};
					
					/* make corrade happy */
					tmp_params.song_title = tmp_params.song_title.toString('utf32');
					tmp_params.song_title = unidecode(tmp_params.song_title);
					tmp_params.song_upload_date = tmp_params.song_upload_date.toString('utf32');
					tmp_params.song_upload_date = unidecode(tmp_params.song_upload_date);
					let folderName = (Math.floor(Date.now() / 1000) + ' - ' + tmp_params.song_title.trim()).substring(0, 60);
					tmp_params = Object.assign(tmp_params, {
						'song_shortTitle': tmp_params.song_title.substring(0, 60).trim(),
						'song_folderName': folderName,
						'song_folderPath': '/My Inventory/Sounds/BeanOS/' + db_data['_app_music_requests_'][reqIndex].owner.replaceAll('-', '_') + '/' + folderName,
						'song_data': [],
						'song_files': [],
						'song_items': []
					});
					
					/* start a new worker thread for the job */
					const worker = new Worker('./include/handler.uploader.js', {
						workerData: tmp_params
					});
					
					worker.on("message", (msg) => {
						switch (msg.type) {
							case 'announce':
								switch (msg.announcementType) {
									case 'uploadStatus':
										io.to('test_facility').emit('uploadStatus', { 'owner': msg.data.user_uuid, 'title': msg.data.song_title, 'action': msg.announcement, 'percent': msg.percent });
										break;
									case 'actionList':
										io.to('test_facility').emit('actionList', { 'uuid': msg.data.user_uuid, 'title': msg.data.song_title, 'action': msg.announcement });
										break;
								}
								break;
							case 'reserve-busy':
								if(handler.isBusy.busy == false) {
									handler.isBusy.busy = true;
									handler.isBusy.by = msg.by;
								}
								worker.postMessage({ busy: handler.isBusy.busy, by: handler.isBusy.by });
								break;
							case 'done-busy':
								if(handler.isBusy.by == msg.by) {
									handler.isBusy.busy = false;
									handler.isBusy.by = 0;
								}
								break;
							case 'store':
								let tmp_string = "";
								for(let i = 0; i < msg.data.song_data.length; i++) {
									tmp_string += msg.data.song_data[i] + '|';
								}
								/* store uuids */
								db.query('UPDATE _app_music_requests_ SET `forfilled`="done", `sl_folder`="' + msg.data.song_folderPath + '", `sl_notecard`="' + msg.data.song_items[msg.data.song_items.length - 1] + '", `sl_uuids`="' + tmp_string + '", `sl_cliplength`="' + msg.data.song_cliplength + '"  WHERE yt_id="' + msg.data.yt_id + '"', function(err){
									if(err) {
										io.to('test_facility').emit('actionList', { 'action': 'failed-request', 'uuid': msg.data.user_uuid, 'title': db_data['_app_music_requests_'][msg.data.key] });
										console.log('[Uploader] An error occoured - ' + err);
									} else {							
										/* store locally */
										var tmp_obj = {
											'forfilled': 'done',
											'sl_folder': msg.data.song_folderPath,
											'sl_notecard': msg.data.song_items[msg.data.song_items.length - 1],
											'sl_uuids': tmp_string,
											'sl_cliplength': msg.data.song_cliplength
										}
										
										db_data['_app_music_requests_'][msg.data.key] = Object.assign(db_data['_app_music_requests_'][msg.data.key], tmp_obj);
									}
								});
								break;
							case 'terminate':
								worker.terminate();								
								/* remove from fairList */
								//handler.fairList.splice(handler.fairList.indexOf(msg.data.user_uuid), 1);
								handler.currUploaders = handler.currUploaders - 1;
								break;
						}
					});
					
					worker.on("error", (msg) => {
						console.log('worker error: ' + msg);
						console.log(msg);
						/* remove from fairList */
						handler.fairList.splice(handler.fairList.indexOf(msg.user_uuid), 1);
					});
				}
			}
			setTimeout(function() {
				handler.uploader();
			}, 1000);
		}
	},
	
	deliveryQueue : async function() {
		let validate;
		/* any deliveries due? */
		if(handler.deliveryList.length > 0) {
			console.log('[Handler] attempting delivery of #' + handler.deliveryList[0].key + ' to ' + handler.deliveryList[0].uuid);
			/* attempt delivery */
			validate = await corrade.sendFile(db_data['_app_music_requests_'][handler.deliveryList[0].key].sl_folder, handler.deliveryList[0].uuid);
			
			/* announce delivery */
			if(validate.success) {
				io.to('test_facility').emit('actionList', { 'action': 'file-delivery', 'uuid': handler.deliveryList[0].uuid, 'title': db_data['_app_music_requests_'][handler.deliveryList[0].key].yt_title });
			} else {
				console.log('[Handler] Could not deliver ' + handler.deliveryList[0].key + ' to ' + handler.deliveryList[0].uuid);
				console.log(validate);
			}
			
			/* remove from queue */
			handler.deliveryList.shift();
		}
		
		setTimeout(function() {
			handler.deliveryQueue();
		}, 1000);
	},
	
	identifier : async function() {
		/* ===================================== */
		/* Check if any uploads need identifying */
		/* ===================================== */
		//var idIndex = db_data['_app_music_requests_'].findIndex(item => { return item.deezer_id == undefined});
		var idIndex = -1;
		db_data['_app_music_requests_'].some(function (item) {
			if(item.deezer_id == 0) {
				console.log("[Identifier] Found identification needed: " + Object.values(item)[0]);
				idIndex = Object.values(item)[0];
				return true;
			}
		});
			
		/* any pending songs? */
		if(idIndex != -1) {
			try {
				
				let tmp_title = db_data['_app_music_requests_'][idIndex].yt_title;
				let tmp_uploader = db_data['_app_music_requests_'][idIndex].yt_uploader;
				let tmp_query = "";
				
				/* clean up title */
				tmp_title = tmp_title.replace(/\s*\(.*?\)\s*/g, '');
				tmp_title = tmp_title.replace(/\s*\[.*?\]\s*/g, '');
				
				/* is it from a channel who's name we can include? */
				if(tmp_uploader.includes(' - Topic')) {
					tmp_uploader = tmp_uploader.replace(' - Topic', '');
					
					/* does it already include the artist in the title? */
					if(!tmp_title.includes(tmp_uploader)) {
						tmp_query = tmp_uploader + ' - ' + tmp_title;
					}
				}
				
				if(tmp_uploader.includes('VEVO')) {
					tmp_uploader = tmp_uploader.replace('VEVO', '');
					
					var tmp_title_vevo = tmp_title.replace(/ /g, '').toLowerCase();
					var tmp_uploader_vevo = tmp_uploader.replace(/ /g, '').toLowerCase();
					
					/* does it already include the artist in the title? */
					if(!tmp_title_vevo.includes(tmp_uploader_vevo)) {
						tmp_query = tmp_uploader + ' ' + tmp_title;
					}
				}
				
				/* did we customize a query? */
				if(tmp_query == "") {
					tmp_query = tmp_title;
				} else {
					tmp_query = db_data['_app_music_requests_'][idIndex].yt_title.replace(/ *\([^)]*\) */g, "");
				}
				
				let deezer_search = await deezer.query(encodeURI('/search?q=' + tmp_query + '&output=json'));
				
				/* found? */
				if(deezer_search.success && deezer_search.data.data != undefined) {
					
					/* remove spaces + make lowercase, for maximum compatibility */
					var tmp_data = {
						'yt_title': db_data['_app_music_requests_'][idIndex].yt_title.replace(/ /g, '').toLowerCase(),
						'yt_uploader': db_data['_app_music_requests_'][idIndex].yt_uploader.replace(/ /g, '').toLowerCase()
					};
			
					
					console.log('[Identifier] Finding match..');
					let deezer_result = await new Promise((resolve, reject) => {
						let result_data = "not-found";
						for (let i = 0; i < deezer_search.data.data.length; i++) { 
							/* remove spaces + make lowercase + convert to unicode, for maximum compatibility */
							var tmp_artist = deezer_search.data.data[i].artist.name.replace(/ /g, '');
							tmp_artist = tmp_artist.toLowerCase();
							tmp_artist = unidecode(tmp_artist);
							if(tmp_data.yt_uploader.includes(tmp_artist)) {
								console.log('[Identifier] song found! ID:' + deezer_search.data.data[i].id);
								result_data = deezer_search.data.data[i];
								i = deezer_search.data.data.length;
							} else {
								if(tmp_data.yt_title.includes(tmp_artist)) {
									console.log('[Identifier] song found! ID:' + deezer_search.data.data[i].id);
									result_data = deezer_search.data.data[i];
									i = deezer_search.data.data.length;
								}
							}
						}
						return resolve(result_data);
					});
					
					/* did we find it? */
					if(deezer_result != 'not-found') {
						
						/* store in MariaDB */
						let validation = await new Promise((resolve, reject) => {
							db.query('UPDATE _app_music_requests_ SET `deezer_id`="' + deezer_result.id + '", `deezer_artist`="' + deezer_result.artist.id + '" WHERE yt_id="' + db_data['_app_music_requests_'][idIndex].yt_id + '"', function(err){
								if(err) {
									console.log('[Identifier] An error occoured while storing song ID - ' + err);
									return reject({'success': false});
								} else {
									return resolve({'success': true});
									
									/* store locally */
									var tmp_obj = {
										'deezer_id': deezer_result.id,
										'deezer_artist': deezer_result.artist.id
									}
									
									db_data['_app_music_requests_'][idIndex] = Object.assign(db_data['_app_music_requests_'][idIndex], tmp_obj);
								}
							});
						});
						
						/* do we already know this song? */
						//var songIndex = db_data['_app_music_songs_'].findIndex(item => { return item.deezer_id == deezer_result.id});
						
						/* do we need to add them? */
						if(db_data['_app_music_songs_'][deezer_result.id] == undefined) {
							/* grab full track info */
							var deezer_track = await deezer.query(encodeURI('/track/' + deezer_result.id));
						
							var latin_title = deezer_track.data.title.toString('utf32');
							latin_title = unidecode(latin_title);
							latin_title = latin_title.replaceAll(sl_regex, '');
							
							var latin_title_short = deezer_track.data.title_short.toString('utf32');
							latin_title_short = unidecode(latin_title_short);
							latin_title_short = latin_title_short.replaceAll(sl_regex, '');
							
							let tmp_query = 'INSERT INTO _app_music_songs_ (`deezer_id`, `deezer_artist`, `title`, `title_short`, `deezer_album`, `release_date`, `duration`, `preview`, `bpm`) VALUES("' + deezer_track.data.id + '", "' + deezer_track.data.artist.id + '", "' + latin_title + '", "' + latin_title_short + '", "' + deezer_track.data.album.id + '", "' + deezer_track.data.release_date + '", "' + deezer_track.data.duration + '", "' + deezer_track.data.preview + '", "' + deezer_track.data.bpm + '")';
							db.query(tmp_query, function(err){
								if(err) {
									console.log('[Identifier] An error occoured while storing song info - ' + err);
								} else {
									/* add it to local song data */
									var tmp_data = {
										'deezer_id': deezer_track.data.id,
										'deezer_artist': deezer_track.data.artist.id,
										'title': latin_title,
										'title_short': latin_title_short,
										'deezer_album': deezer_track.data.album.id,
										'release_date': deezer_track.data.release_date,
										'duration': deezer_track.data.duration,
										'preview': deezer_track.data.preview,
										'bpm': deezer_track.data.bpm
									};
									db_data['_app_music_songs_'][deezer_result.id] = tmp_data;
									
									console.log('[Identifier] New Track added: ' + latin_title);
								}
							});
						} else {
							console.log('[Identifier] Song already in db: ' + deezer_result.id);
						}
						
						/* update request with deezer_id */
						var tmp_obj = {
							'deezer_id': deezer_result.id
						};
						db_data['_app_music_requests_'][idIndex] = Object.assign(db_data['_app_music_requests_'][idIndex], tmp_obj);
						
						/* do we already know this artist? */
						//var artistIndex = db_data['_app_music_artists_'].findIndex(item => { return item.deezer_id == deezer_result.artist.id});
						
						/* do we need to add them? */
						if(db_data['_app_music_artists_'][deezer_result.artist.id] == undefined) {
							/* grab full artist info */
							var deezer_artist = await deezer.query(encodeURI('/artist/' + deezer_result.artist.id));
								
							var latin_name = deezer_artist.data.name.toString('utf32');
							latin_name = unidecode(latin_name);
							latin_name = latin_name.replaceAll(sl_regex, '');
							
							let tmp_query = 'INSERT INTO _app_music_artists_ (`deezer_id`, `name`, `picture_small`, `picture_medium`, `picture_big`) VALUES("' + deezer_artist.data.id + '", "' + latin_name + '", "' + deezer_artist.data.picture_small + '", "' + deezer_artist.data.picture_medium + '", "' + deezer_artist.data.picture_big + '")';
							db.query(tmp_query, function(err){
								if(err) {
									console.log('[Identifier] An error occoured while storing artist info - ' + err);
								} else {
									/* add it to local data */
									var tmp_data = {
										'deezer_id': deezer_artist.data.id,
										'name': latin_name,
										'picture_small': deezer_artist.data.picture_small,
										'picture_medium': deezer_artist.data.picture_medium,
										'picture_big': deezer_artist.data.picture_big
									};
									db_data['_app_music_artists_'][deezer_result.artist.id] = tmp_data;
									
									console.log('[Identifier] New Artist added: ' + latin_name);
								}
							});
						} else {
							console.log('[Identifier] Artist already in db: ' + deezer_result.artist.id);
						}
						
						/* do we already know this album? */
						//var albumIndex = db_data['_app_music_albums_'].findIndex(item => { return item.deezer_id == deezer_result.album.id});
						
						/* do we need to add them? */
						if(db_data['_app_music_albums_'][deezer_result.album.id] == undefined) {
							/* grab full album info */
							var deezer_album = await deezer.query(encodeURI('/album/' + deezer_result.album.id));
							let validation = await new Promise((resolve, reject) => {
								
								/* make title latin characters */
								var latin_name = deezer_album.data.title.toString('utf32');
								latin_name = unidecode(latin_name);
								latin_name = latin_name.replaceAll(sl_regex, '');
								
								/* turn all genres into one long string */
								var genres = "";
								for(var i = 0; i < deezer_album.data.genres.data.length; i++) {
									genres += deezer_album.data.genres.data[i].id + ",";
								}
								
								let tmp_query = 'INSERT INTO _app_music_albums_ (`deezer_id`, `title`, `genres`, `cover_small`, `cover_medium`, `cover_big`) VALUES("' + deezer_album.data.id + '", "' + latin_name + '", "' + genres + '", "' + deezer_album.data.cover_small + '", "' + deezer_album.data.cover_medium + '", "' + deezer_album.data.cover_big + '" )';
								db.query(tmp_query, function(err){
									if(err) {
										console.log('[Identifier] An error occoured while storing album info - ' + err);
										return reject({'success': false});
									} else {
										/* add it to local data */
										var tmp_data = {
											'deezer_id': deezer_album.data.id,
											'title': latin_name,
											'genres': genres,
											'cover_small': deezer_album.data.cover_small,
											'cover_medium': deezer_album.data.cover_medium,
											'cover_big': deezer_album.data.cover_big
										};
										db_data['_app_music_albums_'][deezer_result.album.id] = tmp_data;
										
										console.log('[Identifier] New Album added: ' + latin_name);
										return resolve({'success': true});
									}
								});
							});
							
							/* new album = new genres? */
							var promises = [];
							for(var i = 0; i < deezer_album.data.genres.data.length; i++) {
								/* do we know this genre? */
								//var genreIndex = db_data['_app_music_genres_'].findIndex(item => { return item.deezer_id == deezer_album.data.genres.data[i].id});
								if(db_data['_app_music_genres_'][deezer_album.data.genres.data[i].id] == undefined) {
									/* grab full genre info */
									var deezer_genre = await deezer.query(encodeURI('/genre/' + deezer_album.data.genres.data[i].id));
									promises.push(new Promise((resolve, reject) => {
										let tmp_query = 'INSERT INTO _app_music_genres_ (`deezer_id`, `name`, `picture_small`, `picture_medium`, `picture_big`) VALUES("' + deezer_genre.data.id + '", "' + deezer_genre.data.name + '", "' + deezer_genre.data.picture_small + '", "' + deezer_genre.data.picture_medium + '", "' + deezer_genre.data.picture_big + '" )';
										db.query(tmp_query, function(err){
											if(err) {
												console.log('[Identifier] An error occoured while storing genre info - ' + err);
												return reject({'success': false});
											} else {
												/* add it to local data */
												var tmp_data = {
													'deezer_id': deezer_genre.data.id,
													'name': deezer_genre.data.name,
													'picture_small': deezer_genre.data.picture_small,
													'picture_medium': deezer_genre.data.picture_medium,
													'picture_big': deezer_genre.data.picture_big
												}
												db_data['_app_music_genres_'][deezer_album.data.genres.data[i].id] = tmp_data;
												
												console.log('[Identifier] New Genre added: ' + deezer_genre.data.name);
												return resolve({'success': true});
											}
										});
									}));
								}
							}
							
							await Promise.all(promises);
						} else {
							console.log('[Identifier] Album already in db: ' + deezer_result.album.id);
						}
						
					} else {
						/* failed to locate song */
						console.log('[Identifier] Song "' + db_data['_app_music_requests_'][idIndex].yt_title + '" not found with deezer');
						db.query('UPDATE _app_music_requests_ SET `deezer_id`="-1", `deezer_artist`="-1" WHERE yt_id="' + db_data['_app_music_requests_'][idIndex].yt_id + '"', function(err){
							if(err) {
								console.log('[Identifier] Error occoured while storing song ID - ' + err);
							}
						});
						
						/* update request with -1 */
						var tmp_obj = {
							'deezer_id': -1,
							'deezer_artist': -1
						};
						db_data['_app_music_requests_'][idIndex] = Object.assign(db_data['_app_music_requests_'][idIndex], tmp_obj);
					}
				} else {
					/* failed to locate song */
					console.log('[Identifier] Song "' + db_data['_app_music_requests_'][idIndex].yt_title + '" not found with deezer');
					db.query('UPDATE _app_music_requests_ SET `deezer_id`="-1", `deezer_artist`="-1" WHERE yt_id="' + db_data['_app_music_requests_'][idIndex].yt_id + '"', function(err){
						if(err) {
							console.log('[Identifier] Error occoured while storing song ID - ' + err);
						}
					});
					
					/* update request with -1 */
					var tmp_obj = {
						'deezer_id': -1,
						'deezer_artist': -1
					};
					db_data['_app_music_requests_'][idIndex] = Object.assign(db_data['_app_music_requests_'][idIndex], tmp_obj);
				}
			} catch (err) {
				console.log(err);
			}
		}
		
		setTimeout(function() {
			handler.identifier();
		}, 1000);
	},
	
	cacheCleaner : async function() {
		//console.log('[Cache] starting cleanup..');
		let promises = [];
		
		/* for each array, scan sub-arrays */
		for(let cache_type in cache_data) {
			promises.push(new Promise((resolve, reject) => {
				//console.log('[Cache] cleaning up ' + cache_type);
				for(let data in cache_data[cache_type]) {
					if(Date.now() - cache_data[cache_type][data].when > 60 * 1000) {
						delete cache_data[cache_type][data];
					}
				}
				resolve();
			}));
		}
		
		await Promise.all(promises);
		
		setTimeout(function() {
			handler.cacheCleaner();
		}, 10000);
	},
	
	calcStats : async function() {
		/* first time? */
		if(stats_data['api-log'] == undefined) {
			stats_data['api-log'] = [];
		}
		
		/* calclate average lookup speed */
		const sum = stats_data['api-log'].reduce((a, b) => a + b, 0);
		const apiLatency = (sum / stats_data['api-log'].length) || 0;
		
		/* calculate how many songs are identified */
		let songsIdentified = 0;
		db_data['_app_music_requests_']['map'].every(item => {
			if(db_data['_app_music_requests_'][item].deezer_id != null && db_data['_app_music_requests_'][item].deezer_id != -1) {
				songsIdentified++;
			}
			return true;
		});
		
		stats_data['output'] = {
			'apiLatency': apiLatency,
			'users': db_data['_userlist_']['map'].length,
			'songUploads': db_data['_app_music_requests_']['map'].length,
			'songIdentified': songsIdentified,
			'lastCalculated': Date.now()
		}
		
		setTimeout(function() {
			handler.calcStats();
		}, 1000);
	}
}

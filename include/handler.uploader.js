const { threadId, workerData, parentPort } = require("worker_threads");
const fs = require("fs");
const path = require("path");
const ytdl = require('./ytdl');
const corrade = require('./corrade');

/* globals */
let ready = false;
const num_retries = 10;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

parentPort.on("message", (msg) => {
	/* are we the ones making it busy? */
	if(msg.by == threadId) {
		ready = true;
	}
});

let ourTurn = async function () {
	let tmp_interval;
	/* new promise to wait till our turn */
	return new Promise((resolve, reject) => {
		tmp_interval = setInterval(function(){
			parentPort.postMessage({ type: 'reserve-busy', by: threadId });
			
			/* after 1ms validate reply */
			setTimeout(function() {
				if(ready) {
					clearInterval(tmp_interval);
					resolve();
				}
			}, 1);
		},100);
	});
}

let doneTurn = async function () {
	/* release command reserve */
	parentPort.postMessage({ type: 'done-busy', by: threadId });
	ready = false;
}

/* attempt to upload request */
let tryUpload = async function () {
	let workPath = __dirname + '/../workers/' + workerData.user_uuid;
	let validate = { success: true };
	
	/* make work directory */
	console.log('[Worker #' + threadId + '] making folder.');
	fs.mkdir(workPath,{ recursive: false }, (error) => {
		if(error) {
			console.log('[Worker #' + threadId + '] error making folder: ' + workPath);
			
			/* clean up */
			fs.rmSync(workPath, { recursive: true, force: true }, (err) => {
				if (err) {
					parentPort.postMessage({ type: 'terminate', data: workerData });
					validate.success = false;
				} else {
					/* try again */
					console.log('[Worker #' + threadId + '] trying again to make folder');
					fs.mkdir(workPath,{ recursive: false }, (error) => {
						if (err) {
							parentPort.postMessage({ type: 'terminate', data: workerData });
							validate.success = false;
						}
					});
				}
			});
		}
	});
	
	if(validate) {
		try {
			console.log('[Worker #' + threadId + '] initialized.');
			/* ffmpeg + ytdl-core */
			if(validate.success == true) {
				/* download yt */
				console.log('[Worker #' + threadId + '] downloading youtube.');
				parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Downloading YouTube..', 'percent': '1%', data: workerData });
				for(let attempts = 0; attempts < 3; attempts++) {
					// announce retries
					if(attempts > 0) {
						parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Retrying (x' + attempts + ') download..', 'percent': '1%', data: workerData });
					}
					
					try {
						await ytdl.download(workerData.yt_id, workerData.user_uuid, attempts + 1);
						validate.success = true;
						break;
					} catch(e) {
						validate.success = false;
						parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'YouTube Error: ' + e, 'percent': '1%', data: workerData });
						await sleep(5000);
					}
				}
				//await ytdl.download(workerData.yt_id, workerData.user_uuid, attempts + 1);
				
				if(validate.success) {
					
					for(let attempts = 0; attempts < 2; attempts++) {
						try {
							/* remove silence */
							console.log('[Worker #' + threadId + '] removing silence.');
							parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Removing Silence..', 'percent': '3%', data: workerData });
							await ytdl.removeSilence(workerData.user_uuid);
							
							/* adjust volume */
							console.log('[Worker #' + threadId + '] adjusting volume.');
							parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Adjusting Volume..', 'percent': '6%', data: workerData });
							await ytdl.increaseVolume(workerData.user_uuid);
							break;
						} catch(e) {
							/* silence probably removed everything,
							check if file is missing and if so
							give it a +10db before trying again */
							if (!fs.existsSync(__dirname + '/../workers/' + workerData.user_uuid + '/song_edited.mp3')) {
								parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'File went missing, retrying..', 'percent': '3%', data: workerData });
								console.log('file missing, manually attempting volume boost');
								await ytdl.boostVolume(workerData.user_uuid);
								fs.rename(__dirname + '/../workers/' + workerData.user_uuid + '/song_boosted.mp3', __dirname + '/../workers/' + workerData.user_uuid + '/song.mp3');
							} else {
								throw new Error(e);
							}
						}
					}

					/* segmenting clips */
					console.log('[Worker #' + threadId + '] segmenting clips.');
					parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Segmenting Clips..', 'percent': '9%', data: workerData });
					workerData.song_cliplength = await ytdl.segmentedCuts(workerData.user_uuid);
					
					/* validate last clip */
					console.log('[Worker #' + threadId + '] validating last clip.');
					await ytdl.segmentedValidation(workerData.user_uuid);
				} else {
					/* download failed, we're done here */
					throw new Error('[Worker #' + threadId + '] was unable to download.');
				}
			}
			
			/* corrade */
			/* new promise to wait till our turn */
			parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Awaiting our turn..', 'percent': '10%', data: workerData });
			await ourTurn();			
			/* create work folder */
			parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Initiating inventory..', 'percent': '11%', data: workerData });
			validate = await corrade.createFolder(workerData.song_folderName, workerData.user_uuid.replaceAll('-', '_'));
			
			if(validate.success == false) {
				/* unable to create song folder, start validating stuff */
				parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Validating inventory..?', 'percent': '12%', data: workerData });
				validate = await corrade.validateFolder('/My Inventory/Sounds/BeanOS/' + workerData.user_uuid.replaceAll('-', '_'));
				if(validate.success == true) {
					/* problem solved, try again */
					validate = await corrade.createFolder(workerData.song_folderName, workerData.user_uuid.replaceAll('-', '_'));
				} else {
					/* new user i guess? inb4 we gotta manually clean this shit up again */
					validate = await corrade.createFolder(workerData.user_uuid.replaceAll('-', '_'), "");
					if(validate.success == true) {
						/* problem solved, try again */
						validate = await corrade.createFolder(workerData.song_folderName, workerData.user_uuid.replaceAll('-', '_'));
					}
				}
			}
			
			/* announce job in local chat */
			// if(validate.success == true) { 
				// validate = await corrade.announceJob(workerData);
			// }
			
			/* get file list */
			if(validate.success == true) {
				validate = await new Promise((resolve, reject) => {					
					console.log('[Worker #' + threadId + '] getting file list.');
					fs.readdir(workPath, (err, files) => {
						workerData.song_files = files.filter(el => path.extname(el) === '.ogg');
						console.log('[Worker #' + threadId + '] sound files found: ' + workerData.song_files.length);
						if(workerData.song_files.length != 0) {
							return resolve({ 'success': true});
						} else {
							console.log('[Uploader] Unable to gather file list');
							return resolve({ 'success': false });
						}
					});
				});
			}
			
			/* bulk handle files */
			if(validate.success == true) {				
				/* calculate percentages for uploadStatus */
				var tmp_ppf = 75 / workerData.song_files.length;
				for (let i = 0; i < workerData.song_files.length; i++) {					
					parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Uploading file (' + (i + 1) + ' / ' + workerData.song_files.length + ')..', 'percent': 15 + (tmp_ppf * (i + 1)) + '%', data: workerData });
					
					/* upload file */
					for(let attempts = 0; attempts < num_retries; attempts++) {
						/* announce retries */
						if(attempts > 0) {
							parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Retrying (x' + attempts + ') upload (' + (i + 1) + ' / ' + workerData.song_files.length + ')..', 'percent': 15 + (tmp_ppf * (i + 1)) + '%', data: workerData });
						}
						
						validate = await corrade.uploadFile(workPath, i);
						
						/* success? */
						if(validate.success == true) {
							console.log('----');
							console.log(validate);
							/* validate we didn't get a success without a file UUID */
							if(validate.item_uuid != undefined) {
								break;
							} else {
								/* damn it, it don did it now */
								console.log('[Corrade] Error: file reported success but then returned no UUID?');
								console.log(validate);
							}
						}
					}
					
					if(validate.success == true) {
						workerData.song_items.push(validate.item_uuid);
						workerData.song_data.push(validate.data_uuid);
						
						parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Relocating file (' + (i + 1) + ' / ' + workerData.song_files.length + ')..', 'percent': 15 + (tmp_ppf * (i + 1)) + '%', data: workerData });
						
						/* relocate file */
						for(let attempts = 0; attempts < num_retries; attempts++) {
							/* announce retries */
							if(attempts > 0) {
								parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Retrying (x' + attempts + ') relocation (' + (i + 1) + ' / ' + workerData.song_files.length + ')..', 'percent': 15 + (tmp_ppf * (i + 1)) + '%', data: workerData });
							}
							
							validate = await corrade.moveFile(workerData, workerData.song_items[i]);
							
							/* success? */
							if(validate.success == true) {
								break;
							}
						}
						
						if(validate.success == false) {
							i = workerData.song_files.length;
						}
					} else {
						i = workerData.song_files.length;
					}
				}
			}
			
			/* make a notecard */
			if(validate.success == true) {
				parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Generating notecard..', 'percent': '93%', data: workerData });
				
				/* request notecard creation */
				for(let attempts = 0; attempts < num_retries; attempts++) {
					/* announce retries */
					if(attempts > 0) {
						parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Retrying (x' + attempts + ') notecard creation..', 'percent': '93%', data: workerData });
					}
					
					validate = await corrade.makeNotecard(workerData);
					
					/* success? */
					if(validate.success == true) {
						console.log('notecard created');
						console.log(validate.item_uuid);
						console.log('storing in song_items:');
						workerData.song_items.push(validate.item_uuid);
						console.log(workerData.song_items);
						break;
					}
				}
			}
			
			/* move the notecard */
			if(validate.success == true) {
				parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Relocating notecard..', 'percent': '96%', data: workerData });
				
				/* request notecard relocation */
				for(let attempts = 0; attempts < num_retries; attempts++) {
					/* announce retries */
					if(attempts > 0) {
						parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Retrying (x' + attempts + ') notecard relocation..', 'percent': '96%', data: workerData });
					}
					
					validate = await corrade.moveNotecard(workerData);
					
					/* success? */
					if(validate.success == true) {
						break;
					}
				}
			}
			
			/* release command reserve */
			doneTurn();
			
			/* store data */
			if(validate.success == true) {
				parentPort.postMessage({ type: 'store', data: workerData });
				console.log('[Worker #' + threadId + '] storing data.');
			}
			
			if(validate.success == true) {	
				/* folder or just the notecard? */
				if(workerData.song_items.length <= 40) {
					/* send folder */
					parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Sending folder..', 'percent': '99%', data: workerData });
					for(let attempts = 0; attempts < num_retries; attempts++) {
						if(attempts > 0) {
							parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Retrying (x' + attempts + ') sending folder..', 'percent': '99%', data: workerData });
						}
						validate = await corrade.sendFile(workerData.song_folderPath, workerData.user_uuid);
						
						/* success? */
						if(validate.success == true) {
							break;
						}
					}
					
					/* try the notecard if all else fails */
					if(validate.success == false) {
						parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Sending notecard..?', 'percent': '99%', data: workerData });
						validate = await corrade.sendFile(workerData.song_folderPath + '/' + workerData.song_shortTitle, workerData.user_uuid);
					}
				} else {
					parentPort.postMessage({ type: 'announce', announcementType: 'uploadStatus', announcement: 'Sending notecard..', 'percent': '99%', data: workerData });
					validate = await corrade.sendFile(workerData.song_folderPath + '/' + workerData.song_shortTitle, workerData.user_uuid);
					console.log(validate);
				}
			}
			
			/* clean up */
			fs.rmSync(workPath, { recursive: true, force: true }, (err) => {
				if (err) {
					console.log('[Worker #' + threadId + '] error - ' + err);
				}
			});
			
			/* terminate */
			if(validate.success) {
				parentPort.postMessage({ type: 'announce', announcementType: 'actionList', announcement: 'finished-request', data: workerData });
				console.log('[Worker #' + threadId + '] finished successfully, terminating.');
			} else {
				parentPort.postMessage({ type: 'announce', announcementType: 'actionList', announcement: 'failed-request', data: workerData });
				console.log('[Worker #' + threadId + '] failed job, terminating.');
			}
		} catch(e) {
			parentPort.postMessage({ type: 'announce', announcementType: 'actionList', announcement: 'failed-request', data: workerData });
			console.log('[Worker #' + threadId + '] error - ' + e);
			console.error(e);
		}
		
		/* clean up */
		fs.rmSync(workPath, { recursive: true, force: true }, (err) => {
			if (err) {
				console.log('[Worker #' + threadId + '] error - ' + err);
			}
		});
	}
	if(ready) { parentPort.postMessage({ type: 'done-busy', by: threadId }); }
	parentPort.postMessage({ type: 'terminate', data: workerData });
}

tryUpload();
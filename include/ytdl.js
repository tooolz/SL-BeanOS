const fs = require('fs');
const path = require('path');
const ytdl = require("@distube/ytdl-core");
const readline = require('readline');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
var ffprobe = require('ffprobe-static');
ffmpeg.setFfprobePath(ffprobe.path);
/* globals */
//const ytCookie = 'VISITOR_INFO1_LIVE=lcnbzW3lgFs; CONSENT=YES+DK.en+20151207-13-0; _ga=GA1.2.30838796.1611594814; LOGIN_INFO=AFmmF2swRAIgFS1cgqt07i00r9rFjXUXRAYGrUFBztNFimkGOkoHNjsCIDhDDtFH4UKRPlnYbqHRhg6-ce617fcNtAx8Yh0K7RAZ:QUQ3MjNmeTNnYktnYTlZTFdWcDhPUFo3UzNCS0tkMXJQeVc5bVdnemx0cENvc19obXFKNV9zYWJHSnNoU3k0cklwMnFBb0JPWkRVRlVvX2NLVW0wS19vNEhsTTk4eVdMalpDR3paeC1ULWFLaFc5WjdzUm1pc0pDOWNWZEZHWlpseGM5ZUFvYm9sRnItM3VzdHh2Tkp6TWlmNE04aWJQalZ3VTFDdEZyOGNMdHhNMDU2M3dBUUIwcEszWVRRMDJkQTQ3THlJN2JxaWZLdEV5YzhpQ0c2QTBzT05ybEFNQVgxQQ==; PREF=tz=Europe.Copenhagen&f6=400&f5=20000&f7=100; VISITOR_PRIVACY_METADATA=CgJESxIA; YSC=dDe_L3F23o8; wide=1; SID=aAijYyyiwyig07_zkD2iOOxEDW0327GLyfFjlg2h5zv2qQN9YuNuiJFO-hV03gL007HBcA.; __Secure-1PSID=aAijYyyiwyig07_zkD2iOOxEDW0327GLyfFjlg2h5zv2qQN9wM3HiUSRzRQ41F5xK8JeZw.; __Secure-3PSID=aAijYyyiwyig07_zkD2iOOxEDW0327GLyfFjlg2h5zv2qQN9qnpbXCbm-5uzV9jwyxc5UQ.; HSID=A64vx5PK9pu5ZFA3K; SSID=A2owY6jQQvsMXX9ea; APISID=dJ5hzycDnPOaDflr/AR9ld35DbfHV6NztD; SAPISID=laVC74wWbQJnE7lc/A12Pt_tXwROeFJ2lo; __Secure-1PAPISID=laVC74wWbQJnE7lc/A12Pt_tXwROeFJ2lo; __Secure-3PAPISID=laVC74wWbQJnE7lc/A12Pt_tXwROeFJ2lo; __Secure-1PSIDTS=sidts-CjEBSAxbGXRyO0Sqt2FmEzR8jhNFQj94t7MG6bCoD7ocWCGilZaqLuX_ZzOB1RLcL2c9EAA; __Secure-3PSIDTS=sidts-CjEBSAxbGXRyO0Sqt2FmEzR8jhNFQj94t7MG6bCoD7ocWCGilZaqLuX_ZzOB1RLcL2c9EAA; SIDCC=APoG2W_2T2E3yrR8pqYazrn9m4dfrLHXxEHl_4jE2IATFAgdAaV_MbKZc9SLovHxCFsnzFCB8S0; __Secure-1PSIDCC=APoG2W-G4VdWwH1eHHRNkLSJOGPu5Wda2Q2Hfj5jsKQWQ4IQwrPV_WvABSpIj8_KNFCJrAV7Yo0; __Secure-3PSIDCC=APoG2W8esW2N4-9V07VI35yXcHrNLjBR9alqX1Z_kLMVtj0G2De-YxLLEpePkiBx6ltuTx_y1Akt';
const ytCookie = 'VISITOR_INFO1_LIVE=lcnbzW3lgFs; CONSENT=YES+DK.en+20151207-13-0; _ga=GA1.2.30838796.1611594814; LOGIN_INFO=AFmmF2swRAIgFS1cgqt07i00r9rFjXUXRAYGrUFBztNFimkGOkoHNjsCIDhDDtFH4UKRPlnYbqHRhg6-ce617fcNtAx8Yh0K7RAZ:QUQ3MjNmeTNnYktnYTlZTFdWcDhPUFo3UzNCS0tkMXJQeVc5bVdnemx0cENvc19obXFKNV9zYWJHSnNoU3k0cklwMnFBb0JPWkRVRlVvX2NLVW0wS19vNEhsTTk4eVdMalpDR3paeC1ULWFLaFc5WjdzUm1pc0pDOWNWZEZHWlpseGM5ZUFvYm9sRnItM3VzdHh2Tkp6TWlmNE04aWJQalZ3VTFDdEZyOGNMdHhNMDU2M3dBUUIwcEszWVRRMDJkQTQ3THlJN2JxaWZLdEV5YzhpQ0c2QTBzT05ybEFNQVgxQQ==; VISITOR_PRIVACY_METADATA=CgJESxIA; YSC=dDe_L3F23o8; wide=1; PREF=tz=Europe.Copenhagen&f6=400&f5=20000&f7=100; SID=awijY04VGuNHlvQJNqq9pRBmgqxiLVbJM_pvBJ2MPmtH7w_n-okiRVFlqSotFnzDCxjgww.; __Secure-1PSID=awijY04VGuNHlvQJNqq9pRBmgqxiLVbJM_pvBJ2MPmtH7w_nljsHv4yt2BciuAcwgZUSiw.; __Secure-3PSID=awijY04VGuNHlvQJNqq9pRBmgqxiLVbJM_pvBJ2MPmtH7w_nQSZWavEJZMJ4MuVlXkZrVA.; HSID=AnuixDDQ55qdJVFEg; SSID=Al727qe9ABZm8LLb7; APISID=aptQrwNUMEAc3PBk/AKpSAci-zZ8mESvjD; SAPISID=AuKZGfK3U-gKpv6G/Ang-m6zh5zzMCSB1N; __Secure-1PAPISID=AuKZGfK3U-gKpv6G/Ang-m6zh5zzMCSB1N; __Secure-3PAPISID=AuKZGfK3U-gKpv6G/Ang-m6zh5zzMCSB1N; __Secure-1PSIDTS=sidts-CjEBSAxbGWVLKO4usizDYQFr5nthCJK4gE8Y9V9nwp_FjZOpD82XA6-LOoWowbmMa77nEAA; __Secure-3PSIDTS=sidts-CjEBSAxbGWVLKO4usizDYQFr5nthCJK4gE8Y9V9nwp_FjZOpD82XA6-LOoWowbmMa77nEAA; SIDCC=APoG2W-nLHt3TylERjGEfriv74f6fi9QeX0mrcyFdkNDA6sV3COTeT5GwjK6DePJXqqJ6eN5IEI; __Secure-1PSIDCC=APoG2W_smOQEqC0p3HP6lLtgPGF0JBxx9YVj4_Kg5yQJFihfdPuwpHGg904JElTSRlCj4a3NYJg; __Secure-3PSIDCC=APoG2W8UDEdaiR2Zl_IDDl-RM_EpDVWMpjiLKojoZXI19YqEJ7Q0mxkbjcA1LEpbGOLwmsfjpfjo';
const ytToken = 113288577174113941532;
const ytAgent = ytdl.createAgent(JSON.parse(fs.readFileSync("cookies.json")));

module.exports = {
	download : async function (yt_id, workPath, dlType) {
		return new Promise((resolve, reject) => {
			let ytdlConfig;
			if(dlType == 1) { ytdlConfig = { ytAgent, quality: 'highestaudio' }; }
			if(dlType == 2) { ytdlConfig = { ytAgent, filter: 'audio', quality: 'highest' }; }
			if(dlType == 3) { ytdlConfig = { quality: 'highest' }; }
			
			let stream = ytdl(yt_id, ytdlConfig);

			stream.on('error', (err) => {
				console.error("Error from ytdl:", err.message);
				reject(err.message);
			});

			const converter = ffmpeg(stream)
				.audioFrequency(44100)
				.audioBitrate(320)
				.save(__dirname + '/../workers/' + workPath + '/song.mp3')
				// .on('progress', p => {
					// readline.cursorTo(process.stdout, 0);
					// process.stdout.write(`${p.targetSize}kb downloaded`);
				// })
				.on('end', () => {
					console.log(`\ndone downloading`);
					resolve();
				});

			converter.on('error', (err) => {
				console.error("Error from ffmpeg:", err.message);
				reject('Error while processing the video');
			});
		});
	},

	removeSilence : async function (workPath) {
		return new Promise((resolve, reject) => {
			/* open and edit file */
			const converter = ffmpeg(__dirname + '/../workers/' + workPath + '/song.mp3')
				.audioBitrate(320)
				.audioFilters('silenceremove=start_periods=1:start_duration=1:start_threshold=-60dB:detection=peak,aformat=dblp,areverse,silenceremove=start_periods=1:start_duration=1:start_threshold=-80dB:detection=peak,aformat=dblp,areverse')
				.outputOptions('-threads 0')
				.save(__dirname + '/../workers/' + workPath + '/song_edited.mp3')
				.on('end', () => {
					console.log('silence removed');
					return resolve();
				});
				
			converter.on('error', (err) => {
				console.error("Error from ffmpeg:", err.message);
				reject('Error while processing the video');
			});
		});
	},

	increaseVolume : async function (workPath) {
		return new Promise((resolve, reject) => {
			/* open and equalize file */
			const converter = ffmpeg(__dirname + '/../workers/' + workPath + '/song_edited.mp3')
				.audioBitrate(320)
				.audioFilters('dynaudnorm=f=120:m=20:s=12:g=3')
				.outputOptions('-threads 0')
				.save(__dirname + '/../workers/' + workPath + '/song_equalized.mp3')
				.on('end', () => {
					console.log('volume equalized');
					return resolve();
				});
				
			converter.on('error', (err) => {
				console.error("Error from ffmpeg:", err.message);
				reject('Error while processing the video');
			});
		});
	},
	
	boostVolume : async function (workPath) {
		return new Promise((resolve, reject) => {
			/* open and equalize file */
			const converter = ffmpeg(__dirname + '/../workers/' + workPath + '/song.mp3')
				.audioBitrate(320)
				.audioFilters('volume=10dB')
				.outputOptions('-threads 0')
				.save(__dirname + '/../workers/' + workPath + '/song_boosted.mp3')
				.on('end', () => {
					console.log('+10db added to source file');
					return resolve();
				});
				
			converter.on('error', (err) => {
				console.error("Error from ffmpeg:", err.message);
				reject('Error while processing the video');
			});
		});
	},

	segmentedCuts : async function (workPath) {
		return new Promise((resolve, reject) => {
			/* get file length */
			ffmpeg.ffprobe(__dirname + '/../workers/' + workPath + '/song_equalized.mp3', function(err, metadata) {		
				if(!err) {
					/* get the square root of song length, and segment file */
					let songLength = Math.floor(metadata.format.duration);
					let clipLength = songLength;
					/* verify it's under 30 */
					if(clipLength => 29.5) {
						let increment = 0;
						while(clipLength > 29.5) {
							increment += 10;
							clipLength = songLength / increment;
						}
					}
					console.log('track length is: ' + songLength);
					console.log('segment length is: ' + clipLength);
				
					const converter = ffmpeg(__dirname + '/../workers/' + workPath + '/song_equalized.mp3')
						.audioChannels(1)
						.audioCodec('libvorbis')
						.addOutputOption(['-q:a 10', '-f', 'segment', '-segment_time ' + clipLength, '-force_key_frames "expr:gte(t,n_forced*2)"'])
						.save(__dirname + '/../workers/' + workPath + '/%d.ogg');
						
					converter.on('end', () => {						
						console.log('song segmented');
						return resolve(clipLength);
					})
						
					converter.on('error', (err) => {
						console.error("Error from ffmpeg:", err.message);
						reject('Error while processing the video');
					});
				} else {
					reject(' > An error occoured - ' + err);
				}
			});
		});
	},
	
	segmentedValidation : async function (workPath) {
		return new Promise((resolve, reject) => {
			/* validate last file */
			fs.readdir(__dirname + '/../workers/' + workPath + '/', (err, files) => {
				/* filter for .ogg files */
				files = files.filter(el => path.extname(el) === '.ogg')
				
				if(files.length > 1) {
					let tmp_target = files.length - 1;
					ffmpeg.ffprobe(__dirname + '/../workers/' + workPath + '/' + tmp_target + '.ogg', function(err, metadata) {
						if(metadata.format.duration < 1.0) {
							fs.unlink(__dirname + '/../workers/' + workPath + '/' + tmp_target + '.ogg', (err) => {
								if (err) {
									reject('> an error occoured - ' + err);
								} else {
									resolve();
								}
							});
						} else {
							resolve();
						}
					});
				} else {
					resolve();
				}
			});
		});
	},
	
	validate : async function(url) {
		if(ytdl.validateURL(url)) {
			var data = await ytdl.getBasicInfo(url, { ytAgent });
			if(data.player_response.videoDetails.lengthSeconds < 1800) {
				return { 'success': true, 'data': data.player_response.videoDetails };
			} else {
				return { 'success': false, 'msg': 'File too long! (30min max!)' };
			}
			return { 'success': true };
		} else {
			return { 'success': false, 'msg': 'Invalid Youtube link!' };
		}
	}
}
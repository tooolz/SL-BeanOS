/* includes */
const http = require('http');
const fs = require("fs");
const fs_promise = require("fs/promises");
/* Corrade creds */
const cor_group = 'test';
const cor_pass = 'test123';
let sl_vinylTextures = [
	'592650a0-06cf-e00a-f3ab-28330fa85209',
	'f6b4b3db-533a-165e-1ded-654e5124a8ec',
	'430ab714-0bbd-01da-c1f2-9140b4ec392c',
	'8229042e-657b-c84e-805a-b161135989ff',
	'846634da-7873-d7e9-adb4-e9388e560ebd',
	'b1bb6b57-ff79-29ae-5e05-9e010c0adbdc'
];

async function contact(data) {
	return new Promise((resolve, reject) => {
		let req = http.request({
			hostname: '172.16.1.20',
			port: 9092,
			path: '/',
			method: 'POST',
			headers: {
				'Content-Length': data.length,
				'Content-type': 'application/json'
			}
		}, (res) => {
			let data = '';
			
			const headerDate = res.headers && res.headers.date ? res.headers.date : 'no response date';
			//console.log('Status Code:', res.statusCode);
			//console.log('Date in Response header:', headerDate);
			
			res.on('data', (chunk) => { data += chunk; });
			req.on('error',reject);
			res.on('end', () => {
				if(res.statusCode == 200) {
					resolve(JSON.parse(data));
				} else {
					reject('rejected');
				}
			});
		});

		req.write(data);
		req.end();
	});
}


module.exports = {
	createFolder : async function (folderName, path) {
		// create music folder
		console.log('[Corrade] creating song folder');
		data = JSON.stringify(
			{
				'command': 'inventory',
				'group': cor_group,
				'password': cor_pass,
				'action': 'mkdir',
				'name': folderName,
				'path': '/My Inventory/Sounds/BeanOS/' + path
			}
		);
		validation = await contact(data);
		
		if(validation.success == 'True') {
			let tmp_path;
			if(path == "") {
				tmp_path = '/My Inventory/Sounds/BeanOS/' + folderName;
			} else {
				tmp_path = '/My Inventory/Sounds/BeanOS/' + path + '/' + folderName;
			}
			// switch to created folder
			console.log('[Corrade] switching to song folder');
			data = JSON.stringify(
				{
					'command': 'inventory',
					'group': cor_group,
					'password': cor_pass,
					'action': 'cd',
					'path': tmp_path
				}
			);
			validation = await contact(data);
			
			/* validate that we did it, and return success or false */
			if(validation.success == 'True') {
				return { 'success': true };
			} else {
				return { 'success': false };
			}
		} else {
			console.log('[Corrade] Unable to create song folder');
			return { 'success': false };
		}
	},
	
	validateFolder : async function (folderName) {
		let validation = "";		
		console.log('looking for folder named:' + folderName);
		
		// validate if user folder exists
		console.log('[Corrade] validating if folder exists');
		data = JSON.stringify(
				{
					'command': 'inventory',
					'group': cor_group,
					'password': cor_pass,
					'action': 'cd',
					'path': folderName
				}
			);
		validation = await contact(data);
		
		/* validate that we did it, and return success or false */
		if(validation.success == 'True') {
			return { 'success': true };
		} else {
			return { 'success': false };
		}
	},

	announceJob : async function (params) {
		// announce job in local chat
		console.log('[Corrade] announcing to chat');
		data = JSON.stringify(
			{
				'command': 'tell',
				'group': cor_group,
				'password': cor_pass,
				'message': 'Now uploading "' + params.song_title + '" for secondlife:///app/agent/' + params.user_uuid + '/about',
				'entity': 'local',
				'type': 'Whisper'
			}
		);
		validation = await contact(data);
		
		/* validate that we did it, and return success or false */
		if(validation.success == 'True') {
			return { 'success': true };
		} else {
			console.log('[Corrade] Unable to announce job');
			return { 'success': false };
		}
	},

	uploadFile : async function (workPath, filename) {
		console.log('[Corrade] uploading file ' + filename);
		var data = await fs_promise.readFile(workPath + '/' + filename + '.ogg', {encoding: 'base64'});
		var params = JSON.stringify(
					{
						'command': 'upload',
						'group': cor_group,
						'password': cor_pass,
						'name': filename + '.ogg',
						'type': 'Sound',
						'data': data
					}
				);
		
		validation = await contact(params);
		/* validate that we did it, and return success or false */
		if(validation.success == 'True') {
			return { 'success': true, 'item_uuid': validation.data[0], 'data_uuid': validation.data[1]};
		} else {
			console.log('[Corrade] Unable to upload sound');
			return { 'success': false };
		}
	},

	moveFile : async function (params, uuid) {
		// move file to folder
		console.log('[Corrade] relocating sound file ' + uuid);
		data = JSON.stringify(
			{
				'command': 'inventory',
				'group': cor_group,
				'password': cor_pass,
				'action': 'mv',
				'source': '/My Inventory/Sounds/' + uuid,
				'path': params.song_folderPath
			}
		);
		validation = await contact(data);
		
		/* validate that we did it, and return success or false */
		if(validation.success == 'True') {
			return { 'success': true };
		} else {
			console.log('[Corrade] Unable to relocate sound');
			return { 'success': false };
		}
	},

	makeNotecard : async function (params) {
		// make a notecard for the data
		let tmp_text = "        ,               " + params.song_upload_date + '\n';
		tmp_text += "        |\        __  - Uploaded via BeanOS - https://marketplace.secondlife.com/stores/232338\n";
		tmp_text += "        | |      |--| - Song Requested by: " + params.user_uuid + '\n';
		tmp_text += "        |/       |  | \n";
		tmp_text += "       /|_      () () \n"
		tmp_text += "      //| \             Notecard format:\n";
		tmp_text += "     | \|_ |          - song name,\n";
		tmp_text += "      \_|_/           - song texture,\n";
		tmp_text += "        |             - clip length,\n";
		tmp_text += "       @'             - list of clips.                             (finish comment section with 4 or more ='s	)\n";
		tmp_text += "=========================================================\n";
		tmp_text += params.song_title.toString("utf8") + "\n";
		tmp_text += sl_vinylTextures[Math.floor(Math.random() * sl_vinylTextures.length)] + "\n";
		tmp_text += params.song_cliplength + "\n";
		
		for(let i = 0; i < params.song_data.length; i++) {
			tmp_text += params.song_data[i] + '\n';
		}
		
		console.log('[Corrade] creating a notecard');
		data = JSON.stringify(
				{
					'command': 'createnotecard',
					'group': cor_group,
					'password': cor_pass,
					'entity': 'text',
					'name': params.song_shortTitle,
					'text': tmp_text,
					'permissions': 'c--mvt------------c--mvtc--mvt'
				}
			);
		validation = await contact(data);
		
		/* validate that we did it, and return success or false */
		if(validation.success == 'True') {
			console.log('- notecard: ' + validation.data[1]);
			return { 'success': true, 'item_uuid': validation.data[1] };
		} else {
			console.log('[Corrade] Unable to create notecard');
			return { 'success': false };
		}
	},

	moveNotecard : async function (params) {
		// move notecard to folder
		console.log('[Corrade] relocating notecard ' + params.song_items[params.song_items.length - 1]);
		data = JSON.stringify(
			{
				'command': 'inventory',
				'group': cor_group,
				'password': cor_pass,
				'action': 'mv',
				'source': '/My Inventory/Notecards/' + params.song_items[params.song_items.length - 1],
				'path': params.song_folderPath
			}
		);
		validation = await contact(data);
		
		/* validate that we did it, and return success or false */
		if(validation.success == 'True') {
			return { 'success': true };
		} else {
			console.log('[Corrade] Unable to relocate notecard');
			return { 'success': false };
		}
	},

	sendFile : async function (file, uuid) {
		// transfer it to request-uuid
		console.log('[Corrade] sending file to uploader uuid');
		data = JSON.stringify(
				{
					'command': 'give',
					'group': cor_group,
					'password': cor_pass,
					'entity': 'avatar',
					'item': file,
					'agent': uuid,
					'permissions': 'c--mvt------------c--mvtc--mvt'
				}
			);
		validation = await contact(data);
		
		/* validate that we did it, and return success or false */
		if(validation.success == 'True') {
			return { 'success': true };
		} else {
			console.log('[Corrade] Unable to send folder');
			return { 'success': false };
		}
	},

	message : async function (params) {
		console.log(params);
		data = JSON.stringify(
				{
					'command': 'tell',
					'group': cor_group,
					'password': cor_pass,
					'agent': params[0],
					'entity': 'avatar',
					'dialog': 'MessageFromAgent',
					'message': params[1]
				}
			);
		let result = await contact(data);
		console.log(result);
	},
	
	init_contact : async function(params) { contact(params); },
}
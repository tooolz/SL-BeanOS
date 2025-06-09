const http = require('http');
const { URL } = require('url');

async function contact(url, query) {
	return new Promise((resolve, reject) => {
		let tmp_url = new URL(url);

		const req = http.request(url, { method: 'POST' }, function (res) {
			console.log(res.statusCode);
			
			let data = [];
			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				if(res.statusCode == 200) {
					return resolve(JSON.parse(data));
				} else {
					return resolve('rejected');
				}
			});
			
			req.on('error', (e) => {
				console.log(e);
			});
		});
		
		req.write(JSON.stringify(query));
		req.end();
	});
}

module.exports = {
	send : async function (url, query) {
		let data = "";
		data = await contact(url, query);
		
		if(data == 'rejected') {
			return { 'success': false };
		} else {
			return { 'success': true, 'data': data };
		}
	}
};


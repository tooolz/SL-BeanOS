const http = require('https');

async function contact(query) {
	return new Promise((resolve, reject) => {
		const options = {
			method: 'GET',
			hostname: 'api.deezer.com',
			port: null,
			path: query
		};

		const req = http.request(options, function (res) {
			const data = [];

			res.on('data', function (chunk) {
				data.push(chunk);
			});

			res.on('end', () => {
				if(res.statusCode == 200) {
					return resolve(JSON.parse(Buffer.concat(data)));
				} else {
					return reject('rejected');
				}
			});
		});

		req.end();
	});
}

module.exports = {
	query : async function (url) {
		let data = "";
		data = await contact(url);
		
		if(data == 'rejected') {
			return { 'success': false };
		} else {
			return { 'success': true, 'data': data };
		}
	}
};


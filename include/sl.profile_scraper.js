const request = require('request');
const cheerio = require('cheerio');

module.exports = {
	scrape : async function (uuid) {
		return new Promise((resolve, reject) => {
			request('https://world.secondlife.com/resident/' + uuid, function (error, response, html) {
				if(response.statusCode == 200) {
					const $ = cheerio.load(html);
					let data = [];
					data.push($('head > title').text());
					data.push($('meta[name="imageid"]').attr('content'));
					return resolve(data);
				} else {
					return reject('unavailable');
				}
			});
		});
	}
}
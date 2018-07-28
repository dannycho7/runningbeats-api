const request = require("request");

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
module.exports.generateRandomString = (length) => {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

module.exports.fetchTracks = (access_token) => {
	var options = {
		url: 'https://api.spotify.com/v1/me/tracks',
		headers: { 'Authorization': `Bearer ${access_token}` },
		json: true
	};

	const ids = [];

	request.get(options, function(error, response, body) {
		let tracks = body['items'];
		tracks.forEach(track_obj => {
			let track = track_obj['track'];
			ids.push(track['id']);
		});
		console.log(ids);
	});
};
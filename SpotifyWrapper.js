const request = require("request");

class SpotifyWrapper {
	constructor(access_token) {
		this.access_token = access_token || process.env['DEFAULT_ACCESS_TOKEN'];
	}

	fetchTracks() {
		var options = {
			url: 'https://api.spotify.com/v1/me/tracks',
			headers: { 'Authorization': `Bearer ${this.access_token}` },
			json: true
		};

		const ids = [];

		request.get(options, function(error, response, body) {
			if (error) {
				console.log(error);
				return;
			}

			console.log(body);

			let tracks = body['items'];
			tracks.forEach(track_obj => {
				let track = track_obj['track'];
				ids.push(track['id']);
			});
			console.log(ids);
		});
	};

	mapToBPM(track_ids) {
		let options = {
			url: 'https://api.spotify.com/v1/audio-features',
			headers: { 'Authorization': `Bearer ${this.access_token}` },
			tracks: track_ids.split(","),
			json: true
		}

		request.get(options, function(error, response, body) {
			let tracks = body['items'];
			tracks.forEach(track_obj => {
				let track = track_obj['track'];
				ids.push(track['id']);
			});
			console.log(ids);
		});
	};
}

module.exports = SpotifyWrapper;
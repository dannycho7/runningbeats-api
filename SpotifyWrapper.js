const request = require("request");

class SpotifyWrapper {
	constructor(access_token) {
		this.access_token = access_token || process.env['DEFAULT_ACCESS_TOKEN'];
		this.max_tracks = process.env['MAX_TRACKS'] || 1000;
		this.track_ids = [];
	}

	fetchTracks() {
		this.tracks = [];
		let track_url = 'https://api.spotify.com/v1/me/tracks?limit=50';
		this.paginateForIds(track_url, (ids) => {
			this.track_ids = ids;
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

	paginateForIds(url, cb, ids = []) {
		if (!url || ids.length > this.max_tracks) {
			return cb(ids);
		}

		var options = {
			url: url,
			headers: { 'Authorization': `Bearer ${this.access_token}` },
			json: true
		};

		console.log(`Sending request for ${url}`);

		request.get(options, (error, response, body) => {
			if (error) {
				throw error;
			}

			let tracks = body['items'];
			tracks.forEach(track_obj => {
				let track = track_obj['track'];
				ids.push(track['id']);
			});

			setTimeout(() => {
				this.paginateForIds(body['next'], cb, ids);
			}, 100);
		});
	};
}

module.exports = SpotifyWrapper;
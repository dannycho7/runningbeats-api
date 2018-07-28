const request = require("request");
const { getBPMRangeString } = require("./util");

class SpotifyWrapper {
	constructor(access_token) {
		this.access_token = access_token || process.env['DEFAULT_ACCESS_TOKEN'];
		this.max_tracks = process.env['MAX_TRACKS'] || 1000;
		this.track_ids = [];
		this.bpm_range_to_track_ids_map = {};
	}

	fetchTracks(cb = () => {}) {
		let track_url = 'https://api.spotify.com/v1/me/tracks?limit=50';
		this.paginateForIds(track_url, (ids) => {
			this.track_ids = ids;
			this.mapToBPM(cb);
		});
	};

	mapToBPM(cb, partition_num = 0) {
		let track_ids_starting_index = partition_num * 100;
		let relevant_tracks = this.track_ids.slice(track_ids_starting_index, track_ids_starting_index + 100);
		if (relevant_tracks.length === 0) {
			return cb();
		}

		new Promise((resolve, reject) => {
			let relevant_tracks_string = relevant_tracks.join(",")
			let options = {
				url: `https://api.spotify.com/v1/audio-features?ids=${relevant_tracks_string}`,
				headers: { 'Authorization': `Bearer ${this.access_token}` },
				json: true
			}

			console.log(`Sending request for ${options.url} in partition ${partition_num}`);

			request.get(options, (error, response, body) => {
				let audio_features = body['audio_features'];
				console.log(audio_features);
				audio_features.forEach(audio_feature => {
					let { id, tempo } = audio_feature; // tempo is BPM
					let bpm_range_string = getBPMRangeString(tempo);
					if (this.bpm_range_to_track_ids_map[bpm_range_string]) {
						this.bpm_range_to_track_ids_map[bpm_range_string].push(id);
					} else {
						this.bpm_range_to_track_ids_map[bpm_range_string] = [id];
					}
				});

				resolve();
			});
		})
		.then(() => {
			setTimeout(() => {
				this.mapToBPM(cb, partition_num + 1);
			}, 100);
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
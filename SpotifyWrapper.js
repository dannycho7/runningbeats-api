require('dotenv').config();

const request = require("request");
const mongoose = require('mongoose');
const { getBPMRangeString } = require("./util");

mongoose.connect(
	process.env['MONGO_URI'] ||'mongodb://localhost:27017/runningbeats-api',
	{ useNewUrlParser: true },
	err => {
		if (err) throw err;
		console.log('Successfully connected to DB');
	}
);

const SpotifyDump = mongoose.model('SpotifyDump', {
	access_token: String,
	refresh_token: String,
	max_tracks: Number,
	track_ids: Array,
	bpm_range_to_track_ids_map: Object,
	email: String,
});

class SpotifyWrapper {
	constructor(email, access_token, refresh_token) {
		this.access_token = access_token || process.env['DEFAULT_ACCESS_TOKEN'];
		this.refresh_token = refresh_token || process.env['DEFAULT_REFRESH_TOKEN'];
		this.max_tracks = parseInt(process.env['MAX_TRACKS']) || 1000;
		this.track_ids = [];
		this.bpm_range_to_track_ids_map = {};
		this.email = email;
	}

	static load(
		email = 'admin@admin.com',
		access_token = process.env['DEFAULT_ACCESS_TOKEN'],
		refresh_token = process.env['DEFAULT_REFRESH_TOKEN'],
		cb = () => {}
	) {
		let spotifyWrapper = new SpotifyWrapper(email, access_token, refresh_token);

		SpotifyDump.findOne({ email }, (err, spotifyDump) => {
			if (spotifyDump) {
				console.log('Loaded spotifyDump from DB');
				spotifyWrapper.max_tracks = spotifyDump['max_tracks'];
				spotifyWrapper.track_ids = spotifyDump['tracks_ids'];
				spotifyWrapper.bpm_range_to_track_ids_map = spotifyDump['bpm_range_to_track_ids_map'];
				return cb(spotifyWrapper);
			} else {
				console.log('Could not find saved dump. Fetching tracks...');
				spotifyWrapper.fetchTracks(() => cb(spotifyWrapper));
			}
		});
	}

	save(cb) {
		let spotifyDump = new SpotifyDump({
			access_token: this.access_token,
			refresh_token: this.refresh_token,
			max_tracks: this.max_tracks,
			track_ids: this.track_ids,
			bpm_range_to_track_ids_map: this.bpm_range_to_track_ids_map,
			email: this.email
		});

		spotifyDump.save().then(() => {
			console.log('Saved')
			cb();
		});
	}

	fetchTracks(cb = () => {}) {
		let track_url = 'https://api.spotify.com/v1/me/tracks?limit=50';
		this.paginateForIds(track_url, (ids) => {
			this.track_ids = ids;
			this.mapToBPM(() => this.save(cb));
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
				if (error) throw error;

				let audio_features = body['audio_features'];
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

	refreshToken(cb) {
  		var authOptions = {
			url: 'https://accounts.spotify.com/api/token',
			headers: { 'Authorization': 'Basic ' + (new Buffer(process.env['CLIENT_ID'] + ':' + process.env['CLIENT_SECRET']).toString('base64')) },
			form: {
			  grant_type: 'refresh_token',
			  refresh_token: this.refresh_token
			},
			json: true
		};

		request.post(authOptions, (error, response, body) => {
			if (!error && response.statusCode === 200) {
			  this.access_token = body['access_token'];
			  this.save(cb);
			} else {
				console.log('Refresh failed');
			}
		});
	}

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

			if (body['error']) {
				console.log('access token has expired. refreshing token...');
				this.refreshToken(() => {
					console.log(`Refresh success: ${this.access_token}`);
					this.paginateForIds(url, cb, ids); // retry with new access token
				});
				return;
			};

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
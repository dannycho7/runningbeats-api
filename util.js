/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = (length) => {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};


const getBPMRangeString = (BPM, range_size = 10) => {
	if (BPM <= 0) {
		return "";
	} else if (BPM >= 201) {
		return "201-";
	}

	let upper_bound = (Math.ceil(BPM / range_size) * range_size);
	let lower_bound = upper_bound - range_size + 1;

	return `${lower_bound}-${upper_bound}`;
};

const randomTrackFromBPM = (bpm_range_to_track_ids_map, BPM, range_size = 10) => {
	if (Object.keys(bpm_range_to_track_ids_map).length === 0) {
		throw new Error('There are no tracks to search for');
	}

	let depth = 0;
	let selected_track;
	while (true) {
		console.log(`Searching at depth ${depth}`);
		let bpm_range_range_string_inc = getBPMRangeString(BPM + depth * range_size);
		if (bpm_range_range_string_inc in bpm_range_to_track_ids_map) {
			let tracks_in_range = bpm_range_to_track_ids_map[bpm_range_range_string_inc];
			selected_track = tracks_in_range[Math.floor(Math.random() * tracks_in_range.length)];
			break;
		}

		let bpm_range_range_string_neg = getBPMRangeString(BPM - depth * range_size);
		if (bpm_range_range_string_neg in bpm_range_to_track_ids_map) {
			let tracks_in_range = bpm_range_to_track_ids_map[bpm_range_range_string_neg];
			selected_track = tracks_in_range[Math.floor(Math.random() * tracks_in_range.length)];
			break;
		}

		depth++;
	}

	return selected_track;
};

module.exports.generateRandomString = generateRandomString;
module.exports.getBPMRangeString = getBPMRangeString;
module.exports.randomTrackFromBPM = randomTrackFromBPM;
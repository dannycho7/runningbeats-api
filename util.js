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

module.exports.generateRandomString = generateRandomString;
module.exports.getBPMRangeString = getBPMRangeString;
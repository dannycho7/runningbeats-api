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


module.exports.getBPMRangeString = (BPM) => {
	let upper_bound = Math.ceil(BPM / 10) * 10;
	let lower_bound = upper_bound - 10;

	return `${lower_bound}-${upper_bound}`;
};
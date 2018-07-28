require('dotenv').config();

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const querystring = require('querystring');
const request = require('request');
const SpotifyWrapper = require("./SpotifyWrapper");
const { generateRandomString } = require("./util");

const app = express();
const stateKey = 'spotify_auth_state';

let CURRENT_USER_TOKEN = null;

let spotifyWrapperInst;

app.use(cors())
   .use(cookieParser())
   .use(bodyParser.json())
   .use(bodyParser.urlencoded({ extended: false }))

app.use((req, res, next) => {
  console.log(req.url, req.body);
  next();
});

app.use(express.static(__dirname + '/public'));

app.post('/init', (req, res) => {
  let { access_token } = req.body;
  if (!access_token) {
    throw new Error(`Incorrect body: ${JSON.stringify(req.body)}`);
  }

  var options = {
    url: 'https://api.spotify.com/v1/me',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  request.get(options, (error, response, body) => {
    if (error) throw error;

    if (body['error']) {
      let err_msg = `Couldn\'t get info about yourself ${JSON.stringify(body)}`;
      throw new Error(err_msg);
    } else {
      let { email } = body;
      console.log(email, body);
      SpotifyWrapper.load(email, access_token, '', (sp) => {
        spotifyWrapperInst = sp;
        console.log(`Init called and email was saved as ${spotifyWrapperInst.email} and ${access_token} ==? ${spotifyWrapperInst.access_token}`);
        res.end('Success');
      });
    }
  });
});

app.get('/random-track', (req, res) => {
  if (!spotifyWrapperInst) {
    throw new Error('No spotify inst');
  }

  let { BPM } = req.query;

  if (!BPM) {
    let err_msg = `Invalid BPM: ${BPM}`;
    throw new Error(err_msg);
  } else {
    let track_id = spotifyWrapperInst.getRandomTrackFromBPM(parseInt(BPM));
    console.log(`Sending back ${track_id}`);
    res.end(track_id);
  }
});

app.get('/login', function(req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-library-read';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: process.env['CLIENT_ID'],
      scope: scope,
      redirect_uri: process.env['REDIRECT_URI'],
      state: state,
      show_dialog: true,
    }));
});

app.get('/callback', function(req, res) {
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: process.env['REDIRECT_URI'],
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(process.env['CLIENT_ID'] + ':' + process.env['CLIENT_SECRET']).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        console.log(body);

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        CURRENT_USER_TOKEN = access_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

const port = process.env['PORT'] || 5000;

app.listen(port, () => console.log(`Listening on ${port}`));

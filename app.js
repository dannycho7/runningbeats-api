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

const initSpotifyWrapper = () => {
  SpotifyWrapper.load('admin@admin.com', process.env['DEFAULT_ACCESS_TOKEN'], process.env['DEFAULT_REFRESH_TOKEN'], (sp) => {
    spotifyWrapperInst = sp;
  });
};

initSpotifyWrapper();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser())
   .use(bodyParser.json())
   .use(bodyParser.urlencoded({ extended: false }));

app.post('/init', (req, res) => {
  let { email, access_token, refresh_token } = req.body;
  if (!email || !access_token || !refresh_token) {
    throw new Error(`Incorrect body: ${JSON.stringify(req.body)}`);
  }

  SpotifyWrapper.load(email, access_token, refresh_token, (sp) => {
    spotifyWrapperInst = sp;
    res.end('Success');
  });
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

app.listen(5000, () => console.log('Listening on 5000'));

const express = require('express');
const querystring = require('querystring');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const {DB} = require('./db_repo')
const client_id = "623c7e71f9d940c7937d81a181088ee6";
const client_secret = "ef77ee4cc25d4cd9a9a52c81abb7bff3"; // important to protect this one
const redirect_uri = "http://localhost:8888/callback"; //change if needed
const tokens = {}
const tokens_with_permissions = {}
const generateRandomString = function (length) { // generate random string to use as a state
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

let stateKey = 'spotify_auth_state'; // name of the cookie

let app = express();

app.use(express.static(__dirname + '/public'))
    .use(cors())
    .use(cookieParser());

app.get('/login', function (req, res) { // handle login request from the hyperlink on html page

    let state = generateRandomString(16);
    res.cookie(stateKey, state); // set cookie to travel with request

    // request authorization - automatically redirects to callback
    const scope =
      "user-read-private user-read-email user-read-playback-state user-modify-playback-state";
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));
});

app.get('/callback', function (req, res) {

    // request refresh and access tokens after comparing states

    let code = req.query.code || null;
    let state = req.query.state || null;
    let storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey); // eat (clear) cookie

        const authOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))
            },
            body: `code=${code}&redirect_uri=${redirect_uri}&grant_type=authorization_code`,
            json: true
        };

        fetch('https://accounts.spotify.com/api/token', authOptions) // make request to token endpoint for our tokens
            .then((response) => {
                if (response.status === 200) {
                    response.json().then((data) => {
                        let access_token = data.access_token
                        let refresh_token = data.refresh_token
                        res.redirect('/#' +
                            querystring.stringify({
                                access_token: access_token,
                                refresh_token: refresh_token
                            }));
                    });
                } else {
                    res.redirect('/#' +
                        querystring.stringify({
                            error: 'invalid_token'
                        }));
                };
            })
            .catch(error => {
                console.error(error);
            });
    }
});
async function get_permission_token(refresh_token, client_id, client_secret) {
    
    const authOptions = {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(client_id + ":" + client_secret).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `grant_type=refresh_token&refresh_token=${refresh_token}`,
    };

     fetch("https://accounts.spotify.com/api/token", authOptions)
      .then((response) => {
        if (response.status === 200) {
          response.json().then((data) => {
              const access_token = data.access_token;
              console.log(access_token);
            return access_token 
          });
        }
      })
      .catch((error) => {
        console.error(error);
        return error
      });
}

app.get('/refresh_token',async function (req, res) {

    
    
    const refresh_token = req.query.refresh_token;// this token is used to be granted token with which you can perform actions instead of user
    tokens[refresh_token] = req.query.name
    try{ await DB.add_to_db({
        name: req.query.name,
        token: refresh_token
    })
    } catch (err) {
    }
    console.log(tokens);
    const token = get_permission_token(refresh_token,client_id,client_secret)
res.status(200).json({access_token:token})
});

app.get("/all_users", async(req, res) => {
    const users = await DB.get_all_users()
    res.status(200).json({users})
})


console.log('Listening on 8888');
app.listen(8888);



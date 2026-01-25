const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
let TWITCH_OAUTH_TOKEN = process.env.TWITCH_OAUTH_TOKEN;
let TWITCH_USER_ID = process.env.TWITCH_USER_ID;
const PORT = process.env.PORT || 9442;
const STREAMLINK_PATH = path.join(process.env.LOCALAPPDATA, 'Programs', 'Streamlink', 'bin', 'streamlink.exe');

// Helper to make Twitch API requests
async function twitchFetch(endpoint) {
  const response = await fetch(`https://api.twitch.tv/helix${endpoint}`, {
    headers: {
      'Client-ID': TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${TWITCH_OAUTH_TOKEN}`
    }
  });
  return response.json();
}

// Update .env file with new values
function updateEnvFile(key, value) {
  const envPath = path.join(__dirname, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `${key}=${value}`);
  } else {
    envContent += `\n${key}=${value}`;
  }
  fs.writeFileSync(envPath, envContent);
}

// OAuth callback - exchange code for token
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `http://localhost:${PORT}/callback`
      })
    });
    const tokenData = await tokenResponse.json();

    if (tokenData.access_token) {
      TWITCH_OAUTH_TOKEN = tokenData.access_token;
      updateEnvFile('TWITCH_OAUTH_TOKEN', tokenData.access_token);

      // Get user ID
      const userResponse = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${TWITCH_OAUTH_TOKEN}`
        }
      });
      const userData = await userResponse.json();

      if (userData.data && userData.data[0]) {
        TWITCH_USER_ID = userData.data[0].id;
        updateEnvFile('TWITCH_USER_ID', TWITCH_USER_ID);
      }

      res.redirect('/');
    } else {
      res.status(400).send('Failed to get token: ' + JSON.stringify(tokenData));
    }
  } catch (error) {
    res.status(500).send('OAuth error: ' + error.message);
  }
});

// Check if authenticated
app.get('/api/auth/status', (req, res) => {
  res.json({
    authenticated: !!(TWITCH_OAUTH_TOKEN && TWITCH_USER_ID),
    userId: TWITCH_USER_ID
  });
});

// Get OAuth URL for login
app.get('/api/auth/url', (req, res) => {
  const url = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=http://localhost:${PORT}/callback&response_type=code&scope=user:read:follows`;
  res.json({ url });
});

// Get followed live streams
app.get('/api/streams/followed', async (req, res) => {
  if (!TWITCH_USER_ID) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const data = await twitchFetch(`/streams/followed?user_id=${TWITCH_USER_ID}&first=100`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user ID from username
app.get('/api/users', async (req, res) => {
  const { login } = req.query;
  if (!login) {
    return res.status(400).json({ error: 'Login required' });
  }
  try {
    const data = await twitchFetch(`/users?login=${login}`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get VODs for a channel
app.get('/api/videos', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id required' });
  }
  try {
    const data = await twitchFetch(`/videos?user_id=${user_id}&type=archive&first=20`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Launch live stream in VLC
app.post('/api/watch/live/:channel', (req, res) => {
  const channel = req.params.channel.replace(/[^a-zA-Z0-9_]/g, '');
  exec(`"${STREAMLINK_PATH}" twitch.tv/${channel} best`, (err) => {
    if (err) {
      console.error('Streamlink error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// Launch VOD in VLC
app.post('/api/watch/vod/:id', (req, res) => {
  const id = req.params.id.replace(/[^0-9]/g, '');
  exec(`"${STREAMLINK_PATH}" twitch.tv/videos/${id} best`, (err) => {
    if (err) {
      console.error('Streamlink error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// Serve static files
app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`draks-tv running at http://localhost:${PORT}`);
  if (!TWITCH_OAUTH_TOKEN) {
    console.log(`\nNot authenticated yet. Visit http://localhost:${PORT} to login with Twitch.`);
  }
});

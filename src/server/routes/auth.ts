import { Router } from 'express';

import { getAuth, setAuth, clearAuth } from '../database/auth';

const router = Router();

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID ?? '';
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET ?? '';
const PORT = process.env.PORT ?? '9442';

router.get('/status', (_request, response) => {
  const auth = getAuth();
  response.json({
    authenticated: auth.accessToken !== null && auth.userId !== null,
    userId: auth.userId,
  });
});

router.get('/url', (_request, response) => {
  const redirectUri = `http://localhost:${PORT}/callback`;
  const url = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=user:read:follows`;
  response.json({ url });
});

router.get('/callback', async (request, response) => {
  const code = request.query.code;

  if (typeof code !== 'string') {
    response.status(400).send('No code provided');
    return;
  }

  const redirectUri = `http://localhost:${PORT}/callback`;

  const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenResponse.json() as { access_token?: string; refresh_token?: string };

  if (tokenData.access_token === undefined || tokenData.refresh_token === undefined) {
    response.status(400).send('Failed to get token');
    return;
  }

  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;

  // Get user info
  const userResponse = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      'Client-ID': TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const userData = await userResponse.json() as { data?: Array<{ id: string }> };

  if (userData.data === undefined || userData.data.length === 0) {
    response.status(400).send('Failed to get user info');
    return;
  }

  const userId = userData.data[0].id;
  setAuth(accessToken, refreshToken, userId);

  response.redirect('/');
});

router.post('/logout', (_request, response) => {
  clearAuth();
  response.json({ success: true });
});

export { router as authRouter };

import { Router } from 'express';

import { getAuth } from '../database/auth';
import { getAllFavorites, addFavorite, removeFavorite, isFavorite } from '../database/favorites';
import { getUsers, getFollowedStreams, getStreamsByUserIds, getVideos } from '../services/twitch-service';

import type { Favorite } from '../database/favorites';
import type { TwitchStream, TwitchVideo } from '../services/twitch-service';

const router = Router();

interface Channel {
  id: string;
  login: string;
  displayName: string;
  profileImage: string;
  isFavorite: boolean;
  isLive: boolean;
  stream: {
    title: string;
    gameName: string;
    viewerCount: number;
    thumbnailUrl: string;
    startedAt: string;
  } | null;
  latestVod: {
    id: string;
    title: string;
    duration: string;
    createdAt: string;
    thumbnailUrl: string;
  } | null;
}

function streamToChannelStream(stream: TwitchStream) {
  return {
    title: stream.title,
    gameName: stream.game_name,
    viewerCount: stream.viewer_count,
    thumbnailUrl: stream.thumbnail_url,
    startedAt: stream.started_at,
  };
}

function vodToChannelVod(vod: TwitchVideo) {
  return {
    id: vod.id,
    title: vod.title,
    duration: vod.duration,
    createdAt: vod.created_at,
    thumbnailUrl: vod.thumbnail_url,
  };
}

// Get all channels (favorites + followed live)
router.get('/channels', async (_request, response) => {
  const auth = getAuth();

  if (auth.userId === null) {
    response.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const favorites = getAllFavorites();
  const favoriteIds = new Set(favorites.map((f) => f.id));

  // Get followed live streams
  const liveStreamsResult = await getFollowedStreams(auth.userId);

  if (liveStreamsResult instanceof Error) {
    response.status(500).json({ error: liveStreamsResult.message });
    return;
  }

  const liveStreamMap = new Map<string, TwitchStream>();
  for (const stream of liveStreamsResult) {
    liveStreamMap.set(stream.user_id, stream);
  }

  // Get user info for non-favorite live streams
  const liveNonFavoriteIds = liveStreamsResult
    .filter((stream) => !favoriteIds.has(stream.user_id))
    .map((stream) => stream.user_id);

  let liveUsersMap = new Map<string, { id: string; login: string; display_name: string; profile_image_url: string }>();

  if (liveNonFavoriteIds.length > 0) {
    const usersResult = await getUsers({ ids: liveNonFavoriteIds });

    if (!(usersResult instanceof Error)) {
      for (const user of usersResult) {
        liveUsersMap.set(user.id, user);
      }
    }
  }

  // Build channels array
  const channels: Array<Channel> = [];

  // Process favorites
  for (const fav of favorites) {
    const liveStream = liveStreamMap.get(fav.id);

    if (liveStream !== undefined) {
      channels.push({
        id: fav.id,
        login: fav.login,
        displayName: fav.displayName,
        profileImage: fav.profileImage,
        isFavorite: true,
        isLive: true,
        stream: streamToChannelStream(liveStream),
        latestVod: null,
      });
    } else {
      // Get latest VOD for offline favorite
      const vodsResult = await getVideos(fav.id, 1);
      let latestVod = null;

      if (!(vodsResult instanceof Error) && vodsResult.length > 0) {
        latestVod = vodToChannelVod(vodsResult[0]);
      }

      channels.push({
        id: fav.id,
        login: fav.login,
        displayName: fav.displayName,
        profileImage: fav.profileImage,
        isFavorite: true,
        isLive: false,
        stream: null,
        latestVod,
      });
    }
  }

  // Add non-favorite live streams
  for (const stream of liveStreamsResult) {
    if (favoriteIds.has(stream.user_id)) {
      continue;
    }

    const user = liveUsersMap.get(stream.user_id);

    if (user === undefined) {
      continue;
    }

    channels.push({
      id: user.id,
      login: user.login,
      displayName: user.display_name,
      profileImage: user.profile_image_url,
      isFavorite: false,
      isLive: true,
      stream: streamToChannelStream(stream),
      latestVod: null,
    });
  }

  // Sort: favorites live first, then favorites offline, then followed live by viewer count
  channels.sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;

    if (a.isLive && b.isLive && a.stream !== null && b.stream !== null) {
      return b.stream.viewerCount - a.stream.viewerCount;
    }

    return a.displayName.localeCompare(b.displayName);
  });

  response.json(channels);
});

// Toggle favorite
router.post('/favorites/toggle/:id', async (request, response) => {
  const { id } = request.params;

  if (isFavorite(id)) {
    removeFavorite(id);
    response.json({ isFavorite: false });
    return;
  }

  // Get user info to add as favorite
  const usersResult = await getUsers({ ids: [id] });

  if (usersResult instanceof Error) {
    response.status(500).json({ error: usersResult.message });
    return;
  }

  if (usersResult.length === 0) {
    response.status(404).json({ error: 'User not found' });
    return;
  }

  const user = usersResult[0];
  const favorite: Favorite = {
    id: user.id,
    login: user.login,
    displayName: user.display_name,
    profileImage: user.profile_image_url,
  };

  addFavorite(favorite);
  response.json({ isFavorite: true });
});

// Add favorite by login
router.post('/favorites', async (request, response) => {
  const { login } = request.body as { login?: string };

  if (login === undefined || login.trim() === '') {
    response.status(400).json({ error: 'login required' });
    return;
  }

  const usersResult = await getUsers({ logins: [login.trim().toLowerCase()] });

  if (usersResult instanceof Error) {
    response.status(500).json({ error: usersResult.message });
    return;
  }

  if (usersResult.length === 0) {
    response.status(404).json({ error: 'Channel not found' });
    return;
  }

  const user = usersResult[0];

  if (isFavorite(user.id)) {
    response.status(400).json({ error: 'Already in favorites' });
    return;
  }

  const favorite: Favorite = {
    id: user.id,
    login: user.login,
    displayName: user.display_name,
    profileImage: user.profile_image_url,
  };

  addFavorite(favorite);
  response.json(favorite);
});

// Get users by login
router.get('/users', async (request, response) => {
  const login = request.query.login;

  if (typeof login !== 'string') {
    response.status(400).json({ error: 'login required' });
    return;
  }

  const usersResult = await getUsers({ logins: [login] });

  if (usersResult instanceof Error) {
    response.status(500).json({ error: usersResult.message });
    return;
  }

  response.json({ data: usersResult });
});

// Get videos by user ID
router.get('/videos', async (request, response) => {
  const userId = request.query.user_id;

  if (typeof userId !== 'string') {
    response.status(400).json({ error: 'user_id required' });
    return;
  }

  const videosResult = await getVideos(userId, 20);

  if (videosResult instanceof Error) {
    response.status(500).json({ error: videosResult.message });
    return;
  }

  response.json({ data: videosResult });
});

export { router as channelsRouter };

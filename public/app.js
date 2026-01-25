const liveSection = document.getElementById('live-section');
const authSection = document.getElementById('auth-section');
const liveStreams = document.getElementById('live-streams');
const noLive = document.getElementById('no-live');
const vodsList = document.getElementById('vods-list');
const vodsError = document.getElementById('vods-error');
const channelInput = document.getElementById('channel-input');
const searchVodsBtn = document.getElementById('search-vods-btn');
const loginBtn = document.getElementById('login-btn');
const refreshBtn = document.getElementById('refresh-btn');

// Check auth status and load streams
async function init() {
  const res = await fetch('/api/auth/status');
  const { authenticated } = await res.json();

  if (authenticated) {
    authSection.classList.add('hidden');
    liveSection.classList.remove('hidden');
    loadLiveStreams();
  } else {
    authSection.classList.remove('hidden');
    liveSection.classList.add('hidden');
  }
}

// Load followed live streams
async function loadLiveStreams() {
  liveStreams.innerHTML = '<p style="color:#adadb8">Loading...</p>';
  noLive.classList.add('hidden');

  try {
    const res = await fetch('/api/streams/followed');
    const data = await res.json();

    if (data.error) {
      liveStreams.innerHTML = `<p style="color:#eb0400">${data.error}</p>`;
      return;
    }

    if (!data.data || data.data.length === 0) {
      liveStreams.innerHTML = '';
      noLive.classList.remove('hidden');
      return;
    }

    liveStreams.innerHTML = data.data.map(stream => createStreamCard(stream)).join('');
  } catch (err) {
    liveStreams.innerHTML = `<p style="color:#eb0400">Failed to load streams</p>`;
  }
}

// Create stream card HTML
function createStreamCard(stream) {
  const thumbnail = stream.thumbnail_url
    .replace('{width}', '320')
    .replace('{height}', '180');

  return `
    <div class="stream-card">
      <img class="stream-thumbnail" src="${thumbnail}" alt="${stream.user_name}">
      <div class="stream-info">
        <div class="stream-title" title="${escapeHtml(stream.title)}">${escapeHtml(stream.title)}</div>
        <div class="stream-channel">${escapeHtml(stream.user_name)}</div>
        <div class="stream-game">${escapeHtml(stream.game_name)}</div>
        <div class="stream-viewers">${formatViewers(stream.viewer_count)} viewers</div>
        <button class="watch-btn" onclick="watchLive('${stream.user_login}')">Watch in VLC</button>
      </div>
    </div>
  `;
}

// Create VOD card HTML
function createVodCard(vod) {
  const thumbnail = vod.thumbnail_url
    .replace('%{width}', '320')
    .replace('%{height}', '180');

  return `
    <div class="stream-card">
      <img class="stream-thumbnail" src="${thumbnail}" alt="${vod.title}">
      <div class="stream-info">
        <div class="stream-title" title="${escapeHtml(vod.title)}">${escapeHtml(vod.title)}</div>
        <div class="stream-channel">${escapeHtml(vod.user_name)}</div>
        <div class="stream-duration">${formatDuration(vod.duration)}</div>
        <button class="watch-btn" onclick="watchVod('${vod.id}')">Watch in VLC</button>
      </div>
    </div>
  `;
}

// Search for VODs
async function searchVods() {
  const channel = channelInput.value.trim();
  if (!channel) return;

  vodsList.innerHTML = '<p style="color:#adadb8">Loading...</p>';
  vodsError.classList.add('hidden');

  try {
    // Get user ID from username
    const userRes = await fetch(`/api/users?login=${encodeURIComponent(channel)}`);
    const userData = await userRes.json();

    if (!userData.data || userData.data.length === 0) {
      vodsList.innerHTML = '';
      vodsError.textContent = `Channel "${channel}" not found`;
      vodsError.classList.remove('hidden');
      return;
    }

    const userId = userData.data[0].id;

    // Get VODs
    const vodsRes = await fetch(`/api/videos?user_id=${userId}`);
    const vodsData = await vodsRes.json();

    if (!vodsData.data || vodsData.data.length === 0) {
      vodsList.innerHTML = '';
      vodsError.textContent = `No VODs found for ${channel}`;
      vodsError.classList.remove('hidden');
      return;
    }

    vodsList.innerHTML = vodsData.data.map(vod => createVodCard(vod)).join('');
  } catch (err) {
    vodsList.innerHTML = '';
    vodsError.textContent = 'Failed to load VODs';
    vodsError.classList.remove('hidden');
  }
}

// Watch live stream
async function watchLive(channel) {
  try {
    const res = await fetch(`/api/watch/live/${channel}`, { method: 'POST' });
    const data = await res.json();
    if (data.error) {
      alert('Failed to launch: ' + data.error);
    }
  } catch (err) {
    alert('Failed to launch stream');
  }
}

// Watch VOD
async function watchVod(id) {
  try {
    const res = await fetch(`/api/watch/vod/${id}`, { method: 'POST' });
    const data = await res.json();
    if (data.error) {
      alert('Failed to launch: ' + data.error);
    }
  } catch (err) {
    alert('Failed to launch VOD');
  }
}

// Login with Twitch
async function login() {
  const res = await fetch('/api/auth/url');
  const { url } = await res.json();
  window.location.href = url;
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatViewers(count) {
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

function formatDuration(duration) {
  // Duration comes as "1h2m3s" format
  const match = duration.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  const hours = match[1] || 0;
  const minutes = match[2] || 0;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Event listeners
loginBtn.addEventListener('click', login);
refreshBtn.addEventListener('click', () => {
  loadLiveStreams();
});
searchVodsBtn.addEventListener('click', searchVods);
channelInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchVods();
});

// Initialize
init();

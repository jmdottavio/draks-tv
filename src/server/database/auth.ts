import { db } from './schema';

interface AuthData {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
}

interface AuthRow {
  access_token: string | null;
  refresh_token: string | null;
  user_id: string | null;
}

function getAuth(): AuthData {
  const row = db.query<AuthRow, []>(
    'SELECT access_token, refresh_token, user_id FROM auth WHERE id = 1'
  ).get();

  if (row === null) {
    return { accessToken: null, refreshToken: null, userId: null };
  }

  return {
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    userId: row.user_id,
  };
}

function setAuth(accessToken: string, refreshToken: string, userId: string): void {
  db.run(
    'UPDATE auth SET access_token = ?, refresh_token = ?, user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
    [accessToken, refreshToken, userId]
  );
}

function clearAuth(): void {
  db.run(
    'UPDATE auth SET access_token = NULL, refresh_token = NULL, user_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = 1'
  );
}

export { getAuth, setAuth, clearAuth };
export type { AuthData };

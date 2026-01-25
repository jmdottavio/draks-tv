import { db } from './schema';

interface AuthData {
  accessToken: string | null;
  userId: string | null;
}

interface AuthRow {
  access_token: string | null;
  user_id: string | null;
}

function getAuth(): AuthData {
  const row = db.query<AuthRow, []>(
    'SELECT access_token, user_id FROM auth WHERE id = 1'
  ).get();

  if (row === null) {
    return { accessToken: null, userId: null };
  }

  return {
    accessToken: row.access_token,
    userId: row.user_id,
  };
}

function setAuth(accessToken: string, userId: string): void {
  db.run(
    'UPDATE auth SET access_token = ?, user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
    [accessToken, userId]
  );
}

function clearAuth(): void {
  db.run(
    'UPDATE auth SET access_token = NULL, user_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = 1'
  );
}

export { getAuth, setAuth, clearAuth };
export type { AuthData };

import { db } from './schema';

interface Favorite {
  id: string;
  login: string;
  displayName: string;
  profileImage: string;
}

interface FavoriteRow {
  twitch_id: string;
  login: string;
  display_name: string;
  profile_image: string;
}

function getAllFavorites(): Array<Favorite> {
  const rows = db.query<FavoriteRow, []>(
    'SELECT twitch_id, login, display_name, profile_image FROM favorites ORDER BY created_at'
  ).all();

  return rows.map((row) => ({
    id: row.twitch_id,
    login: row.login,
    displayName: row.display_name,
    profileImage: row.profile_image,
  }));
}

function addFavorite(favorite: Favorite): void {
  db.run(
    'INSERT INTO favorites (twitch_id, login, display_name, profile_image) VALUES (?, ?, ?, ?)',
    [favorite.id, favorite.login, favorite.displayName, favorite.profileImage]
  );
}

function removeFavorite(twitchId: string): boolean {
  const result = db.run('DELETE FROM favorites WHERE twitch_id = ?', [twitchId]);
  return result.changes > 0;
}

function isFavorite(twitchId: string): boolean {
  const row = db.query<{ count: number }, [string]>(
    'SELECT COUNT(*) as count FROM favorites WHERE twitch_id = ?'
  ).get(twitchId);

  return row !== null && row.count > 0;
}

export { getAllFavorites, addFavorite, removeFavorite, isFavorite };
export type { Favorite };

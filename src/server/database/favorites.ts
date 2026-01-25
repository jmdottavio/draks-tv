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
  sort_order: number;
}

function getAllFavorites(): Array<Favorite> {
  const rows = db.query<FavoriteRow, []>(
    'SELECT twitch_id, login, display_name, profile_image, sort_order FROM favorites ORDER BY sort_order ASC'
  ).all();

  return rows.map((row) => ({
    id: row.twitch_id,
    login: row.login,
    displayName: row.display_name,
    profileImage: row.profile_image,
  }));
}

function getNextSortOrder(): number {
  const result = db.query<{ max_order: number | null }, []>(
    'SELECT MAX(sort_order) as max_order FROM favorites'
  ).get();

  if (result === null || result.max_order === null) {
    return 0;
  }

  return result.max_order + 1;
}

function addFavorite(favorite: Favorite): void {
  const sortOrder = getNextSortOrder();
  db.run(
    'INSERT INTO favorites (twitch_id, login, display_name, profile_image, sort_order) VALUES (?, ?, ?, ?, ?)',
    [favorite.id, favorite.login, favorite.displayName, favorite.profileImage, sortOrder]
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

function reorderFavorites(orderedIds: Array<string>): void {
  const transaction = db.transaction(() => {
    for (let index = 0; index < orderedIds.length; index++) {
      db.run(
        'UPDATE favorites SET sort_order = ? WHERE twitch_id = ?',
        [index, orderedIds[index]]
      );
    }
  });

  transaction();
}

export { getAllFavorites, addFavorite, removeFavorite, isFavorite, reorderFavorites };
export type { Favorite };

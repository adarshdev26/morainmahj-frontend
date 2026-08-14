/** Shared tournament leaderboard logic — matches Leaderboard.jsx calculation. */

export const PLAYER_ID_KEYS = ['player1_id', 'player2_id', 'player3_id', 'player4_id'];
export const SCORE_KEYS = ['player1_scores', 'player2_scores', 'player3_scores', 'player4_scores'];

/**
 * Build a player_id → display name map from registration/player directory rows.
 * @param {Array<{ player_id?: string, player_name?: string, player_email?: string }>} players
 */
export function buildPlayerNameMap(players = []) {
  const map = {};
  for (const row of players) {
    if (!row?.player_id) continue;
    map[row.player_id] = row.player_name || row.player_email || 'Player';
  }
  return map;
}

/**
 * Compute ranked standings from verified scorecards (same algorithm as Leaderboard page).
 * @returns {{ rankings: Array<{ id, name, totalScore, roundScores }>, verifiedCount, totalCount }}
 */
export function computeTournamentRankings(scorecards = [], nameMap = {}) {
  const map = {};
  const verified = scorecards.filter((s) => s.status === 'verified');

  verified.forEach((sc) => {
    PLAYER_ID_KEYS.forEach((idKey, idx) => {
      const uid = sc[idKey];
      if (!uid) return;
      const roundTotal = (sc[SCORE_KEYS[idx]] || []).reduce(
        (s, v) => s + (typeof v === 'number' ? v : 0),
        0,
      );
      if (!map[uid]) {
        map[uid] = { id: uid, name: nameMap[uid] || 'Player', roundScores: {} };
      }
      // Last card per round wins (matches Leaderboard.jsx)
      map[uid].roundScores[sc.round_number] = roundTotal;
    });
  });

  Object.values(map).forEach((p) => {
    p.totalScore = Object.values(p.roundScores).reduce((s, v) => s + v, 0);
  });

  const rankings = Object.values(map).sort((a, b) => b.totalScore - a.totalScore);

  return {
    rankings,
    verifiedCount: verified.length,
    totalCount: scorecards.length,
  };
}

/** Return 1-based rank for a user, or 0 if not ranked. */
export function getPlayerRank(rankings, userId) {
  if (!userId || !rankings?.length) return 0;
  const idx = rankings.findIndex((p) => p.id === userId);
  return idx >= 0 ? idx + 1 : 0;
}

/** Resolve a display name for a player id using the name map. */
export function getPlayerDisplayName(nameMap, playerId, fallback = 'Unknown') {
  if (!playerId) return fallback;
  return nameMap[playerId] || fallback;
}

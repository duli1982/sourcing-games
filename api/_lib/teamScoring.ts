import type { TimeFilter } from '../../types.js';

export type TeamScoringConfig = {
  topN: number;
  minAttemptsPerMember: number;
};

export const DEFAULT_TEAM_SCORING_CONFIG: TeamScoringConfig = {
  topN: 5,
  minAttemptsPerMember: 3,
};

export const getWindowStart = (timeFilter: TimeFilter): number | null => {
  const now = Date.now();
  if (timeFilter === 'weekly') return now - 7 * 24 * 60 * 60 * 1000;
  if (timeFilter === 'monthly') return now - 30 * 24 * 60 * 60 * 1000;
  return null; // all-time
};

type AttemptLike = {
  gameId?: string;
  score?: number;
  ts?: string;
};

export const computeMemberScore = (
  attempts: AttemptLike[] | undefined,
  timeFilter: TimeFilter,
  config: TeamScoringConfig = DEFAULT_TEAM_SCORING_CONFIG
): { eligible: boolean; attemptsInWindow: number; score: number } => {
  const windowStart = getWindowStart(timeFilter);
  const safeAttempts = Array.isArray(attempts) ? attempts : [];

  const attemptsInWindow = safeAttempts.filter((a) => {
    if (!a?.ts) return false;
    if (windowStart === null) return true;
    const ts = new Date(a.ts).getTime();
    return Number.isFinite(ts) && ts >= windowStart;
  });

  if (attemptsInWindow.length < config.minAttemptsPerMember) {
    return { eligible: false, attemptsInWindow: attemptsInWindow.length, score: 0 };
  }

  const bestPerGame = new Map<string, number>();
  for (const a of attemptsInWindow) {
    const gameId = a.gameId || 'unknown';
    const score = typeof a.score === 'number' ? a.score : 0;
    const prev = bestPerGame.get(gameId);
    if (prev === undefined || score > prev) {
      bestPerGame.set(gameId, score);
    }
  }

  const total = Array.from(bestPerGame.values()).reduce((sum, s) => sum + s, 0);
  return { eligible: true, attemptsInWindow: attemptsInWindow.length, score: total };
};

export const computeTeamScore = (
  members: Array<{ playerId: string }>,
  playersById: Map<string, { progress?: any; score?: number }>,
  timeFilter: TimeFilter,
  config: TeamScoringConfig = DEFAULT_TEAM_SCORING_CONFIG
): { score: number; eligibleMembers: number } => {
  const memberScores: number[] = [];

  for (const m of members) {
    const p = playersById.get(m.playerId);
    const attempts = p?.progress?.attempts as AttemptLike[] | undefined;
    const result = computeMemberScore(attempts, timeFilter, config);
    if (result.eligible) memberScores.push(result.score);
  }

  memberScores.sort((a, b) => b - a);
  const top = memberScores.slice(0, config.topN);
  if (top.length === 0) return { score: 0, eligibleMembers: 0 };
  const avg = Math.round(top.reduce((sum, s) => sum + s, 0) / top.length);
  return { score: avg, eligibleMembers: top.length };
};


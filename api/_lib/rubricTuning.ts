import type { SupabaseClient } from '@supabase/supabase-js';

export const RUBRIC_TUNING_CONFIG = {
  minSamples: 15,
  stdDevRatioThreshold: 0.45,
  disagreementThreshold: 15,
  disagreementRateThreshold: 0.35,
};

export type RubricBreakdown = Record<string, { points: number; maxPoints: number; reasoning?: string }>;

export const logRubricCriteriaScores = async (
  supabase: SupabaseClient,
  payload: {
    attemptId: string;
    gameId: string;
    gameTitle: string;
    gameType: 'individual' | 'team';
    playerId: string;
    playerName?: string;
    score: number;
    aiScore?: number;
    validationScore?: number;
    rubricBreakdown: RubricBreakdown;
  }
) => {
  try {
    const rows = Object.entries(payload.rubricBreakdown).map(([criterion, value]) => ({
      attempt_id: payload.attemptId,
      player_id: payload.playerId,
      player_name: payload.playerName ?? null,
      game_id: payload.gameId,
      game_title: payload.gameTitle,
      game_type: payload.gameType,
      criterion,
      points: Number(value.points) || 0,
      max_points: Number(value.maxPoints) || 0,
      final_score: payload.score,
      ai_score: payload.aiScore ?? null,
      validation_score: payload.validationScore ?? null,
    }));

    if (rows.length === 0) return;

    const { error } = await supabase.from('rubric_criteria_scores').insert(rows);
    if (error) {
      if ((error as any)?.code === '42P01') {
        console.warn('rubric_criteria_scores table missing. Run supabase_rubric_tuning.sql.');
        return;
      }
      console.warn('Failed to log rubric criteria scores:', error);
    }
  } catch (err) {
    console.warn('Rubric criteria logging failed:', err);
  }
};

const computeStats = (values: number[]) => {
  if (values.length === 0) return { avg: 0, stdDev: 0 };
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return { avg, stdDev: Math.sqrt(variance) };
};

export const analyzeRubricFlags = (
  rows: Array<{
    game_id: string;
    game_title: string;
    criterion: string;
    points: number;
    max_points: number;
    ai_score?: number | null;
    validation_score?: number | null;
  }>
) => {
  const grouped = new Map<string, typeof rows>();
  rows.forEach(row => {
    const key = `${row.game_id}::${row.criterion}`;
    const list = grouped.get(key) || [];
    list.push(row);
    grouped.set(key, list);
  });

  const flags: Array<{
    gameId: string;
    gameTitle: string;
    criterion: string;
    sampleSize: number;
    avgPoints: number;
    stdDev: number;
    stdDevRatio: number;
    disagreementRate: number;
    reason: string;
  }> = [];

  grouped.forEach((list, key) => {
    const [gameId, criterion] = key.split('::');
    const points = list.map(r => Number(r.points) || 0);
    const maxPoints = Math.max(...list.map(r => Number(r.max_points) || 0));
    const { avg, stdDev } = computeStats(points);
    const stdDevRatio = maxPoints > 0 ? stdDev / maxPoints : 0;

    const disagreements = list.filter(r => {
      if (r.ai_score == null || r.validation_score == null) return false;
      return Math.abs(r.ai_score - r.validation_score) >= RUBRIC_TUNING_CONFIG.disagreementThreshold;
    });
    const disagreementRate = list.length > 0 ? disagreements.length / list.length : 0;

    if (
      list.length >= RUBRIC_TUNING_CONFIG.minSamples &&
      (stdDevRatio >= RUBRIC_TUNING_CONFIG.stdDevRatioThreshold ||
        disagreementRate >= RUBRIC_TUNING_CONFIG.disagreementRateThreshold)
    ) {
      const gameTitle = list[0]?.game_title || gameId;
      const reason = stdDevRatio >= RUBRIC_TUNING_CONFIG.stdDevRatioThreshold
        ? `High criteria variance (std dev ${stdDev.toFixed(1)} / ${maxPoints} max)`
        : `High AI vs validation disagreement (${Math.round(disagreementRate * 100)}%)`;

      flags.push({
        gameId,
        gameTitle,
        criterion,
        sampleSize: list.length,
        avgPoints: Math.round(avg * 10) / 10,
        stdDev: Math.round(stdDev * 10) / 10,
        stdDevRatio: Math.round(stdDevRatio * 100) / 100,
        disagreementRate: Math.round(disagreementRate * 100) / 100,
        reason,
      });
    }
  });

  return flags.sort((a, b) => b.stdDevRatio - a.stdDevRatio);
};

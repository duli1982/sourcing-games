import type { SupabaseClient } from '@supabase/supabase-js';

export const REVIEW_CONFIG = {
  minConfidence: 60,
  integrityRisks: new Set(['high']),
  gamingRisks: new Set(['high', 'critical']),
  gamingActions: new Set(['flag_review', 'reject']),
};

export type ReviewSignal = {
  confidence?: number | null;
  integrityRisk?: string | null;
  gamingRisk?: string | null;
  gamingAction?: string | null;
  integrityFlags?: string[];
  gamingFlags?: string[];
};

export const buildReviewReasons = (signal: ReviewSignal) => {
  const reasons: string[] = [];
  const confidence = typeof signal.confidence === 'number' ? signal.confidence : null;
  if (confidence !== null && confidence < REVIEW_CONFIG.minConfidence) {
    reasons.push(`Low confidence (${Math.round(confidence)}%)`);
  }

  if (signal.integrityRisk && REVIEW_CONFIG.integrityRisks.has(signal.integrityRisk)) {
    reasons.push(`Integrity risk: ${signal.integrityRisk}`);
  }

  if (signal.gamingRisk && REVIEW_CONFIG.gamingRisks.has(signal.gamingRisk)) {
    reasons.push(`Gaming risk: ${signal.gamingRisk}`);
  }

  if (signal.gamingAction && REVIEW_CONFIG.gamingActions.has(signal.gamingAction)) {
    reasons.push(`Recommended action: ${signal.gamingAction}`);
  }

  return {
    shouldReview: reasons.length > 0,
    reasons,
  };
};

export const enqueueReview = async (
  supabase: SupabaseClient,
  payload: {
    attemptId: string;
    playerId: string;
    playerName: string;
    gameId: string;
    gameTitle: string;
    gameType: 'individual' | 'team';
    score: number;
    confidence?: number | null;
    integrityRisk?: string | null;
    gamingRisk?: string | null;
    integrityFlags?: string[];
    gamingFlags?: string[];
    reasons: string[];
  }
) => {
  try {
    const { error } = await supabase
      .from('review_queue')
      .insert({
        attempt_id: payload.attemptId,
        player_id: payload.playerId,
        player_name: payload.playerName,
        game_id: payload.gameId,
        game_title: payload.gameTitle,
        game_type: payload.gameType,
        score: payload.score,
        confidence: payload.confidence ?? null,
        integrity_risk: payload.integrityRisk ?? null,
        gaming_risk: payload.gamingRisk ?? null,
        integrity_flags: payload.integrityFlags ?? [],
        gaming_flags: payload.gamingFlags ?? [],
        reasons: payload.reasons,
        status: 'pending',
      });

    if (error) {
      if ((error as any)?.code === '42P01') {
        console.warn('review_queue table missing. Run supabase_review_queue.sql.');
        return;
      }
      console.warn('Failed to enqueue review item:', error);
    }
  } catch (err) {
    console.warn('Review queue insert failed:', err);
  }
};

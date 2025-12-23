/**
 * Unified Admin API Endpoint
 * Consolidates all admin operations to reduce serverless function count
 *
 * POST /api/admin?action=login - Admin login
 * POST /api/admin?action=logout - Admin logout
 * GET /api/admin?action=analytics - Get analytics dashboard data
 * GET /api/admin?action=attempts&playerId=xxx&gameId=xxx - Get player attempts
 * GET /api/admin?action=games - Get game overrides
 * POST /api/admin?action=save-game - Save game override
 * GET /api/admin?action=players - Get all players
 * POST /api/admin?action=player-action - Perform player action (ban/unban/reset-score)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assertAdmin, getAdminSupabase, logAdminEvent } from './_lib/adminUtils.js';

const ADMIN_TOKEN = process.env.ADMIN_DASH_TOKEN;
const ONE_DAY = 60 * 60 * 24;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  try {
    // ==== AUTH ACTIONS (No admin check required for login) ====
    if (req.method === 'POST' && action === 'login') {
      if (!ADMIN_TOKEN) {
        return res.status(500).json({ error: 'Admin authentication is not configured on the server' });
      }

      const { token, actor } = req.body as { token?: string; actor?: string };

      if (!token) {
        return res.status(400).json({ error: 'Admin token is required' });
      }

      if (token !== ADMIN_TOKEN) {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }

      const secure = process.env.VERCEL_ENV === 'production' ? 'Secure; ' : '';
      const adminActorValue = actor || 'admin';

      res.setHeader('Set-Cookie', [
        `adminToken=${token}; Path=/; ${secure}HttpOnly; SameSite=Strict; Max-Age=${ONE_DAY}`,
        `adminActor=${adminActorValue}; Path=/; SameSite=Strict; Max-Age=${ONE_DAY}`
      ]);

      return res.status(200).json({ success: true, actor: adminActorValue });
    }

    if (req.method === 'POST' && action === 'logout') {
      res.setHeader('Set-Cookie', [
        'adminToken=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
        'adminActor=; Path=/; SameSite=Strict; Max-Age=0'
      ]);

      return res.status(200).json({ success: true });
    }

    // ==== ALL OTHER ACTIONS REQUIRE ADMIN AUTH ====
    if (!assertAdmin(req, res)) return;

    const supabase = getAdminSupabase();

    // ==== GET ANALYTICS ====
    if (req.method === 'GET' && action === 'analytics') {
      const { data: players, error } = await supabase.from('players').select('id, name, score, status, progress, updated_at, created_at');
      if (error) {
        return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to fetch players', details: error.message } });
      }

      const now = Date.now();
      const daysAgo = (days: number) => now - days * 24 * 60 * 60 * 1000;
      const stats = {
        totalPlayers: players?.length || 0,
        active7d: 0,
        active30d: 0,
        attempts7d: 0,
        attempts30d: 0,
        repeatPlayers: 0,
        churned14d: 0,
        gameStats: {} as Record<string, { gameId: string; gameTitle: string; attempts: number; avgScore: number }>,
      };

      for (const player of players || []) {
        const attempts = player.progress?.attempts || [];
        if (attempts.length >= 2) stats.repeatPlayers += 1;
        const lastAttempt = attempts.length ? new Date(attempts[attempts.length - 1].ts).getTime() : null;
        if (lastAttempt && lastAttempt < daysAgo(14)) stats.churned14d += 1;

        let attempts7d = 0;
        let attempts30d = 0;
        attempts.forEach((a: any) => {
          const ts = new Date(a.ts).getTime();
          if (ts >= daysAgo(7)) {
            attempts7d += 1;
            stats.attempts7d += 1;
          }
          if (ts >= daysAgo(30)) {
            attempts30d += 1;
            stats.attempts30d += 1;
          }

          const gameId = a.gameId || 'unknown';
          const entry = stats.gameStats[gameId] || { gameId, gameTitle: a.gameTitle || gameId, attempts: 0, avgScore: 0 };
          entry.attempts += 1;
          entry.avgScore = entry.avgScore + (a.score - entry.avgScore) / entry.attempts;
          stats.gameStats[gameId] = entry;
        });

        if (attempts7d > 0) stats.active7d += 1;
        if (attempts30d > 0) stats.active30d += 1;
      }

      const gameList = Object.values(stats.gameStats).sort((a, b) => b.attempts - a.attempts);

      return res.status(200).json({
        totalPlayers: stats.totalPlayers,
        active7d: stats.active7d,
        active30d: stats.active30d,
        attempts7d: stats.attempts7d,
        attempts30d: stats.attempts30d,
        repeatPlayers: stats.repeatPlayers,
        churned14d: stats.churned14d,
        gameStats: gameList,
      });
    }

    // ==== GET ATTEMPTS ====
    if (req.method === 'GET' && action === 'attempts') {
      const { playerId, gameId, limit = '50', offset = '0' } = req.query as Record<string, string>;

      let query = supabase.from('players').select('id, name, progress');

      if (playerId) {
        query = query.eq('id', playerId);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to fetch attempts', details: error.message } });
      }

      const attempts: any[] = [];
      for (const row of data || []) {
        const playerAttempts = row.progress?.attempts || [];
        playerAttempts.forEach((attempt: any, idx: number) => {
          if (gameId && attempt.gameId !== gameId) return;
          attempts.push({
            attemptId: `${row.id}-${idx}`,
            playerId: row.id,
            playerName: row.name,
            gameId: attempt.gameId,
            gameTitle: attempt.gameTitle,
            submission: attempt.submission,
            score: attempt.score,
            ts: attempt.ts,
          });
        });
      }

      attempts.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      const start = parseInt(offset, 10) || 0;
      const end = start + (parseInt(limit, 10) || 50);

      return res.status(200).json({
        total: attempts.length,
        attempts: attempts.slice(start, end),
      });
    }

    // ==== GET GAME OVERRIDES ====
    if (req.method === 'GET' && action === 'games') {
      const { data, error } = await supabase.from('game_overrides').select('*');
      if (error?.code === '42P01') {
        return res.status(503).json({ error: { code: 'table_missing', message: 'game_overrides table not found. Run supabase_admin_setup.sql.' } });
      }
      if (error) {
        return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to load overrides', details: error.message } });
      }
      return res.status(200).json({ overrides: data || [] });
    }

    // ==== SAVE GAME OVERRIDE ====
    if ((req.method === 'POST' || req.method === 'PUT') && action === 'save-game') {
      const body = req.body as any;
      if (!body?.id) {
        return res.status(400).json({ error: { code: 'bad_request', message: 'id is required' } });
      }
      const payload = {
        id: body.id,
        title: body.title,
        description: body.description,
        task: body.task,
        prompt_template: body.prompt_template,
        rubric_json: body.rubric_json,
        featured: Boolean(body.featured),
        active: body.active !== false,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('game_overrides').upsert(payload, { onConflict: 'id' });
      if (error?.code === '42P01') {
        return res.status(503).json({ error: { code: 'table_missing', message: 'game_overrides table not found. Run supabase_admin_setup.sql.' } });
      }
      if (error) {
        return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to save override', details: error.message } });
      }
      await logAdminEvent('save-game-override', payload.id, payload, req);
      return res.status(200).json({ success: true });
    }

    // ==== GET PLAYERS ====
    if (req.method === 'GET' && action === 'players') {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, score, status, session_token, progress, updated_at')
        .order('updated_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to fetch players', details: error.message } });
      }

      const players = (data || []).map((row: any) => {
        const attempts = row.progress?.attempts || [];
        const lastAttemptAt = attempts.length ? attempts[attempts.length - 1].ts : null;
        return {
          id: row.id,
          name: row.name,
          score: row.score ?? 0,
          status: row.status ?? 'active',
          totalAttempts: attempts.length,
          lastAttemptAt,
        };
      });

      return res.status(200).json({ players });
    }

    // ==== PLAYER ACTION (ban/unban/reset-score) ====
    if (req.method === 'POST' && action === 'player-action') {
      const { playerId, action: playerAction } = (req.body ?? {}) as { playerId?: string; action?: 'ban' | 'unban' | 'reset-score' };
      if (!playerId || !playerAction) {
        return res.status(400).json({ error: { code: 'bad_request', message: 'playerId and action are required.' } });
      }

      const { data: playerRow, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (playerError || !playerRow) {
        return res.status(404).json({ error: { code: 'not_found', message: 'Player not found.' } });
      }

      if (playerAction === 'ban' || playerAction === 'unban') {
        const status = playerAction === 'ban' ? 'banned' : 'active';
        const { error: updateError } = await supabase
          .from('players')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', playerId);
        if (updateError) {
          return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to update player status', details: updateError.message } });
        }
        await logAdminEvent(playerAction, playerId, { status }, req);
        return res.status(200).json({ success: true, status });
      }

      if (playerAction === 'reset-score') {
        const { error: resetError } = await supabase
          .from('players')
          .update({
            score: 0,
            progress: { attempts: [], achievements: [], pinHash: playerRow.progress?.pinHash || null },
            updated_at: new Date().toISOString(),
          })
          .eq('id', playerId);
        if (resetError) {
          return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to reset player', details: resetError.message } });
        }
        await logAdminEvent('reset-score', playerId, null, req);
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: { code: 'unsupported_action', message: 'Unsupported action' } });
    }

    return res.status(400).json({ error: 'Invalid action parameter' });
  } catch (error: any) {
    console.error('Admin API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
}

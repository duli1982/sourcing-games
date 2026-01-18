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
 * GET /api/admin?action=teams - Get teams with members + activity summary
 * POST /api/admin?action=team-action - Perform team action (activate/deactivate/regenerate-invite/remove-member)
 * GET /api/admin?action=team-analytics - Get team analytics summary
 * GET /api/admin?action=rubric-flags - Get rubric tuning flags
 * GET /api/admin?action=game-versions&id=gameId - Get game override versions
 * POST /api/admin?action=rollback-game - Roll back to a previous game override version
 * GET /api/admin?action=review-queue&status=pending - Get review queue items
 * POST /api/admin?action=resolve-review - Resolve a review queue item
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assertAdmin, getAdminSupabase, getAdminActor, logAdminEvent } from './_lib/adminUtils.js';
import { generateInviteCode } from '../utils/teamUtils.js';
import { computeTeamScore } from './_lib/teamScoring.js';
import type { TimeFilter, Attempt, AdminAttempt } from '../types.js';
import { analyzeRubricFlags } from './_lib/rubricTuning.js';
import { logger } from './_lib/logger.js';

const ADMIN_TOKEN = process.env.ADMIN_DASH_TOKEN;
const ONE_DAY = 60 * 60 * 24;

type PlayerProgress = {
  attempts?: Attempt[];
};

type PlayerRow = {
  id: string;
  name: string;
  score?: number | null;
  status?: string | null;
  progress?: PlayerProgress;
  updated_at?: string | null;
  created_at?: string | null;
};

type TeamRow = {
  id: string;
  name: string;
  description?: string | null;
  invite_code?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  member_count?: number | null;
  max_members?: number | null;
  is_active?: boolean | null;
};

type TeamMemberRow = {
  id: string;
  team_id: string;
  player_id: string;
  player_name: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
};

type TeamAttemptRow = {
  team_id: string;
  score?: number | null;
  skill?: string | null;
  submitted_by?: string | null;
  submitted_by_name?: string | null;
  ts?: string | null;
};

type GameOverridePayload = {
  id?: string;
  title?: string;
  description?: string;
  task?: string;
  prompt_template?: string;
  rubric_json?: unknown;
  featured?: boolean;
  active?: boolean;
};

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
    const normalizeInviteCode = (code: string) => code.replace(/-/g, '').toUpperCase();
    const timeFilter = (req.query.timeFilter as TimeFilter | undefined) || 'weekly';

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

      for (const player of (players || []) as PlayerRow[]) {
        const attempts = (player.progress?.attempts || []) as Attempt[];
        if (attempts.length >= 2) stats.repeatPlayers += 1;
        const lastAttempt = attempts.length ? new Date(attempts[attempts.length - 1].ts).getTime() : null;
        if (lastAttempt && lastAttempt < daysAgo(14)) stats.churned14d += 1;

        let attempts7d = 0;
        let attempts30d = 0;
        attempts.forEach((a) => {
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

      const attempts: AdminAttempt[] = [];
      for (const row of (data || []) as PlayerRow[]) {
        const playerAttempts = (row.progress?.attempts || []) as Attempt[];
        playerAttempts.forEach((attempt, idx: number) => {
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
      const start = parseInt(offset, 10);
      const limitNum = parseInt(limit, 10);
      if (Number.isNaN(start) || start < 0) {
        return res.status(400).json({ error: { code: 'bad_request', message: 'offset must be a non-negative integer' } });
      }
      if (Number.isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
        return res.status(400).json({ error: { code: 'bad_request', message: 'limit must be an integer between 1 and 200' } });
      }
      const end = start + limitNum;

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
      const body = (req.body ?? {}) as GameOverridePayload;
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
      const { error: versionError } = await supabase.from('game_override_versions').insert({
        game_id: payload.id,
        title: payload.title,
        description: payload.description,
        task: payload.task,
        prompt_template: payload.prompt_template,
        rubric_json: payload.rubric_json,
        featured: payload.featured,
        active: payload.active,
        created_by: getAdminActor(req),
      });
      if (versionError && versionError.code !== '42P01') {
        logger.warn('Failed to record game override version:', versionError);
      }
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

      const players = ((data || []) as PlayerRow[]).map((row) => {
        const attempts = (row.progress?.attempts || []) as Attempt[];
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

    // ==== GET TEAMS ====
    if (req.method === 'GET' && action === 'teams') {
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, description, invite_code, created_by, created_at, updated_at, member_count, max_members, is_active')
        .order('created_at', { ascending: false });

      if (teamsError) {
        return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to fetch teams', details: teamsError.message } });
      }

      const teamIds = ((teams || []) as TeamRow[]).map((t) => t.id);
      const { data: members, error: membersError } = teamIds.length
        ? await supabase
          .from('team_members')
          .select('id, team_id, player_id, player_name, role, joined_at')
          .in('team_id', teamIds)
          .order('joined_at', { ascending: true })
        : { data: [], error: null };

      if (membersError) {
        return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to fetch team members', details: membersError.message } });
      }

      const playerIds = Array.from(new Set(((members || []) as TeamMemberRow[]).map((m) => m.player_id))).filter(Boolean);
      const { data: players, error: playersError } = playerIds.length
        ? await supabase
          .from('players')
          .select('id, score, progress, updated_at')
          .in('id', playerIds)
        : { data: [], error: null };

      if (playersError) {
        return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to fetch team player scores', details: playersError.message } });
      }

      const playerMap = new Map<string, PlayerRow>(((players || []) as PlayerRow[]).map((p) => [p.id, p]));
      const membersByTeam = new Map<string, TeamMemberRow[]>();

      for (const m of members || []) {
        const list = membersByTeam.get(m.team_id) || [];
        list.push(m);
        membersByTeam.set(m.team_id, list);
      }

      const result = ((teams || []) as TeamRow[]).map((t) => {
        const teamMembers = (membersByTeam.get(t.id) || []).map((m) => {
          const p = playerMap.get(m.player_id);
          const attempts = (p?.progress?.attempts || []) as Attempt[];
          return {
            id: m.id,
            teamId: m.team_id,
            playerId: m.player_id,
            playerName: m.player_name,
            role: m.role,
            joinedAt: m.joined_at,
            score: p?.score ?? 0,
            lastPlayerUpdatedAt: p?.updated_at ?? null,
            lastAttemptAt: attempts.length ? attempts[attempts.length - 1].ts : null,
          };
        });

        const memberRefs = teamMembers.map((m) => ({ playerId: m.playerId }));
        const { score: teamScore } = computeTeamScore(memberRefs, playerMap, timeFilter);

        const lastMemberJoinedAt = teamMembers.reduce((latest: string | null, m) => {
          if (!m.joinedAt) return latest;
          if (!latest) return m.joinedAt;
          return new Date(m.joinedAt).getTime() > new Date(latest).getTime() ? m.joinedAt : latest;
        }, null);

        const lastActivityAt = teamMembers.reduce((latest: string | null, m) => {
          const candidates = [m.lastAttemptAt, m.lastPlayerUpdatedAt].filter(Boolean) as string[];
          for (const c of candidates) {
            if (!latest) latest = c;
            else if (new Date(c).getTime() > new Date(latest).getTime()) latest = c;
          }
          return latest;
        }, t.updated_at ?? null);

        return {
          id: t.id,
          name: t.name,
          description: t.description,
          inviteCode: t.invite_code,
          createdBy: t.created_by,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          memberCount: t.member_count ?? teamMembers.length,
          maxMembers: t.max_members ?? 50,
          isActive: t.is_active ?? true,
          averageScore: teamScore,
          lastMemberJoinedAt,
          lastActivityAt,
          members: teamMembers.map(({ lastPlayerUpdatedAt, lastAttemptAt, ...rest }) => rest),
        };
      });

      return res.status(200).json({ teams: result });
    }

    // ==== TEAM ANALYTICS ====
    if (req.method === 'GET' && action === 'team-analytics') {
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, is_active, member_count, created_at');

      if (teamsError) {
        return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to fetch teams', details: teamsError.message } });
      }

      const teamIds = ((teams || []) as TeamRow[]).map((t) => t.id);
      const { data: members, error: membersError } = teamIds.length
        ? await supabase
          .from('team_members')
          .select('team_id, player_id, player_name, role, joined_at')
          .in('team_id', teamIds)
        : { data: [], error: null };

      if (membersError) {
        return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to fetch team members', details: membersError.message } });
      }

      const playerIds = Array.from(new Set(((members || []) as TeamMemberRow[]).map((m) => m.player_id))).filter(Boolean);
      const { data: players, error: playersError } = playerIds.length
        ? await supabase
          .from('players')
          .select('id, score, progress, updated_at')
          .in('id', playerIds)
        : { data: [], error: null };

      if (playersError) {
        return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to fetch player data', details: playersError.message } });
      }

      const { data: teamAttempts, error: teamAttemptsError } = teamIds.length
        ? await supabase
          .from('team_attempts')
          .select('team_id, score, skill, submitted_by, submitted_by_name, ts')
          .in('team_id', teamIds)
        : { data: [], error: null };

      if (teamAttemptsError && teamAttemptsError.code !== '42P01') {
        return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to fetch team attempts', details: teamAttemptsError.message } });
      }

      const playerMap = new Map<string, PlayerRow>(((players || []) as PlayerRow[]).map((p) => [p.id, p]));
      const membersByTeam = new Map<string, TeamMemberRow[]>();
      for (const m of (members || []) as TeamMemberRow[]) {
        const list = membersByTeam.get(m.team_id) || [];
        list.push(m);
        membersByTeam.set(m.team_id, list);
      }

      const attemptsByTeam = new Map<string, TeamAttemptRow[]>();
      for (const a of (teamAttempts || []) as TeamAttemptRow[]) {
        const list = attemptsByTeam.get(a.team_id) || [];
        list.push(a);
        attemptsByTeam.set(a.team_id, list);
      }

      const result = ((teams || []) as TeamRow[]).map((team) => {
        const teamMembers = membersByTeam.get(team.id) || [];
        const teamGameAttempts = attemptsByTeam.get(team.id) || [];

        const skillScores = new Map<string, number[]>();
        for (const attempt of teamGameAttempts) {
          if (!attempt.skill) continue;
          const list = skillScores.get(attempt.skill) || [];
          list.push(Number(attempt.score) || 0);
          skillScores.set(attempt.skill, list);
        }

        if (skillScores.size === 0) {
          for (const member of teamMembers) {
            const player = playerMap.get(member.player_id);
            const attempts = player?.progress?.attempts || [];
            (attempts as Attempt[]).forEach((a) => {
              if (!a.skill) return;
              const list = skillScores.get(a.skill) || [];
              list.push(Number(a.score) || 0);
              skillScores.set(a.skill, list);
            });
          }
        }

        const skillGaps = Array.from(skillScores.entries()).map(([skill, scores]) => {
          const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
          return {
            skill,
            avgScore: Math.round(avgScore),
            attempts: scores.length,
          };
        }).sort((a, b) => a.avgScore - b.avgScore);

        const memberContributions = teamMembers.map((member) => {
          const player = playerMap.get(member.player_id);
          const attempts = (player?.progress?.attempts || []) as Attempt[];
          const totalAttempts = attempts.length;
          const avgScore = totalAttempts > 0
            ? Math.round(attempts.reduce((sum: number, a) => sum + (a.score ?? 0), 0) / totalAttempts)
            : 0;
          const teamSubmissions = teamGameAttempts.filter(a => a.submitted_by === member.player_id).length;
          const lastAttemptAt = totalAttempts > 0 ? attempts[attempts.length - 1].ts : null;
          return {
            playerId: member.player_id,
            playerName: member.player_name,
            role: member.role,
            totalAttempts,
            avgScore,
            teamSubmissions,
            lastAttemptAt,
          };
        }).sort((a, b) => (b.teamSubmissions + b.totalAttempts) - (a.teamSubmissions + a.totalAttempts));

        const totalTeamSubmissions = teamGameAttempts.length;
        const avgTeamScore = totalTeamSubmissions > 0
          ? Math.round(teamGameAttempts.reduce((sum, a) => sum + (a.score ?? 0), 0) / totalTeamSubmissions)
          : 0;
        const lastTeamSubmissionAt = totalTeamSubmissions > 0
          ? teamGameAttempts
            .map(a => a.ts)
            .filter(Boolean)
            .sort()
            .slice(-1)[0]
          : null;
        const submitterCounts = new Map<string, number>();
        for (const attempt of teamGameAttempts) {
          if (!attempt.submitted_by) continue;
          submitterCounts.set(attempt.submitted_by, (submitterCounts.get(attempt.submitted_by) || 0) + 1);
        }
        const topSubmitter = Array.from(submitterCounts.entries())
          .sort((a, b) => b[1] - a[1])[0];
        const topSubmitterShare = topSubmitter && totalTeamSubmissions > 0
          ? Math.round((topSubmitter[1] / totalTeamSubmissions) * 100)
          : 0;

        return {
          teamId: team.id,
          teamName: team.name,
          isActive: team.is_active ?? true,
          memberCount: team.member_count ?? teamMembers.length,
          totalTeamSubmissions,
          avgTeamScore,
          lastTeamSubmissionAt,
          uniqueSubmitters: submitterCounts.size,
          topSubmitterShare,
          skillGaps,
          members: memberContributions,
        };
      });

      return res.status(200).json({ teams: result });
    }

    if (req.method === 'GET' && action === 'rubric-flags') {
      const limit = Math.min(parseInt((req.query.limit as string) || '2000', 10) || 2000, 10000);
      const { data, error } = await supabase
        .from('rubric_criteria_scores')
        .select('game_id, game_title, criterion, points, max_points, ai_score, validation_score')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error?.code === '42P01') {
        return res.status(503).json({ error: { code: 'table_missing', message: 'rubric_criteria_scores table not found. Run supabase_rubric_tuning.sql.' } });
      }
      if (error) {
        return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to load rubric criteria', details: error.message } });
      }

      type RubricScoreRow = {
        game_id: string;
        game_title?: string | null;
        criterion: string;
        points: number;
        max_points: number;
        ai_score: number | null;
        validation_score: number | null;
      };
      const rows = (data || []) as RubricScoreRow[];
      const normalized = rows.map(row => ({
        ...row,
        game_title: row.game_title ?? row.game_id,
      }));
      const flags = analyzeRubricFlags(normalized);
      return res.status(200).json({ flags });
    }

    if (req.method === 'GET' && action === 'game-versions') {
      const gameId = req.query.id as string | undefined;
      if (!gameId) {
        return res.status(400).json({ error: { code: 'bad_request', message: 'id is required.' } });
      }

      const { data, error } = await supabase
        .from('game_override_versions')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error?.code === '42P01') {
        return res.status(503).json({ error: { code: 'table_missing', message: 'game_override_versions table not found. Run supabase_game_versions.sql.' } });
      }
      if (error) {
        return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to load game versions', details: error.message } });
      }

      return res.status(200).json({ versions: data || [] });
    }

    if (req.method === 'POST' && action === 'rollback-game') {
      const body = (req.body ?? {}) as { versionId?: string };
      if (!body.versionId) {
        return res.status(400).json({ error: { code: 'bad_request', message: 'versionId is required.' } });
      }

      const { data: versionRow, error: versionError } = await supabase
        .from('game_override_versions')
        .select('*')
        .eq('id', body.versionId)
        .single();

      if (versionError?.code === '42P01') {
        return res.status(503).json({ error: { code: 'table_missing', message: 'game_override_versions table not found. Run supabase_game_versions.sql.' } });
      }
      if (versionError || !versionRow) {
        return res.status(404).json({ error: { code: 'not_found', message: 'Version not found.' } });
      }

      const payload = {
        id: versionRow.game_id,
        title: versionRow.title,
        description: versionRow.description,
        task: versionRow.task,
        prompt_template: versionRow.prompt_template,
        rubric_json: versionRow.rubric_json,
        featured: versionRow.featured,
        active: versionRow.active,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('game_overrides')
        .upsert(payload, { onConflict: 'id' });

      if (updateError) {
        return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to roll back game', details: updateError.message } });
      }

      await logAdminEvent('rollback-game', versionRow.game_id, { versionId: body.versionId }, req);
      return res.status(200).json({ success: true });
    }

    // ==== TEAM ACTIONS ====
    if (req.method === 'POST' && action === 'team-action') {
      const body = (req.body ?? {}) as {
        teamId?: string;
        action?: 'activate' | 'deactivate' | 'regenerate-invite' | 'remove-member';
        playerId?: string;
      };

      if (!body.teamId || !body.action) {
        return res.status(400).json({ error: { code: 'bad_request', message: 'teamId and action are required.' } });
      }

      const { data: teamRow, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', body.teamId)
        .single();

      if (teamError || !teamRow) {
        return res.status(404).json({ error: { code: 'not_found', message: 'Team not found.' } });
      }

      if (body.action === 'activate' || body.action === 'deactivate') {
        const isActive = body.action === 'activate';
        const { error: updateError } = await supabase
          .from('teams')
          .update({ is_active: isActive, updated_at: new Date().toISOString() })
          .eq('id', body.teamId);

        if (updateError) {
          return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to update team', details: updateError.message } });
        }

        await logAdminEvent(body.action, body.teamId, { isActive }, req);
        return res.status(200).json({ success: true, isActive });
      }

      if (body.action === 'regenerate-invite') {
        const newInvite = normalizeInviteCode(generateInviteCode());
        const { error: updateError } = await supabase
          .from('teams')
          .update({ invite_code: newInvite, updated_at: new Date().toISOString() })
          .eq('id', body.teamId);

        if (updateError) {
          return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to regenerate invite code', details: updateError.message } });
        }

        await logAdminEvent('regenerate-invite', body.teamId, null, req);
        return res.status(200).json({ success: true, inviteCode: newInvite });
      }

      if (body.action === 'remove-member') {
        if (!body.playerId) {
          return res.status(400).json({ error: { code: 'bad_request', message: 'playerId is required for remove-member.' } });
        }

        const { data: membership, error: membershipError } = await supabase
          .from('team_members')
          .select('id, role')
          .eq('team_id', body.teamId)
          .eq('player_id', body.playerId)
          .maybeSingle();

        if (membershipError || !membership) {
          return res.status(404).json({ error: { code: 'not_found', message: 'Member not found.' } });
        }

        if (membership.role === 'owner') {
          return res.status(400).json({ error: { code: 'bad_request', message: 'Cannot remove the team owner.' } });
        }

        const { error: deleteError } = await supabase
          .from('team_members')
          .delete()
          .eq('team_id', body.teamId)
          .eq('player_id', body.playerId);

        if (deleteError) {
          return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to remove member', details: deleteError.message } });
        }

        await logAdminEvent('remove-member', body.teamId, { playerId: body.playerId }, req);
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: { code: 'unsupported_action', message: 'Unsupported action' } });
    }

    // ==== REVIEW QUEUE ====
    if (req.method === 'GET' && action === 'review-queue') {
      const status = (req.query.status as string | undefined) || 'pending';
      const limit = Math.min(parseInt((req.query.limit as string) || '200', 10) || 200, 500);

      let query = supabase
        .from('review_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error?.code === '42P01') {
        return res.status(503).json({ error: { code: 'table_missing', message: 'review_queue table not found. Run supabase_review_queue.sql.' } });
      }
      if (error) {
        return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to load review queue', details: error.message } });
      }

      return res.status(200).json({ items: data || [] });
    }

    if (req.method === 'POST' && action === 'resolve-review') {
      const body = (req.body ?? {}) as {
        id?: string;
        status?: 'resolved' | 'dismissed';
        resolutionNotes?: string;
      };

      if (!body.id) {
        return res.status(400).json({ error: { code: 'bad_request', message: 'id is required.' } });
      }

      const status = body.status || 'resolved';
      const payload = {
        status,
        resolved_at: new Date().toISOString(),
        resolved_by: getAdminActor(req),
        resolution_notes: body.resolutionNotes || null,
      };

      const { error } = await supabase
        .from('review_queue')
        .update(payload)
        .eq('id', body.id);

      if (error?.code === '42P01') {
        return res.status(503).json({ error: { code: 'table_missing', message: 'review_queue table not found. Run supabase_review_queue.sql.' } });
      }
      if (error) {
        return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to resolve review item', details: error.message } });
      }

      await logAdminEvent('resolve-review', body.id, { status }, req);
      return res.status(200).json({ success: true });
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
  } catch (error: unknown) {
    logger.error('Admin API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: 'Internal server error', details: message });
  }
}

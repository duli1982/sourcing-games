import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getSessionTokenFromCookie } from './_lib/utils/cookieUtils.js';
import type { SkillCategory } from '../types.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSupabase = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase service credentials are not configured');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

const toCsvValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildSkillBreakdown = (attempts: any[]) => {
  const skillMap = new Map<string, number[]>();
  attempts.forEach((attempt) => {
    const skill = attempt.skill || 'unknown';
    const list = skillMap.get(skill) || [];
    list.push(Number(attempt.score) || 0);
    skillMap.set(skill, list);
  });

  return Array.from(skillMap.entries()).map(([skill, scores]) => {
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const bestScore = Math.max(...scores);
    return {
      skill: skill as SkillCategory | 'unknown',
      attempts: scores.length,
      avgScore: Math.round(avgScore),
      bestScore,
    };
  }).sort((a, b) => b.avgScore - a.avgScore);
};

const buildCertificateHtml = (payload: {
  playerName: string;
  totalPoints: number;
  totalGames: number;
  averageScore: number;
  bestScore: number;
  topSkills: string[];
  issuedOn: string;
}) => {
  const topSkillsText = payload.topSkills.length > 0
    ? payload.topSkills.join(', ')
    : 'General Sourcing';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sourcing League Certificate</title>
    <style>
      body {
        font-family: "Georgia", "Times New Roman", serif;
        background: #0f172a;
        color: #0f172a;
        margin: 0;
        padding: 24px;
      }
      .certificate {
        background: #f8fafc;
        border: 10px solid #0ea5e9;
        padding: 32px;
        max-width: 920px;
        margin: 0 auto;
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.2);
      }
      .title {
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 4px;
        font-size: 18px;
        color: #0ea5e9;
        margin-bottom: 16px;
      }
      .name {
        text-align: center;
        font-size: 36px;
        font-weight: bold;
        margin: 8px 0 16px;
      }
      .subtitle {
        text-align: center;
        font-size: 16px;
        color: #475569;
        margin-bottom: 32px;
      }
      .details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        margin-top: 24px;
      }
      .detail-card {
        border: 1px solid #e2e8f0;
        padding: 16px;
        border-radius: 8px;
        background: #ffffff;
      }
      .detail-card h4 {
        margin: 0 0 8px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #64748b;
      }
      .detail-card p {
        margin: 0;
        font-size: 18px;
        color: #0f172a;
      }
      .footer {
        margin-top: 32px;
        text-align: center;
        font-size: 12px;
        color: #64748b;
      }
    </style>
  </head>
  <body>
    <div class="certificate">
      <div class="title">Certificate of Achievement</div>
      <div class="name">${payload.playerName}</div>
      <div class="subtitle">
        Recognized for outstanding performance in the AI Sourcing League
      </div>
      <div class="details">
        <div class="detail-card">
          <h4>Total Points</h4>
          <p>${payload.totalPoints}</p>
        </div>
        <div class="detail-card">
          <h4>Games Completed</h4>
          <p>${payload.totalGames}</p>
        </div>
        <div class="detail-card">
          <h4>Average Score</h4>
          <p>${payload.averageScore}/100</p>
        </div>
        <div class="detail-card">
          <h4>Best Score</h4>
          <p>${payload.bestScore}/100</p>
        </div>
        <div class="detail-card">
          <h4>Top Skills</h4>
          <p>${topSkillsText}</p>
        </div>
        <div class="detail-card">
          <h4>Issued On</h4>
          <p>${payload.issuedOn}</p>
        </div>
      </div>
      <div class="footer">
        Verified by Sourcing League. This certificate is generated from in-app performance data.
      </div>
    </div>
  </body>
</html>`;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sessionToken = getSessionTokenFromCookie(req);
    if (!sessionToken) {
      return res.status(401).json({ error: 'No session found' });
    }

    const supabase = getSupabase();
    const { data: playerRow, error } = await supabase
      .from('players')
      .select('id, name, score, progress, created_at')
      .eq('session_token', sessionToken)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch player' });
    }
    if (!playerRow) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const attempts = playerRow.progress?.attempts || [];
    const totalGames = attempts.length;
    const totalPoints = playerRow.score ?? 0;
    const averageScore = totalGames > 0
      ? Math.round(attempts.reduce((sum: number, a: any) => sum + (a.score ?? 0), 0) / totalGames)
      : 0;
    const bestScore = totalGames > 0
      ? Math.max(...attempts.map((a: any) => a.score ?? 0))
      : 0;

    const skillBreakdown = buildSkillBreakdown(attempts);
    const topSkills = skillBreakdown.slice(0, 3).map(s => s.skill);

    const action = (req.query.action as string | undefined) || 'report';
    const format = (req.query.format as string | undefined) || 'json';
    const issuedOn = formatDate(new Date());

    if (action === 'certificate') {
      const html = buildCertificateHtml({
        playerName: playerRow.name,
        totalPoints,
        totalGames,
        averageScore,
        bestScore,
        topSkills,
        issuedOn,
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    if (format === 'csv') {
      const header = [
        'player_id',
        'player_name',
        'game_id',
        'game_title',
        'skill',
        'score',
        'submitted_at',
      ].join(',');

      const rows = attempts.map((attempt: any) => [
        toCsvValue(playerRow.id),
        toCsvValue(playerRow.name),
        toCsvValue(attempt.gameId),
        toCsvValue(attempt.gameTitle),
        toCsvValue(attempt.skill),
        toCsvValue(attempt.score),
        toCsvValue(attempt.ts),
      ].join(','));

      const csv = [header, ...rows].join('\n');
      const filename = `sourcing-report-${playerRow.name.replace(/\s+/g, '_')}-${issuedOn}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csv);
    }

    const report = {
      generatedAt: new Date().toISOString(),
      player: {
        id: playerRow.id,
        name: playerRow.name,
        joinedAt: playerRow.created_at,
        totalPoints,
      },
      stats: {
        totalGames,
        averageScore,
        bestScore,
      },
      skillBreakdown,
      attempts,
    };

    const filename = `sourcing-report-${playerRow.name.replace(/\s+/g, '_')}-${issuedOn}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).json(report);
  } catch (error) {
    console.error('export endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

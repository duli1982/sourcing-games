import { Player, Attempt, SkillCategory } from '../types';

export interface ProgressDataPoint {
  date: string;
  score: number;
  gameTitle: string;
  skill: SkillCategory;
}

export interface SkillProficiency {
  skill: string;
  skillKey: SkillCategory;
  avgScore: number;
  attempts: number;
  bestScore: number;
}

export interface ScoreComparison {
  range: string;
  yourCount: number;
  communityAvg: number;
}

export interface WeakSpot {
  skill: string;
  skillKey: SkillCategory;
  avgScore: number;
  attempts: number;
  recommendedGames: string[];
}

export type TimeFilterType = '7d' | '30d' | 'all';

/**
 * Skill category display names
 */
export const skillLabels: Record<SkillCategory, string> = {
  'boolean': 'Boolean Search',
  'xray': 'X-Ray Search',
  'persona': 'Candidate Profiling',
  'outreach': 'Outreach Messages',
  'linkedin': 'LinkedIn Sourcing',
  'diversity': 'Diversity Sourcing',
  'ats': 'ATS/CRM Usage',
  'screening': 'Resume Screening',
  'job-description': 'Job Descriptions',
  'ai-prompting': 'AI Prompting',
  'negotiation': 'Negotiation',
  'talent-intelligence': 'Talent Intelligence',
};

/**
 * Calculate progress over time
 * Groups attempts by day and returns progression data
 */
export function calculateProgressOverTime(
  player: Player,
  timeFilter: TimeFilterType = 'all'
): ProgressDataPoint[] {
  if (!player.attempts || player.attempts.length === 0) {
    return [];
  }

  const now = new Date();
  const cutoffDate = getCutoffDate(now, timeFilter);

  const filteredAttempts = player.attempts
    .filter((attempt) => {
      const attemptDate = new Date(attempt.ts);
      return attemptDate >= cutoffDate;
    })
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  return filteredAttempts.map((attempt) => ({
    date: new Date(attempt.ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    score: attempt.score,
    gameTitle: attempt.gameTitle,
    skill: attempt.skill || 'boolean',
  }));
}

/**
 * Calculate skill breakdown by category
 * Returns average score, attempts count, and best score per skill
 */
export function calculateSkillBreakdown(
  player: Player,
  timeFilter: TimeFilterType = 'all'
): SkillProficiency[] {
  if (!player.attempts || player.attempts.length === 0) {
    return [];
  }

  const now = new Date();
  const cutoffDate = getCutoffDate(now, timeFilter);

  const filteredAttempts = player.attempts.filter((attempt) => {
    const attemptDate = new Date(attempt.ts);
    return attemptDate >= cutoffDate;
  });

  // Group by skill
  const skillMap: Record<
    SkillCategory,
    { scores: number[]; gameIds: Set<string> }
  > = {} as any;

  filteredAttempts.forEach((attempt) => {
    const skill = attempt.skill || 'boolean';
    if (!skillMap[skill]) {
      skillMap[skill] = { scores: [], gameIds: new Set() };
    }
    skillMap[skill].scores.push(attempt.score);
    skillMap[skill].gameIds.add(attempt.gameId);
  });

  // Calculate stats for each skill
  const skillProficiencies: SkillProficiency[] = [];

  Object.entries(skillMap).forEach(([skillKey, data]) => {
    const avgScore =
      data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
    const bestScore = Math.max(...data.scores);

    skillProficiencies.push({
      skill: skillLabels[skillKey as SkillCategory] || skillKey,
      skillKey: skillKey as SkillCategory,
      avgScore: Math.round(avgScore),
      attempts: data.scores.length,
      bestScore,
    });
  });

  return skillProficiencies.sort((a, b) => b.avgScore - a.avgScore);
}

/**
 * Compare player's score distribution with community average
 * Returns bucketed score distribution
 */
export function compareWithAverage(
  player: Player,
  communityAverage: number = 65,
  timeFilter: TimeFilterType = 'all'
): ScoreComparison[] {
  if (!player.attempts || player.attempts.length === 0) {
    return [];
  }

  const now = new Date();
  const cutoffDate = getCutoffDate(now, timeFilter);

  const filteredAttempts = player.attempts.filter((attempt) => {
    const attemptDate = new Date(attempt.ts);
    return attemptDate >= cutoffDate;
  });

  // Score buckets
  const buckets = [
    { range: '0-20', min: 0, max: 20 },
    { range: '21-40', min: 21, max: 40 },
    { range: '41-60', min: 41, max: 60 },
    { range: '61-80', min: 61, max: 80 },
    { range: '81-100', min: 81, max: 100 },
  ];

  const distribution: ScoreComparison[] = buckets.map((bucket) => {
    const yourCount = filteredAttempts.filter(
      (attempt) => attempt.score >= bucket.min && attempt.score <= bucket.max
    ).length;

    // Simulated community distribution (bell curve centered on average)
    let communityAvg = 0;
    const bucketMid = (bucket.min + bucket.max) / 2;
    const distance = Math.abs(bucketMid - communityAverage);
    communityAvg = Math.max(0, 30 - distance / 3);

    return {
      range: bucket.range,
      yourCount,
      communityAvg: Math.round(communityAvg),
    };
  });

  return distribution;
}

/**
 * Identify weak spots and recommend games
 * Returns skills with below-average performance
 */
export function identifyWeakSpots(
  player: Player,
  allGames: { id: string; title: string; skillCategory: SkillCategory }[],
  threshold: number = 70
): WeakSpot[] {
  const skillBreakdown = calculateSkillBreakdown(player, 'all');

  if (skillBreakdown.length === 0) {
    return [];
  }

  // Find skills below threshold
  const weakSkills = skillBreakdown.filter(
    (skill) => skill.avgScore < threshold && skill.attempts >= 2
  );

  // Get game recommendations for each weak skill
  const weakSpots: WeakSpot[] = weakSkills.map((skill) => {
    const recommendedGames = allGames
      .filter((game) => game.skillCategory === skill.skillKey)
      .slice(0, 3)
      .map((game) => game.title);

    return {
      skill: skill.skill,
      skillKey: skill.skillKey,
      avgScore: skill.avgScore,
      attempts: skill.attempts,
      recommendedGames,
    };
  });

  return weakSpots.sort((a, b) => a.avgScore - b.avgScore);
}

/**
 * Calculate consecutive days played (streak)
 */
export function calculateStreak(player: Player): {
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string | null;
} {
  if (!player.attempts || player.attempts.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null };
  }

  // Get unique dates (YYYY-MM-DD format)
  const uniqueDates = Array.from(
    new Set(
      player.attempts.map((attempt) =>
        new Date(attempt.ts).toISOString().split('T')[0]
      )
    )
  ).sort();

  if (uniqueDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null };
  }

  const lastPlayedDate = uniqueDates[uniqueDates.length - 1];
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  // Calculate streaks
  for (let i = uniqueDates.length - 1; i > 0; i--) {
    const currentDate = new Date(uniqueDates[i]);
    const prevDate = new Date(uniqueDates[i - 1]);
    const diffDays = Math.round(
      (currentDate.getTime() - prevDate.getTime()) / 86400000
    );

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Calculate current streak
  if (lastPlayedDate === today || lastPlayedDate === yesterday) {
    currentStreak = 1;
    for (let i = uniqueDates.length - 1; i > 0; i--) {
      const currentDate = new Date(uniqueDates[i]);
      const prevDate = new Date(uniqueDates[i - 1]);
      const diffDays = Math.round(
        (currentDate.getTime() - prevDate.getTime()) / 86400000
      );

      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return { currentStreak, longestStreak, lastPlayedDate };
}

/**
 * Helper function to get cutoff date based on time filter
 */
function getCutoffDate(now: Date, timeFilter: TimeFilterType): Date {
  switch (timeFilter) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return new Date(0); // Beginning of time
  }
}

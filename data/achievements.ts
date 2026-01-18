import { AchievementDefinition, Player } from '../types';

/**
 * Comprehensive Achievement System
 * Includes game-specific, score-based, skill-based, performance, and special achievements
 */

// ===== SCORE MILESTONE ACHIEVEMENTS =====
const scoreMilestoneAchievements: AchievementDefinition[] = [
    {
        id: 'century_club',
        name: 'Century Club',
        description: 'Reach 100 total points',
        icon: '💯',
        category: 'score',
        checkUnlock: (player: Player) => player.score >= 100
    },
    {
        id: 'half_grand',
        name: 'Half Grand',
        description: 'Reach 500 total points',
        icon: '🏆',
        category: 'score',
        checkUnlock: (player: Player) => player.score >= 500
    },
    {
        id: 'grand_master',
        name: 'Grand Master',
        description: 'Reach 1000 total points',
        icon: '👑',
        category: 'score',
        checkUnlock: (player: Player) => player.score >= 1000
    },
    {
        id: 'elite_scorer',
        name: 'Elite Scorer',
        description: 'Reach 2500 total points',
        icon: '💎',
        category: 'score',
        checkUnlock: (player: Player) => player.score >= 2500
    },
    {
        id: 'legendary',
        name: 'Legendary',
        description: 'Reach 5000 total points',
        icon: '🌟',
        category: 'score',
        checkUnlock: (player: Player) => player.score >= 5000
    }
];

// ===== GAMES COMPLETED ACHIEVEMENTS =====
const gamesCompletedAchievements: AchievementDefinition[] = [
    {
        id: 'first_blood',
        name: 'First Blood',
        description: 'Complete your first game',
        icon: '🎯',
        category: 'games',
        checkUnlock: (player: Player) => (player.attempts?.length || 0) >= 1
    },
    {
        id: 'getting_started',
        name: 'Getting Started',
        description: 'Complete 5 games',
        icon: '🌱',
        category: 'games',
        checkUnlock: (player: Player) => (player.attempts?.length || 0) >= 5
    },
    {
        id: 'dedicated_learner',
        name: 'Dedicated Learner',
        description: 'Complete 10 games',
        icon: '📚',
        category: 'games',
        checkUnlock: (player: Player) => (player.attempts?.length || 0) >= 10
    },
    {
        id: 'sourcing_veteran',
        name: 'Sourcing Veteran',
        description: 'Complete 25 games',
        icon: '🎓',
        category: 'games',
        checkUnlock: (player: Player) => (player.attempts?.length || 0) >= 25
    },
    {
        id: 'sourcing_legend',
        name: 'Sourcing Legend',
        description: 'Complete 50 games',
        icon: '⭐',
        category: 'games',
        checkUnlock: (player: Player) => (player.attempts?.length || 0) >= 50
    },
    {
        id: 'completionist',
        name: 'Completionist',
        description: 'Complete all 52 games',
        icon: '🏅',
        category: 'games',
        checkUnlock: (player: Player) => {
            if (!player.attempts) return false;
            const uniqueGames = new Set(player.attempts.map(a => a.gameId));
            return uniqueGames.size >= 52;
        }
    }
];


// ===== STREAK ACHIEVEMENTS =====
const getStreakStats = (player: Player) => {
    const attempts = player.attempts || [];
    if (attempts.length === 0) {
        return { currentStreak: 0, longestStreak: 0 };
    }

    const uniqueDates = Array.from(
        new Set(
            attempts.map((attempt) =>
                new Date(attempt.ts).toISOString().split('T')[0]
            )
        )
    ).sort();

    if (uniqueDates.length === 0) {
        return { currentStreak: 0, longestStreak: 0 };
    }

    let longestStreak = 1;
    let tempStreak = 1;

    for (let i = uniqueDates.length - 1; i > 0; i--) {
        const currentDate = new Date(uniqueDates[i]);
        const prevDate = new Date(uniqueDates[i - 1]);
        const diffDays = Math.round(
            (currentDate.getTime() - prevDate.getTime()) / 86400000
        );

        if (diffDays === 1) {
            tempStreak += 1;
        } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
        }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    const lastPlayedDate = uniqueDates[uniqueDates.length - 1];
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let currentStreak = 0;
    if (lastPlayedDate === today || lastPlayedDate === yesterday) {
        currentStreak = 1;
        for (let i = uniqueDates.length - 1; i > 0; i--) {
            const currentDate = new Date(uniqueDates[i]);
            const prevDate = new Date(uniqueDates[i - 1]);
            const diffDays = Math.round(
                (currentDate.getTime() - prevDate.getTime()) / 86400000
            );
            if (diffDays === 1) {
                currentStreak += 1;
            } else {
                break;
            }
        }
    }

    return { currentStreak, longestStreak };
};

const streakAchievements: AchievementDefinition[] = [
    {
        id: 'streak_3',
        name: '3-Day Streak',
        description: 'Play games 3 days in a row',
        icon: '🔥',
        category: 'streak',
        checkUnlock: (player: Player) => getStreakStats(player).currentStreak >= 3
    },
    {
        id: 'streak_7',
        name: 'Week Warrior',
        description: 'Play games 7 days in a row',
        icon: '🏆',
        category: 'streak',
        checkUnlock: (player: Player) => getStreakStats(player).currentStreak >= 7
    },
    {
        id: 'streak_14',
        name: 'Fortnight Focus',
        description: 'Play games 14 days in a row',
        icon: '📆',
        category: 'streak',
        checkUnlock: (player: Player) => getStreakStats(player).currentStreak >= 14
    },
    {
        id: 'streak_30',
        name: 'Monthly Momentum',
        description: 'Play games 30 days in a row',
        icon: '🗓️',
        category: 'streak',
        checkUnlock: (player: Player) => getStreakStats(player).currentStreak >= 30
    },
    {
        id: 'streak_marathon',
        name: 'Streak Marathon',
        description: 'Reach a 30-day longest streak',
        icon: '🏅',
        category: 'streak',
        checkUnlock: (player: Player) => getStreakStats(player).longestStreak >= 30
    }
];

// ===== SKILL-BASED ACHIEVEMENTS =====
const skillBasedAchievements: AchievementDefinition[] = [
    {
        id: 'boolean_master',
        name: 'Boolean Master',
        description: 'Complete 5 Boolean search games',
        icon: '🔎',
        category: 'skill',
        checkUnlock: (player: Player) => {
            const booleanGames = player.attempts?.filter(a => a.skill === 'boolean') || [];
            return booleanGames.length >= 5;
        }
    },
    {
        id: 'xray_expert',
        name: 'X-Ray Expert',
        description: 'Complete 5 X-ray search games',
        icon: '🩻',
        category: 'skill',
        checkUnlock: (player: Player) => {
            const xrayGames = player.attempts?.filter(a => a.skill === 'xray') || [];
            return xrayGames.length >= 5;
        }
    },
    {
        id: 'persona_pro',
        name: 'Persona Pro',
        description: 'Complete 3 persona profiling games',
        icon: '🧑‍💼',
        category: 'skill',
        checkUnlock: (player: Player) => {
            const personaGames = player.attempts?.filter(a => a.skill === 'persona') || [];
            return personaGames.length >= 3;
        }
    },
    {
        id: 'outreach_wizard',
        name: 'Outreach Wizard',
        description: 'Complete 3 outreach games',
        icon: '✉️',
        category: 'skill',
        checkUnlock: (player: Player) => {
            const outreachGames = player.attempts?.filter(a => a.skill === 'outreach') || [];
            return outreachGames.length >= 3;
        }
    },
    {
        id: 'diversity_champion',
        name: 'Diversity Champion',
        description: 'Complete a diversity sourcing game',
        icon: '🌈',
        category: 'skill',
        checkUnlock: (player: Player) => {
            const diversityGames = player.attempts?.filter(a => a.skill === 'diversity') || [];
            return diversityGames.length >= 1;
        }
    },
    {
        id: 'linkedin_ninja',
        name: 'LinkedIn Ninja',
        description: 'Complete 3 LinkedIn sourcing games',
        icon: '🔗',
        category: 'skill',
        checkUnlock: (player: Player) => {
            const linkedinGames = player.attempts?.filter(a => a.skill === 'linkedin') || [];
            return linkedinGames.length >= 3;
        }
    },
    {
        id: 'well_rounded',
        name: 'Well Rounded',
        description: 'Complete at least one game from 5 different skill categories',
        icon: '🧩',
        category: 'skill',
        checkUnlock: (player: Player) => {
            if (!player.attempts) return false;
            const uniqueSkills = new Set(player.attempts.map(a => a.skill).filter(Boolean));
            return uniqueSkills.size >= 5;
        }
    },
    {
        id: 'skill_specialist',
        name: 'Skill Specialist',
        description: 'Average 80+ in any skill with 3+ attempts',
        icon: '🎓',
        category: 'skill',
        checkUnlock: (player: Player) => {
            const attempts = player.attempts || [];
            const skillScores = new Map<string, number[]>();
            attempts.forEach(a => {
                if (!a.skill) return;
                const list = skillScores.get(a.skill) || [];
                list.push(a.score);
                skillScores.set(a.skill, list);
            });

            for (const scores of skillScores.values()) {
                if (scores.length < 3) continue;
                const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
                if (avg >= 80) return true;
            }
            return false;
        }
    },
    {
        id: 'skill_elite',
        name: 'Skill Elite',
        description: 'Average 90+ in any skill with 5+ attempts',
        icon: '💎',
        category: 'skill',
        checkUnlock: (player: Player) => {
            const attempts = player.attempts || [];
            const skillScores = new Map<string, number[]>();
            attempts.forEach(a => {
                if (!a.skill) return;
                const list = skillScores.get(a.skill) || [];
                list.push(a.score);
                skillScores.set(a.skill, list);
            });

            for (const scores of skillScores.values()) {
                if (scores.length < 5) continue;
                const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
                if (avg >= 90) return true;
            }
            return false;
        }
    },
    {
        id: 'multi_skill_mastery',
        name: 'Multi-Skill Mastery',
        description: 'Average 75+ across 3 different skills (2+ attempts each)',
        icon: '🥇',
        category: 'skill',
        checkUnlock: (player: Player) => {
            const attempts = player.attempts || [];
            const skillScores = new Map<string, number[]>();
            attempts.forEach(a => {
                if (!a.skill) return;
                const list = skillScores.get(a.skill) || [];
                list.push(a.score);
                skillScores.set(a.skill, list);
            });

            let strongSkills = 0;
            for (const scores of skillScores.values()) {
                if (scores.length < 2) continue;
                const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
                if (avg >= 75) strongSkills += 1;
            }
            return strongSkills >= 3;
        }
    }
];

// ===== PERFORMANCE ACHIEVEMENTS =====
const performanceAchievements: AchievementDefinition[] = [
    {
        id: 'perfectionist',
        name: 'Perfectionist',
        description: 'Score 100/100 on any game',
        icon: '💯',
        category: 'special',
        checkUnlock: (player: Player) => {
            const perfectScores = player.attempts?.filter(a => a.score === 100) || [];
            return perfectScores.length >= 1;
        }
    },
    {
        id: 'high_achiever',
        name: 'High Achiever',
        description: 'Score 90+ on 5 different games',
        icon: '🌟',
        category: 'special',
        checkUnlock: (player: Player) => {
            const highScores = player.attempts?.filter(a => a.score >= 90) || [];
            return highScores.length >= 5;
        }
    },
    {
        id: 'consistent_performer',
        name: 'Consistent Performer',
        description: 'Score 80+ on 10 games in a row',
        icon: '📈',
        category: 'special',
        checkUnlock: (player: Player) => {
            if (!player.attempts || player.attempts.length < 10) return false;
            const sortedAttempts = [...player.attempts].sort((a, b) =>
                new Date(a.ts).getTime() - new Date(b.ts).getTime()
            );
            const last10 = sortedAttempts.slice(-10);
            return last10.every(a => a.score >= 80);
        }
    },
    {
        id: 'comeback_kid',
        name: 'Comeback Kid',
        description: 'Retry a game and score 20+ points higher',
        icon: '🔁',
        category: 'special',
        checkUnlock: (player: Player) => {
            if (!player.attempts) return false;
            const gameAttempts = new Map<string, number[]>();
            player.attempts.forEach(attempt => {
                if (!gameAttempts.has(attempt.gameId)) {
                    gameAttempts.set(attempt.gameId, []);
                }
                gameAttempts.get(attempt.gameId)!.push(attempt.score);
            });

            for (const scores of gameAttempts.values()) {
                if (scores.length < 2) continue;
                const minScore = Math.min(...scores);
                const maxScore = Math.max(...scores);
                if (maxScore - minScore >= 20) return true;
            }
            return false;
        }
    },
    {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Complete a game within the first day of joining',
        icon: '🌅',
        category: 'special',
        checkUnlock: (player: Player) => {
            if (!player.attempts || player.attempts.length === 0) return false;
            return player.attempts.length >= 1;
        }
    },
    {
        id: 'weekly_grinder',
        name: 'Weekly Grinder',
        description: 'Complete 5 games in the last 7 days',
        icon: '📆',
        category: 'special',
        checkUnlock: (player: Player) => {
            if (!player.attempts) return false;
            const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const recent = player.attempts.filter(a => new Date(a.ts).getTime() >= cutoff);
            return recent.length >= 5;
        }
    },
    {
        id: 'monthly_grinder',
        name: 'Monthly Grinder',
        description: 'Complete 15 games in the last 30 days',
        icon: '🗓️',
        category: 'special',
        checkUnlock: (player: Player) => {
            if (!player.attempts) return false;
            const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
            const recent = player.attempts.filter(a => new Date(a.ts).getTime() >= cutoff);
            return recent.length >= 15;
        }
    }
];

// ===== INDIVIDUAL GAME ACHIEVEMENTS =====
const gameIcons = [
    '🎯', '👤', '✉️', '🔍', '💼', '🌈', '📄', '✍️', '⚙️', '🔧',
    '🎓', '🚀', '💡', '🌟', '🏆', '⭐', '💎', '🔥', '⚡', '🌊',
    '🎨', '🎭', '🎪', '🎬', '🎮', '🎲', '🎰', '🎸', '🎹', '🎺',
    '🎻', '🎤', '🎧', '🎵', '🎶', '🎼', '🏅', '🥇', '🥈', '🥉',
    '🏁', '🎊', '🎉', '🎈', '🎀', '🎁', '🔑', '🌸', '🌺', '🌻',
    '🌷', '🌹'
];

const createGameAchievement = (gameNumber: number, icon: string): AchievementDefinition => {
    const gameId = `game${gameNumber}`;

    return {
        id: `completed_${gameId}`,
        name: `Game ${gameNumber} Master`,
        description: `Complete Game ${gameNumber} with a passing score (60+)`,
        icon: icon,
        category: 'games',
        checkUnlock: (player: Player) => {
            if (!player.attempts) return false;
            const gameAttempts = player.attempts.filter(a => a.gameId === gameId && a.score >= 60);
            return gameAttempts.length > 0;
        }
    };
};

const individualGameAchievements: AchievementDefinition[] = Array.from(
    { length: 52 },
    (_, i) => createGameAchievement(i + 1, gameIcons[i])
);

// ===== COMBINE ALL ACHIEVEMENTS =====
export const achievementDefinitions: AchievementDefinition[] = [
    ...scoreMilestoneAchievements,
    ...gamesCompletedAchievements,
    ...streakAchievements,
    ...skillBasedAchievements,
    ...performanceAchievements,
    ...individualGameAchievements
];

/**
 * Check which new achievements a player has unlocked
 * @param player The player to check
 * @returns Array of newly unlocked achievements
 */
export function checkNewAchievements(player: Player): AchievementDefinition[] {
    const currentAchievementIds = new Set(player.achievements?.map(a => a.id) || []);
    const newAchievements: AchievementDefinition[] = [];

    for (const achievement of achievementDefinitions) {
        if (!currentAchievementIds.has(achievement.id) && achievement.checkUnlock(player)) {
            newAchievements.push(achievement);
        }
    }

    return newAchievements;
}

/**
 * Get all achievements with their unlock status
 * @param player The player to check against
 * @returns Array of all achievements with unlock status
 */
export function getAllAchievementsWithStatus(player: Player): Array<AchievementDefinition & { unlocked: boolean; unlockedAt?: string }> {
    const unlockedMap = new Map(player.achievements?.map(a => [a.id, a.unlockedAt]) || []);

    return achievementDefinitions.map(achievement => ({
        ...achievement,
        unlocked: unlockedMap.has(achievement.id),
        unlockedAt: unlockedMap.get(achievement.id)
    }));
}

/**
 * Get achievements grouped by category with counts
 */
export function getAchievementsByCategory(player: Player) {
    const achievementsWithStatus = getAllAchievementsWithStatus(player);

    return {
        score: achievementsWithStatus.filter(a => a.category === 'score'),
        games: achievementsWithStatus.filter(a => a.category === 'games'),
        streak: achievementsWithStatus.filter(a => a.category === 'streak'),
        skill: achievementsWithStatus.filter(a => a.category === 'skill'),
        special: achievementsWithStatus.filter(a => a.category === 'special')
    };
}

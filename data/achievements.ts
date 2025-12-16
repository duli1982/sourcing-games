import { AchievementDefinition, Player } from '../types';

/**
 * Achievement Definitions - One Achievement Per Game
 * Each of the 52 games has its own unique achievement that can only be unlocked once.
 * Achievements unlock when a player completes the game with a score of 60+ (passing grade).
 */

const gameIcons = [
    '🎯', '👤', '✉️', '🔍', '💼', '🌈', '📄', '✍️', '⚙️', '🔧',
    '🎓', '🚀', '💡', '🌟', '🏆', '⭐', '💎', '🔥', '⚡', '🌊',
    '🎨', '🎭', '🎪', '🎬', '🎮', '🎲', '🎰', '🎸', '🎹', '🎺',
    '🎻', '🎤', '🎧', '🎵', '🎶', '🎼', '🏅', '🥇', '🥈', '🥉',
    '🏁', '🎊', '🎉', '🎈', '🎀', '🎁', '🔑', '🌸', '🌺', '🌻',
    '🌷', '🌹'
];

// Helper function to create achievement with proper closure
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

            // Check if player has completed this specific game with score >= 60
            const gameAttempts = player.attempts.filter(a => a.gameId === gameId && a.score >= 60);
            return gameAttempts.length > 0;
        }
    };
};

// Generate 52 achievements (one per game)
export const achievementDefinitions: AchievementDefinition[] = Array.from(
    { length: 52 },
    (_, i) => createGameAchievement(i + 1, gameIcons[i])
);

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

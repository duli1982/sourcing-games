import React from 'react';
import { Player } from '../types';
import { achievementDefinitions, getAllAchievementsWithStatus } from '../data/achievements';

interface AchievementsPanelProps {
    player: Player;
}

const AchievementsPanel: React.FC<AchievementsPanelProps> = ({ player }) => {
    const achievementsWithStatus = getAllAchievementsWithStatus(player);
    const unlockedAchievements = achievementsWithStatus.filter(a => a.unlocked);
    const unlockedIds = new Set(unlockedAchievements.map(a => a.id));

    // Group achievements by category
    const categories = {
        score: achievementsWithStatus.filter(a => a.category === 'score'),
        games: achievementsWithStatus.filter(a => a.category === 'games'),
        skill: achievementsWithStatus.filter(a => a.category === 'skill'),
        streak: achievementsWithStatus.filter(a => a.category === 'streak'),
        special: achievementsWithStatus.filter(a => a.category === 'special'),
    };

    const categoryLabels = {
        score: 'Score Milestones',
        games: 'Game Achievements',
        skill: 'Skill Mastery',
        streak: 'Streak Achievements',
        special: 'Special Achievements',
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'score': return '📊';
            case 'games': return '🎮';
            case 'skill': return '🎯';
            case 'streak': return '🔥';
            case 'special': return '⭐';
            default: return '🏆';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-cyan-400">Achievements</h3>
                <div className="text-gray-400">
                    <span className="font-bold text-white">{unlockedAchievements.length}</span>
                    <span> / {achievementDefinitions.length} Unlocked</span>
                    <span className="text-xs text-gray-500 ml-2">
                        ({achievementDefinitions.length - unlockedAchievements.length} locked)
                    </span>
                </div>
            </div>

            {Object.entries(categories).map(([categoryKey, achievements]) => {
                if (achievements.length === 0) return null;

                const categoryUnlocked = achievements.filter(a => unlockedIds.has(a.id)).length;

                return (
                    <div key={categoryKey} className="bg-gray-800 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                <span>{getCategoryIcon(categoryKey)}</span>
                                <span>{categoryLabels[categoryKey as keyof typeof categoryLabels]}</span>
                            </h4>
                            <span className="text-sm text-gray-400">
                                {categoryUnlocked} / {achievements.length}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {achievements.map(achievement => {
                                const isUnlocked = achievement.unlocked;

                                return (
                                    <div
                                        key={achievement.id}
                                        className={`p-4 rounded-lg border-2 transition-all ${
                                            isUnlocked
                                                ? 'bg-gray-700 border-cyan-600 shadow-lg'
                                                : 'bg-gray-900 border-gray-700 opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`text-3xl ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
                                                {achievement.icon}
                                            </div>
                                            <div className="flex-1">
                                                <h5 className={`font-bold ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                                                    {achievement.name}
                                                </h5>
                                                <p className={`text-xs mt-1 ${isUnlocked ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    {achievement.description}
                                                </p>
                                                {isUnlocked && achievement.unlockedAt && (
                                                    <p className="text-xs text-cyan-400 mt-2">
                                                        Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                                                    </p>
                                                )}
                                                {!isUnlocked && (
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        Locked — complete the requirement to unlock.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {unlockedAchievements.length === 0 && (
                <div className="bg-gray-800 rounded-lg p-8 text-center">
                    <p className="text-gray-400 text-lg">
                        🎯 Start playing games to unlock achievements!
                    </p>
                </div>
            )}
        </div>
    );
};

export default AchievementsPanel;

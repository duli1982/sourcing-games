import React, { useState, useMemo } from 'react';
import GameCard from '../components/GameCard';
import { games } from '../data/games';
import { Game, SkillCategory } from '../types';
import { useAppContext } from '../context/AppContext';

const getNextFriday = (): Date => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
    nextFriday.setHours(9, 0, 0, 0); // Set to 9 AM for clarity
    return nextFriday;
};

const GamesPage: React.FC = () => {
    const { player } = useAppContext();
    const [mode, setMode] = useState<'challenge' | 'practice'>('challenge');
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<SkillCategory | 'all'>('all');

    // Determine which game to show based on the week number
    // This creates a stable rotation that changes each week
    const startDate = new Date('2024-01-05T00:00:00Z'); // A known past Friday
    const now = new Date();
    const weeksPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const gameIndex = weeksPassed % games.length;
    const currentGame = games[gameIndex];

    const nextFriday = getNextFriday();
    const nextChallengeDate = nextFriday.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    // Determine which games are unlocked (played in Challenge mode)
    const unlockedGameIds = useMemo(() => {
        if (!player?.attempts) return new Set<number>();
        return new Set(player.attempts.map(attempt => attempt.gameId));
    }, [player?.attempts]);

    // Filter games by category
    const filteredGames = selectedCategory === 'all'
        ? games
        : games.filter(g => g.skillCategory === selectedCategory);

    // Separate unlocked and locked games
    const unlockedGames = filteredGames.filter(g => unlockedGameIds.has(g.id));
    const lockedGames = filteredGames.filter(g => !unlockedGameIds.has(g.id));

    // Get unique skill categories
    const skillCategories: SkillCategory[] = Array.from(new Set(games.map(g => g.skillCategory)));

    return (
        <div>
            {/* Mode Toggle */}
            <div className="mb-6 flex gap-2">
                <button
                    onClick={() => setMode('challenge')}
                    className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all ${
                        mode === 'challenge'
                            ? 'bg-cyan-600 text-white shadow-lg'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-650'
                    }`}
                >
                    🏆 Weekly Challenge
                </button>
                <button
                    onClick={() => {
                        setMode('practice');
                        setSelectedGame(null);
                    }}
                    className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all ${
                        mode === 'practice'
                            ? 'bg-cyan-600 text-white shadow-lg'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-650'
                    }`}
                >
                    🎯 Practice Mode
                </button>
            </div>

            {/* Challenge Mode */}
            {mode === 'challenge' && (
                <div>
                    <div className="mb-6 border-b border-gray-700 pb-4">
                        <h2 className="text-3xl font-bold text-cyan-400">This Week's Challenge</h2>
                        <p className="text-gray-400 mt-1">A new sourcing game unlocks every Friday. Good luck!</p>
                    </div>
                    <div className="space-y-8">
                        <GameCard key={currentGame.id} game={currentGame} mode="challenge" />
                    </div>
                    <div className="mt-8 text-center bg-gray-800 p-4 rounded-lg">
                        <p className="text-gray-300">The next challenge will be available on <span className="font-bold text-cyan-400">{nextChallengeDate}</span>.</p>
                    </div>
                </div>
            )}

            {/* Practice Mode */}
            {mode === 'practice' && (
                <div>
                    <div className="mb-6 border-b border-gray-700 pb-4">
                        <h2 className="text-3xl font-bold text-cyan-400">Practice Mode</h2>
                        <p className="text-gray-400 mt-1">Choose any game to practice your sourcing skills!</p>
                    </div>

                    {/* Category Filter */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-gray-400 mb-3">Filter by Skill Category:</h3>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                                    selectedCategory === 'all'
                                        ? 'bg-cyan-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-650'
                                }`}
                            >
                                All ({games.length})
                            </button>
                            {skillCategories.map(category => {
                                const count = games.filter(g => g.skillCategory === category).length;
                                return (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                                            selectedCategory === category
                                                ? 'bg-cyan-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-650'
                                        }`}
                                    >
                                        {category.charAt(0).toUpperCase() + category.slice(1)} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Game Selection or Game Card */}
                    {selectedGame ? (
                        <div>
                            <button
                                onClick={() => setSelectedGame(null)}
                                className="mb-4 text-purple-400 hover:text-purple-300 flex items-center gap-2"
                            >
                                ← Back to Game Selection
                            </button>
                            <GameCard key={selectedGame.id} game={selectedGame} mode="practice" />
                        </div>
                    ) : (
                        <div>
                            {/* Unlocked Games */}
                            {unlockedGames.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                                        <span>🔓</span>
                                        <span>Unlocked Games ({unlockedGames.length})</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {unlockedGames.map(game => {
                                            const difficultyConfig = {
                                                easy: { color: 'bg-green-600', text: 'Easy', icon: '⭐' },
                                                medium: { color: 'bg-yellow-600', text: 'Medium', icon: '⭐⭐' },
                                                hard: { color: 'bg-red-600', text: 'Hard', icon: '⭐⭐⭐' }
                                            };
                                            const difficulty = difficultyConfig[game.difficulty];

                                            return (
                                                <button
                                                    key={game.id}
                                                    onClick={() => setSelectedGame(game)}
                                                    className="bg-gray-800 hover:bg-gray-750 rounded-lg p-6 text-left transition-all hover:shadow-xl border-2 border-transparent hover:border-purple-600"
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <h3 className="text-lg font-bold flex-1 text-white">{game.title}</h3>
                                                        <span className={`${difficulty.color} text-white text-xs font-bold px-2 py-1 rounded-full`}>
                                                            {difficulty.icon}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-400 text-sm mb-3">{game.description}</p>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="bg-gray-700 text-purple-400 px-3 py-1 rounded-full font-semibold">
                                                            {game.skillCategory}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Locked Games */}
                            {lockedGames.length > 0 && (
                                <div>
                                    <h3 className="text-xl font-bold text-gray-500 mb-4 flex items-center gap-2">
                                        <span>🔒</span>
                                        <span>Locked Games ({lockedGames.length})</span>
                                    </h3>
                                    <p className="text-sm text-gray-400 mb-4">Complete these games in Weekly Challenge mode to unlock them for practice!</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {lockedGames.map(game => {
                                            const difficultyConfig = {
                                                easy: { color: 'bg-green-600', text: 'Easy', icon: '⭐' },
                                                medium: { color: 'bg-yellow-600', text: 'Medium', icon: '⭐⭐' },
                                                hard: { color: 'bg-red-600', text: 'Hard', icon: '⭐⭐⭐' }
                                            };
                                            const difficulty = difficultyConfig[game.difficulty];

                                            return (
                                                <div
                                                    key={game.id}
                                                    className="bg-gray-900 rounded-lg p-6 opacity-50 cursor-not-allowed border-2 border-gray-700"
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <h3 className="text-lg font-bold flex-1 text-gray-400">{game.title}</h3>
                                                        <span className={`${difficulty.color} text-white text-xs font-bold px-2 py-1 rounded-full`}>
                                                            {difficulty.icon}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-600 text-sm mb-3">Play this in Weekly Challenge to unlock</p>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="bg-gray-800 text-gray-500 px-3 py-1 rounded-full font-semibold">
                                                            {game.skillCategory}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Empty state if no games match filter */}
                            {unlockedGames.length === 0 && lockedGames.length === 0 && (
                                <div className="text-center py-12 text-gray-400">
                                    <p>No games found in this category.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GamesPage;
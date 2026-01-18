import React, { useEffect, useState } from 'react';
import GameCard from '../components/GameCard';
import { Spinner } from '../components/Spinner';
import { games as baseGames } from '../data/games';
import { Game, SkillCategory } from '../types';
import { fetchGames } from '../services/gameService';
import { usePlayerContext } from '../context/PlayerContext';


const getNextFriday = (): Date => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
    nextFriday.setUTCHours(0, 0, 0, 0); // 00:00 UTC = Midnight UTC (Thursday evening in US, Friday morning in EU)
    return nextFriday;
};

const GamesPage: React.FC = () => {
    const { player } = usePlayerContext();
    const [mode, setMode] = useState<'challenge' | 'practice'>('challenge');
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<SkillCategory | 'all'>('all');
    const [games, setGames] = useState<Game[]>(baseGames);
    const [isLoadingGames, setIsLoadingGames] = useState(true);

    // Helper function to check if a game has been completed
    const getGameAttempt = (gameId: string) => {
        if (!player?.attempts) return null;
        return player.attempts.find(a => a.gameId === gameId);
    };

    useEffect(() => {
        let isMounted = true;
        setIsLoadingGames(true);
        fetchGames()
            .then((data) => {
                if (isMounted) setGames(data);
            })
            .catch(() => {
                if (isMounted) setGames(baseGames);
            })
            .finally(() => {
                if (isMounted) setIsLoadingGames(false);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    // Determine which game to show based on the week number
    // This creates a stable rotation that changes each week
    const startDate = new Date('2026-01-02T00:00:00Z'); // First Friday of 2026
    const now = new Date();
    const weeksPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const gameIndex = games.length > 0 ? weeksPassed % games.length : 0;
    const currentGame = games.length > 0 ? games[gameIndex] : null;

    const nextFridayUtc = getNextFriday();

    const userLocale = typeof navigator !== 'undefined' && navigator.language
        ? navigator.language
        : 'en-US';

    const nextChallengeDate = nextFridayUtc.toLocaleDateString(userLocale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    const formatInTimezone = (date: Date, timeZone: string, label: string) => {
        const timeFormatter = new Intl.DateTimeFormat(userLocale, {
            hour: 'numeric',
            minute: '2-digit',
            timeZone,
            hour12: false
        });
        return `${timeFormatter.format(date)} ${label}`;
    };

    const timezoneDisplay = [
        formatInTimezone(nextFridayUtc, 'Europe/Berlin', 'CET'),
        formatInTimezone(nextFridayUtc, 'America/New_York', 'ET')
    ];

    // Filter games by category - ALL games are now unlocked for Practice Mode
    const filteredGames = selectedCategory === 'all'
        ? games
        : games.filter(g => g.skillCategory === selectedCategory);

    // All games are available in Practice Mode (no locks)
    const practiceGames = filteredGames;

    // Get unique skill categories
    const skillCategories: SkillCategory[] = Array.from(new Set(games.map(g => g.skillCategory)));

    return (
        <div>
            {/* Mode Toggle */}
            <div className="mb-6 flex gap-2">
                <button
                    onClick={() => setMode('challenge')}
                    className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all ${mode === 'challenge'
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
                    className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all ${mode === 'practice'
                        ? 'bg-cyan-600 text-white shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-650'
                        }`}
                >
                    🎯 Practice Mode
                </button>
            </div>

            {isLoadingGames && (
                <div className="bg-gray-800 rounded-lg p-6 mb-6 flex flex-col items-center">
                    <Spinner />
                    <p className="text-gray-400 mt-3">Loading games...</p>
                </div>
            )}

            {/* Challenge Mode */}
            {mode === 'challenge' && currentGame && (
                <div>
                    <div className="mb-6 border-b border-gray-700 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl font-bold text-cyan-400">This Week's Challenge</h2>
                                <p className="text-gray-400 mt-1">
                                    A new sourcing game unlocks every Friday. Next drop: <span className="font-semibold text-white">{nextChallengeDate}</span>
                                    <br />
                                    <span className="text-sm text-gray-500">
                                        {timezoneDisplay.join(' / ')}
                                    </span>
                                </p>
                            </div>
                            {(() => {
                                const attempt = getGameAttempt(currentGame.id);
                                return attempt && typeof attempt.score === 'number' && (
                                    <div className="bg-green-600 text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2">
                                        ✓ Completed: {attempt.score}/100
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                    <div className="space-y-8">
                        <GameCard key={currentGame.id} game={currentGame} mode="challenge" />
                    </div>
                    <div className="mt-8 text-center bg-gray-800 p-4 rounded-lg">
                        <p className="text-gray-300">The next challenge will be available on <span className="font-bold text-cyan-400">{nextChallengeDate}</span>.</p>
                    </div>
                </div>
            )}
            {mode === 'challenge' && !currentGame && (
                <div className="text-gray-400">No games available.</div>
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
                                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedCategory === 'all'
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
                                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedCategory === category
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
                            {/* All Games - Now Unlocked */}
                            {practiceGames.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                                        <span>🎯</span>
                                        <span>All Games ({practiceGames.length})</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {practiceGames.map(game => {
                                            const difficultyConfig = {
                                                easy: { color: 'bg-green-600', text: 'Easy', icon: '⭐' },
                                                medium: { color: 'bg-yellow-600', text: 'Medium', icon: '⭐⭐' },
                                                hard: { color: 'bg-red-600', text: 'Hard', icon: '⭐⭐⭐' }
                                            };
                                            const difficulty = difficultyConfig[game.difficulty];
                                            const attempt = getGameAttempt(game.id);
                                            const isCompleted = attempt !== null && attempt !== undefined && typeof attempt.score === 'number';

                                            return (
                                                <button
                                                    key={game.id}
                                                    onClick={() => setSelectedGame(game)}
                                                    className={`bg-gray-800 hover:bg-gray-750 rounded-lg p-6 text-left transition-all hover:shadow-xl border-2 ${
                                                        isCompleted
                                                            ? 'border-green-600 bg-opacity-90'
                                                            : 'border-transparent hover:border-purple-600'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <h3 className="text-lg font-bold flex-1 text-white">{game.title}</h3>
                                                        <div className="flex items-center gap-2">
                                                            {isCompleted && attempt && (
                                                                <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                                    ✓ {attempt.score}
                                                                </span>
                                                            )}
                                                            <span className={`${difficulty.color} text-white text-xs font-bold px-2 py-1 rounded-full`}>
                                                                {difficulty.icon}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {game.featured && (
                                                        <p className="text-xs text-cyan-400 font-semibold mb-2">Featured</p>
                                                    )}
                                                    {isCompleted && attempt && (
                                                        <p className="text-xs text-green-400 font-semibold mb-2">✓ Completed - Score: {attempt.score}/100</p>
                                                    )}
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

                            {/* Empty state if no games match filter */}
                            {practiceGames.length === 0 && (
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

import React, { useEffect, useState } from 'react';
import GameCard from '../components/GameCard';
import { Spinner } from '../components/Spinner';
import { teamGames } from '../data/teamGames';
import { Game, SkillCategory } from '../types';
import { useTeamContext } from '../context/TeamContext';

/**
 * Team Games Page - Bi-weekly rotation for team-based challenges
 *
 * Rotation Schedule:
 * - Games rotate every 2 weeks (bi-weekly)
 * - Period 1: 15th - End of month
 * - Period 2: 1st - 14th of next month
 * - 24 games total = 12 months of bi-weekly challenges
 */

const getNextRotation = (): Date => {
    const today = new Date();
    const day = today.getDate();
    const nextRotation = new Date(today);

    if (day < 15) {
        // Next rotation is the 15th
        nextRotation.setDate(15);
    } else {
        // Next rotation is the 1st of next month
        nextRotation.setMonth(today.getMonth() + 1);
        nextRotation.setDate(1);
    }

    nextRotation.setUTCHours(0, 0, 0, 0);
    return nextRotation;
};

const TeamGamesPage: React.FC = () => {
    const { currentTeam } = useTeamContext();
    const [mode, setMode] = useState<'challenge' | 'practice'>('challenge');
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<SkillCategory | 'all'>('all');
    const [teamAttempts, setTeamAttempts] = useState<any[]>([]);
    const [isLoadingTeamAttempts, setIsLoadingTeamAttempts] = useState(false);

    // Fetch team attempts when team changes
    useEffect(() => {
        const fetchTeamAttempts = async () => {
            if (!currentTeam) {
                setTeamAttempts([]);
                setIsLoadingTeamAttempts(false);
                return;
            }

            try {
                setIsLoadingTeamAttempts(true);
                const response = await fetch(`/api/team-games?action=attempts&teamId=${encodeURIComponent(currentTeam.id)}`, {
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    setTeamAttempts(data || []);
                }
            } catch (error) {
                console.error('Failed to fetch team attempts:', error);
            } finally {
                setIsLoadingTeamAttempts(false);
            }
        };

        fetchTeamAttempts();
    }, [currentTeam]);

    // Helper function to check if a team game has been completed
    const getTeamGameAttempt = (gameId: string) => {
        if (!teamAttempts || teamAttempts.length === 0) return null;
        return teamAttempts.find(a => a.gameId === gameId);
    };

    // Bi-weekly rotation logic
    // Start date: January 1, 2026 (first period)
    const startDate = new Date('2026-01-01T00:00:00Z');
    const now = new Date();

    // Calculate bi-weekly periods passed since start
    // Each period is ~15 days (either 1st-14th or 15th-end of month)
    const calculateBiWeeklyPeriod = () => {
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-indexed
        const day = now.getDate();

        // Calculate total bi-weekly periods from start year
        const yearsSinceStart = year - startDate.getFullYear();
        const periodsSinceStartOfYear = (month * 2) + (day >= 15 ? 1 : 0);
        const totalPeriods = (yearsSinceStart * 24) + periodsSinceStartOfYear;

        return totalPeriods;
    };

    const periodIndex = calculateBiWeeklyPeriod();
    const gameIndex = teamGames.length > 0 ? periodIndex % teamGames.length : 0;
    const currentGame = teamGames.length > 0 ? teamGames[gameIndex] : null;

    const nextRotationDate = getNextRotation();

    const userLocale = typeof navigator !== 'undefined' && navigator.language
        ? navigator.language
        : 'en-US';

    const nextRotationFormatted = nextRotationDate.toLocaleDateString(userLocale, {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
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
        formatInTimezone(nextRotationDate, 'Europe/Berlin', 'CET'),
        formatInTimezone(nextRotationDate, 'America/New_York', 'ET')
    ];

    // Filter games by category
    const filteredGames = selectedCategory === 'all'
        ? teamGames
        : teamGames.filter(g => g.skillCategory === selectedCategory);

    // All team games are available in Practice Mode (no locks)
    const practiceGames = filteredGames;

    // Get unique skill categories
    const skillCategories: SkillCategory[] = Array.from(new Set(teamGames.map(g => g.skillCategory)));

    return (
        <div>
            {/* Team Requirement Notice */}
            {!currentTeam && (
                <div className="mb-6 bg-yellow-900/30 border border-yellow-600 rounded-lg p-4">
                    <p className="text-yellow-200">
                        <span className="font-bold">👥 Team Required:</span> You need to be part of a team to submit team game challenges.
                        Join or create a team from the Teams page to participate!
                    </p>
                </div>
            )}

            {/* Mode Toggle */}
            <div className="mb-6 flex gap-2">
                <button
                    onClick={() => setMode('challenge')}
                    className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all ${mode === 'challenge'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-650'
                        }`}
                >
                    👥 Bi-Weekly Team Challenge
                </button>
                <button
                    onClick={() => {
                        setMode('practice');
                        setSelectedGame(null);
                    }}
                    className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all ${mode === 'practice'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-650'
                        }`}
                >
                    🎯 Team Practice Mode
                </button>
            </div>

            {currentTeam && isLoadingTeamAttempts && (
                <div className="bg-gray-800 rounded-lg p-4 mb-6 flex items-center justify-center gap-3">
                    <Spinner />
                    <p className="text-gray-400">Loading team attempts...</p>
                </div>
            )}

            {/* Challenge Mode */}
            {mode === 'challenge' && currentGame && (
                <div>
                    <div className="mb-6 border-b border-gray-700 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl font-bold text-purple-400">This Period's Team Challenge</h2>
                                <p className="text-gray-400 mt-1">
                                    A new team challenge unlocks every 2 weeks. Next rotation: <span className="font-semibold text-white">{nextRotationFormatted}</span>
                                    <br />
                                    <span className="text-sm text-gray-500">
                                        {timezoneDisplay.join(' / ')}
                                    </span>
                                </p>
                                <p className="text-sm text-purple-300 mt-2">
                                    ⚡ Rotation Schedule: 1st-14th and 15th-End of month
                                </p>
                            </div>
                            {(() => {
                                const attempt = getTeamGameAttempt(currentGame.id);
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
                        <p className="text-gray-300">The next team challenge will be available on <span className="font-bold text-purple-400">{nextRotationFormatted}</span>.</p>
                        <p className="text-sm text-gray-400 mt-2">
                            Team games require one submission per team. Scores are tracked separately from individual player scores.
                        </p>
                    </div>
                </div>
            )}
            {mode === 'challenge' && !currentGame && (
                <div className="text-gray-400">No team games available.</div>
            )}

            {/* Practice Mode */}
            {mode === 'practice' && (
                <div>
                    <div className="mb-6 border-b border-gray-700 pb-4">
                        <h2 className="text-3xl font-bold text-purple-400">Team Practice Mode</h2>
                        <p className="text-gray-400 mt-1">Choose any team game to practice your collaborative sourcing skills!</p>
                    </div>

                    {/* Category Filter */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-gray-400 mb-3">Filter by Skill Category:</h3>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedCategory === 'all'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-650'
                                    }`}
                            >
                                All ({teamGames.length})
                            </button>
                            {skillCategories.map(category => {
                                const count = teamGames.filter(g => g.skillCategory === category).length;
                                return (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedCategory === category
                                            ? 'bg-purple-600 text-white'
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
                            {/* All Team Games */}
                            {practiceGames.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                                        <span>👥</span>
                                        <span>All Team Games ({practiceGames.length})</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {practiceGames.map(game => {
                                            const difficultyConfig = {
                                                easy: { color: 'bg-green-600', text: 'Easy', icon: '⭐' },
                                                medium: { color: 'bg-yellow-600', text: 'Medium', icon: '⭐⭐' },
                                                hard: { color: 'bg-red-600', text: 'Hard', icon: '⭐⭐⭐' }
                                            };
                                            const difficulty = difficultyConfig[game.difficulty];
                                            const attempt = getTeamGameAttempt(game.id);
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
                                                        <p className="text-xs text-green-400 font-semibold mb-2">✓ Team Completed - Score: {attempt.score}/100</p>
                                                    )}
                                                    <p className="text-gray-400 text-sm mb-3">{game.description}</p>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="bg-gray-700 text-purple-400 px-3 py-1 rounded-full font-semibold">
                                                            {game.skillCategory}
                                                        </span>
                                                        <span className="bg-purple-900 text-purple-300 px-3 py-1 rounded-full font-semibold">
                                                            Team Game
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
                                    <p>No team games found in this category.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TeamGamesPage;

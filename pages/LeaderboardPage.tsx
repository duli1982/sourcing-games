
import React, { useState, useMemo } from 'react';
import { useLeaderboardContext } from '../context/LeaderboardContext';
import { usePlayerContext } from '../context/PlayerContext';
import { Spinner } from '../components/Spinner';
import { TimeFilter, Player } from '../types';

const LeaderboardPage: React.FC = () => {
    const { leaderboard, isLoadingLeaderboard } = useLeaderboardContext();
    const { player } = usePlayerContext();
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all-time');

    // Calculate filtered leaderboard based on time filter
    const filteredLeaderboard = useMemo(() => {
        if (timeFilter === 'all-time') {
            return leaderboard;
        }

        const now = new Date();
        let cutoffDate: Date;

        if (timeFilter === 'weekly') {
            cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else { // monthly
            cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Calculate scores based on attempts within timeframe
        const playersWithFilteredScores: Player[] = leaderboard
            .map(p => {
                const filteredAttempts = (p.attempts || []).filter(attempt => {
                    const attemptDate = new Date(attempt.ts);
                    return attemptDate >= cutoffDate;
                });

                const filteredScore = filteredAttempts.reduce((sum, attempt) => sum + attempt.score, 0);

                return {
                    ...p,
                    score: filteredScore,
                };
            })
            .filter(p => p.score > 0) // Only show players with score in this timeframe
            .sort((a, b) => b.score - a.score);

        return playersWithFilteredScores;
    }, [leaderboard, timeFilter]);

    return (
        <div>
            <h2 className="text-3xl font-bold text-cyan-400 mb-6">Leaderboard</h2>

            {/* Time Filter Buttons */}
            <div className="mb-6 flex gap-2">
                <button
                    onClick={() => setTimeFilter('all-time')}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all ${timeFilter === 'all-time'
                            ? 'bg-cyan-600 text-white shadow-lg'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-650'
                        }`}
                >
                    All Time
                </button>
                <button
                    onClick={() => setTimeFilter('weekly')}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all ${timeFilter === 'weekly'
                            ? 'bg-cyan-600 text-white shadow-lg'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-650'
                        }`}
                >
                    Weekly
                </button>
                <button
                    onClick={() => setTimeFilter('monthly')}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all ${timeFilter === 'monthly'
                            ? 'bg-cyan-600 text-white shadow-lg'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-650'
                        }`}
                >
                    Monthly
                </button>
            </div>

            <div className="bg-gray-800 rounded-lg p-8 shadow-xl overflow-x-auto">
                {isLoadingLeaderboard ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Spinner />
                        <p className="text-gray-400 mt-4">Loading leaderboard...</p>
                    </div>
                ) : (
                    <table className="w-full text-left min-w-[400px]">
                        <thead className="border-b-2 border-gray-600">
                            <tr>
                                <th className="p-3 text-lg">Rank</th>
                                <th className="p-3 text-lg">Name</th>
                                <th className="p-3 text-lg">Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeaderboard.length > 0 ? (
                                filteredLeaderboard.map((p, index) => {
                                    const isCurrentUser = p.name === player?.name;
                                    return (
                                        <tr key={index} className={`${isCurrentUser ? 'bg-cyan-900/50 font-bold' : 'border-b border-gray-700 hover:bg-gray-700/50'}`}>
                                            <td className="p-3">{index + 1}</td>
                                            <td className="p-3">{p.name} {isCurrentUser ? '(You)' : ''}</td>
                                            <td className="p-3">{p.score}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={3} className="p-6 text-center text-gray-400">
                                        {timeFilter === 'all-time'
                                            ? 'The leaderboard is still empty. Be the first to play a game and get on the board!'
                                            : `No scores recorded in the ${timeFilter === 'weekly' ? 'past week' : 'past month'}. Play some games to appear here!`
                                        }
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default LeaderboardPage;

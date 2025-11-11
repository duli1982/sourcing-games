
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Spinner } from '../components/Spinner';
import { TimeFilter, Player } from '../types';
import { fetchLeaderboard } from '../services/supabaseService';

const LeaderboardPage: React.FC = () => {
    const { player } = useAppContext();
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all-time');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [paginatedLeaderboard, setPaginatedLeaderboard] = useState<Player[]>([]);
    const [totalPlayers, setTotalPlayers] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const pageSize = 50;

    // Fetch paginated leaderboard data
    useEffect(() => {
        const loadPaginatedLeaderboard = async () => {
            setIsLoading(true);
            const { players, total } = await fetchLeaderboard(currentPage, pageSize);
            setPaginatedLeaderboard(players);
            setTotalPlayers(total);
            setIsLoading(false);
        };

        loadPaginatedLeaderboard();
    }, [currentPage, pageSize]);

    // Reset to page 1 when time filter changes
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
    }, [timeFilter]);

    // Calculate filtered leaderboard based on time filter
    const filteredLeaderboard = useMemo(() => {
        if (timeFilter === 'all-time') {
            return paginatedLeaderboard;
        }

        const now = new Date();
        let cutoffDate: Date;

        if (timeFilter === 'weekly') {
            cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else { // monthly
            cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Calculate scores based on attempts within timeframe
        const playersWithFilteredScores: Player[] = paginatedLeaderboard
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
    }, [paginatedLeaderboard, timeFilter]);

    const totalPages = Math.ceil(totalPlayers / pageSize);
    const startRank = (currentPage - 1) * pageSize + 1;

    return (
        <div>
            <h2 className="text-3xl font-bold text-cyan-400 mb-6">Leaderboard</h2>

            {/* Time Filter Buttons */}
            <div className="mb-6 flex gap-2">
                <button
                    onClick={() => setTimeFilter('all-time')}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                        timeFilter === 'all-time'
                            ? 'bg-cyan-600 text-white shadow-lg'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-650'
                    }`}
                >
                    All Time
                </button>
                <button
                    onClick={() => setTimeFilter('weekly')}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                        timeFilter === 'weekly'
                            ? 'bg-cyan-600 text-white shadow-lg'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-650'
                    }`}
                >
                    Weekly
                </button>
                <button
                    onClick={() => setTimeFilter('monthly')}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                        timeFilter === 'monthly'
                            ? 'bg-cyan-600 text-white shadow-lg'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-650'
                    }`}
                >
                    Monthly
                </button>
            </div>

            <div className="bg-gray-800 rounded-lg p-8 shadow-xl overflow-x-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Spinner />
                        <p className="text-gray-400 mt-4">Loading leaderboard...</p>
                    </div>
                ) : (
                    <>
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
                                        const rank = timeFilter === 'all-time' ? startRank + index : index + 1;
                                        return (
                                            <tr key={p.id || index} className={`${isCurrentUser ? 'bg-cyan-900/50 font-bold' : 'border-b border-gray-700 hover:bg-gray-700/50'}`}>
                                                <td className="p-3">{rank}</td>
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

                        {/* Pagination Controls */}
                        {timeFilter === 'all-time' && totalPages > 1 && (
                            <div className="mt-6 flex items-center justify-between">
                                <div className="text-gray-400 text-sm">
                                    Showing {startRank} - {Math.min(startRank + pageSize - 1, totalPlayers)} of {totalPlayers} players
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                            currentPage === 1
                                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                                : 'bg-cyan-600 text-white hover:bg-cyan-700'
                                        }`}
                                    >
                                        Previous
                                    </button>
                                    <div className="flex items-center gap-2">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum: number;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                                        currentPage === pageNum
                                                            ? 'bg-cyan-600 text-white shadow-lg'
                                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-650'
                                                    }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                            currentPage === totalPages
                                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                                : 'bg-cyan-600 text-white hover:bg-cyan-700'
                                        }`}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default LeaderboardPage;


import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLeaderboardContext } from '../context/LeaderboardContext';
import { usePlayerContext } from '../context/PlayerContext';
import { Spinner } from '../components/Spinner';
import { TimeFilter, Player } from '../types';

type LeaderboardTab = 'individual' | 'team-games';

interface TeamGameLeaderboardEntry {
    team_id: string;
    team_name: string;
    total_score: number;
    games_played: number;
    rank: number;
}

const LeaderboardPage: React.FC = () => {
    const { leaderboard, isLoadingLeaderboard } = useLeaderboardContext();
    const { player } = usePlayerContext();
    const [tab, setTab] = useState<LeaderboardTab>('individual');
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all-time');
    const [teamGameLeaderboard, setTeamGameLeaderboard] = useState<TeamGameLeaderboardEntry[]>([]);
    const [isLoadingTeamLeaderboard, setIsLoadingTeamLeaderboard] = useState(false);

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

    // Fetch team game leaderboard when switching to team games tab
    useEffect(() => {
        if (tab === 'team-games') {
            const fetchTeamGameLeaderboard = async () => {
                setIsLoadingTeamLeaderboard(true);
                try {
                    const response = await fetch('/api/team-games?action=leaderboard&limit=50', {
                        credentials: 'include',
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setTeamGameLeaderboard(data);
                    }
                } catch (error) {
                    console.error('Failed to fetch team game leaderboard:', error);
                } finally {
                    setIsLoadingTeamLeaderboard(false);
                }
            };
            fetchTeamGameLeaderboard();
        }
    }, [tab]);

    return (
        <div>
            <h2 className="text-3xl font-bold text-cyan-400 mb-6">Leaderboard</h2>

            {/* Tab Selector */}
            <div className="mb-6 flex gap-2">
                <button
                    onClick={() => setTab('individual')}
                    className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all ${tab === 'individual'
                        ? 'bg-cyan-600 text-white shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-650'
                        }`}
                >
                    Individual Games
                </button>
                <button
                    onClick={() => setTab('team-games')}
                    className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all ${tab === 'team-games'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-650'
                        }`}
                >
                    Team Games
                </button>
            </div>

            {/* Time Filter Buttons - Only show for individual games */}
            {tab === 'individual' && (
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
            )}

            {/* Individual Games Leaderboard */}
            {tab === 'individual' && (
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
                                            <td className="p-3">
                                                <Link
                                                    to={`/player/${encodeURIComponent(p.name)}`}
                                                    className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                                                >
                                                    {p.name}
                                                </Link>
                                                {isCurrentUser ? ' (You)' : ''}
                                            </td>
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
            )}

            {/* Team Games Leaderboard */}
            {tab === 'team-games' && (
                <div className="bg-gray-800 rounded-lg p-8 shadow-xl overflow-x-auto">
                    {isLoadingTeamLeaderboard ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Spinner />
                            <p className="text-gray-400 mt-4">Loading team game leaderboard...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left min-w-[500px]">
                            <thead className="border-b-2 border-gray-600">
                                <tr>
                                    <th className="p-3 text-lg">Rank</th>
                                    <th className="p-3 text-lg">Team Name</th>
                                    <th className="p-3 text-lg">Total Score</th>
                                    <th className="p-3 text-lg">Games Played</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamGameLeaderboard.length > 0 ? (
                                    teamGameLeaderboard.map((entry) => (
                                        <tr key={entry.team_id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="p-3">{entry.rank}</td>
                                            <td className="p-3">
                                                <Link
                                                    to={`/team/${entry.team_id}`}
                                                    className="text-purple-400 hover:text-purple-300 hover:underline transition-colors"
                                                >
                                                    {entry.team_name}
                                                </Link>
                                            </td>
                                            <td className="p-3">{entry.total_score}</td>
                                            <td className="p-3">{entry.games_played}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="p-6 text-center text-gray-400">
                                            No team game scores yet. Be the first team to play team games!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default LeaderboardPage;

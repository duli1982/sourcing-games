import React, { useMemo } from 'react';
import { AdminPlayer, AdminAttempt } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface PlayerDetailModalProps {
    player: AdminPlayer;
    attempts: AdminAttempt[];
    onClose: () => void;
    onAction: (playerId: string, action: 'ban' | 'unban' | 'reset_score') => void;
}

const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({ player, attempts, onClose, onAction }) => {
    // Filter attempts for this player and sort by date (oldest first for chart)
    const playerAttempts = useMemo(() => {
        return attempts
            .filter(a => a.playerId === player.id)
            .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
    }, [attempts, player.id]);

    // Calculate score progression for chart
    const chartData = useMemo(() => {
        let runningScore = 0;
        return playerAttempts.map((attempt, index) => {
            runningScore += attempt.score;
            return {
                attempt: index + 1,
                score: attempt.score,
                total: runningScore,
                game: attempt.gameTitle,
                date: new Date(attempt.ts).toLocaleDateString()
            };
        });
    }, [playerAttempts]);

    // Sort attempts newest first for the table
    const recentAttempts = [...playerAttempts].reverse();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex justify-between items-start p-6 border-b border-gray-700">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-white">{player.name}</h2>
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${player.status === 'active' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                                }`}>
                                {player.status}
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">ID: {player.id}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <p className="text-gray-400 text-xs uppercase">Total Score</p>
                            <p className="text-2xl font-bold text-cyan-400">{player.score}</p>
                        </div>
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <p className="text-gray-400 text-xs uppercase">Attempts</p>
                            <p className="text-2xl font-bold text-white">{player.totalAttempts}</p>
                        </div>
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <p className="text-gray-400 text-xs uppercase">Avg Score</p>
                            <p className="text-2xl font-bold text-purple-400">
                                {player.totalAttempts > 0 ? Math.round(player.score / player.totalAttempts) : 0}
                            </p>
                        </div>
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <p className="text-gray-400 text-xs uppercase">Last Active</p>
                            <p className="text-sm font-bold text-white mt-1">
                                {player.lastAttemptAt ? new Date(player.lastAttemptAt).toLocaleDateString() : 'Never'}
                            </p>
                        </div>
                    </div>

                    {/* Score Trend Chart */}
                    {chartData.length > 1 && (
                        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                            <h3 className="text-sm font-bold text-gray-400 mb-4">Score Progression</h3>
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <XAxis dataKey="attempt" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem' }}
                                            itemStyle={{ color: '#e5e7eb' }}
                                            labelStyle={{ color: '#9ca3af' }}
                                        />
                                        <Line type="monotone" dataKey="total" stroke="#22d3ee" strokeWidth={2} dot={{ fill: '#22d3ee' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Recent Attempts Table */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-3">Attempt History</h3>
                        <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                            <table className="w-full text-sm text-left text-gray-400">
                                <thead className="text-xs text-gray-400 uppercase bg-gray-800">
                                    <tr>
                                        <th className="px-4 py-3">Game</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3 text-right">Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentAttempts.length > 0 ? (
                                        recentAttempts.map((attempt) => (
                                            <tr key={attempt.attemptId} className="border-b border-gray-800 hover:bg-gray-800">
                                                <td className="px-4 py-3 font-medium text-white">{attempt.gameTitle}</td>
                                                <td className="px-4 py-3">{new Date(attempt.ts).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`font-bold ${attempt.score >= 80 ? 'text-green-400' :
                                                            attempt.score >= 50 ? 'text-yellow-400' : 'text-red-400'
                                                        }`}>
                                                        {attempt.score}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                                No attempts recorded yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                        <button
                            onClick={() => {
                                if (confirm('Are you sure you want to reset this player\'s score? This cannot be undone.')) {
                                    onAction(player.id, 'reset_score');
                                }
                            }}
                            className="px-4 py-2 bg-yellow-900 text-yellow-200 hover:bg-yellow-800 rounded transition"
                        >
                            Reset Score
                        </button>

                        {player.status === 'active' ? (
                            <button
                                onClick={() => {
                                    if (confirm('Ban this player? They will not be able to submit attempts.')) {
                                        onAction(player.id, 'ban');
                                    }
                                }}
                                className="px-4 py-2 bg-red-900 text-red-200 hover:bg-red-800 rounded transition"
                            >
                                Ban Player
                            </button>
                        ) : (
                            <button
                                onClick={() => onAction(player.id, 'unban')}
                                className="px-4 py-2 bg-green-900 text-green-200 hover:bg-green-800 rounded transition"
                            >
                                Unban Player
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerDetailModal;

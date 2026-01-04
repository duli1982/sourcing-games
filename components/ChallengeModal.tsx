import React, { useState } from 'react';
import { createChallenge } from '../services/supabaseService';
import { useChallenges } from '../context/ChallengeContext';
import { games } from '../data/games';

interface ChallengeModalProps {
    isOpen: boolean;
    onClose: () => void;
    challengedPlayerName: string;
    challengedPlayerId: string;
    onSuccess?: () => void;
}

const ChallengeModal: React.FC<ChallengeModalProps> = ({
    isOpen,
    onClose,
    challengedPlayerName,
    challengedPlayerId,
    onSuccess
}) => {
    const { refreshChallenges } = useChallenges();
    const [selectedGame, setSelectedGame] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedGame) {
            setError('Please select a game');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const game = games.find(g => g.id === selectedGame);
            if (!game) {
                throw new Error('Game not found');
            }

            await createChallenge({
                challenged_id: challengedPlayerId,
                game_id: game.id,
                game_title: game.title,
                message: message.trim() || undefined
            });

            // Refresh challenges list
            await refreshChallenges();

            // Reset form
            setSelectedGame('');
            setMessage('');

            if (onSuccess) {
                onSuccess();
            }

            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to send challenge');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setSelectedGame('');
            setMessage('');
            setError('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <svg
                                className="w-6 h-6 text-purple-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                />
                            </svg>
                            Challenge {challengedPlayerName}
                        </h2>
                        <button
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Game Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Select a Game *
                            </label>
                            <select
                                value={selectedGame}
                                onChange={(e) => setSelectedGame(e.target.value)}
                                disabled={isSubmitting}
                                className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                                required
                            >
                                <option value="">-- Choose a game --</option>
                                {games.map((game) => (
                                    <option key={game.id} value={game.id}>
                                        {game.title} ({game.skillCategory})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Optional Message */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Challenge Message (Optional)
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                disabled={isSubmitting}
                                placeholder="Think you can beat my score?"
                                maxLength={200}
                                rows={3}
                                className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 resize-none"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                {message.length}/200 characters
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-900 bg-opacity-50 border border-red-600 text-red-200 px-4 py-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        {/* Info Box */}
                        <div className="bg-purple-900 bg-opacity-30 border border-purple-600 rounded-lg p-4">
                            <p className="text-sm text-purple-200">
                                <strong>{challengedPlayerName}</strong> will receive your challenge and can accept or decline it.
                                Once accepted, you both play the game and the highest score wins!
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !selectedGame}
                                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Send Challenge
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChallengeModal;

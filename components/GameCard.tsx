
import React, { useState, useEffect, useMemo } from 'react';
import { getGeminiResponse } from '../services/geminiService';
import { useAppContext } from '../context/AppContext';
import { Game } from '../types';
import { Spinner } from './Spinner';

interface GameCardProps {
    game: Game;
    mode?: 'challenge' | 'practice';
}

const COOLDOWN_MS = 30000; // 30 seconds

const GameCard: React.FC<GameCardProps> = ({ game, mode = 'challenge' }) => {
    const { player, updateScore, addToast, addAttempt } = useAppContext();
    const [submission, setSubmission] = useState('');
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);
    const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

    // Calculate previous attempts for this specific game
    const gameAttempts = useMemo(() => {
        if (!player?.attempts) return [];
        return player.attempts.filter(a => a.gameId === game.id).sort((a, b) =>
            new Date(b.ts).getTime() - new Date(a.ts).getTime()
        );
    }, [player?.attempts, game.id]);

    const bestAttempt = useMemo(() => {
        if (gameAttempts.length === 0) return null;
        return gameAttempts.reduce((best, curr) => curr.score > best.score ? curr : best);
    }, [gameAttempts]);

    // Cooldown timer effect
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, COOLDOWN_MS - (now - lastSubmitTime));
            setCooldownRemaining(remaining);
        }, 100);

        return () => clearInterval(interval);
    }, [lastSubmitTime]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!submission.trim() || !player) return;

        // Practice mode: just save locally, no AI feedback
        if (mode === 'practice') {
            addToast('Saved to practice area!', 'success');
            return;
        }

        // Challenge mode: full AI feedback and scoring
        setIsLoading(true);
        setFeedback(null);

        try {
            const prompt = game.promptGenerator(submission);
            const responseText = await getGeminiResponse(prompt);

            if(responseText.startsWith("Error:")) {
                throw new Error(responseText);
            }

            const scoreMatch = responseText.match(/SCORE: (\d+)/);
            let score = 0;
            if (scoreMatch) {
                score = parseInt(scoreMatch[1], 10);
                updateScore(score);

                // Save attempt to history
                addAttempt({
                    gameId: game.id,
                    gameTitle: game.title,
                    submission: submission,
                    score: score,
                    skill: game.skillCategory,
                    ts: new Date().toISOString(),
                    feedback: responseText
                });

                addToast(`Score updated! +${score} points`, 'success');
            }

            const feedbackHtml = responseText
                .replace(/SCORE: \d+/g, `<h3>Your Score: <strong class="text-cyan-400">${score}/100</strong></h3>`)
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br />');

            setFeedback(feedbackHtml);
            setLastSubmitTime(Date.now());

        } catch (error) {
            const message = error instanceof Error ? error.message : "An unknown error occurred.";
            setFeedback(`<p class="text-red-400">${message}</p>`);
            addToast(message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRetry = () => {
        setSubmission('');
        setFeedback(null);
    };

    const isCooldownActive = cooldownRemaining > 0;
    const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);

    // Difficulty badge styling
    const difficultyConfig = {
        easy: { color: 'bg-green-600', text: 'Easy', icon: '⭐' },
        medium: { color: 'bg-yellow-600', text: 'Medium', icon: '⭐⭐' },
        hard: { color: 'bg-red-600', text: 'Hard', icon: '⭐⭐⭐' }
    };
    const difficulty = difficultyConfig[game.difficulty];

    return (
        <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
            <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-bold flex-1">{game.title}</h3>
                <span className={`${difficulty.color} text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1`}>
                    <span>{difficulty.icon}</span>
                    <span>{difficulty.text}</span>
                </span>
            </div>
            <p className="text-gray-400 mb-4">{game.description}</p>

            {/* Scoring Rules - Only show in Challenge Mode */}
            {mode === 'challenge' && (
                <div className="mb-4 p-4 bg-gray-900 rounded-md border border-gray-700">
                    <h4 className="text-sm font-bold text-cyan-400 mb-2">Scoring Rules</h4>
                    <ul className="text-xs text-gray-400 space-y-1">
                        <li>• You'll receive a score from 0-100 based on the quality of your submission</li>
                        <li>• Each submission adds to your total score on the leaderboard</li>
                        <li>• You can retry as many times as you want to improve your skills</li>
                        <li>• There's a 30-second cooldown between submissions</li>
                    </ul>
                </div>
            )}

            {/* Practice Mode Info */}
            {mode === 'practice' && (
                <div className="mb-4 p-4 bg-gray-900 rounded-md border border-purple-700">
                    <h4 className="text-sm font-bold text-purple-400 mb-2">🎯 Practice Mode</h4>
                    <ul className="text-xs text-gray-400 space-y-1">
                        <li>• This is a practice area - no AI feedback or scoring</li>
                        <li>• Use this space to draft and refine your answers</li>
                        <li>• Your work is saved locally for reference</li>
                        <li>• Play the Weekly Challenge to unlock more practice games!</li>
                    </ul>
                </div>
            )}

            {/* Previous Attempts Stats */}
            {gameAttempts.length > 0 && (
                <div className="mb-4 p-4 bg-gray-900 rounded-md border border-cyan-900">
                    <h4 className="text-sm font-bold text-cyan-400 mb-2">Your Progress on This Game</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <span className="text-gray-400">Total Attempts:</span>
                            <span className="ml-2 text-white font-bold">{gameAttempts.length}</span>
                        </div>
                        <div>
                            <span className="text-gray-400">Best Score:</span>
                            <span className="ml-2 text-cyan-400 font-bold">{bestAttempt?.score}/100</span>
                        </div>
                    </div>
                </div>
            )}

            {game.context && (
                 <div className="text-sm bg-gray-700 p-4 rounded-md mb-4 border-l-4 border-cyan-500" dangerouslySetInnerHTML={{ __html: game.context }}></div>
            )}
            <p className="text-gray-300 mb-6 font-semibold">{game.task}</p>

            <form onSubmit={handleSubmit}>
                <textarea
                    rows={4}
                    value={submission}
                    onChange={e => setSubmission(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder={game.placeholder}
                    aria-label={`Submission for ${game.title}`}
                ></textarea>
                <div className="flex gap-3 mt-4">
                    {mode === 'challenge' ? (
                        <>
                            <button
                                type="submit"
                                disabled={isLoading || isCooldownActive}
                                className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
                                aria-live="polite"
                            >
                                {isLoading ? 'Getting Feedback...' : isCooldownActive ? `Wait ${cooldownSeconds}s` : 'Submit & Get Feedback'}
                            </button>
                            {feedback && !isLoading && (
                                <button
                                    type="button"
                                    onClick={handleRetry}
                                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                                >
                                    Try Again
                                </button>
                            )}
                        </>
                    ) : (
                        <button
                            type="submit"
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                        >
                            💾 Save Draft
                        </button>
                    )}
                </div>
                {mode === 'challenge' && isCooldownActive && !isLoading && (
                    <p className="text-xs text-gray-400 mt-2">⏱️ Cooldown active. Please wait {cooldownSeconds} seconds before submitting again.</p>
                )}
            </form>

            {/* Only show AI feedback in Challenge Mode */}
            {mode === 'challenge' && (
                <div className="mt-6" aria-live="polite" aria-busy={isLoading}>
                    {isLoading && (
                        <div className="flex items-center mb-4">
                            <h4 className="text-2xl font-bold text-cyan-400">AI Coach Feedback</h4>
                            <Spinner />
                        </div>
                    )}
                    {feedback && (
                        <>
                            {!isLoading && <h4 className="text-2xl font-bold text-cyan-400 mb-4">AI Coach Feedback</h4>}
                            <div
                                className="bg-gray-700 p-6 rounded-lg prose prose-invert max-w-none text-gray-300"
                                dangerouslySetInnerHTML={{ __html: feedback }}
                            />
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default GameCard;



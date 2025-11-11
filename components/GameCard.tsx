
import React, { useState, useEffect, useMemo } from 'react';
import { getGeminiResponse } from '../services/geminiService';
import { useAppContext } from '../context/AppContext';
import { Game } from '../types';
import { Spinner } from './Spinner';
import { formatFeedback } from '../utils/feedbackFormatter';
import '../styles/feedback.css';

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
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showRubric, setShowRubric] = useState(false);

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

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!submission.trim() || !player) return;

        // Show confirmation modal before submitting
        setShowConfirmation(true);
    };

    const handleConfirmedSubmit = async () => {
        if (!submission.trim() || !player) return;

        // Validate player has an ID before submitting
        if (!player.id) {
            addToast('Your account is not properly set up. Please refresh the page and try again.', 'error');
            setShowConfirmation(false);
            return;
        }

        // Close confirmation modal
        setShowConfirmation(false);

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

            // Use the enhanced feedback formatter
            const feedbackHtml = formatFeedback(responseText, score);

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

    // Calculate word and character count for submission
    const wordCount = submission.trim().split(/\s+/).filter(word => word.length > 0).length;
    const charCount = submission.length;

    // Difficulty badge styling
    const difficultyConfig = {
        easy: { color: 'bg-green-600', text: 'Easy', icon: '⭐' },
        medium: { color: 'bg-yellow-600', text: 'Medium', icon: '⭐⭐' },
        hard: { color: 'bg-red-600', text: 'Hard', icon: '⭐⭐⭐' }
    };
    const difficulty = difficultyConfig[game.difficulty];

    // Scoring rubric based on difficulty
    const rubricByDifficulty = {
        easy: [
            { criteria: 'Relevant Keywords', points: 30, description: 'Includes key terms related to the role/skill' },
            { criteria: 'Basic Boolean Operators', points: 25, description: 'Uses AND, OR to combine search terms' },
            { criteria: 'Search Syntax', points: 25, description: 'Proper use of quotes, parentheses, or platform syntax' },
            { criteria: 'Completeness', points: 20, description: 'Addresses all requirements in the task description' }
        ],
        medium: [
            { criteria: 'Advanced Keywords', points: 25, description: 'Includes synonyms, variations, and related terms' },
            { criteria: 'Complex Boolean Logic', points: 30, description: 'Uses AND, OR, NOT with proper grouping/nesting' },
            { criteria: 'Platform-Specific Features', points: 25, description: 'Leverages advanced search operators (site:, intitle:, etc.)' },
            { criteria: 'Optimization & Precision', points: 20, description: 'Balanced between broad and specific, avoids noise' }
        ],
        hard: [
            { criteria: 'Expert Keyword Strategy', points: 25, description: 'Comprehensive terms including industry jargon, certifications' },
            { criteria: 'Sophisticated Boolean Logic', points: 30, description: 'Multi-level nesting, excludes false positives effectively' },
            { criteria: 'Advanced Search Techniques', points: 25, description: 'Uses proximity operators, wildcards, regex where applicable' },
            { criteria: 'Strategic Optimization', points: 20, description: 'Highly targeted, considers edge cases, minimal false positives' }
        ]
    };

    const currentRubric = rubricByDifficulty[game.difficulty];

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
                        <li>• Your work stays here until you clear it or navigate away</li>
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
            <p className="text-gray-300 mb-4 font-semibold">{game.task}</p>

            {/* Scoring Rubric - Collapsible */}
            {mode === 'challenge' && (
                <div className="mb-6">
                    <button
                        type="button"
                        onClick={() => setShowRubric(!showRubric)}
                        className="w-full flex items-center justify-between bg-gray-900 hover:bg-gray-700 p-4 rounded-md border border-cyan-900 transition duration-300"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">📋</span>
                            <div className="text-left">
                                <h4 className="text-sm font-bold text-cyan-400">Scoring Rubric</h4>
                                <p className="text-xs text-gray-400">Click to see how you'll be evaluated (0-100 points)</p>
                            </div>
                        </div>
                        <span className="text-cyan-400 text-xl">{showRubric ? '▼' : '▶'}</span>
                    </button>

                    {showRubric && (
                        <div className="mt-3 bg-gray-900 rounded-md p-5 border border-cyan-900">
                            <div className="space-y-4">
                                {currentRubric.map((item, index) => (
                                    <div key={index} className="border-l-4 border-cyan-600 pl-4">
                                        <div className="flex items-start justify-between mb-1">
                                            <h5 className="text-sm font-bold text-white">{item.criteria}</h5>
                                            <span className="text-cyan-400 font-bold text-sm ml-2">{item.points} pts</span>
                                        </div>
                                        <p className="text-xs text-gray-400">{item.description}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-700">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-white">Total Possible Score:</span>
                                    <span className="text-cyan-400 font-bold text-lg">100 points</span>
                                </div>
                            </div>

                            <div className="mt-4 bg-gray-800 rounded p-3 border border-gray-700">
                                <p className="text-xs text-gray-300 leading-relaxed">
                                    <strong className="text-cyan-400">💡 Tip:</strong> Review this rubric before submitting!
                                    Make sure your answer addresses each criterion to maximize your score.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

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
                        submission.trim() && (
                            <button
                                type="button"
                                onClick={() => setSubmission('')}
                                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                            >
                                🗑️ Clear Draft
                            </button>
                        )
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
                                className="feedback-content bg-gray-700 p-6 rounded-lg max-w-none"
                                dangerouslySetInnerHTML={{ __html: feedback }}
                            />
                        </>
                    )}
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmation && mode === 'challenge' && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-cyan-500">
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-2xl font-bold text-cyan-400">⚠️ Confirm Submission</h3>
                                <button
                                    onClick={() => setShowConfirmation(false)}
                                    className="text-gray-400 hover:text-white text-2xl leading-none"
                                    aria-label="Close confirmation"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Info Message */}
                            <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-md p-4 mb-4">
                                <p className="text-yellow-200 text-sm">
                                    ⚠️ <strong>Important:</strong> Once you submit, your answer will be evaluated and your score will be added to your total. Make sure you're happy with your submission!
                                </p>
                            </div>

                            {/* Submission Stats */}
                            <div className="bg-gray-900 rounded-md p-4 mb-4 border border-gray-700">
                                <h4 className="text-sm font-bold text-cyan-400 mb-3">Submission Stats</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400">📝 Word Count:</span>
                                        <span className="text-white font-bold">{wordCount}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400">🔤 Character Count:</span>
                                        <span className="text-white font-bold">{charCount}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Submission Preview */}
                            <div className="mb-6">
                                <h4 className="text-sm font-bold text-cyan-400 mb-2">Your Submission Preview</h4>
                                <div className="bg-gray-900 rounded-md p-4 border border-gray-700 max-h-60 overflow-y-auto">
                                    <p className="text-gray-300 whitespace-pre-wrap break-words">{submission}</p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmation(false)}
                                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-md transition duration-300"
                                >
                                    ← Go Back & Edit
                                </button>
                                <button
                                    onClick={handleConfirmedSubmit}
                                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-md transition duration-300"
                                >
                                    ✓ Yes, Submit Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameCard;




import React, { useState, useEffect, useMemo } from 'react';
import { usePlayerContext } from '../context/PlayerContext';
import { useUIContext } from '../context/UIContext';
import { Game, Player } from '../types';
import { Spinner } from './Spinner';
import { formatFeedback } from '../utils/feedbackFormatter';
import {
    validateBooleanSearch,
    validateOutreach,
    validateGeneral,
    validateSimilarity,
    validateCultureAddNote,
    validatePromptInstructions,
} from '../utils/answerValidators';
import { validateCandidateExperience } from '../utils/candidateExperienceValidator';
import { validateDataDrivenSourcing } from '../utils/dataDrivenSourcingValidator';
import { ValidationResult } from '../types';
import { rubricByDifficulty } from '../utils/rubrics';
import ShareButtons from './ShareButtons';
import { getCurrentUrl, getPlayerProfileUrl } from '../utils/shareUtils';
import '../styles/feedback.css';

interface GameCardProps {
    game: Game;
    mode?: 'challenge' | 'practice';
}

const COOLDOWN_MS = 30000; // 30 seconds

const GameCard: React.FC<GameCardProps> = ({ game, mode = 'challenge' }) => {
    const { player, refreshPlayer } = usePlayerContext();
    const { addToast } = useUIContext();
    const [submission, setSubmission] = useState('');
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);
    const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showRubric, setShowRubric] = useState(false);
    const [lastSubmissionText, setLastSubmissionText] = useState<string>('');
    const [lastScore, setLastScore] = useState<number | null>(null);
    const [recentValidation, setRecentValidation] = useState<ValidationResult | null>(null);

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
    const latestAttempt = gameAttempts.length > 0 ? gameAttempts[0] : null;
    const firstAttempt = gameAttempts.length > 0 ? gameAttempts[gameAttempts.length - 1] : null;
    const improvementFromFirst = latestAttempt && firstAttempt ? latestAttempt.score - firstAttempt.score : null;

    const skillLevel = useMemo<'beginner' | 'intermediate' | 'expert'>(() => {
        const scores = (player?.attempts || []).slice(-6).map(a => a.score);
        if (scores.length === 0) return 'beginner';
        const avg = scores.reduce((acc, val) => acc + val, 0) / scores.length;
        if (avg >= 85) return 'expert';
        if (avg >= 65) return 'intermediate';
        return 'beginner';
    }, [player?.attempts]);

    const dailyStreak = useMemo(() => {
        const attempts = (player?.attempts || [])
            .map(a => new Date(a.ts))
            .filter(d => !Number.isNaN(d.getTime()))
            .sort((a, b) => b.getTime() - a.getTime());

        if (attempts.length === 0) return 0;

        let streak = 1;
        const today = new Date();
        let prev = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        prev.setHours(0, 0, 0, 0);

        for (const date of attempts) {
            const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const diffDays = Math.round((prev.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) {
                continue;
            } else if (diffDays === 1) {
                streak += 1;
                prev = current;
            } else {
                break;
            }
        }
        return streak;
    }, [player?.attempts]);

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
        const trimmedSubmission = submission.trim();
        if (!trimmedSubmission || !player) return;
        if (!player.sessionToken) {
            addToast('Session expired. Please refresh the page.', 'error');
            return;
        }

        // Close confirmation modal
        setShowConfirmation(false);

        // Challenge mode: full AI feedback and scoring
        setIsLoading(true);
        setFeedback(null);

        // Run client-side validation
        let validation: ValidationResult | undefined;
        const validationType = (game.validation as any)?.type;

        if (game.id === 'game48') {
            validation = validateCultureAddNote(trimmedSubmission);
        } else if (validationType === 'promptInstructions') {
            validation = validatePromptInstructions(trimmedSubmission, {
                mustMention: (game.validation as any)?.mustMention,
            });
        } else if (game.skillCategory === 'boolean' || game.skillCategory === 'xray') {
            validation = validateBooleanSearch(
                trimmedSubmission,
                {
                    keywords: (game.validation as any)?.keywords,
                    location: (game.validation as any)?.location,
                },
                game.validation as any // Pass full config for flexible validation
            );
        } else if (game.skillCategory === 'outreach') {
            const outreachValidation = validateOutreach(
                trimmedSubmission,
                (game.validation as any)?.maxWords,
                game.validation as any // Pass full config for personalization analysis
            );
            const candidateExpValidation = validateCandidateExperience(trimmedSubmission);

            // Combine both validations - Candidate experience is weighted more heavily (60/40)
            validation = {
                score: Math.round(candidateExpValidation.score * 0.6 + outreachValidation.score * 0.4),
                checks: { ...outreachValidation.checks, ...candidateExpValidation.checks },
                feedback: [
                    ...(candidateExpValidation.feedback.length > 0 ? ['🎯 Candidate POV:', ...candidateExpValidation.feedback] : []),
                    ...(outreachValidation.feedback.length > 0 ? ['📝 Technical Quality:', ...outreachValidation.feedback] : []),
                ],
                strengths: [
                    ...(candidateExpValidation.strengths.length > 0 ? ['✅ Candidate Experience:', ...candidateExpValidation.strengths] : []),
                    ...(outreachValidation.strengths.length > 0 ? ['✅ Message Quality:', ...outreachValidation.strengths] : []),
                ],
            };
        } else if (game.skillCategory === 'ats' || game.skillCategory === 'diversity' || game.skillCategory === 'persona') {
            // For strategy/ATS games, add data-driven validation
            const baseValidation = validateGeneral(trimmedSubmission, game.validation as any);
            const dataDrivenValidation = validateDataDrivenSourcing(trimmedSubmission);

            // Combine validations - Data-driven is weighted 40%, base is 60%
            validation = {
                score: Math.round(baseValidation.score * 0.6 + dataDrivenValidation.score * 0.4),
                checks: { ...baseValidation.checks, ...dataDrivenValidation.checks },
                feedback: [
                    ...(baseValidation.feedback.length > 0 ? baseValidation.feedback : []),
                    ...(dataDrivenValidation.feedback.length > 0 ? ['📊 Data & Metrics:', ...dataDrivenValidation.feedback] : []),
                ],
                strengths: [
                    ...(baseValidation.strengths.length > 0 ? baseValidation.strengths : []),
                    ...(dataDrivenValidation.strengths.length > 0 ? ['📊 Quantitative Thinking:', ...dataDrivenValidation.strengths] : []),
                ],
            };
        } else {
            validation = validateGeneral(trimmedSubmission, game.validation as any);
        }
        setRecentValidation(validation || null);

        // Calculate similarity score if example solution exists
        if (game.exampleSolution && validation) {
            const similarity = validateSimilarity(trimmedSubmission, game.exampleSolution);
            validation.similarityScore = similarity;

            // If similarity is very high (>0.9), boost the score or add feedback
            if (similarity > 0.9) {
                validation.feedback.push('Your answer is extremely close to the example solution!');
                validation.score = Math.max(validation.score, 95);
            }
        }

        // If validation score is extremely low, we could warn, but for now we pass it to AI
        // to let AI give the detailed feedback, but we send the validation result to the server.

        try {
            const response = await fetch('/api/submitAttempt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Send httpOnly cookie with session token
                body: JSON.stringify({
                    // Security: sessionToken now sent via httpOnly cookie, not request body
                    gameId: game.id,
                    skillLevel,
                    submission: trimmedSubmission,
                    validation // Pass validation result to server
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `Request failed with ${response.status}`);
            }

            const data: { score: number; feedback: string; player: Player } = await response.json();

            if (data.player) {
                refreshPlayer(data.player);
            }

            if (typeof data.score === 'number') {
                addToast(`Score updated! +${data.score} points`, 'success');
            }

            const feedbackHtml = formatFeedback(data.feedback, data.score ?? 0);
            setFeedback(feedbackHtml);
            setLastSubmissionText(trimmedSubmission);
            setLastScore(data.score ?? null);
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
    const currentRubric = rubricByDifficulty[game.difficulty];

    const hintMessages = useMemo(() => {
        const sourceText = `${game.task} ${game.placeholder} ${game.exampleSolution ?? ''}`.toLowerCase();
        const hints: string[] = [];

        if (game.skillCategory === 'boolean' || game.skillCategory === 'xray') {
            hints.push('Tip: Use parentheses to group OR terms, then connect groups with AND.');
            if (sourceText.includes('vienna') || sourceText.includes('wien')) {
                hints.push('Tip: Vienna can also be written as "Wien" in German.');
            }
            if (sourceText.includes('kubernetes') || sourceText.includes('k8s')) {
                hints.push('Tip: Kubernetes is often shortened to "K8s" in profiles.');
            }
        }

        if (game.skillCategory === 'outreach') {
            hints.push('Tip: Lead with one line of personalization before your ask.');
            hints.push('Tip: End with a clear yes/no call-to-action.');
        }

        if (hints.length === 0 && sourceText.includes('kubernetes')) {
            hints.push('Tip: Kubernetes = K8s (common abbreviation in resumes).');
        }

        return hints;
    }, [game.exampleSolution, game.placeholder, game.skillCategory, game.task]);

    const comparisonSets = useMemo(() => {
        if (!game.exampleSolution || !lastSubmissionText) return null;
        const toWordSet = (text: string) =>
            new Set((text.match(/\b[\w'-]+\b/g) || []).map(w => w.toLowerCase()));
        const userWords = toWordSet(lastSubmissionText);
        const exampleWords = toWordSet(game.exampleSolution);

        const missingInUser = new Set<string>();
        exampleWords.forEach(word => {
            if (!userWords.has(word)) missingInUser.add(word);
        });

        const extraFromUser = new Set<string>();
        userWords.forEach(word => {
            if (!exampleWords.has(word)) extraFromUser.add(word);
        });

        return { missingInUser, extraFromUser };
    }, [game.exampleSolution, lastSubmissionText]);

    const renderHighlightedText = (text: string, highlightSet?: Set<string>, highlightClass?: string) => {
        return text.split(/(\b[\w'-]+\b)/).map((segment, idx) => {
            if (!highlightSet || highlightSet.size === 0) {
                return <React.Fragment key={idx}>{segment}</React.Fragment>;
            }
            const normalized = segment.toLowerCase();
            if (highlightSet.has(normalized)) {
                return (
                    <mark key={idx} className={highlightClass ?? 'bg-yellow-800 text-yellow-100 px-1 rounded'}>
                        {segment}
                    </mark>
                );
            }
            return <React.Fragment key={idx}>{segment}</React.Fragment>;
        });
    };

    const missingHighlights = comparisonSets ? Array.from(comparisonSets.missingInUser).slice(0, 12) : [];
    const extraHighlights = comparisonSets ? Array.from(comparisonSets.extraFromUser).slice(0, 12) : [];

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

            {dailyStreak > 1 && (
                <div className="mb-4 p-3 bg-gray-900 rounded-md border border-orange-700 text-sm text-orange-200">
                    {dailyStreak} days in a row! Keep the streak going.
                </div>
            )}

            <div
                className="mb-4 p-3 bg-gray-900 rounded-md border border-gray-700 text-sm text-gray-200 flex items-center justify-between"
                title="Difficulty is set per game. Your skill tier is based on your last 6 scored submissions across games."
            >
                <span>
                    Your skill tier (auto-estimated):{' '}
                    <strong className="text-white capitalize">{skillLevel}</strong>
                    <span className="text-xs text-gray-400 ml-2">
                        Game difficulty can be higher/lower than your tier.
                    </span>
                </span>
                <span className="text-xs text-gray-400">Higher recent scores shift you up.</span>
            </div>

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

            {mode === 'challenge' && hintMessages.length > 0 && (
                <div className="mb-4 p-4 bg-gray-900 rounded-md border border-blue-800">
                    <h4 className="text-sm font-bold text-blue-300 mb-2">Quick tips for this game</h4>
                    <ul className="text-xs text-gray-200 space-y-1 list-disc list-inside">
                        {hintMessages.map((hint, idx) => (
                            <li key={idx}>{hint}</li>
                        ))}
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
                    {firstAttempt && latestAttempt && (
                        <div className="mt-3 text-xs text-gray-300 space-y-1">
                            <p>First attempt: {firstAttempt.score}/100</p>
                            <p>Latest attempt: {latestAttempt.score}/100</p>
                            {improvementFromFirst !== null && (
                                <p className={improvementFromFirst >= 0 ? 'text-green-300' : 'text-yellow-300'}>
                                    Improvement: {improvementFromFirst >= 0 ? '+' : ''}{improvementFromFirst} points
                                </p>
                            )}
                        </div>
                    )}

                    {/* Share Buttons - Show after completing game */}
                    {bestAttempt && bestAttempt.score >= 60 && player && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                            <p className="text-xs text-gray-400 mb-2">Share your achievement:</p>
                            <ShareButtons
                                shareData={{
                                    type: 'game_score',
                                    playerName: player.name,
                                    score: bestAttempt.score,
                                    gameTitle: game.title,
                                    url: getPlayerProfileUrl(player.name)
                                }}
                                size="small"
                                showLabels={false}
                            />
                        </div>
                    )}
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

            {mode === 'challenge' && recentValidation?.strengths?.length ? (
                <div className="mt-4 p-4 bg-gray-900 rounded-md border border-green-700">
                    <h4 className="text-sm font-bold text-green-300 mb-2">What You Did Well (automated checks)</h4>
                    <ul className="text-xs text-gray-200 list-disc list-inside space-y-1">
                        {recentValidation.strengths.map((item, idx) => (
                            <li key={idx}>{item}</li>
                        ))}
                    </ul>
                </div>
            ) : null}

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
                            {lastScore !== null && !isLoading && (
                                <p className="text-sm text-gray-300 mb-2">This attempt: {lastScore}/100</p>
                            )}
                            <div
                                className="feedback-content bg-gray-700 p-6 rounded-lg max-w-none"
                                dangerouslySetInnerHTML={{ __html: feedback }}
                            />
                        </>
                    )}
                </div>
            )}

            {mode === 'challenge' && comparisonSets && game.exampleSolution && lastSubmissionText && (
                <div className="mt-6">
                    <h4 className="text-xl font-bold text-cyan-400 mb-2">Compare with Example</h4>
                    <p className="text-xs text-gray-400 mb-3">Highlights show what is different. Red = content you used that is not in the example. Yellow = content from the example that is missing in your answer.</p>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-gray-900 p-4 rounded-md border border-gray-700">
                            <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Your answer</div>
                            <p className="text-sm text-gray-100 leading-relaxed whitespace-pre-wrap break-words">
                                {renderHighlightedText(lastSubmissionText, comparisonSets.extraFromUser, 'bg-red-900 text-red-100 px-1 rounded')}
                            </p>
                        </div>
                        <div className="bg-gray-900 p-4 rounded-md border border-gray-700">
                            <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Example solution</div>
                            <p className="text-sm text-gray-100 leading-relaxed whitespace-pre-wrap break-words">
                                {renderHighlightedText(game.exampleSolution, comparisonSets.missingInUser, 'bg-yellow-800 text-yellow-100 px-1 rounded')}
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-300 space-y-1">
                        {missingHighlights.length > 0 && (
                            <p><strong>Missing focus areas:</strong> {missingHighlights.join(', ')}</p>
                        )}
                        {extraHighlights.length > 0 && (
                            <p><strong>Extra terms you added:</strong> {extraHighlights.join(', ')}</p>
                        )}
                        {missingHighlights.length === 0 && extraHighlights.length === 0 && (
                            <p>Your answer closely matches the example content.</p>
                        )}
                    </div>
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

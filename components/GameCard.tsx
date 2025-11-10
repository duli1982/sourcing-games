
import React, { useState } from 'react';
import { getGeminiResponse } from '../services/geminiService';
import { useAppContext } from '../context/AppContext';
import { Game } from '../types';
import { Spinner } from './Spinner';

interface GameCardProps {
    game: Game;
}

const GameCard: React.FC<GameCardProps> = ({ game }) => {
    const { player, updateScore, addToast } = useAppContext();
    const [submission, setSubmission] = useState('');
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!submission.trim() || !player) return;

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
                addToast(`Score updated! +${score} points`, 'success');
            }
            
            const feedbackHtml = responseText
                .replace(/SCORE: \d+/g, `<h3>Your Score: <strong class="text-cyan-400">${score}/100</strong></h3>`)
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br />');

            setFeedback(feedbackHtml);

        } catch (error) {
            const message = error instanceof Error ? error.message : "An unknown error occurred.";
            setFeedback(`<p class="text-red-400">${message}</p>`);
            addToast(message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
            <h3 className="text-xl font-bold mb-2">{game.title}</h3>
            <p className="text-gray-400 mb-4">{game.description}</p>
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
                <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center"
                    aria-live="polite"
                >
                    {isLoading ? 'Getting Feedback...' : 'Submit & Get Feedback'}
                </button>
            </form>

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
        </div>
    );
};

export default GameCard;



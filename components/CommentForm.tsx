import React, { useState } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

interface CommentFormProps {
    gameId: string;
    parentId?: string | null;
    onSuccess: () => void;
    onCancel?: () => void;
    placeholder?: string;
}

const CommentForm: React.FC<CommentFormProps> = ({
    gameId,
    parentId = null,
    onSuccess,
    onCancel,
    placeholder = 'Write a comment...'
}) => {
    const { player } = usePlayerContext();
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const MIN_LENGTH = 5;
    const MAX_LENGTH = 2000;
    const isValid = content.trim().length >= MIN_LENGTH && content.trim().length <= MAX_LENGTH;
    const charCount = content.length;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!player) {
            setError('You must be logged in to comment');
            return;
        }

        if (!isValid) {
            setError(`Comment must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters`);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/comments?action=create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    gameId,
                    content: content.trim(),
                    parentId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to post comment');
            }

            // Success
            setContent('');
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to post comment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setContent('');
        setError(null);
        if (onCancel) {
            onCancel();
        }
    };

    if (!player) {
        return (
            <div className="bg-gray-700 rounded-lg p-4 text-center">
                <p className="text-gray-400">Please log in to comment</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-gray-700 rounded-lg p-4">
            {/* Textarea */}
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                disabled={isSubmitting}
                className="w-full bg-gray-800 text-white rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                rows={parentId ? 3 : 4}
                maxLength={MAX_LENGTH}
            />

            {/* Character Count */}
            <div className="flex items-center justify-between mt-2">
                <span className={`text-xs ${
                    charCount < MIN_LENGTH
                        ? 'text-gray-500'
                        : charCount > MAX_LENGTH
                        ? 'text-red-400'
                        : 'text-gray-400'
                }`}>
                    {charCount}/{MAX_LENGTH}
                    {charCount < MIN_LENGTH && ` (minimum ${MIN_LENGTH} characters)`}
                </span>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={!isValid || isSubmitting}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Posting...
                            </>
                        ) : (
                            parentId ? 'Reply' : 'Comment'
                        )}
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mt-2 text-red-400 text-sm">
                    {error}
                </div>
            )}
        </form>
    );
};

export default CommentForm;

import React, { useState, useEffect } from 'react';

interface FlaggedComment {
    id: string;
    gameId: string;
    gameTitle: string;
    playerId: string;
    playerName: string;
    content: string;
    flagCount: number;
    createdAt: string;
    isHidden: boolean;
}

const FlaggedCommentsTable: React.FC = () => {
    const [flaggedComments, setFlaggedComments] = useState<FlaggedComment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);
    const [actionInProgress, setActionInProgress] = useState<string | null>(null);

    const LIMIT = 50;

    const fetchFlaggedComments = async (reset: boolean = false) => {
        const currentOffset = reset ? 0 : offset;
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/comments?action=flagged&limit=${LIMIT}&offset=${currentOffset}`,
                {
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch flagged comments');
            }

            const data = await response.json();

            if (reset) {
                setFlaggedComments(data.comments || []);
                setOffset(LIMIT);
            } else {
                setFlaggedComments(prev => [...prev, ...(data.comments || [])]);
                setOffset(prev => prev + LIMIT);
            }

            setHasMore((data.comments || []).length === LIMIT);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch flagged comments');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFlaggedComments(true);
    }, []);

    const handleDelete = async (commentId: string) => {
        if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
            return;
        }

        setActionInProgress(commentId);

        try {
            const response = await fetch('/api/comments?action=delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ commentId })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete comment');
            }

            // Remove from list
            setFlaggedComments(prev => prev.filter(c => c.id !== commentId));
            alert('Comment deleted successfully');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete comment');
        } finally {
            setActionInProgress(null);
        }
    };

    const handleUnflag = async (commentId: string) => {
        // Note: This would require a new API endpoint to clear flags
        // For now, show a message
        alert('Unflag functionality requires additional API endpoint implementation');
    };

    const toggleExpand = (commentId: string) => {
        setExpandedCommentId(prev => prev === commentId ? null : commentId);
    };

    const truncateContent = (content: string, maxLength: number = 100) => {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (error) {
        return (
            <div className="bg-red-900 text-red-200 rounded-lg p-4">
                <p className="font-semibold">Error loading flagged comments</p>
                <p className="text-sm mt-1">{error}</p>
                <button
                    onClick={() => fetchFlaggedComments(true)}
                    className="mt-3 px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">
                    Flagged Comments ({flaggedComments.length})
                </h3>
                <button
                    onClick={() => fetchFlaggedComments(true)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors disabled:opacity-50"
                >
                    Refresh
                </button>
            </div>

            {isLoading && flaggedComments.length === 0 ? (
                <div className="text-center py-12">
                    <svg className="animate-spin h-8 w-8 mx-auto text-cyan-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-gray-400 mt-4">Loading flagged comments...</p>
                </div>
            ) : flaggedComments.length === 0 ? (
                <div className="bg-gray-700 rounded-lg p-12 text-center">
                    <svg className="w-16 h-16 mx-auto text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="text-xl font-semibold text-gray-300 mb-2">No Flagged Comments</h4>
                    <p className="text-gray-400">All clear! No comments have been flagged for review.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full bg-gray-700 rounded-lg overflow-hidden">
                        <thead className="bg-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Game</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Player</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Content</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Flags</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-600">
                            {flaggedComments.map((comment) => (
                                <tr key={comment.id} className="hover:bg-gray-600 transition-colors">
                                    <td className="px-4 py-3 text-sm text-gray-200">{comment.gameTitle}</td>
                                    <td className="px-4 py-3 text-sm text-gray-200">{comment.playerName}</td>
                                    <td className="px-4 py-3 text-sm text-gray-200">
                                        <div>
                                            {expandedCommentId === comment.id ? (
                                                <div className="whitespace-pre-wrap">{comment.content}</div>
                                            ) : (
                                                <div>{truncateContent(comment.content)}</div>
                                            )}
                                            {comment.content.length > 100 && (
                                                <button
                                                    onClick={() => toggleExpand(comment.id)}
                                                    className="text-cyan-400 hover:text-cyan-300 text-xs mt-1 transition-colors"
                                                >
                                                    {expandedCommentId === comment.id ? 'Show less' : 'Show more'}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className="px-2 py-1 bg-red-900 text-red-200 rounded-full font-semibold">
                                            {comment.flagCount}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-400">{formatDate(comment.createdAt)}</td>
                                    <td className="px-4 py-3 text-sm">
                                        {comment.isHidden ? (
                                            <span className="px-2 py-1 bg-yellow-900 text-yellow-200 rounded text-xs font-semibold">
                                                HIDDEN
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-green-900 text-green-200 rounded text-xs font-semibold">
                                                VISIBLE
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleDelete(comment.id)}
                                                disabled={actionInProgress === comment.id}
                                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Load More */}
                    {hasMore && (
                        <div className="text-center mt-4">
                            <button
                                onClick={() => fetchFlaggedComments(false)}
                                disabled={isLoading}
                                className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                {isLoading ? 'Loading...' : 'Load More'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FlaggedCommentsTable;

import React, { useState, useEffect, useCallback } from 'react';
import { Comment } from '../types';
import CommentCard from './CommentCard';
import CommentForm from './CommentForm';
import CommentThread from './CommentThread';

interface CommentSectionProps {
    gameId: string;
}

type SortType = 'newest' | 'top';

const CommentSection: React.FC<CommentSectionProps> = ({ gameId }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [sortBy, setSortBy] = useState<SortType>('newest');
    const [isLoading, setIsLoading] = useState(true);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [total, setTotal] = useState(0);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);

    const LIMIT = 20;
    const POLL_INTERVAL = 30000; // 30 seconds

    // Fetch comments
    const fetchComments = useCallback(async (reset: boolean = false) => {
        const currentOffset = reset ? 0 : offset;

        try {
            const response = await fetch(
                `/api/comments?action=list&gameId=${gameId}&sort=${sortBy}&limit=${LIMIT}&offset=${currentOffset}`,
                {
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch comments');
            }

            const data = await response.json();

            if (reset) {
                setComments(data.comments || []);
                setOffset(LIMIT);
            } else {
                setComments(prev => [...prev, ...(data.comments || [])]);
                setOffset(prev => prev + LIMIT);
            }

            setTotal(data.total || 0);
            setHasMore((data.comments || []).length === LIMIT);
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setIsLoading(false);
        }
    }, [gameId, sortBy, offset]);

    // Initial load and sort change
    useEffect(() => {
        setIsLoading(true);
        setOffset(0);
        setComments([]);
        fetchComments(true);
    }, [gameId, sortBy]);

    // Polling for new comments
    useEffect(() => {
        const pollInterval = setInterval(() => {
            // Only poll if on first page and sorted by newest
            if (sortBy === 'newest' && offset <= LIMIT) {
                fetchComments(true);
            }
        }, POLL_INTERVAL);

        return () => clearInterval(pollInterval);
    }, [sortBy, offset]);

    // Handle voting
    const handleVote = async (commentId: string, voteType: 'up' | 'down' | 'remove') => {
        try {
            const response = await fetch('/api/comments?action=vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ commentId, voteType })
            });

            if (!response.ok) {
                throw new Error('Failed to vote');
            }

            const data = await response.json();

            // Update comment in state
            setComments(prev => prev.map(comment => {
                if (comment.id === commentId) {
                    return {
                        ...comment,
                        upvotes: data.upvotes,
                        downvotes: data.downvotes,
                        userVote: voteType === 'remove' ? null : voteType
                    };
                }
                // Also check nested replies
                if (comment.replies) {
                    return {
                        ...comment,
                        replies: comment.replies.map(reply =>
                            reply.id === commentId
                                ? { ...reply, upvotes: data.upvotes, downvotes: data.downvotes, userVote: voteType === 'remove' ? null : voteType }
                                : reply
                        )
                    };
                }
                return comment;
            }));
        } catch (error) {
            console.error('Error voting:', error);
            throw error; // Re-throw for CommentCard to handle optimistic rollback
        }
    };

    // Handle flagging
    const handleFlag = async (commentId: string) => {
        const reason = prompt('Why are you flagging this comment? (optional)');

        try {
            const response = await fetch('/api/comments?action=flag', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ commentId, reason: reason || undefined })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to flag comment');
            }

            alert('Comment flagged successfully. Moderators will review it.');

            // Refresh to see if comment was auto-hidden
            fetchComments(true);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to flag comment');
        }
    };

    // Handle delete
    const handleDelete = async (commentId: string) => {
        if (!confirm('Are you sure you want to delete this comment?')) {
            return;
        }

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
                throw new Error('Failed to delete comment');
            }

            // Refresh comments
            fetchComments(true);
        } catch (error) {
            alert('Failed to delete comment');
        }
    };

    // Handle reply
    const handleReply = (commentId: string) => {
        setReplyingTo(commentId);
    };

    // Handle comment form success
    const handleCommentSuccess = () => {
        fetchComments(true);
    };

    // Handle sort change
    const handleSortChange = (newSort: SortType) => {
        setSortBy(newSort);
        setOffset(0);
        setComments([]);
    };

    // Load more
    const handleLoadMore = () => {
        fetchComments(false);
    };

    // Top-level comments only (parentId is null)
    const topLevelComments = comments.filter(c => !c.parentId);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-cyan-400">
                    Discussion ({total})
                </h3>

                {/* Sort Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => handleSortChange('newest')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            sortBy === 'newest'
                                ? 'bg-cyan-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                        Newest
                    </button>
                    <button
                        onClick={() => handleSortChange('top')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            sortBy === 'top'
                                ? 'bg-cyan-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                        Top
                    </button>
                </div>
            </div>

            {/* Comment Form */}
            <CommentForm
                gameId={gameId}
                onSuccess={handleCommentSuccess}
                placeholder="Share your thoughts about this game..."
            />

            {/* Loading State */}
            {isLoading && comments.length === 0 && (
                <div className="text-center py-12">
                    <svg className="animate-spin h-8 w-8 mx-auto text-cyan-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-gray-400 mt-4">Loading comments...</p>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && topLevelComments.length === 0 && (
                <div className="bg-gray-700 rounded-lg p-12 text-center">
                    <svg className="w-16 h-16 mx-auto text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h4 className="text-xl font-semibold text-gray-300 mb-2">No comments yet</h4>
                    <p className="text-gray-400">Be the first to share your thoughts about this game!</p>
                </div>
            )}

            {/* Comments List */}
            {topLevelComments.length > 0 && (
                <div className="space-y-4">
                    {topLevelComments.map((comment) => (
                        <div key={comment.id} className="space-y-3">
                            <CommentCard
                                comment={comment}
                                onReply={handleReply}
                                onVote={handleVote}
                                onFlag={handleFlag}
                                onDelete={handleDelete}
                            />

                            {/* Inline Reply Form */}
                            {replyingTo === comment.id && (
                                <div className="ml-8">
                                    <CommentForm
                                        gameId={gameId}
                                        parentId={comment.id}
                                        onSuccess={() => {
                                            setReplyingTo(null);
                                            fetchComments(true);
                                        }}
                                        onCancel={() => setReplyingTo(null)}
                                        placeholder="Write a reply..."
                                    />
                                </div>
                            )}

                            {/* Replies Thread */}
                            <CommentThread
                                parentId={comment.id}
                                gameId={gameId}
                                initialReplies={comment.replies}
                                replyCount={comment.replyCount}
                                onVote={handleVote}
                                onFlag={handleFlag}
                                onDelete={handleDelete}
                                onRefresh={() => fetchComments(true)}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Load More Button */}
            {hasMore && topLevelComments.length > 0 && (
                <div className="text-center pt-4">
                    <button
                        onClick={handleLoadMore}
                        disabled={isLoading}
                        className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Loading...' : 'Load More Comments'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default CommentSection;

import React, { useState, useEffect } from 'react';
import { Comment } from '../types';
import CommentCard from './CommentCard';
import CommentForm from './CommentForm';

interface CommentThreadProps {
    parentId: string;
    gameId: string;
    initialReplies?: Comment[];
    replyCount?: number;
    onVote: (commentId: string, voteType: 'up' | 'down' | 'remove') => Promise<void>;
    onFlag: (commentId: string) => void;
    onDelete: (commentId: string) => void;
    onRefresh: () => void;
}

const CommentThread: React.FC<CommentThreadProps> = ({
    parentId,
    gameId,
    initialReplies = [],
    replyCount = 0,
    onVote,
    onFlag,
    onDelete,
    onRefresh
}) => {
    const [replies, setReplies] = useState<Comment[]>(initialReplies);
    const [isExpanded, setIsExpanded] = useState(initialReplies.length > 0);
    const [isLoading, setIsLoading] = useState(false);
    const [showReplyForm, setShowReplyForm] = useState(false);

    // Fetch replies when expanded
    const fetchReplies = async () => {
        if (replies.length > 0 || isLoading) return; // Already have replies or loading

        setIsLoading(true);
        try {
            const response = await fetch(
                `/api/comments?action=list&gameId=${gameId}&parentId=${parentId}&sort=oldest&limit=100`,
                {
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch replies');
            }

            const data = await response.json();
            setReplies(data.comments || []);
        } catch (error) {
            console.error('Error fetching replies:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleExpand = () => {
        if (!isExpanded && replies.length === 0) {
            fetchReplies();
        }
        setIsExpanded(!isExpanded);
    };

    const handleReplySuccess = () => {
        setShowReplyForm(false);
        fetchReplies(); // Refresh replies
        onRefresh(); // Refresh parent to update reply count
    };

    // If no replies and no ability to show replies, return null
    if (replyCount === 0 && replies.length === 0) {
        return null;
    }

    return (
        <div className="mt-3">
            {/* Toggle Button */}
            {replyCount > 0 && (
                <button
                    onClick={handleToggleExpand}
                    className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors flex items-center gap-1 mb-3"
                >
                    <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {isExpanded ? 'Hide' : 'Show'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                </button>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="ml-8 text-gray-400 text-sm flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading replies...
                </div>
            )}

            {/* Replies List */}
            {isExpanded && !isLoading && (
                <div className="space-y-3">
                    {replies.map((reply) => (
                        <CommentCard
                            key={reply.id}
                            comment={reply}
                            onVote={onVote}
                            onFlag={onFlag}
                            onDelete={onDelete}
                            isNested={true}
                        />
                    ))}

                    {/* Reply Form */}
                    {showReplyForm && (
                        <div className="ml-8">
                            <CommentForm
                                gameId={gameId}
                                parentId={parentId}
                                onSuccess={handleReplySuccess}
                                onCancel={() => setShowReplyForm(false)}
                                placeholder="Write a reply..."
                            />
                        </div>
                    )}

                    {/* Add Reply Button */}
                    {!showReplyForm && (
                        <button
                            onClick={() => setShowReplyForm(true)}
                            className="ml-8 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add a reply
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default CommentThread;

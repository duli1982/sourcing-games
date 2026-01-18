import React, { useState } from 'react';
import { Comment } from '../types';
import { usePlayerContext } from '../context/PlayerContext';

interface CommentCardProps {
    comment: Comment;
    onReply?: (commentId: string) => void;
    onVote: (commentId: string, voteType: 'up' | 'down' | 'remove') => Promise<void>;
    onFlag: (commentId: string) => void;
    onDelete: (commentId: string) => void;
    isNested?: boolean;
}

const CommentCard: React.FC<CommentCardProps> = ({
    comment,
    onReply,
    onVote,
    onFlag,
    onDelete,
    isNested = false
}) => {
    const { player } = usePlayerContext();
    const [optimisticVote, setOptimisticVote] = useState<'up' | 'down' | null>(comment.userVote || null);
    const [optimisticUpvotes, setOptimisticUpvotes] = useState(comment.upvotes);
    const [optimisticDownvotes, setOptimisticDownvotes] = useState(comment.downvotes);
    const [isVoting, setIsVoting] = useState(false);

    const isOwner = player?.id === comment.playerId;
    const canInteract = !!player;

    // Handle vote with optimistic update
    const handleVote = async (voteType: 'up' | 'down') => {
        if (!canInteract || isVoting) return;

        setIsVoting(true);

        // Determine the actual vote to send
        let actualVote: 'up' | 'down' | 'remove';
        let newVote: 'up' | 'down' | null;
        let newUpvotes = optimisticUpvotes;
        let newDownvotes = optimisticDownvotes;

        if (optimisticVote === voteType) {
            // Remove vote (toggle off)
            actualVote = 'remove';
            newVote = null;
            if (voteType === 'up') {
                newUpvotes--;
            } else {
                newDownvotes--;
            }
        } else if (optimisticVote === null) {
            // New vote
            actualVote = voteType;
            newVote = voteType;
            if (voteType === 'up') {
                newUpvotes++;
            } else {
                newDownvotes++;
            }
        } else {
            // Change vote (up -> down or down -> up)
            actualVote = voteType;
            newVote = voteType;
            if (voteType === 'up') {
                newUpvotes++;
                newDownvotes--;
            } else {
                newDownvotes++;
                newUpvotes--;
            }
        }

        // Optimistic update
        setOptimisticVote(newVote);
        setOptimisticUpvotes(newUpvotes);
        setOptimisticDownvotes(newDownvotes);

        try {
            await onVote(comment.id, actualVote);
        } catch (error) {
            // Revert on error
            setOptimisticVote(comment.userVote || null);
            setOptimisticUpvotes(comment.upvotes);
            setOptimisticDownvotes(comment.downvotes);
            console.error('Error voting:', error);
        } finally {
            setIsVoting(false);
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    // Handle deleted or hidden comments
    if (comment.isDeleted) {
        return (
            <div className={`bg-gray-${isNested ? '800' : '700'} rounded-lg p-4 ${isNested ? 'ml-8' : ''}`}>
                <p className="text-gray-500 italic">[deleted]</p>
            </div>
        );
    }

    if (comment.isHidden) {
        return (
            <div className={`bg-gray-${isNested ? '800' : '700'} rounded-lg p-4 ${isNested ? 'ml-8' : ''}`}>
                <p className="text-gray-500 italic">[hidden by moderators]</p>
            </div>
        );
    }

    const score = optimisticUpvotes - optimisticDownvotes;

    return (
        <div className={`bg-gray-${isNested ? '800' : '700'} rounded-lg p-4 ${isNested ? 'ml-8' : ''}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold">
                        {comment.playerName[0].toUpperCase()}
                    </div>
                    <div>
                        <p className="font-semibold text-white">{comment.playerName}</p>
                        <p className="text-xs text-gray-400">{formatTimestamp(comment.createdAt)}</p>
                    </div>
                </div>

                {/* Delete button (owner only) */}
                {isOwner && (
                    <button
                        onClick={() => onDelete(comment.id)}
                        className="text-red-400 hover:text-red-300 text-sm transition-colors"
                        title="Delete comment"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="mb-4">
                <p className="text-gray-200 whitespace-pre-wrap">{comment.content}</p>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-4">
                {/* Vote Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleVote('up')}
                        disabled={!canInteract || isVoting}
                        className={`transition-colors ${
                            optimisticVote === 'up'
                                ? 'text-green-400'
                                : 'text-gray-400 hover:text-green-400'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Upvote"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                        </svg>
                    </button>
                    <span className={`font-semibold ${
                        score > 0 ? 'text-green-400' : score < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                        {score}
                    </span>
                    <button
                        onClick={() => handleVote('down')}
                        disabled={!canInteract || isVoting}
                        className={`transition-colors ${
                            optimisticVote === 'down'
                                ? 'text-red-400'
                                : 'text-gray-400 hover:text-red-400'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Downvote"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                        </svg>
                    </button>
                </div>

                {/* Reply Button (not for nested comments) */}
                {!isNested && canInteract && onReply && (
                    <button
                        onClick={() => onReply(comment.id)}
                        className="text-gray-400 hover:text-cyan-400 text-sm font-medium transition-colors flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Reply
                        {comment.replyCount !== undefined && comment.replyCount > 0 && (
                            <span className="text-xs">({comment.replyCount})</span>
                        )}
                    </button>
                )}

                {/* Flag Button (not for own comments) */}
                {!isOwner && canInteract && (
                    <button
                        onClick={() => onFlag(comment.id)}
                        className="text-gray-400 hover:text-yellow-400 text-sm font-medium transition-colors flex items-center gap-1"
                        title="Flag as inappropriate"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                        </svg>
                        Flag
                    </button>
                )}
            </div>
        </div>
    );
};

export default CommentCard;

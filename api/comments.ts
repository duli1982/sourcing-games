/**
 * Unified Comments API Endpoint
 * Handles all comment operations for game discussion threads
 *
 * Actions:
 * - GET  ?action=list&gameId=xxx&sort=newest|top&limit=20&offset=0 - List comments with pagination
 * - GET  ?action=flagged&limit=50&offset=0 - Admin: list flagged comments
 * - POST ?action=create - Create comment (requires session)
 * - POST ?action=vote - Upvote/downvote (requires session)
 * - POST ?action=delete - Delete comment (requires session or admin)
 * - POST ?action=flag - Flag comment for moderation (requires session)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import DOMPurify from 'isomorphic-dompurify';
import { getSessionTokenFromCookie } from './_lib/utils/cookieUtils.js';
import { assertAdmin, getAdminSupabase, logAdminEvent } from './_lib/adminUtils.js';
import { logger } from './_lib/logger.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Rate limiting map (in-memory, resets on cold start)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW = 10000; // 10 seconds
const RATE_LIMIT_MAX = 1;
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

type CommentFlagDetail = {
  playerId: string;
  playerName: string;
  reason: string;
  createdAt: string;
};

/**
 * Content sanitization - strips all HTML tags
 */
function sanitizeContent(content: string): string {
  const clean = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true
  });
  return clean.trim();
}

/**
 * Rate limiting check - 1 comment per 10 seconds per player
 */
async function checkRateLimit(playerId: string): Promise<boolean> {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const key = `rl:comments:${playerId}`;
      const incrRes = await fetch(`${UPSTASH_URL}/incr/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${UPSTASH_TOKEN}`,
        },
      });
      if (!incrRes.ok) {
        logger.warn('Rate limit increment failed, falling back to in-memory limiter');
      } else {
        const incrBody = await incrRes.json();
        const count = Number(incrBody?.result ?? incrBody);
        if (count === 1) {
          await fetch(`${UPSTASH_URL}/expire/${encodeURIComponent(key)}/${Math.ceil(RATE_LIMIT_WINDOW / 1000)}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${UPSTASH_TOKEN}`,
            },
          });
        }
        return count <= RATE_LIMIT_MAX;
      }
    } catch (error) {
      logger.warn('Rate limit check failed, falling back to in-memory limiter:', error);
    }
  }

  const lastComment = rateLimitMap.get(playerId) || 0;
  const now = Date.now();

  if (now - lastComment < RATE_LIMIT_WINDOW) {
    return false;
  }

  rateLimitMap.set(playerId, now);
  return true;
}

/**
 * Validate comment depth - max 1 level (parent + replies)
 */
async function validateCommentDepth(parentId: string | null): Promise<boolean> {
  if (!parentId) return true; // Top-level comment, always valid

  // Check if parent exists and is not itself a reply
  const { data: parent } = await supabase
    .from('comments')
    .select('parent_id')
    .eq('id', parentId)
    .single();

  if (!parent) return false; // Parent doesn't exist
  if (parent.parent_id !== null) return false; // Parent is a reply (too deep)

  return true;
}

/**
 * Main API handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  try {
    // =====================================================
    // GET: List comments for a game
    // =====================================================
    if (req.method === 'GET' && action === 'list') {
      const { gameId, sort = 'newest', limit = '20', offset = '0' } = req.query as Record<string, string>;

      if (!gameId) {
        return res.status(400).json({ error: 'gameId is required' });
      }

      const limitNum = parseInt(limit, 10);
      const offsetNum = parseInt(offset, 10);

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({ error: 'Invalid limit (must be 1-100)' });
      }

      if (isNaN(offsetNum) || offsetNum < 0) {
        return res.status(400).json({ error: 'Invalid offset (must be >= 0)' });
      }

      // Build base query for top-level comments only (parent_id IS NULL)
      let query = supabase
        .from('comments')
        .select('*', { count: 'exact' })
        .eq('game_id', gameId)
        .is('parent_id', null)  // Top-level comments only
        .eq('is_deleted', false);

      // Apply sorting
      if (sort === 'top') {
        // Sort by score (upvotes - downvotes) descending, then by created_at
        query = query.order('upvotes', { ascending: false })
                     .order('downvotes', { ascending: true })
                     .order('created_at', { ascending: false });
      } else {
        // Default: sort by newest first
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      query = query.range(offsetNum, offsetNum + limitNum - 1);

      const { data: comments, error, count } = await query;

      if (error) {
        logger.error('Error fetching comments:', error);
        return res.status(500).json({ error: 'Failed to fetch comments' });
      }

      // Get reply counts for each comment
      const commentIds = comments?.map(c => c.id) || [];
      const { data: replyCounts } = await supabase
        .from('comments')
        .select('parent_id')
        .in('parent_id', commentIds)
        .eq('is_deleted', false);

      const replyCountMap = new Map<string, number>();
      replyCounts?.forEach(r => {
        replyCountMap.set(r.parent_id, (replyCountMap.get(r.parent_id) || 0) + 1);
      });

      // Get user's votes if authenticated
      const sessionToken = getSessionTokenFromCookie(req);
      let userVotes = new Map<string, string>();

      if (sessionToken && commentIds.length > 0) {
        const { data: player } = await supabase
          .from('players')
          .select('id')
          .eq('session_token', sessionToken)
          .single();

        if (player) {
          const { data: votes } = await supabase
            .from('comment_votes')
            .select('comment_id, vote_type')
            .in('comment_id', commentIds)
            .eq('player_id', player.id);

          votes?.forEach(v => {
            userVotes.set(v.comment_id, v.vote_type);
          });
        }
      }

      // Format response with additional fields
      const formattedComments = comments?.map(c => ({
        id: c.id,
        gameId: c.game_id,
        playerId: c.player_id,
        playerName: c.player_name,
        content: c.content,
        parentId: c.parent_id,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        upvotes: c.upvotes,
        downvotes: c.downvotes,
        score: c.upvotes - c.downvotes,
        flagCount: c.flag_count,
        isDeleted: c.is_deleted,
        isHidden: c.is_hidden,
        replyCount: replyCountMap.get(c.id) || 0,
        userVote: userVotes.get(c.id) || null,
        replies: []  // Populated separately by frontend
      })) || [];

      return res.status(200).json({
        total: count || 0,
        comments: formattedComments
      });
    }

    // =====================================================
    // GET: List flagged comments (Admin only)
    // =====================================================
    if (req.method === 'GET' && action === 'flagged') {
      if (!assertAdmin(req, res)) return;

      const { limit = '50', offset = '0' } = req.query as Record<string, string>;
      const limitNum = parseInt(limit, 10);
      const offsetNum = parseInt(offset, 10);

      // Get flagged comments (flag_count >= 3)
      const { data: comments, error, count } = await getAdminSupabase()
        .from('comments')
        .select('*', { count: 'exact' })
        .gte('flag_count', 3)
        .order('flag_count', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offsetNum, offsetNum + limitNum - 1);

      if (error) {
        logger.error('Error fetching flagged comments:', error);
        return res.status(500).json({ error: 'Failed to fetch flagged comments' });
      }

      // Get flag details for each comment
      const commentIds = comments?.map(c => c.id) || [];
      const { data: flags } = await getAdminSupabase()
        .from('comment_flags')
        .select('comment_id, player_id, reason, created_at')
        .in('comment_id', commentIds);

      // Get player names for flaggers
      const playerIds = flags?.map(f => f.player_id) || [];
      const { data: players } = await getAdminSupabase()
        .from('players')
        .select('id, name')
        .in('id', playerIds);

      const playerNameMap = new Map<string, string>();
      players?.forEach(p => playerNameMap.set(p.id, p.name));

      // Group flags by comment
      const flagsByComment = new Map<string, CommentFlagDetail[]>();
      flags?.forEach(f => {
        if (!flagsByComment.has(f.comment_id)) {
          flagsByComment.set(f.comment_id, []);
        }
        flagsByComment.get(f.comment_id)!.push({
          playerId: f.player_id,
          playerName: playerNameMap.get(f.player_id) || 'Unknown',
          reason: f.reason,
          createdAt: f.created_at
        });
      });

      // Format response
      const formattedComments = comments?.map(c => ({
        id: c.id,
        gameId: c.game_id,
        playerId: c.player_id,
        playerName: c.player_name,
        content: c.content,
        flagCount: c.flag_count,
        isHidden: c.is_hidden,
        isDeleted: c.is_deleted,
        createdAt: c.created_at,
        flags: flagsByComment.get(c.id) || []
      })) || [];

      return res.status(200).json({
        total: count || 0,
        comments: formattedComments
      });
    }

    // =====================================================
    // POST: Create comment
    // =====================================================
    if (req.method === 'POST' && action === 'create') {
      const sessionToken = getSessionTokenFromCookie(req);
      if (!sessionToken) {
        return res.status(401).json({ error: 'Unauthorized - no session' });
      }

      // Get player from session
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('id, name')
        .eq('session_token', sessionToken)
        .single();

      if (playerError || !player) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      // Check rate limit
      if (!(await checkRateLimit(player.id))) {
        return res.status(429).json({
          error: 'Rate limit exceeded. Please wait 10 seconds between comments.'
        });
      }

      const { gameId, content, parentId = null } = req.body;

      if (!gameId || !content) {
        return res.status(400).json({ error: 'gameId and content are required' });
      }

      // Sanitize content
      const cleanContent = sanitizeContent(content);

      // Validate length
      if (cleanContent.length < 5) {
        return res.status(400).json({ error: 'Comment must be at least 5 characters' });
      }

      if (cleanContent.length > 2000) {
        return res.status(400).json({ error: 'Comment must be at most 2000 characters' });
      }

      // Validate parent depth
      if (parentId) {
        const isValidDepth = await validateCommentDepth(parentId);
        if (!isValidDepth) {
          return res.status(400).json({ error: 'Invalid parent comment or reply depth exceeded (max 1 level)' });
        }
      }

      // Insert comment
      const { data: comment, error: insertError } = await supabase
        .from('comments')
        .insert({
          game_id: gameId,
          player_id: player.id,
          player_name: player.name,
          content: cleanContent,
          parent_id: parentId
        })
        .select()
        .single();

      if (insertError || !comment) {
        logger.error('Error creating comment:', insertError);
        return res.status(500).json({ error: 'Failed to create comment' });
      }

      return res.status(201).json({
        comment: {
          id: comment.id,
          gameId: comment.game_id,
          playerId: comment.player_id,
          playerName: comment.player_name,
          content: comment.content,
          parentId: comment.parent_id,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
          upvotes: 0,
          downvotes: 0,
          score: 0,
          flagCount: 0,
          isDeleted: false,
          isHidden: false,
          replyCount: 0
        }
      });
    }

    // =====================================================
    // POST: Vote on comment
    // =====================================================
    if (req.method === 'POST' && action === 'vote') {
      const sessionToken = getSessionTokenFromCookie(req);
      if (!sessionToken) {
        return res.status(401).json({ error: 'Unauthorized - no session' });
      }

      // Get player from session
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('id')
        .eq('session_token', sessionToken)
        .single();

      if (playerError || !player) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      const { commentId, voteType } = req.body;

      if (!commentId || !voteType) {
        return res.status(400).json({ error: 'commentId and voteType are required' });
      }

      if (!['up', 'down', 'remove'].includes(voteType)) {
        return res.status(400).json({ error: 'voteType must be "up", "down", or "remove"' });
      }

      // Remove vote if voteType is 'remove'
      if (voteType === 'remove') {
        const { error: deleteError } = await supabase
          .from('comment_votes')
          .delete()
          .eq('comment_id', commentId)
          .eq('player_id', player.id);
        if (deleteError) {
          logger.error('Error removing comment vote:', deleteError);
          return res.status(500).json({ error: 'Failed to update vote' });
        }
      } else {
        // Upsert vote (will update if already exists)
        const { error: upsertError } = await supabase
          .from('comment_votes')
          .upsert({
            comment_id: commentId,
            player_id: player.id,
            vote_type: voteType
          }, { onConflict: 'comment_id,player_id' });
        if (upsertError) {
          logger.error('Error upserting comment vote:', upsertError);
          return res.status(500).json({ error: 'Failed to update vote' });
        }
      }

      // Get updated comment
      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .select('upvotes, downvotes')
        .eq('id', commentId)
        .single();
      if (commentError) {
        logger.error('Error fetching updated comment votes:', commentError);
        return res.status(500).json({ error: 'Failed to fetch updated vote totals' });
      }

      // Get user's current vote
      const { data: userVote, error: userVoteError } = await supabase
        .from('comment_votes')
        .select('vote_type')
        .eq('comment_id', commentId)
        .eq('player_id', player.id)
        .single();
      if (userVoteError) {
        logger.error('Error fetching user vote state:', userVoteError);
        return res.status(500).json({ error: 'Failed to fetch user vote state' });
      }

      return res.status(200).json({
        success: true,
        upvotes: comment?.upvotes || 0,
        downvotes: comment?.downvotes || 0,
        score: (comment?.upvotes || 0) - (comment?.downvotes || 0),
        userVote: userVote?.vote_type || null
      });
    }

    // =====================================================
    // POST: Delete comment (soft delete)
    // =====================================================
    if (req.method === 'POST' && action === 'delete') {
      const sessionToken = getSessionTokenFromCookie(req);
      const { commentId } = req.body;

      if (!commentId) {
        return res.status(400).json({ error: 'commentId is required' });
      }

      // Check if admin
      const isAdmin = assertAdmin(req, res, false); // Don't send error response yet

      if (isAdmin) {
        // Admin can delete any comment
        await getAdminSupabase()
          .from('comments')
          .update({
            is_deleted: true,
            content: '[deleted]',
            updated_at: new Date().toISOString()
          })
          .eq('id', commentId);

        // Log admin action
        await logAdminEvent('comment_delete', commentId, { commentId }, req);

        return res.status(200).json({ success: true });
      }

      // Non-admin: verify session and ownership
      if (!sessionToken) {
        return res.status(401).json({ error: 'Unauthorized - no session' });
      }

      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('id')
        .eq('session_token', sessionToken)
        .single();

      if (playerError || !player) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      // Verify ownership
      const { data: comment } = await supabase
        .from('comments')
        .select('player_id')
        .eq('id', commentId)
        .single();

      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      if (comment.player_id !== player.id) {
        return res.status(403).json({ error: 'You can only delete your own comments' });
      }

      // Soft delete
      await supabase
        .from('comments')
        .update({
          is_deleted: true,
          content: '[deleted]',
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

      return res.status(200).json({ success: true });
    }

    // =====================================================
    // POST: Flag comment for moderation
    // =====================================================
    if (req.method === 'POST' && action === 'flag') {
      const sessionToken = getSessionTokenFromCookie(req);
      if (!sessionToken) {
        return res.status(401).json({ error: 'Unauthorized - no session' });
      }

      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('id')
        .eq('session_token', sessionToken)
        .single();

      if (playerError || !player) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      const { commentId, reason } = req.body;

      if (!commentId) {
        return res.status(400).json({ error: 'commentId is required' });
      }

      // Insert flag (will fail if already flagged due to unique constraint)
      const { error: flagError } = await supabase
        .from('comment_flags')
        .insert({
          comment_id: commentId,
          player_id: player.id,
          reason: reason || null
        });

      if (flagError) {
        // Check if it's a duplicate
        if (flagError.code === '23505') { // PostgreSQL unique violation
          return res.status(400).json({ error: 'You have already flagged this comment' });
        }
        logger.error('Error flagging comment:', flagError);
        return res.status(500).json({ error: 'Failed to flag comment' });
      }

      // Get updated comment
      const { data: comment } = await supabase
        .from('comments')
        .select('flag_count, is_hidden')
        .eq('id', commentId)
        .single();

      return res.status(200).json({
        success: true,
        flagCount: comment?.flag_count || 0,
        isHidden: comment?.is_hidden || false
      });
    }

    // Unknown action
    return res.status(400).json({ error: `Unknown action: ${action}` });

  } catch (error: unknown) {
    logger.error('Comments API error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}

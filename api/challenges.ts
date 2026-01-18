/**
 * Unified Challenges API Endpoint
 * Handles creating, accepting, declining challenges and fetching user challenges
 *
 * GET /api/challenges?action=my-challenges&playerId=xxx - Get player's challenges
 * POST /api/challenges?action=create - Create new challenge
 * POST /api/challenges?action=accept&challengeId=xxx - Accept a challenge
 * POST /api/challenges?action=decline&challengeId=xxx - Decline a challenge
 * POST /api/challenges?action=submit-score - Submit score for accepted challenge
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionTokenFromCookie } from './_lib/utils/cookieUtils.js';
import { logger } from './_lib/logger.js';
import { getServiceSupabase, isMissingTableError } from './_lib/supabaseServer.js';

const respondMissingTable = (res: VercelResponse, tableHint: string) =>
    res.status(500).json({
        error: `Database table missing (${tableHint}). Run the Supabase SQL migrations in /sql and then reload the schema cache.`,
    });

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { action, playerId, challengeId } = req.query;

    try {
        const supabase = getServiceSupabase();

        // ==== GET REQUESTS ====
        if (req.method === 'GET') {
            // Get player's challenges (sent and received)
            if (action === 'my-challenges' && playerId && typeof playerId === 'string') {
                const { data: challenges, error } = await supabase
                    .from('challenges')
                    .select(`
                        *,
                        challenger:players!challenges_challenger_id_fkey(id, name),
                        challenged:players!challenges_challenged_id_fkey(id, name),
                        winner:players!challenges_winner_id_fkey(id, name)
                    `)
                    .or(`challenger_id.eq.${playerId},challenged_id.eq.${playerId}`)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (error) {
                    if (isMissingTableError(error)) return respondMissingTable(res, 'challenges');
                    logger.error('Error fetching challenges:', error);
                    return res.status(500).json({ error: 'Failed to fetch challenges' });
                }

                // Flatten nested player data
                const formattedChallenges = challenges?.map(c => ({
                    ...c,
                    challenger_name: c.challenger?.name,
                    challenged_name: c.challenged?.name,
                    winner_name: c.winner?.name
                })) || [];

                return res.status(200).json(formattedChallenges);
            }

            return res.status(400).json({ error: 'Invalid GET request parameters' });
        }

        // ==== POST REQUESTS (require authentication) ====
        if (req.method === 'POST') {
            const sessionToken = getSessionTokenFromCookie(req);
            if (!sessionToken) {
                return res.status(401).json({ error: 'Unauthorized - No session token' });
            }

            // Get current player
            const { data: player, error: playerError } = await supabase
                .from('players')
                .select('id, name')
                .eq('session_token', sessionToken)
                .single();

            if (playerError) {
                if (isMissingTableError(playerError)) return respondMissingTable(res, 'players');
                return res.status(401).json({ error: 'Invalid session' });
            }
            if (!player) {
                return res.status(401).json({ error: 'Invalid session' });
            }

            // Create a new challenge
            if (action === 'create') {
                const { challenged_id, game_id, game_title, message } = req.body;

                if (!challenged_id || !game_id || !game_title) {
                    return res.status(400).json({
                        error: 'Missing required fields: challenged_id, game_id, game_title'
                    });
                }

                // Don't allow challenging yourself
                if (challenged_id === player.id) {
                    return res.status(400).json({ error: 'Cannot challenge yourself' });
                }

                // Create challenge
                const { data: challenge, error } = await supabase
                    .from('challenges')
                    .insert({
                        challenger_id: player.id,
                        challenged_id,
                        game_id,
                        game_title,
                        message: message || null,
                        status: 'pending'
                    })
                    .select(`
                        *,
                        challenger:players!challenges_challenger_id_fkey(id, name),
                        challenged:players!challenges_challenged_id_fkey(id, name)
                    `)
                    .single();

                if (error) {
                    if (isMissingTableError(error)) return respondMissingTable(res, 'challenges');
                    logger.error('Error creating challenge:', error);
                    return res.status(500).json({ error: 'Failed to create challenge' });
                }

                return res.status(201).json({
                    ...challenge,
                    challenger_name: challenge.challenger?.name,
                    challenged_name: challenge.challenged?.name
                });
            }

            // Accept a challenge
            if (action === 'accept' && challengeId && typeof challengeId === 'string') {
                // Verify user is the challenged player
                const { data: challenge } = await supabase
                    .from('challenges')
                    .select('*')
                    .eq('id', challengeId)
                    .single();

                if (!challenge) {
                    return res.status(404).json({ error: 'Challenge not found' });
                }

                if (challenge.challenged_id !== player.id) {
                    return res.status(403).json({ error: 'You are not authorized to accept this challenge' });
                }

                if (challenge.status !== 'pending') {
                    return res.status(400).json({ error: 'Challenge cannot be accepted (not pending)' });
                }

                // Update challenge status
                const { data: updated, error } = await supabase
                    .from('challenges')
                    .update({
                        status: 'accepted',
                        accepted_at: new Date().toISOString()
                    })
                    .eq('id', challengeId)
                    .select()
                    .single();

                if (error) {
                    if (isMissingTableError(error)) return respondMissingTable(res, 'challenges');
                    logger.error('Error accepting challenge:', error);
                    return res.status(500).json({ error: 'Failed to accept challenge' });
                }

                return res.status(200).json(updated);
            }

            // Decline a challenge
            if (action === 'decline' && challengeId && typeof challengeId === 'string') {
                // Verify user is the challenged player
                const { data: challenge } = await supabase
                    .from('challenges')
                    .select('*')
                    .eq('id', challengeId)
                    .single();

                if (!challenge) {
                    return res.status(404).json({ error: 'Challenge not found' });
                }

                if (challenge.challenged_id !== player.id) {
                    return res.status(403).json({ error: 'You are not authorized to decline this challenge' });
                }

                if (challenge.status !== 'pending') {
                    return res.status(400).json({ error: 'Challenge cannot be declined (not pending)' });
                }

                // Update challenge status
                const { data: updated, error } = await supabase
                    .from('challenges')
                    .update({ status: 'declined' })
                    .eq('id', challengeId)
                    .select()
                    .single();

                if (error) {
                    if (isMissingTableError(error)) return respondMissingTable(res, 'challenges');
                    logger.error('Error declining challenge:', error);
                    return res.status(500).json({ error: 'Failed to decline challenge' });
                }

                return res.status(200).json(updated);
            }

            // Submit score for a challenge
            if (action === 'submit-score') {
                const { challengeId: cId, score } = req.body;

                if (!cId || score === undefined || score === null) {
                    return res.status(400).json({ error: 'Missing challengeId or score' });
                }

                // Get challenge
                const { data: challenge } = await supabase
                    .from('challenges')
                    .select('*')
                    .eq('id', cId)
                    .single();

                if (!challenge) {
                    return res.status(404).json({ error: 'Challenge not found' });
                }

                // Verify user is part of the challenge
                if (challenge.challenger_id !== player.id && challenge.challenged_id !== player.id) {
                    return res.status(403).json({ error: 'You are not part of this challenge' });
                }

                // Verify challenge is accepted
                if (challenge.status !== 'accepted') {
                    return res.status(400).json({ error: 'Challenge must be accepted before submitting scores' });
                }

                // Update the appropriate score field
                const updateData: any = {};
                if (challenge.challenger_id === player.id) {
                    updateData.challenger_score = score;
                } else {
                    updateData.challenged_score = score;
                }

                const { data: updated, error } = await supabase
                    .from('challenges')
                    .update(updateData)
                    .eq('id', cId)
                    .select()
                    .single();

                if (error) {
                    if (isMissingTableError(error)) return respondMissingTable(res, 'challenges');
                    logger.error('Error submitting score:', error);
                    return res.status(500).json({ error: 'Failed to submit score' });
                }

                return res.status(200).json(updated);
            }

            return res.status(400).json({ error: 'Invalid POST action' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        logger.error('Unexpected error in challenges API:', error);
        if (isMissingTableError(error)) return respondMissingTable(res, 'challenges');
        return res.status(500).json({ error: 'Internal server error' });
    }
}

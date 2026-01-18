#!/usr/bin/env node
/**
 * Knowledge Base Seeding Script
 *
 * Seeds the RAG knowledge base with sourcing best practices.
 * Run this script after setting up the database tables.
 *
 * Usage:
 *   npx ts-node scripts/seedKnowledgeBase.ts
 *
 * Environment variables required:
 *   - SUPABASE_URL or VITE_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - GEMINI_API_KEY (for computing embeddings)
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { SOURCING_KNOWLEDGE, seedKnowledgeBase } from '../api/_lib/ragKnowledge.js';

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

async function main() {
  console.log('='.repeat(60));
  console.log('RAG Knowledge Base Seeding Script');
  console.log('='.repeat(60));

  // Validate environment
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }

  if (!geminiApiKey) {
    console.error('Error: GEMINI_API_KEY must be set for computing embeddings');
    process.exit(1);
  }

  // Initialize clients
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  // Count knowledge articles to seed
  const totalArticles = Object.values(SOURCING_KNOWLEDGE).flat().length;
  console.log(`\nFound ${totalArticles} knowledge articles to seed across categories:`);

  for (const [category, articles] of Object.entries(SOURCING_KNOWLEDGE)) {
    console.log(`  - ${category}: ${articles.length} articles`);
  }

  console.log('\nStarting seeding process...\n');

  // Create embedding function
  const computeEmbedding = async (text: string): Promise<number[]> => {
    try {
      const result = await ai.models.embedContent({
        model: 'text-embedding-004',
        content: { parts: [{ text }] }
      } as any);
      return (result as any)?.embedding?.values || [];
    } catch (error) {
      console.error('Error computing embedding:', error);
      return [];
    }
  };

  // Seed the knowledge base
  const result = await seedKnowledgeBase(supabase, computeEmbedding);

  console.log('\n' + '='.repeat(60));
  if (result.success) {
    console.log(`SUCCESS: Seeded ${result.articlesSeeded} articles`);
  } else {
    console.log(`PARTIAL: Seeded ${result.articlesSeeded} articles with errors`);
    if (result.error) {
      console.error(`Error: ${result.error}`);
    }
  }
  console.log('='.repeat(60));

  // Verify seeding by querying the database
  console.log('\nVerifying seeded articles...');

  const { data: articles, error } = await supabase
    .from('knowledge_articles')
    .select('id, title, category, quality_score')
    .eq('is_active', true)
    .order('category');

  if (error) {
    console.error('Error verifying articles:', error);
  } else if (articles) {
    console.log(`\nFound ${articles.length} active articles in database:`);
    const byCategory = new Map<string, number>();
    for (const article of articles) {
      byCategory.set(article.category, (byCategory.get(article.category) || 0) + 1);
    }
    for (const [category, count] of byCategory.entries()) {
      console.log(`  - ${category}: ${count} articles`);
    }
  }

  console.log('\nKnowledge base seeding complete!');
}

main().catch(console.error);

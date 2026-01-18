/**
 * RAG Knowledge Base Service
 *
 * Retrieval-Augmented Generation for sourcing domain knowledge.
 * Provides contextual best practices and expert knowledge to the AI
 * for more consistent, domain-expert feedback.
 *
 * @version 1.0.0
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SkillCategory } from '../../types.js';

// ============================================================================
// Types
// ============================================================================

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  content: string;
  summary?: string;
  keyPoints: string[];
  goodExamples: string[];
  badExamples: string[];
  commonMistakes: string[];
  skillLevels: string[];
  qualityScore: number;
}

export interface KnowledgeChunk {
  id: string;
  articleId: string;
  articleTitle: string;
  chunkText: string;
  chunkType: 'content' | 'example' | 'tip' | 'mistake';
  similarity: number;
}

export interface RetrievalResult {
  articles: Array<KnowledgeArticle & { similarity: number }>;
  chunks: KnowledgeChunk[];
  context: string; // Formatted context for AI prompt
  retrievalTimeMs: number;
  avgSimilarity: number;
  maxSimilarity: number;
}

export interface RAGContext {
  domainKnowledge: string;
  bestPractices: string[];
  commonMistakes: string[];
  examplePatterns: string[];
  evaluationGuidelines: string[];
}

// ============================================================================
// Configuration
// ============================================================================

export const RAG_CONFIG = {
  // Number of articles to retrieve
  maxArticles: 3,

  // Number of chunks for fine-grained context
  maxChunks: 5,

  // Minimum similarity threshold
  minSimilarity: 0.45,

  // Maximum context length (characters) to include in prompt
  maxContextLength: 2000,

  // Whether to include examples in context
  includeExamples: true,

  // Cache TTL for knowledge (in memory)
  cacheTtlMs: 5 * 60 * 1000, // 5 minutes
};

// ============================================================================
// In-Memory Knowledge Cache
// ============================================================================

interface CachedKnowledge {
  articles: Map<string, KnowledgeArticle[]>; // by category
  timestamp: number;
}

let knowledgeCache: CachedKnowledge | null = null;

const isCacheValid = (): boolean => {
  if (!knowledgeCache) return false;
  return Date.now() - knowledgeCache.timestamp < RAG_CONFIG.cacheTtlMs;
};

// ============================================================================
// Built-in Domain Knowledge
// (Used as fallback when database is not seeded)
// ============================================================================

export const SOURCING_KNOWLEDGE: Record<string, KnowledgeArticle[]> = {
  boolean: [
    {
      id: 'boolean-fundamentals',
      title: 'Boolean Search Fundamentals',
      category: 'boolean',
      subcategory: 'basics',
      content: `Boolean search is the foundation of technical recruiting. Effective Boolean strings combine keywords with operators (AND, OR, NOT) and modifiers (quotes, parentheses, wildcards) to find precise candidate matches.

Key principles:
1. Start broad, then narrow - begin with core skills, add filters incrementally
2. Use OR for synonyms and variations (e.g., "software engineer" OR "developer" OR "programmer")
3. Use AND to require multiple criteria (e.g., Python AND "machine learning")
4. Use NOT sparingly - over-exclusion misses good candidates
5. Parentheses group related terms and control operator precedence
6. Quotes force exact phrase matching
7. Consider international variations and abbreviations`,
      summary: 'Core Boolean operators and search construction principles',
      keyPoints: [
        'AND requires all terms to be present',
        'OR finds any of the listed terms (increases results)',
        'NOT excludes terms (use carefully)',
        'Parentheses group related OR terms before AND',
        'Quotes match exact phrases',
        'Always include synonyms and variations',
      ],
      goodExamples: [
        '("software engineer" OR developer) AND (Python OR Java) AND (AWS OR "Amazon Web Services")',
        '(recruiter OR "talent acquisition" OR sourcer) AND (tech OR technology OR IT) NOT agency',
      ],
      badExamples: [
        'software engineer python - Missing operators, too simple',
        'engineer NOT junior NOT intern NOT entry - Over-exclusion',
      ],
      commonMistakes: [
        'Forgetting to use OR for synonyms and variations',
        'Not grouping OR terms in parentheses',
        'Over-using NOT which excludes good candidates',
        'Forgetting location variations (NYC, New York, NY)',
        'Not including abbreviations (K8s for Kubernetes)',
      ],
      skillLevels: ['beginner', 'intermediate', 'expert'],
      qualityScore: 0.95,
    },
    {
      id: 'boolean-advanced',
      title: 'Advanced Boolean Techniques',
      category: 'boolean',
      subcategory: 'advanced',
      content: `Advanced Boolean searches go beyond basic operators to leverage platform-specific features, proximity operators, and strategic query construction.

Advanced techniques:
1. X-Ray searching: Use site: operator to search within specific platforms (site:linkedin.com/in/)
2. Proximity operators: NEAR/n finds terms within n words of each other
3. Wildcards: * matches multiple characters, ? matches single character
4. Title/URL targeting: intitle: and inurl: focus on specific page elements
5. Nested Boolean: Multiple levels of parentheses for complex logic
6. Exclusion patterns: Identify and exclude non-target profiles systematically`,
      summary: 'Platform-specific operators and sophisticated search patterns',
      keyPoints: [
        'site: restricts search to specific domains',
        'intitle: searches page titles only',
        'inurl: searches URL strings',
        'Wildcards expand term matching (develop* matches developer, development)',
        'NEAR operator finds terms in proximity',
        'Combine multiple advanced operators strategically',
      ],
      goodExamples: [
        'site:linkedin.com/in/ ("senior engineer" OR "staff engineer") AND (Rust OR Go) AND (distributed OR "systems programming")',
        'site:github.com (kubernetes OR k8s) AND contributor AND (maintainer OR committer)',
      ],
      badExamples: [
        'site:linkedin.com engineer - Too broad, millions of results',
        'intitle:resume AND inurl:resume - Redundant operators',
      ],
      commonMistakes: [
        'Using site: without /in/ for LinkedIn profiles',
        'Forgetting that Google interprets spaces as AND',
        'Not testing X-Ray strings before deploying',
        'Ignoring platform-specific syntax requirements',
      ],
      skillLevels: ['intermediate', 'expert'],
      qualityScore: 0.92,
    },
  ],

  outreach: [
    {
      id: 'outreach-personalization',
      title: 'Personalization in Candidate Outreach',
      category: 'outreach',
      subcategory: 'personalization',
      content: `Effective outreach stands out through genuine personalization. Generic templates get ignored; personalized messages get responses.

Personalization hierarchy (from strongest to weakest):
1. Specific work mention: Reference their actual project, post, or contribution
2. Company/role insight: Show you understand their current situation
3. Mutual connection: Leverage shared network or background
4. Industry relevance: Demonstrate domain understanding
5. Career trajectory: Acknowledge their growth and potential

The first 2-3 lines are critical - they determine if the rest gets read. Lead with personalization, not the opportunity.`,
      summary: 'Creating genuine connections through research-based personalization',
      keyPoints: [
        'Lead with personalization in the first 1-2 sentences',
        'Reference specific, verifiable details about the candidate',
        'Show genuine interest in their work, not just filling a role',
        'Avoid generic compliments - be specific',
        'Research their recent activity, posts, or projects',
        'Match your tone to their professional style',
      ],
      goodExamples: [
        'Opening: "Your talk on microservices at KubeCon caught my attention - particularly your approach to service mesh optimization."',
        'Opening: "I noticed you just shipped the new authentication module at [Company] - congrats on the launch!"',
      ],
      badExamples: [
        '"I came across your impressive profile..." - Generic, says nothing specific',
        '"With your background, you\'d be perfect..." - Assumes without evidence',
      ],
      commonMistakes: [
        'Using generic compliments that could apply to anyone',
        'Mentioning profile details without genuine insight',
        'Over-personalizing (seems stalker-ish)',
        'Personalization that is clearly automated/templated',
        'Not connecting personalization to the opportunity',
      ],
      skillLevels: ['beginner', 'intermediate', 'expert'],
      qualityScore: 0.94,
    },
    {
      id: 'outreach-structure',
      title: 'Message Structure and Call-to-Action',
      category: 'outreach',
      subcategory: 'structure',
      content: `Message structure directly impacts response rates. The best messages are concise, clear, and make responding easy.

Optimal structure:
1. Hook (1-2 lines): Personalized opening that earns attention
2. Value proposition (2-3 lines): Why this matters TO THEM
3. Credibility (1-2 lines): Why they should trust you/the opportunity
4. Call-to-action (1 line): Clear, low-friction next step

Key principles:
- Keep under 150 words for initial outreach
- Mobile-friendly: First 3 lines visible in preview
- One clear CTA, not multiple options
- Make responding easy (yes/no questions work)
- Respect their time - get to the point`,
      summary: 'Optimal message structure for maximum response rates',
      keyPoints: [
        'Keep messages under 150 words',
        'First 2-3 sentences must hook the reader',
        'Include clear value proposition for the candidate',
        'End with single, clear call-to-action',
        'Make responding easy with yes/no questions',
        'Be mobile-friendly - assume preview reading',
      ],
      goodExamples: [
        'CTA: "Would you be open to a quick call this week to explore if this could be a fit?"',
        'CTA: "Does this sound interesting enough to learn more?"',
      ],
      badExamples: [
        'CTA: "Let me know if you want to talk, or feel free to share your resume, or I can send more info, whatever works!"',
        'No CTA: Message ends without asking for anything',
      ],
      commonMistakes: [
        'Writing essays instead of concise messages',
        'Burying the opportunity description',
        'Multiple competing calls-to-action',
        'No clear next step for the candidate',
        'Using jargon-heavy language',
      ],
      skillLevels: ['beginner', 'intermediate', 'expert'],
      qualityScore: 0.93,
    },
    {
      id: 'outreach-candidate-pov',
      title: 'Candidate-Centric Messaging',
      category: 'outreach',
      subcategory: 'perspective',
      content: `The most effective outreach centers on the candidate's perspective, not the company's needs. Think "WIIFM" (What's In It For Me) from the candidate's view.

Candidate-centric principles:
1. Lead with their potential gain, not your hiring need
2. Address their likely concerns proactively
3. Show you understand their career stage and goals
4. Respect that they may be happy where they are
5. Offer value even if they're not interested (insights, connections)

Shift from company-centric to candidate-centric:
- "We need a senior engineer" → "This role would let you lead architecture decisions"
- "We have great benefits" → "You'd have freedom to work on problems that interest you"
- "We're growing fast" → "You'd shape the technical direction as we scale"`,
      summary: 'Framing opportunities from the candidate perspective',
      keyPoints: [
        'Focus on what the candidate gains, not what you need',
        'Understand their likely career goals and concerns',
        'Show respect for their current position',
        'Offer value beyond just a job opportunity',
        'Acknowledge the relationship is two-way',
        'Use "you" more than "we" in your message',
      ],
      goodExamples: [
        '"This role would give you ownership of the ML infrastructure decisions - something I know can be hard to get at larger companies."',
        '"Given your interest in distributed systems, you might find our consensus protocol work interesting."',
      ],
      badExamples: [
        '"We urgently need to hire for this role" - Company-centric, shows desperation',
        '"Our company is amazing because..." - Self-focused, not candidate-focused',
      ],
      commonMistakes: [
        'Leading with company accomplishments',
        'Focusing on what you need from them',
        'Not acknowledging their current role value',
        'Generic "great opportunity" language',
        'Assuming they want to leave their job',
      ],
      skillLevels: ['intermediate', 'expert'],
      qualityScore: 0.91,
    },
  ],

  diversity: [
    {
      id: 'diversity-sourcing-fundamentals',
      title: 'Inclusive Sourcing Strategies',
      category: 'diversity',
      subcategory: 'fundamentals',
      content: `Diverse sourcing requires intentional strategy, not just good intentions. It means expanding where you look, how you search, and how you evaluate.

Key strategies:
1. Expand source channels: HBCUs, diversity-focused groups, underrepresented communities
2. Rewrite Boolean to include diverse institutions and organizations
3. Focus on skills over pedigree - prestigious school bias excludes talent
4. Partner with diversity-focused organizations and bootcamps
5. Build long-term relationships, not just transactional outreach
6. Review job requirements for unnecessary barriers

Common diversity-focused sources:
- Professional associations (NSBE, SWE, SHPE, Out in Tech, etc.)
- Bootcamps and alternative education programs
- Community colleges and state universities
- Diversity-focused job boards and Slack communities`,
      summary: 'Intentional strategies for building diverse candidate pipelines',
      keyPoints: [
        'Expand sourcing channels beyond traditional networks',
        'Include diverse institutions in Boolean searches',
        'Focus on skills and potential, not just pedigree',
        'Partner with diversity-focused organizations',
        'Build long-term community relationships',
        'Audit job requirements for unnecessary barriers',
      ],
      goodExamples: [
        'Boolean includes: (NSBE OR SHPE OR SWE OR "Out in Tech" OR Lesbians Who Tech)',
        'Sourcing from bootcamps: (Flatiron OR "Hack Reactor" OR "App Academy" OR "Grace Hopper")',
      ],
      badExamples: [
        'Only sourcing from Ivy League or top tech companies',
        'Using gendered language in searches (ninja, rockstar)',
      ],
      commonMistakes: [
        'Treating diversity as a checkbox, not a strategy',
        'Only sourcing for "diversity roles" vs all roles',
        'Not adjusting requirements that exclude diverse candidates',
        'Performative diversity without real commitment',
        'Ignoring unconscious bias in evaluation',
      ],
      skillLevels: ['beginner', 'intermediate', 'expert'],
      qualityScore: 0.90,
    },
  ],

  linkedin: [
    {
      id: 'linkedin-search-optimization',
      title: 'LinkedIn Recruiter Search Optimization',
      category: 'linkedin',
      subcategory: 'search',
      content: `LinkedIn Recruiter offers powerful filters but requires strategic use. Combine filters with Boolean, use saved searches, and leverage unique LinkedIn data.

Optimization techniques:
1. Use "Current Title" vs "Past Title" strategically
2. Leverage "Years in current position" for timing opportunities
3. Use "Open to Work" signals appropriately
4. Combine Boolean in keyword field with structured filters
5. Save and iterate on searches over time
6. Use Projects and Publications for technical depth

LinkedIn-specific considerations:
- Profile completeness affects searchability
- InMail limits require prioritization
- Connection degree affects visibility
- Recruiter Lite vs full Recruiter have different capabilities`,
      summary: 'Maximizing LinkedIn Recruiter search effectiveness',
      keyPoints: [
        'Use current vs past title filters strategically',
        'Combine Boolean keywords with structured filters',
        'Leverage LinkedIn-specific data (years in position, etc.)',
        'Consider profile completeness in search strategy',
        'Prioritize InMails carefully given limits',
        'Iterate and save successful searches',
      ],
      goodExamples: [
        'Combining: Keywords = "(Python OR Go) AND distributed" + Filter: Current Title = "Senior Engineer" + Years in position = 2-4',
        'Using Open to Work + specific skills + location radius for warm leads',
      ],
      badExamples: [
        'Relying solely on keywords without filters',
        'Ignoring "years in current position" for timing',
      ],
      commonMistakes: [
        'Not using quotes for multi-word titles in filters',
        'Ignoring the difference between Recruiter tiers',
        'Not saving successful search combinations',
        'Over-relying on Open to Work (misses passive candidates)',
      ],
      skillLevels: ['beginner', 'intermediate', 'expert'],
      qualityScore: 0.88,
    },
  ],

  general: [
    {
      id: 'sourcing-metrics',
      title: 'Sourcing Metrics and Performance',
      category: 'general',
      subcategory: 'metrics',
      content: `Data-driven sourcing requires tracking the right metrics. Focus on quality indicators, not just activity volume.

Key metrics to track:
1. Response rate: % of outreach that gets a reply
2. Positive response rate: % of replies that express interest
3. Screen-to-submit ratio: Quality of sourced pipeline
4. Source-to-hire ratio: Ultimate effectiveness
5. Time-to-fill impact: Sourcing speed contribution
6. Diversity metrics: Pipeline diversity at each stage

Quality > Quantity principle:
A 30% response rate on 20 targeted messages beats a 5% rate on 200 spray-and-pray messages. Track quality indicators alongside volume.`,
      summary: 'Key performance indicators for sourcing effectiveness',
      keyPoints: [
        'Track response rate as primary engagement metric',
        'Measure quality through screen-to-hire ratios',
        'Monitor diversity at each pipeline stage',
        'Focus on positive response rate, not just replies',
        'Quality outreach beats high-volume spray-and-pray',
        'Use data to iterate on messaging and targeting',
      ],
      goodExamples: [
        'Tracking: 25 messages → 8 responses (32%) → 5 interested (20%) → 3 screens → 1 hire',
        'A/B testing subject lines and measuring response rate differences',
      ],
      badExamples: [
        'Measuring success only by messages sent',
        'Ignoring conversion rates between stages',
      ],
      commonMistakes: [
        'Focusing on volume over quality',
        'Not tracking diversity through the funnel',
        'Ignoring response rate as feedback signal',
        'Not iterating based on data',
      ],
      skillLevels: ['intermediate', 'expert'],
      qualityScore: 0.87,
    },
    {
      id: 'sourcing-ethics',
      title: 'Ethical Sourcing Practices',
      category: 'general',
      subcategory: 'ethics',
      content: `Ethical sourcing builds long-term reputation and relationships. Short-term tricks damage trust and brand.

Ethical principles:
1. Honest representation of opportunities (no bait-and-switch)
2. Respect for candidate time and privacy
3. Clear about who you are and who you represent
4. Provide value in every interaction
5. Handle rejections gracefully
6. Maintain confidentiality of candidate information

Long-term relationship building:
- Candidates become sources for referrals
- Today's "no" might be tomorrow's "yes"
- Reputation follows you in the industry
- Ghosting candidates damages employer brand`,
      summary: 'Building trust through ethical sourcing practices',
      keyPoints: [
        'Be honest about the opportunity and company',
        'Respect candidate time with concise, relevant outreach',
        'Always identify yourself and your client/company clearly',
        'Provide value even when candidates decline',
        'Never ghost candidates - close loops professionally',
        'Protect candidate information confidentially',
      ],
      goodExamples: [
        'Providing salary range upfront when asked',
        'Following up with candidates after rejection to share feedback',
      ],
      badExamples: [
        'Vague job descriptions to get more applications',
        'Ghosting candidates after interviews',
      ],
      commonMistakes: [
        'Overselling opportunities to get interest',
        'Not disclosing agency relationship',
        'Sharing candidate info without permission',
        'Pressuring candidates to make decisions',
      ],
      skillLevels: ['beginner', 'intermediate', 'expert'],
      qualityScore: 0.89,
    },
  ],

  xray: [
    {
      id: 'xray-fundamentals',
      title: 'X-Ray Search Fundamentals',
      category: 'xray',
      subcategory: 'basics',
      content: `X-Ray searching uses search engines (primarily Google) to find profiles on platforms that limit internal search. The site: operator is the key.

Core X-Ray patterns:
1. LinkedIn profiles: site:linkedin.com/in/ [keywords]
2. GitHub profiles: site:github.com [keywords] -site:github.com/topics
3. Stack Overflow: site:stackoverflow.com/users [keywords]
4. Twitter/X profiles: site:twitter.com [keywords] inurl:status -inurl:status

Refinement operators:
- intitle: searches page titles
- inurl: searches URL strings
- filetype: finds specific document types
- -[term] excludes results containing term

X-Ray advantages:
- Access profiles without platform account limits
- Combine with Google's powerful search capabilities
- Find passive candidates not on recruiter platforms`,
      summary: 'Using search engines to find profiles across platforms',
      keyPoints: [
        'site: operator restricts search to specific domains',
        'Use /in/ for LinkedIn to target profile pages only',
        'Combine with standard Boolean operators',
        'Exclude common false positives with NOT or -',
        'intitle: and inurl: help refine results',
        'Different platforms require different URL patterns',
      ],
      goodExamples: [
        'site:linkedin.com/in/ ("staff engineer" OR "principal engineer") AND kubernetes AND (Bay Area OR "San Francisco")',
        'site:github.com "machine learning" AND (tensorflow OR pytorch) AND (maintainer OR "core contributor")',
      ],
      badExamples: [
        'site:linkedin.com developer - Too broad, includes company pages, posts, etc.',
        'linkedin.com/in/ engineer - Missing site: operator',
      ],
      commonMistakes: [
        'Forgetting /in/ for LinkedIn profile pages',
        'Not excluding noise results (company pages, job posts)',
        'Using platform-specific syntax in Google searches',
        'Not testing and refining X-Ray strings',
      ],
      skillLevels: ['beginner', 'intermediate', 'expert'],
      qualityScore: 0.91,
    },
  ],

  persona: [
    {
      id: 'candidate-persona-building',
      title: 'Building Effective Candidate Personas',
      category: 'persona',
      subcategory: 'creation',
      content: `Candidate personas help focus sourcing by defining the ideal candidate profile based on role requirements and successful hires.

Persona components:
1. Technical skills (must-have vs nice-to-have)
2. Experience level and trajectory
3. Company background patterns
4. Educational indicators (but avoid over-relying)
5. Motivational drivers (what makes them move)
6. Red flags and disqualifiers

Building process:
1. Interview hiring managers about best hires
2. Analyze LinkedIn profiles of top performers
3. Identify patterns in career paths
4. Understand what attracted successful hires
5. Define anti-patterns from bad hires
6. Validate with recruiting data`,
      summary: 'Defining target candidate profiles to focus sourcing efforts',
      keyPoints: [
        'Base personas on actual successful hires',
        'Include motivational drivers, not just skills',
        'Separate must-haves from nice-to-haves',
        'Consider career trajectory patterns',
        'Identify red flags from past bad hires',
        'Update personas based on hiring feedback',
      ],
      goodExamples: [
        'Persona includes: "Motivated by technical challenges over management track, typically at company for 2-4 years, values learning opportunities"',
        'Including motivators: "Looking for remote flexibility" or "Interested in equity upside"',
      ],
      badExamples: [
        'Persona is just a list of technical requirements',
        'Over-relying on school pedigree in persona',
      ],
      commonMistakes: [
        'Creating personas without input from hiring data',
        'Focusing only on technical skills, ignoring motivations',
        'Not updating personas as role evolves',
        'Making personas too narrow (missing good candidates)',
      ],
      skillLevels: ['intermediate', 'expert'],
      qualityScore: 0.86,
    },
  ],
};

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Convert embedding array to pgvector format string
 */
const toPgVector = (embedding: number[]): string => {
  return `[${embedding.join(',')}]`;
};

/**
 * Search knowledge base using semantic similarity
 */
export const searchKnowledge = async (
  supabase: SupabaseClient,
  queryEmbedding: number[],
  options: {
    category?: string;
    skillLevel?: string;
    limit?: number;
    minSimilarity?: number;
  } = {}
): Promise<Array<KnowledgeArticle & { similarity: number }>> => {
  const {
    category,
    skillLevel = 'intermediate',
    limit = RAG_CONFIG.maxArticles,
    minSimilarity = RAG_CONFIG.minSimilarity,
  } = options;

  try {
    const { data, error } = await supabase.rpc('search_knowledge', {
      p_query_embedding: toPgVector(queryEmbedding),
      p_category: category || null,
      p_skill_level: skillLevel,
      p_limit: limit,
      p_min_similarity: minSimilarity,
    });

    if (error) {
      console.warn('[RAG] search_knowledge RPC failed:', error.message);
      // Fall back to built-in knowledge
      return getBuiltInKnowledge(category, limit);
    }

    return (data ?? []).map((row: any) => ({
      id: row.article_id,
      title: row.title,
      category: row.category,
      content: row.content,
      summary: row.summary,
      keyPoints: row.key_points || [],
      goodExamples: row.good_examples || [],
      badExamples: [],
      commonMistakes: row.common_mistakes || [],
      skillLevels: [],
      qualityScore: row.quality_score,
      similarity: row.similarity,
    }));
  } catch (err) {
    console.error('[RAG] Error searching knowledge:', err);
    return getBuiltInKnowledge(category, limit);
  }
};

/**
 * Search knowledge chunks for fine-grained context
 */
export const searchKnowledgeChunks = async (
  supabase: SupabaseClient,
  queryEmbedding: number[],
  options: {
    category?: string;
    chunkTypes?: string[];
    limit?: number;
    minSimilarity?: number;
  } = {}
): Promise<KnowledgeChunk[]> => {
  const {
    category,
    chunkTypes = ['content', 'example', 'tip'],
    limit = RAG_CONFIG.maxChunks,
    minSimilarity = RAG_CONFIG.minSimilarity,
  } = options;

  try {
    const { data, error } = await supabase.rpc('search_knowledge_chunks', {
      p_query_embedding: toPgVector(queryEmbedding),
      p_category: category || null,
      p_chunk_types: chunkTypes,
      p_limit: limit,
      p_min_similarity: minSimilarity,
    });

    if (error) {
      console.warn('[RAG] search_knowledge_chunks RPC failed:', error.message);
      return [];
    }

    return (data ?? []).map((row: any) => ({
      id: row.chunk_id,
      articleId: row.article_id,
      articleTitle: row.article_title,
      chunkText: row.chunk_text,
      chunkType: row.chunk_type,
      similarity: row.similarity,
    }));
  } catch (err) {
    console.error('[RAG] Error searching chunks:', err);
    return [];
  }
};

/**
 * Get built-in knowledge by category (fallback when DB not seeded)
 */
const getBuiltInKnowledge = (
  category?: string,
  limit: number = 3
): Array<KnowledgeArticle & { similarity: number }> => {
  let articles: KnowledgeArticle[] = [];

  if (category && SOURCING_KNOWLEDGE[category]) {
    articles = SOURCING_KNOWLEDGE[category];
  } else {
    // Get from all categories
    articles = Object.values(SOURCING_KNOWLEDGE).flat();
  }

  // Sort by quality score and return top N
  return articles
    .sort((a, b) => b.qualityScore - a.qualityScore)
    .slice(0, limit)
    .map(a => ({ ...a, similarity: 0.8 })); // Assign default similarity
};

/**
 * Get knowledge by category without embedding search
 */
export const getKnowledgeByCategory = async (
  supabase: SupabaseClient,
  category: string,
  options: { includeExamples?: boolean; limit?: number } = {}
): Promise<KnowledgeArticle[]> => {
  const { includeExamples = true, limit = 10 } = options;

  try {
    const { data, error } = await supabase.rpc('get_knowledge_by_category', {
      p_category: category,
      p_include_examples: includeExamples,
      p_limit: limit,
    });

    if (error) {
      console.warn('[RAG] get_knowledge_by_category failed:', error.message);
      return getBuiltInKnowledge(category, limit).map(({ similarity, ...a }) => a);
    }

    return (data ?? []).map((row: any) => ({
      id: row.article_id,
      title: row.title,
      category,
      content: '',
      summary: row.summary,
      keyPoints: row.key_points || [],
      goodExamples: row.good_examples || [],
      badExamples: [],
      commonMistakes: row.common_mistakes || [],
      skillLevels: [],
      qualityScore: row.quality_score,
    }));
  } catch (err) {
    console.error('[RAG] Error getting knowledge by category:', err);
    return getBuiltInKnowledge(category, limit).map(({ similarity, ...a }) => a);
  }
};

// ============================================================================
// Context Building
// ============================================================================

/**
 * Build RAG context for AI prompt from retrieved knowledge
 */
export const buildRAGContext = (
  articles: Array<KnowledgeArticle & { similarity: number }>,
  chunks: KnowledgeChunk[],
  options: { maxLength?: number; includeExamples?: boolean } = {}
): RAGContext => {
  const { maxLength = RAG_CONFIG.maxContextLength, includeExamples = true } = options;

  const bestPractices: string[] = [];
  const commonMistakes: string[] = [];
  const examplePatterns: string[] = [];
  const evaluationGuidelines: string[] = [];

  // Extract from articles
  for (const article of articles) {
    if (article.keyPoints) {
      bestPractices.push(...article.keyPoints.slice(0, 3));
    }
    if (article.commonMistakes) {
      commonMistakes.push(...article.commonMistakes.slice(0, 3));
    }
    if (includeExamples && article.goodExamples) {
      examplePatterns.push(...article.goodExamples.slice(0, 2));
    }
  }

  // Extract from chunks
  for (const chunk of chunks) {
    if (chunk.chunkType === 'tip') {
      bestPractices.push(chunk.chunkText);
    } else if (chunk.chunkType === 'mistake') {
      commonMistakes.push(chunk.chunkText);
    } else if (chunk.chunkType === 'example' && includeExamples) {
      examplePatterns.push(chunk.chunkText);
    }
  }

  // Build formatted domain knowledge string
  let domainKnowledge = '';

  if (articles.length > 0) {
    const topArticle = articles[0];
    domainKnowledge = topArticle.summary || topArticle.content.slice(0, 500);
  }

  // Build evaluation guidelines from best practices
  evaluationGuidelines.push(
    'Award higher scores for submissions that follow domain best practices',
    'Deduct points for common mistakes identified in the knowledge base',
    'Consider whether the submission demonstrates understanding of core principles'
  );

  // Truncate to max length
  if (domainKnowledge.length > maxLength) {
    domainKnowledge = domainKnowledge.slice(0, maxLength) + '...';
  }

  return {
    domainKnowledge,
    bestPractices: [...new Set(bestPractices)].slice(0, 6),
    commonMistakes: [...new Set(commonMistakes)].slice(0, 5),
    examplePatterns: [...new Set(examplePatterns)].slice(0, 3),
    evaluationGuidelines,
  };
};

/**
 * Format RAG context for inclusion in AI prompt
 */
export const formatRAGContextForPrompt = (context: RAGContext): string => {
  const sections: string[] = [];

  if (context.domainKnowledge) {
    sections.push(`## DOMAIN EXPERTISE\n${context.domainKnowledge}`);
  }

  if (context.bestPractices.length > 0) {
    sections.push(`## BEST PRACTICES TO REWARD\n${context.bestPractices.map(p => `- ${p}`).join('\n')}`);
  }

  if (context.commonMistakes.length > 0) {
    sections.push(`## COMMON MISTAKES TO PENALIZE\n${context.commonMistakes.map(m => `- ${m}`).join('\n')}`);
  }

  if (context.examplePatterns.length > 0) {
    sections.push(`## EXAMPLE PATTERNS\n${context.examplePatterns.map((e, i) => `${i + 1}. ${e}`).join('\n')}`);
  }

  if (context.evaluationGuidelines.length > 0) {
    sections.push(`## EVALUATION GUIDELINES\n${context.evaluationGuidelines.map(g => `- ${g}`).join('\n')}`);
  }

  return sections.join('\n\n');
};

// ============================================================================
// Main Retrieval Function
// ============================================================================

/**
 * Retrieve relevant knowledge for a game submission
 */
export const retrieveKnowledgeForScoring = async (
  supabase: SupabaseClient,
  submission: string,
  game: { id: string; skillCategory: SkillCategory; task: string },
  submissionEmbedding: number[],
  options: {
    skillLevel?: string;
    maxArticles?: number;
    maxChunks?: number;
  } = {}
): Promise<RetrievalResult> => {
  const startTime = Date.now();
  const {
    skillLevel = 'intermediate',
    maxArticles = RAG_CONFIG.maxArticles,
    maxChunks = RAG_CONFIG.maxChunks,
  } = options;

  // Map skill category to knowledge category
  const category = mapSkillToKnowledgeCategory(game.skillCategory);

  let articles: Array<KnowledgeArticle & { similarity: number }> = [];
  let chunks: KnowledgeChunk[] = [];

  // If we have an embedding, do semantic search
  if (submissionEmbedding && submissionEmbedding.length > 0) {
    // Search articles and chunks in parallel
    const [articlesResult, chunksResult] = await Promise.all([
      searchKnowledge(supabase, submissionEmbedding, {
        category,
        skillLevel,
        limit: maxArticles,
      }),
      searchKnowledgeChunks(supabase, submissionEmbedding, {
        category,
        limit: maxChunks,
      }),
    ]);

    articles = articlesResult;
    chunks = chunksResult;
  } else {
    // Fall back to category-based retrieval
    articles = getBuiltInKnowledge(category, maxArticles);
  }

  // If no articles found, use built-in knowledge
  if (articles.length === 0) {
    articles = getBuiltInKnowledge(category, maxArticles);
  }

  // Calculate metrics
  const allSimilarities = [
    ...articles.map(a => a.similarity),
    ...chunks.map(c => c.similarity),
  ].filter(s => s > 0);

  const avgSimilarity = allSimilarities.length > 0
    ? allSimilarities.reduce((a, b) => a + b, 0) / allSimilarities.length
    : 0;
  const maxSimilarity = allSimilarities.length > 0
    ? Math.max(...allSimilarities)
    : 0;

  // Build formatted context
  const ragContext = buildRAGContext(articles, chunks);
  const formattedContext = formatRAGContextForPrompt(ragContext);

  const retrievalTimeMs = Date.now() - startTime;

  return {
    articles,
    chunks,
    context: formattedContext,
    retrievalTimeMs,
    avgSimilarity,
    maxSimilarity,
  };
};

/**
 * Map game skill category to knowledge category
 */
const mapSkillToKnowledgeCategory = (skillCategory: SkillCategory): string => {
  const mapping: Record<SkillCategory, string> = {
    boolean: 'boolean',
    xray: 'xray',
    outreach: 'outreach',
    linkedin: 'linkedin',
    diversity: 'diversity',
    persona: 'persona',
    ats: 'general',
    screening: 'general',
    'job-description': 'general',
    'ai-prompting': 'general',
    negotiation: 'outreach',
    'talent-intelligence': 'general',
    multiplatform: 'xray',
    multi: 'general',
  };

  return mapping[skillCategory] || 'general';
};

// ============================================================================
// Logging and Analytics
// ============================================================================

/**
 * Log knowledge retrieval for analytics
 */
export const logKnowledgeRetrieval = async (
  supabase: SupabaseClient,
  params: {
    attemptId: string;
    gameId: string;
    skillCategory: string;
    queryText: string;
    articlesRetrieved: string[];
    chunksRetrieved: string[];
    avgSimilarity: number;
    maxSimilarity: number;
    retrievalTimeMs: number;
    finalScore?: number;
  }
): Promise<{ success: boolean; logId?: string; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('log_knowledge_retrieval', {
      p_attempt_id: params.attemptId,
      p_game_id: params.gameId,
      p_skill_category: params.skillCategory,
      p_query_text: params.queryText.slice(0, 1000), // Truncate for storage
      p_articles_retrieved: params.articlesRetrieved,
      p_chunks_retrieved: params.chunksRetrieved,
      p_avg_similarity: params.avgSimilarity,
      p_max_similarity: params.maxSimilarity,
      p_retrieval_time_ms: params.retrievalTimeMs,
      p_final_score: params.finalScore || null,
    });

    if (error) {
      console.warn('[RAG] log_knowledge_retrieval failed:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, logId: data };
  } catch (err) {
    console.error('[RAG] Error logging retrieval:', err);
    return { success: false, error: 'Logging failed' };
  }
};

// ============================================================================
// Knowledge Base Seeding
// ============================================================================

/**
 * Seed the knowledge base with built-in articles
 * (Run once when setting up the database)
 */
export const seedKnowledgeBase = async (
  supabase: SupabaseClient,
  computeEmbedding: (text: string) => Promise<number[]>
): Promise<{ success: boolean; articlesSeeded: number; error?: string }> => {
  let seeded = 0;

  try {
    for (const [category, articles] of Object.entries(SOURCING_KNOWLEDGE)) {
      for (const article of articles) {
        // Compute embedding for article content
        const embedding = await computeEmbedding(
          `${article.title}\n${article.summary || ''}\n${article.content}`
        );

        const { error } = await supabase
          .from('knowledge_articles')
          .upsert({
            id: article.id,
            title: article.title,
            category: article.category,
            subcategory: article.subcategory,
            content: article.content,
            summary: article.summary,
            key_points: article.keyPoints,
            good_examples: article.goodExamples,
            bad_examples: article.badExamples,
            common_mistakes: article.commonMistakes,
            content_embedding: embedding,
            skill_levels: article.skillLevels,
            quality_score: article.qualityScore,
            source: 'built-in',
            is_active: true,
            is_verified: true,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id',
          });

        if (error) {
          console.warn(`[RAG] Failed to seed article ${article.id}:`, error.message);
        } else {
          seeded++;
        }
      }
    }

    console.log(`[RAG] Seeded ${seeded} knowledge articles`);
    return { success: true, articlesSeeded: seeded };
  } catch (err) {
    console.error('[RAG] Error seeding knowledge base:', err);
    return { success: false, articlesSeeded: seeded, error: 'Seeding failed' };
  }
};

export default {
  // Configuration
  RAG_CONFIG,
  SOURCING_KNOWLEDGE,

  // Search functions
  searchKnowledge,
  searchKnowledgeChunks,
  getKnowledgeByCategory,

  // Context building
  buildRAGContext,
  formatRAGContextForPrompt,

  // Main retrieval
  retrieveKnowledgeForScoring,

  // Logging
  logKnowledgeRetrieval,

  // Seeding
  seedKnowledgeBase,
};

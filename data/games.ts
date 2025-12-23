import { Game, RubricItem } from '../types';

/**
 * Standard rubric templates by difficulty level
 */
export const rubricByDifficulty: Record<'easy' | 'medium' | 'hard', RubricItem[]> = {
    easy: [
        { criteria: 'Relevant Keywords', points: 30, description: 'Includes key terms related to the role/skill' },
        { criteria: 'Basic Boolean Operators', points: 25, description: 'Uses AND, OR to combine search terms' },
        { criteria: 'Search Syntax', points: 25, description: 'Proper use of quotes, parentheses, or platform syntax' },
        { criteria: 'Completeness', points: 20, description: 'Addresses all requirements in the task description' }
    ],
    medium: [
        { criteria: 'Advanced Keywords', points: 25, description: 'Includes synonyms, variations, and related terms' },
        { criteria: 'Complex Boolean Logic', points: 30, description: 'Uses AND, OR, NOT with proper grouping/nesting' },
        { criteria: 'Platform-Specific Features', points: 25, description: 'Leverages advanced search operators (site:, intitle:, etc.)' },
        { criteria: 'Optimization & Precision', points: 20, description: 'Balanced between broad and specific, avoids noise' }
    ],
    hard: [
        { criteria: 'Expert Keyword Strategy', points: 25, description: 'Comprehensive terms including industry jargon, certifications' },
        { criteria: 'Sophisticated Boolean Logic', points: 30, description: 'Multi-level nesting, excludes false positives effectively' },
        { criteria: 'Advanced Search Techniques', points: 25, description: 'Uses proximity operators, wildcards, regex where applicable' },
        { criteria: 'Strategic Optimization', points: 20, description: 'Highly targeted, considers edge cases, minimal false positives' }
    ]
};

/**
 * This is the central repository for all game challenges.
 * To add a new game to the weekly rotation, simply add a new object to this array.
 * The system will automatically pick it up and include it in the cycle.
 * Ensure each game has a unique `id`.
 */
export const games: Game[] = [
    {
        id: 'game1',
        title: 'Game 1: The Boolean Blacksmith',
        description: 'You have a new role: "Senior Backend Engineer" specializing in distributed systems, located in Vienna, Austria. The client requires experience with Go (Golang) and Kubernetes. They have a strong preference for candidates who have contributed to open-source projects.',
        task: 'Your task: Craft the most effective Boolean search string to find these candidates on a professional networking site.',
        placeholder: 'e.g., (engineer OR developer) AND ...',
        difficulty: 'medium' as const,
        skillCategory: 'boolean' as const,
        exampleSolution: '("Senior Backend Engineer" OR "Backend Developer" OR "Software Engineer") AND (Go OR Golang) AND (Kubernetes OR K8s OR "container orchestration") AND (Vienna OR Wien) AND ("open source" OR "open-source" OR GitHub OR "contributor")',
        rubric: rubricByDifficulty.medium,
        validation: {
            keywords: ['engineer', 'go', 'golang', 'kubernetes', 'k8s'],
            location: 'vienna',
            requiresBoolean: true,
            requiresParentheses: true,
            minChars: 30
        },
        promptGenerator: (submission, rubric) => `
            You are a Technical Sourcing Coach evaluating a Boolean search string submission.

            **CHALLENGE GOAL:**
            Find Senior Backend Engineers in Vienna with Go + Kubernetes + Open Source contributions.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they include core role titles with OR variations (Backend Engineer, Software Engineer)?
            2. Did they include BOTH required skills (Go/Golang AND Kubernetes/K8s)?
            3. Did they target the location correctly (Vienna/Wien)?
            4. Did they include open source signals (GitHub, contributor, open-source)?
            5. Is the Boolean logic properly structured with parentheses for grouping?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game2',
        title: 'Game 2: The Persona Profiler',
        description: 'Analyze the following job description snippet for a "Lead UX Designer" and create a concise candidate persona. Focus on key skills, experience level, and potential motivations.',
        context: `"We're seeking a Lead UX Designer to own the user experience for our flagship B2B SaaS product. You'll guide a team of 3 designers, work with product managers to translate complex requirements into intuitive workflows, and champion a user-centered design culture. Must have 7+ years of experience, a portfolio showcasing complex problem-solving, and proficiency in Figma. Experience with data visualization is a huge plus."`,
        task: 'Your task: Write a short candidate persona (3-4 sentences) that captures the essence of the ideal candidate.',
        placeholder: 'e.g., An experienced design leader motivated by mentoring...',
        difficulty: 'easy' as const,
        skillCategory: 'persona' as const,
        exampleSolution: 'A seasoned UX leader with 7-10 years in B2B SaaS environments who thrives on mentoring junior designers and building design systems. Expert in Figma and translating complex business requirements into clean user experiences. Passionate about data-driven design decisions and has experience with analytics dashboards or data visualization. Values collaborative, user-centered cultures and has managed small design teams while maintaining hands-on involvement.',
        rubric: rubricByDifficulty.easy,
        validation: {
            minWords: 50,
            maxWords: 150,
            minChars: 200
        },
        promptGenerator: (submission, rubric) => `
            You are a Talent Strategy Consultant evaluating a candidate persona submission.

            **CHALLENGE GOAL:**
            Create a candidate persona for Lead UX Designer (B2B SaaS, 7+ yrs, Figma, Data Viz).

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they capture the experience level (7+ years/Lead)?
            2. Did they include the specific technical skills (Figma, Data Viz)?
            3. Did they identify motivations (Mentoring, User-Centered Culture)?
            4. Is the persona 3-dimensional (Skills, Traits, Motivations)?
            5. Is it concise (3-4 sentences) yet comprehensive?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game3',
        title: 'Game 3: The Outreach Originator',
        description: "You've found a promising passive candidate for a \"Senior DevOps Engineer\" role. Her online profile shows she's been at her current company for 5 years and has spoken at a conference about \"Scaling CI/CD Pipelines\".",
        task: 'Your task: Write a concise and personalized outreach message (under 100 words) to this candidate to gauge her interest.',
        placeholder: 'e.g., Hi [Candidate Name], I was impressed by your talk on...',
        difficulty: 'medium' as const,
        skillCategory: 'outreach' as const,
        exampleSolution: 'Hi Sarah, I came across your presentation on "Scaling CI/CD Pipelines" at DevOps Summit—really insightful approach to infrastructure automation. I\'m reaching out because we\'re building out the platform engineering team at TechCorp and looking for someone with deep CI/CD expertise like yours. The role involves architecting deployment pipelines for our microservices platform. I\'d love to share more about the technical challenges and team. Would you be open to a brief call this week? No pressure—just exploring if there\'s mutual interest.',
        rubric: rubricByDifficulty.medium,
        validation: {
            maxWords: 100,
            minWords: 30,
            forbiddenPhrases: ['just checking in', 'circling back', 'touching base']
        },
        promptGenerator: (submission, rubric) => `
            You are a Candidate Engagement Specialist evaluating an outreach message submission.

            **CHALLENGE GOAL:**
            Write a personalized outreach message (under 100 words) to a Senior DevOps Engineer who spoke at a conference about "Scaling CI/CD Pipelines".

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they mention the specific conference talk ("Scaling CI/CD Pipelines")?
            2. Is the message under 100 words?
            3. Is the Call to Action low friction (e.g., "brief call" vs "formal interview")?
            4. Is the tone respectful, specific, and not pushy?
            5. Does it avoid generic recruiter clichés?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game4',
        title: 'Game 4: The X-Ray Expert',
        description: 'You need to find Python developers in Berlin who have experience with Django and have profiles on GitHub. Standard searches are not yielding good results.',
        task: 'Your task: Write a Google X-ray search string to find user profiles on GitHub that match these criteria.',
        placeholder: 'e.g., site:github.com ...',
        difficulty: 'hard' as const,
        skillCategory: 'xray' as const,
        exampleSolution: 'site:github.com (Python OR Django) AND Berlin AND ("repositories" OR "projects") -site:github.com/topics -site:github.com/explore',
        rubric: rubricByDifficulty.hard,
        validation: {
            keywords: ['python', 'django', 'berlin'],
            requiresSite: true,
            minChars: 30
        },
        promptGenerator: (submission, rubric) => `
            You are a Google X-Ray Search Expert evaluating a GitHub profile search submission.

            **CHALLENGE GOAL:**
            Find Python + Django developers in Berlin using Google X-ray search for GitHub profiles.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they use "site:github.com" to target the domain?
            2. Did they filter out non-profile pages (e.g., -site:github.com/topics, -site:github.com/explore)?
            3. Did they include the location (Berlin)?
            4. Did they include both Python AND Django?
            5. Is the search optimized to minimize false positives?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    // NEW GAMES - Expanded Library
    {
        id: 'game5',
        title: 'Game 5: LinkedIn Navigator',
        description: 'You need to find Marketing Directors at Series A/B startups in the San Francisco Bay Area who have experience with product launches.',
        task: 'Your task: Write an effective LinkedIn Recruiter search query using LinkedIn-specific filters and keywords.',
        placeholder: 'e.g., title:(Marketing Director) AND ...',
        difficulty: 'easy' as const,
        skillCategory: 'linkedin' as const,
        exampleSolution: 'title:(Marketing Director OR Head of Marketing OR VP Marketing) AND ("product launch" OR "go-to-market" OR "GTM") AND location:"San Francisco Bay Area" AND company_size:(11-50 OR 51-200) AND past_company:(funded startup OR Series A OR Series B)',
        rubric: rubricByDifficulty.easy,
        validation: {
            keywords: ['marketing', 'director'],
            location: 'san francisco',
            minChars: 30
        },
        promptGenerator: (submission, rubric) => `
            You are a LinkedIn Recruiter Coach evaluating a search query submission.

            **CHALLENGE GOAL:**
            Find Marketing Directors at Series A/B startups in SF Bay Area with product launch experience.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they use the "Title" filter correctly with OR variations?
            2. Did they use "Company Size" or keywords for startups?
            3. Did they include "Product Launch" keywords?
            4. Did they include the location (SF Bay Area)?
            5. Will this query likely give a focused but not over-narrow pool?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game6',
        title: 'Game 6: Diversity Sourcing Strategist',
        description: 'Your company is committed to building diverse engineering teams. You need to source underrepresented candidates for a Senior Software Engineer role without using discriminatory search terms.',
        task: 'Your task: Describe 3-4 ethical sourcing strategies to build a diverse candidate pipeline.',
        placeholder: 'e.g., Partner with organizations like...',
        difficulty: 'medium' as const,
        skillCategory: 'diversity' as const,
        exampleSolution: '1) Partner with organizations like Code2040, Women Who Code, and Black Girls Code to tap into diverse talent pools. 2) Source from HBCUs, women\'s colleges, and universities with strong diversity programs. 3) Use inclusive language in job descriptions and avoid gendered/biased terms. 4) Search for candidates who participate in diversity-focused tech communities, conferences (Grace Hopper, AfroTech), and ERGs.',
        rubric: rubricByDifficulty.medium,
        validation: {
            minWords: 50,
            maxWords: 300,
            minChars: 200
        },
        promptGenerator: (submission, rubric) => `
            You are a DE&I Recruitment Strategist evaluating sourcing strategies. A participant has proposed strategies to build a diverse pipeline.

            **CHALLENGE GOAL:**
            Create ethical sourcing strategies to build a diverse pipeline for Senior Software Engineer role without using discriminatory search terms.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they suggest specific partnerships (e.g., Code2040, Women Who Code, distinct orgs)?
            2. Did they mention sourcing from diverse institutions (HBCUs, women's colleges)?
            3. Did they focus on inclusive job description language to avoid gendered/biased terms?
            4. Did they avoid illegal filtering (e.g., "search only for women")?
            5. Does the strategy ensure compliance with protected characteristics and focus on expanding the pool?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game7',
        title: 'Game 7: The Resume Scanner',
        description: 'You receive a resume for a "Data Scientist" role. The candidate has a PhD in Statistics, 3 years in consulting, lists Python/R/SQL, and mentions "predictive modeling" and "A/B testing." Your role requires 5+ years in a tech company and ML deployment experience.',
        task: 'Your task: Write a brief screening assessment (3-4 sentences) explaining if this candidate should move forward and why/why not.',
        placeholder: 'e.g., This candidate shows strong...',
        difficulty: 'easy' as const,
        skillCategory: 'screening' as const,
        exampleSolution: 'This candidate has strong technical fundamentals with a PhD in Statistics and relevant tools (Python/R/SQL), but falls short of the 5+ years industry experience requirement with only 3 years in consulting. The consulting background likely provided exposure to A/B testing and modeling, but there\'s no evidence of ML deployment or production systems experience. Recommend a phone screen to assess if their consulting work involved tech companies and to probe for any ML deployment experience not listed on the resume. If deployment experience is minimal, they may be better suited for a mid-level rather than senior role.',
        rubric: rubricByDifficulty.easy,
        validation: {
            minWords: 40,
            maxWords: 150,
            minChars: 150
        },
        promptGenerator: (submission, rubric) => `
            You are a Technical Recruiter evaluating a screening assessment. A participant has assessed a candidate for a Data Scientist role.

            **CHALLENGE GOAL:**
            Evaluate a Data Scientist candidate with PhD in Statistics, 3 years consulting experience, Python/R/SQL skills, but the role requires 5+ years in tech company and ML deployment experience.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they identify the gap in industry experience (3 vs 5 years)?
            2. Did they spot the missing "ML Deployment" skill?
            3. Did they suggest a "Phone Screen" to probe (rather than flat reject)?
            4. Did they differentiate "nice to have" vs "must have"?
            5. Did they consider that PhDs often count as years of experience?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game8',
        title: 'Game 8: The Job Description Wordsmith',
        description: 'You need to write a compelling job description for a "Customer Success Manager" role at a B2B SaaS company. The role requires 3-5 years experience, ownership of customer retention, and cross-functional collaboration.',
        task: 'Your task: Write an engaging "About the Role" section (100-150 words) that attracts top talent.',
        placeholder: 'e.g., As our Customer Success Manager, you will...',
        difficulty: 'medium' as const,
        skillCategory: 'job-description' as const,
        exampleSolution: 'As our Customer Success Manager, you\'ll be the trusted advisor to our mid-market clients, ensuring they achieve maximum value from our platform. You\'ll own the full customer lifecycle post-sale, from onboarding through renewal and expansion. Working closely with Sales, Product, and Support teams, you\'ll advocate for customer needs while driving adoption and identifying growth opportunities. This role requires a consultative mindset, analytical skills to track health metrics, and the ability to build strong relationships with C-level stakeholders. You\'ll directly impact our 90%+ retention rate and help shape our customer success playbook as we scale. If you thrive on solving complex problems, love turning customers into advocates, and want to make a measurable impact in a fast-growing SaaS company, this role is for you.',
        rubric: rubricByDifficulty.medium,
        validation: {
            minWords: 100,
            maxWords: 200,
            forbiddenPhrases: ['rockstar', 'ninja', 'guru', 'wizard']
        },
        promptGenerator: (submission, rubric) => `
            You are a Talent Brand Expert evaluating a job description. A participant has written an "About the Role" section for a Customer Success Manager position.

            **CHALLENGE GOAL:**
            Write an engaging "About the Role" section (100-150 words) for a Customer Success Manager at a B2B SaaS company, covering 3-5 years experience, customer retention ownership, and cross-functional collaboration.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Is the tone engaging and candidate-centric ("You will..." rather than "We need...")?
            2. Did they cover the key requirements (Retention, Cross-functional collaboration)?
            3. Is it concise (100-150 words)?
            4. Did they use inclusive language (no hype/bro culture terms like "rockstar")?
            5. Did they focus on impact (what they will achieve), not just tasks?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game9',
        title: 'Game 9: The ATS Optimizer',
        description: 'You have 50 candidates in your ATS for a "Product Manager" role. You need to create a filtering strategy to identify the top 10 for phone screens.',
        task: 'Your task: Describe your filtering criteria and process (4-5 key factors you would use).',
        placeholder: 'e.g., 1) Years of PM experience: must have 3+...',
        difficulty: 'medium' as const,
        skillCategory: 'ats' as const,
        exampleSolution: '1) Years of PM experience: Must have 3+ years in a product management role, not just "project" management. 2) B2B SaaS experience: Strong preference for candidates from similar industries/business models. 3) Technical background: Look for engineering degrees, CS minors, or demonstrated ability to work with engineering teams. 4) Ownership of product launches: Evidence of taking products from 0-1 or managing a full product lifecycle. 5) Analytical skills: Mentions of data-driven decision making, A/B testing, or metrics ownership. Filter order: Hard requirements first (years exp), then industry match, then differentiators (technical background, ownership). Review top 15-20 manually to account for non-traditional backgrounds.',
        rubric: rubricByDifficulty.medium,
        validation: {
            minWords: 50,
            maxWords: 300,
            minChars: 200
        },
        promptGenerator: (submission, rubric) => `
            You are a Recruiting Ops Manager evaluating an ATS filtering strategy. A participant has created a strategy to filter 50 Product Manager candidates to identify the top 10.

            **CHALLENGE GOAL:**
            Create a filtering strategy to identify top 10 Product Manager candidates from 50 in the ATS, focusing on 4-5 key factors like experience, technical background, and ownership.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they prioritize "Hard Requirements" (e.g., Years of PM Experience)?
            2. Did they look for "Differentiators" (B2B SaaS, Technical background)?
            3. Is the process efficient (e.g., Knockout questions, structured filter order)?
            4. Do they balance automation vs manual review (not 100% filter-driven)?
            5. Did they consider non-traditional backgrounds and account for edge cases?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game10',
        title: 'Game 10: Advanced Boolean Builder',
        description: 'Find "Machine Learning Engineers" in Seattle who have experience with either TensorFlow or PyTorch AND have worked at either Google, Amazon, or Microsoft AND have published research papers.',
        task: 'Your task: Write an advanced Boolean search string with nested logic.',
        placeholder: 'e.g., ("Machine Learning Engineer" OR ...) AND ...',
        difficulty: 'hard' as const,
        skillCategory: 'boolean' as const,
        exampleSolution: '("Machine Learning Engineer" OR "ML Engineer" OR "Applied Scientist") AND (TensorFlow OR PyTorch OR "deep learning framework") AND (Google OR Amazon OR Microsoft OR FAANG) AND (Seattle OR "Seattle area" OR Bellevue OR Redmond) AND ("published research" OR "research paper" OR "conference paper" OR arxiv OR "peer reviewed")',
        rubric: rubricByDifficulty.hard,
        validation: {
            keywords: ['engineer', 'machine learning', 'ml', 'seattle'],
            requiresBoolean: true,
            requiresParentheses: true,
            minChars: 50
        },
        promptGenerator: (submission, rubric) => `
            You are a Boolean Logic Master evaluating an advanced search string. A participant has written a complex Boolean search to find Machine Learning Engineers.

            **CHALLENGE GOAL:**
            Find Machine Learning Engineers in Seattle with TensorFlow OR PyTorch experience, who have worked at Google, Amazon, or Microsoft, AND have published research papers.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they use nested parentheses correctly for the OR groups?
            2. Did they include all 3 constraints (Tech frameworks, Company, Research)?
            3. Did they target the location (Seattle and surrounding areas)?
            4. Did they cover role title variations (ML Eng, Applied Scientist)?
            5. Did they use proper Boolean structure with AND to combine different requirement categories?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game11',
        title: 'Game 11: Stack Overflow Sleuth',
        description: 'You need to find iOS developers who are active on Stack Overflow and have expertise in Swift UI. Standard searches aren\'t working.',
        task: 'Your task: Write a Google X-ray search to find their Stack Overflow profiles.',
        placeholder: 'e.g., site:stackoverflow.com ...',
        difficulty: 'hard' as const,
        skillCategory: 'xray' as const,
        exampleSolution: 'site:stackoverflow.com/users (Swift OR SwiftUI OR "Swift UI") AND (iOS OR iPhone) AND ("reputation" OR "top user" OR "answers") -site:stackoverflow.com/questions',
        rubric: rubricByDifficulty.hard,
        validation: {
            keywords: ['Swift', 'iOS', 'stackoverflow'],
        },
        promptGenerator: (submission, rubric) => `
            You are a Technical Sourcing Expert evaluating an X-ray search. A participant has written a Google X-ray search to find iOS developers on Stack Overflow.

            **CHALLENGE GOAL:**
            Find iOS developers who are active on Stack Overflow with Swift UI expertise using a Google X-ray search targeting Stack Overflow profiles.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they target "site:stackoverflow.com/users" to find profiles specifically?
            2. Did they include the skills (Swift/SwiftUI/iOS) with appropriate variations?
            3. Did they exclude non-profile pages (e.g., -questions, -tags)?
            4. Did they look for activity signals (reputation, answers, top user)?
            5. Is the query optimized to exclude noise while finding active contributors?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game12',
        title: 'Game 12: Cold Email Follow-Up',
        description: 'You sent an outreach email to a Senior Data Engineer 5 days ago. She hasn\'t responded. You want to send one follow-up before moving on.',
        task: 'Your task: Write a brief, professional follow-up message (under 75 words).',
        placeholder: 'e.g., Hi [Name], following up on my note from...',
        difficulty: 'easy' as const,
        skillCategory: 'outreach' as const,
        exampleSolution: 'Hi Jennifer, I wanted to follow up on my message from last week about the Senior Data Engineer role at DataCorp. I know you\'re likely busy, but wanted to make sure it didn\'t get lost in your inbox. If the timing isn\'t right or you\'re not interested, no worries at all—just let me know and I won\'t bother you again. Thanks!',
        rubric: rubricByDifficulty.easy,
        validation: {
            maxWords: 75,
        },
        promptGenerator: (submission, rubric) => `
            You are a Candidate Engagement Specialist evaluating a follow-up email. A participant has written a follow-up to a Senior Data Engineer who hasn't responded after 5 days.

            **CHALLENGE GOAL:**
            Write a brief, professional follow-up message (under 75 words) for a first follow-up after 5 days of no response.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Is it brief (under 75 words)?
            2. Is the tone professional yet polite (not generic "just checking in")?
            3. Is there a clear "out" (e.g., "let me know if not interested")?
            4. Does it reference the previous email without re-pitching everything?
            5. Does it avoid guilt-tripping or being pushy?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game13',
        title: 'Game 13: GitHub Profile Detective',
        description: 'You need to find front-end developers in Austin, Texas who contribute to open-source React projects and have active GitHub profiles.',
        task: 'Your task: Write a Google X-ray search targeting GitHub profiles.',
        placeholder: 'e.g., site:github.com ...',
        difficulty: 'medium' as const,
        skillCategory: 'xray' as const,
        exampleSolution: 'site:github.com (React OR ReactJS OR "front end" OR "frontend developer") AND (Austin OR "Austin, TX" OR Texas) AND ("repositories" OR "contributions") AND ("open source" OR "open-source") -site:github.com/topics -site:github.com/trending',
        rubric: rubricByDifficulty.medium,
        validation: {
            keywords: ['React', 'Austin', 'github'],
        },
        promptGenerator: (submission, rubric) => `
            You are a Technical Sourcer evaluating a GitHub X-ray search. A participant has written a Google X-ray search to find front-end developers on GitHub.

            **CHALLENGE GOAL:**
            Find front-end developers in Austin, Texas who contribute to open-source React projects with active GitHub profiles.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they include the location (Austin/Austin, TX/Texas) with variations?
            2. Did they include "React" keywords and front-end developer variations?
            3. Did they filter for activity ("contributions" or "repositories")?
            4. Did they try to reduce noise by excluding generic pages (-topics, -trending)?
            5. Did they use proper site: operator and structure the query effectively?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game14',
        title: 'Game 14: Persona Deep Dive',
        description: 'Create a detailed persona for a "VP of Sales" at a cybersecurity company. They need enterprise sales experience, cybersecurity domain knowledge, and team leadership skills.',
        task: 'Your task: Write a comprehensive candidate persona (5-6 sentences) covering background, motivations, and where to find them.',
        placeholder: 'e.g., A seasoned enterprise sales leader...',
        difficulty: 'hard' as const,
        skillCategory: 'persona' as const,
        exampleSolution: 'A proven enterprise sales leader with 10-15 years of experience, including at least 5 years selling cybersecurity or infrastructure solutions to Fortune 500 companies. Likely has an MBA and has managed teams of 10-20 AEs/SEs, with a track record of consistently exceeding $10M+ quotas. Motivated by equity upside and the opportunity to build a sales organization from the ground up at a high-growth startup. Has probably worked at established cybersecurity vendors (Palo Alto Networks, CrowdStrike, Okta) and is ready to take on more strategic responsibility. May be active on LinkedIn sharing thought leadership about enterprise sales or cybersecurity trends. Can be found at RSA Conference, Black Hat, or through referrals from VPs at competitor companies.',
        rubric: rubricByDifficulty.hard,
        validation: {
            minWords: 80,
            maxWords: 200,
            minSentences: 5,
        },
        promptGenerator: (submission, rubric) => `
            You are an Executive Search Researcher evaluating a candidate persona. A participant has created a detailed persona for a VP of Sales at a cybersecurity company.

            **CHALLENGE GOAL:**
            Write a comprehensive candidate persona (5-6 sentences) for a VP of Sales at a cybersecurity company, covering background, motivations, and where to find them. Must include enterprise sales experience, cybersecurity domain knowledge, and team leadership skills.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they identify the specific domain experience (Cybersecurity/Security)?
            2. Did they mention the target market (Enterprise/Fortune 500)?
            3. Did they suggest where to find them (e.g., RSA Conference, Black Hat, Competitors)?
            4. Did they reflect realistic seniority (10-15 yrs, quota ownership, team size)?
            5. Did they cover motivations and career trajectory for this executive level role?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game15',
        title: 'Game 15: Inclusive Job Description Review',
        description: 'Review this JD excerpt: "We need a rockstar developer who can hit the ground running. Must have a computer science degree from a top-tier university. Looking for young, hungry talent to join our fast-paced, work-hard-play-hard culture."',
        task: 'Your task: Identify 3-4 problematic phrases and suggest inclusive alternatives.',
        placeholder: 'e.g., 1) "Rockstar developer" is...',
        difficulty: 'medium' as const,
        skillCategory: 'job-description' as const,
        exampleSolution: '1) "Rockstar developer" - Use "experienced developer" or "skilled engineer" to avoid gendered/exclusionary jargon. 2) "Top-tier university" - This excludes candidates from non-traditional backgrounds; change to "relevant degree or equivalent experience." 3) "Young, hungry talent" - Age discrimination red flag; use "motivated professionals" or "passionate engineers." 4) "Work-hard-play-hard culture" - Can deter candidates with caregiving responsibilities; replace with "collaborative, results-driven environment with work-life balance."',
        rubric: rubricByDifficulty.medium,
        validation: {
            minWords: 60,
            minSentences: 3,
        },
        promptGenerator: (submission, rubric) => `
            You are a DE&I Consultant evaluating a job description review. A participant has identified problematic phrases in a biased job description and suggested inclusive alternatives.

            **CHALLENGE GOAL:**
            Review a biased job description excerpt and identify 3-4 problematic phrases ("rockstar developer", "top-tier university", "young, hungry talent", "work-hard-play-hard culture"), then suggest inclusive alternatives.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they catch "Rockstar" (Gendered/exclusionary jargon)?
            2. Did they catch "Top-tier university" (Elitist/excludes non-traditional backgrounds)?
            3. Did they catch "Young/Hungry" (Ageist language)?
            4. Did they address "Work-hard-play-hard" (Burnout signal/deters caregivers)?
            5. Are the suggested alternatives inclusive while still selling the role effectively?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game16',
        title: 'Game 16: LinkedIn Recruiter Filters Mastery',
        description: 'You need to find "Chief Technology Officers" who have experience scaling engineering teams from 10 to 100+ people at venture-backed startups.',
        task: 'Your task: List the specific LinkedIn Recruiter filters and values you would use.',
        placeholder: 'e.g., Current Title: CTO OR...',
        difficulty: 'hard' as const,
        skillCategory: 'linkedin' as const,
        exampleSolution: 'Current Title: (CTO OR "Chief Technology Officer" OR "VP Engineering" transitioning to CTO)\nKeywords: ("scaled team" OR "grew team" OR "10 to 100" OR "team growth" OR "built engineering team")\nCompany Type: Venture-backed startup OR funded startup\nCompany Size: 51-200, 201-500, 501-1000 (companies that have scaled)\nPast Company Keywords: (Series B OR Series C OR Series D OR growth stage OR scale-up)\nYears at Current Company: 2+ (looking for people who stayed through scaling phase)\nFunction: Engineering\nSeniority Level: CXO, VP',
        rubric: rubricByDifficulty.hard,
        validation: {
            minWords: 30,
            minSentences: 2,
        },
        promptGenerator: (submission, rubric) => `
            You are a LinkedIn Recruiter Power User evaluating filter selections. A participant has selected filters.

            **CHALLENGE GOAL:**
            Find CTOs who scaled engineering teams from 10 to 100+ people at venture-backed startups.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they use the "Company Size" filter (or keywords for growth)?
            2. Did they use "Past Company" keywords for "Venture/Series"?
            3. Did they use "Years in Position" to find seasoned leaders?
            4. Did they combine Function: Engineering + Seniority: CXO/VP?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    // INDUSTRY-SPECIFIC EXPANSION
    {
        id: 'game17',
        title: 'Game 17: Healthcare Talent Hunter',
        description: 'You need to find "Registered Nurses" with ICU experience and CCRN certification in the Chicago area who are open to travel nursing positions.',
        task: 'Your task: Write a Boolean search string for healthcare job boards or LinkedIn that captures these requirements.',
        placeholder: 'e.g., ("Registered Nurse" OR RN) AND ...',
        difficulty: 'medium' as const,
        skillCategory: 'boolean' as const,
        exampleSolution: '("Registered Nurse" OR RN OR "Critical Care Nurse") AND (ICU OR "Intensive Care Unit" OR "Critical Care") AND (CCRN OR "CCRN certified" OR "Critical Care Registered Nurse") AND (Chicago OR "Chicago area" OR Illinois OR IL) AND ("travel nurse" OR "travel nursing" OR "open to relocation" OR "willing to travel")',
        rubric: rubricByDifficulty.medium,
        validation: {
            keywords: ['Nurse', 'ICU', 'CCRN'],
            location: 'Chicago',
        },
        promptGenerator: (submission, rubric) => `
            You are a Healthcare Recruiter evaluating a Boolean search string submission. A participant has written a Boolean search.

            **CHALLENGE GOAL:**
            Find Registered Nurses with ICU experience, CCRN certification, in Chicago, open to travel nursing.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they include the certification (CCRN)?
            2. Did they include "Travel" or "Relocation" keywords?
            3. Did they target the location (Chicago/IL)?
            4. Did they include ICU synonyms (critical care, intensive care)?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game18',
        title: 'Game 18: Financial Services Compliance Screen',
        description: 'You\'re screening a candidate for a "Compliance Officer" role at a bank. They have 4 years at a fintech startup, Series 7 and Series 63 licenses, and a finance degree. Your role requires banking experience and prefers regulatory agency background.',
        task: 'Your task: Write a screening assessment explaining whether to move forward and what questions to ask.',
        placeholder: 'e.g., The candidate has relevant licenses but...',
        difficulty: 'medium' as const,
        skillCategory: 'screening' as const,
        exampleSolution: 'The candidate has the right licenses (Series 7 and 63) and relevant compliance experience, but fintech and traditional banking compliance can differ significantly in regulatory scope. The 4 years of experience meets the minimum, but the lack of traditional banking or regulatory agency background is a gap. Recommend a phone screen to assess: 1) Their specific experience with banking regulations (BSA/AML, FDIC, OCC requirements), 2) Whether their fintech exposure included any banking partnerships or bank-like regulations, 3) Their understanding of the regulatory examination process. If they have strong transferable knowledge and are coachable, they could be a culture fit given fintech\'s innovative approach to compliance.',
        rubric: rubricByDifficulty.medium,
        validation: {
            minWords: 50,
            minSentences: 3,
        },
        promptGenerator: (submission, rubric) => `
            You are a Financial Services Recruiter & Compliance Screener evaluating a candidate assessment. A participant has screened a candidate.

            **CHALLENGE GOAL:**
            Screen a Compliance Officer candidate with fintech experience for a banking role requiring banking experience.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they acknowledge the licenses (Series 7/63 are good)?
            2. Did they flag the "Fintech vs Banking" gap (Regulatory difference)?
            3. Did they suggest probing for specific banking reg knowledge (BSA/AML)?
            4. Did they recommend a next step (phone screen vs reject vs HM consult) clearly?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game19',
        title: 'Game 19: Neurodiversity Hiring Initiative',
        description: 'Your company is launching a neurodiversity hiring program for software QA and testing roles. You need to design an inclusive recruitment and interview process.',
        task: 'Your task: Outline 4-5 key accommodations and process changes to make your hiring more neurodiversity-friendly.',
        placeholder: 'e.g., 1) Provide interview questions in advance...',
        difficulty: 'hard' as const,
        skillCategory: 'diversity' as const,
        exampleSolution: '1) Provide interview questions and format details in advance to reduce anxiety and allow preparation. 2) Offer alternative interview formats: written responses, take-home assignments, or skills-based assessments instead of only verbal interviews. 3) Create a sensory-friendly interview environment: quiet room, option to turn off cameras in virtual interviews, minimal distractions. 4) Allow extra time for processing questions and formulating responses; avoid rapid-fire questioning. 5) Focus on skills-based evaluation over culture fit, and train interviewers to recognize different communication styles. 6) Partner with neurodiversity employment organizations like Specialisterne or Integrate Autism Employment Advisors. 7) Provide clear, structured onboarding with written documentation.',
        rubric: rubricByDifficulty.hard,
        validation: {
            minWords: 60,
            minSentences: 4,
        },
        promptGenerator: (submission, rubric) => `
            You are an Inclusive Hiring Expert evaluating an accommodation design. A participant has designed accommodations.

            **CHALLENGE GOAL:**
            Design a neurodiversity-friendly recruitment and interview process for software QA and testing roles.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they suggest "Questions in Advance"?
            2. Did they offer alternative formats (Written vs Verbal)?
            3. Did they mention sensory considerations (Quiet room)?
            4. Did they tie accommodations to better evaluation of actual job skills (QA/testing work samples)?
            5. Did they avoid stereotypes (no "superpowers" clichés)?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game20',
        title: 'Game 20: ATS Pipeline Velocity Analysis',
        description: 'Your ATS shows 200 candidates in various stages for a Senior Product Manager role. You have: 120 in "New", 45 in "Phone Screen", 20 in "Onsite", 15 in "Offer". Your hiring manager is frustrated about the timeline.',
        task: 'Your task: Identify the bottleneck and propose 3-4 actions to improve pipeline velocity.',
        placeholder: 'e.g., The bottleneck appears to be...',
        difficulty: 'hard' as const,
        skillCategory: 'ats' as const,
        exampleSolution: 'The bottleneck is at the top of the funnel - 120 candidates sitting in "New" status suggests inadequate screening capacity or unclear qualification criteria. The conversion rate from Phone Screen (45) to Onsite (20) is healthy at 44%, and Onsite to Offer (15 to 15) needs monitoring. Actions: 1) Implement knockout questions in the application to auto-screen unqualified candidates, reducing the "New" pile. 2) Schedule a calibration session with the hiring manager to tighten screening criteria and create a scorecard. 3) Dedicate 2 hours daily for the next week to batch-process "New" candidates - aim to clear 30-40 per day. 4) Set up automated rejection emails for clearly unqualified candidates to improve candidate experience. 5) Track time-in-stage metrics weekly to prevent future buildup. Goal: Get "New" down to <30 within one week.',
        rubric: rubricByDifficulty.hard,
        validation: {
            minWords: 60,
            minSentences: 3,
        },
        promptGenerator: (submission, rubric) => `
            You are a Recruiting Ops Analyst evaluating a pipeline bottleneck diagnosis. A participant has diagnosed a pipeline bottleneck.

            **CHALLENGE GOAL:**
            Identify the bottleneck and propose actions to improve pipeline velocity for a role with 120 candidates in "New" stage.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they identify the bottleneck at the top ("New" stage)?
            2. Did they suggest a "Screening Blitz" or "Knockout Questions"?
            3. Did they analyze the conversion rates (Phone->Onsite is good)?
            4. Did they propose time-bound actions (clear "by when")?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game21',
        title: 'Game 21: EEOC Compliance Audit',
        description: 'You\'re reviewing your sourcing process for potential bias. Your recent "Software Engineer" searches used terms like "rockstar", "ninja", "recent grad", and required "CS degree from top university". You sourced primarily from MIT, Stanford, and CMU.',
        task: 'Your task: Identify compliance issues and propose corrected sourcing language and strategy.',
        placeholder: 'e.g., Issue 1: "Rockstar" and "ninja" are...',
        difficulty: 'hard' as const,
        skillCategory: 'diversity' as const,
        exampleSolution: 'Issue 1: "Rockstar" and "ninja" are tech-bro jargon that may discourage women and underrepresented groups from applying. Replace with "skilled engineer" or "experienced developer". Issue 2: "Recent grad" can be interpreted as age discrimination, potentially excluding career-changers and older candidates. Use "early career" or remove time-based language. Issue 3: "Top university" requirement creates socioeconomic and geographic bias, excluding talented developers from non-elite schools, bootcamps, or self-taught backgrounds. Change to "CS degree or equivalent experience". Issue 4: Sourcing only from MIT/Stanford/CMU perpetuates lack of diversity. Expand to HBCUs (Howard, Spelman), HSIs (UT Austin, UC System), regional state schools, and coding bootcamps (Hack Reactor, App Academy). Issue 5: Add diversity job boards (PowerToFly, Jopwell, Fairygodboss) and focus on skills-based assessments over pedigree.',
        rubric: rubricByDifficulty.hard,
        validation: {
            minWords: 80,
            minSentences: 5,
        },
        promptGenerator: (submission, rubric) => `
            You are a Compliance & DE&I Talent Partner evaluating a bias identification in sourcing. A participant has identified bias in sourcing.

            **CHALLENGE GOAL:**
            Identify compliance issues and propose corrected sourcing language and strategy for Software Engineer searches.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they flag "Recent Grad" as age discrimination?
            2. Did they flag "Top University" as socioeconomic bias?
            3. Did they suggest expanding the school list (e.g., State schools, HBCUs)?
            4. Did they propose skill-based sourcing (diversity boards, non-elite schools, career changers)?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game22',
        title: 'Game 22: Retail District Manager Search',
        description: 'You need to find "District Managers" for a national retail chain. They need multi-unit management experience, P&L responsibility, and a track record of improving store performance. Prefer candidates from competitive retail brands.',
        task: 'Your task: Write a Boolean search string targeting retail management talent.',
        placeholder: 'e.g., ("District Manager" OR ...) AND ...',
        difficulty: 'easy' as const,
        skillCategory: 'boolean' as const,
        exampleSolution: '("District Manager" OR "Regional Manager" OR "Area Manager" OR "Multi-Unit Manager") AND (retail OR "brick and mortar" OR stores) AND ("P&L" OR "profit and loss" OR "P&L responsibility" OR revenue) AND ("store performance" OR "sales improvement" OR "comp sales" OR "same-store sales") AND (Target OR Walmart OR "Best Buy" OR Nordstrom OR Macy\'s OR Gap OR "Home Depot" OR Lowe\'s OR CVS OR Walgreens)',
        rubric: rubricByDifficulty.easy,
        validation: {
            keywords: ['District Manager', 'retail', 'P&L'],
        },
        promptGenerator: (submission, rubric) => `
            You are a Retail Recruiter evaluating a Boolean search string submission. A participant has written a Boolean search.

            **CHALLENGE GOAL:**
            Find District Managers with multi-unit management experience, P&L responsibility, and store performance improvement track record.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they use "District Manager" OR "Area Manager"?
            2. Did they include "P&L" or "Profit and Loss"?
            3. Did they list specific competitors (Target, Walmart, etc.)?
            4. Did they mention "multi-unit" or "multi-store" management?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game23',
        title: 'Game 23: Manufacturing Engineer Sourcing',
        description: 'Find "Manufacturing Engineers" with Lean Six Sigma certification, experience in automotive or aerospace, and proficiency in CAD software (AutoCAD or SolidWorks) in the Detroit or Seattle areas.',
        task: 'Your task: Write a Boolean search string for this manufacturing role.',
        placeholder: 'e.g., ("Manufacturing Engineer" OR ...) AND ...',
        difficulty: 'medium' as const,
        skillCategory: 'boolean' as const,
        exampleSolution: '("Manufacturing Engineer" OR "Process Engineer" OR "Production Engineer" OR "Industrial Engineer") AND ("Lean Six Sigma" OR "Six Sigma" OR "Green Belt" OR "Black Belt" OR LSS) AND (automotive OR aerospace OR aviation OR "auto industry") AND (CAD OR AutoCAD OR SolidWorks OR "3D modeling" OR "CAD software") AND (Detroit OR Michigan OR Seattle OR Washington OR "Puget Sound")',
        rubric: rubricByDifficulty.medium,
        validation: {
            keywords: ['Manufacturing Engineer', 'Lean Six Sigma', 'CAD'],
            location: 'Detroit|Seattle',
        },
        promptGenerator: (submission, rubric) => `
            You are an Engineering Sourcer evaluating a Boolean search string submission. A participant has written a Boolean search.

            **CHALLENGE GOAL:**
            Find Manufacturing Engineers with Lean Six Sigma certification, automotive/aerospace experience, and CAD proficiency in Detroit or Seattle.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they include "Lean Six Sigma" OR "Green Belt" OR "Black Belt"?
            2. Did they include CAD software (AutoCAD OR SolidWorks)?
            3. Did they target the locations (Detroit OR Seattle)?
            4. Did they target "Automotive OR aerospace" explicitly?
            5. Would this reasonably fill a shortlist without being too narrow?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game24',
        title: 'Game 24: LinkedIn Recruiter Boolean Mastery',
        description: 'Using LinkedIn Recruiter specifically, find "Sales Directors" at SaaS companies with $10M-$100M revenue who have experience selling to enterprise clients (Fortune 500) and have been in their current role for less than 2 years (potential flight risk).',
        task: 'Your task: Write the LinkedIn Recruiter search using LinkedIn-specific Boolean and filters.',
        placeholder: 'e.g., Current Title: ("Sales Director" OR ...) AND ...',
        difficulty: 'hard' as const,
        skillCategory: 'linkedin' as const,
        exampleSolution: 'Current Title: ("Sales Director" OR "Director of Sales" OR "VP Sales" OR "Head of Sales")\nKeywords: (SaaS OR "Software as a Service" OR "B2B software") AND (enterprise OR "Fortune 500" OR "enterprise sales" OR "strategic accounts")\nCompany Revenue: $10M-$50M, $50M-$100M\nIndustry: Computer Software, Information Technology & Services, Internet\nYears in Current Position: 0-1 years, 1-2 years\nFunction: Sales\nSeniority Level: Director, VP\nBoolean in Keywords field: (enterprise OR "Fortune 500") AND (SaaS OR "B2B software")',
        rubric: rubricByDifficulty.hard,
        validation: {
            minWords: 40,
            minSentences: 3,
        },
        promptGenerator: (submission, rubric) => `
            You are a SaaS Recruiter evaluating a LinkedIn Recruiter search. A participant has written a LinkedIn Recruiter search.

            **CHALLENGE GOAL:**
            Find Sales Directors at SaaS companies ($10M-$100M revenue) with enterprise sales experience and less than 2 years in current role.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they use "Company Revenue" or keywords for size?
            2. Did they use "Years in Current Position" (0-2 years)?
            3. Did they include "Enterprise" or "Fortune 500" keywords?
            4. Did they include title variations (Director/Head/VP)?
            5. Did they combine Function: Sales + Seniority: Director/VP?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game25',
        title: 'Game 25: Veteran Transition Sourcing',
        description: 'Your company wants to hire military veterans for "Operations Manager" and "Logistics Coordinator" roles. You need to identify military occupational specialties (MOS) that translate well and create a targeted sourcing strategy.',
        task: 'Your task: List 3-4 relevant military roles/MOS and describe your sourcing approach.',
        placeholder: 'e.g., 1) Army Logistics Officers (92A MOS)...',
        difficulty: 'medium' as const,
        skillCategory: 'diversity' as const,
        exampleSolution: '1) Army Logistics Officers (88A/92A MOS) and Navy Supply Corps Officers have direct operational and supply chain experience. 2) Marine Corps Operations Officers and Air Force Mission Support Officers bring coordination and team leadership skills. 3) Senior NCOs (E-7 to E-9) across all branches with logistics or operations backgrounds. Sourcing approach: Partner with veteran organizations (Hire Heroes USA, Veterati, FourBlock), attend veteran job fairs, use LinkedIn\'s Military Occupational Specialty feature, search for keywords like "veteran", "transitioning service member", "military leadership", "clearance holder". Create veteran-friendly JDs that translate requirements (avoid corporate jargon, highlight leadership and problem-solving). Offer MOS-to-civilian role translation guides and mentorship programs for smooth transition.',
        rubric: rubricByDifficulty.medium,
        validation: {
            minWords: 60,
            minSentences: 3,
        },
        promptGenerator: (submission, rubric) => `
            You are a Veteran Talent Acquisition Specialist evaluating a sourcing strategy. A participant has created a sourcing strategy.

            **CHALLENGE GOAL:**
            Identify military occupational specialties (MOS) that translate to Operations Manager and Logistics Coordinator roles and create a targeted sourcing strategy.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they mention specific MOS codes (e.g., 92A, 88N)?
            2. Did they mention specific ranks (NCOs, Officers)?
            3. Did they suggest veteran-specific job boards (Hire Heroes, etc.)?
            4. Did they mention translation of military skills to civilian roles (Ops/Logistics)?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game26',
        title: 'Game 26: ATS Candidate Re-engagement',
        description: 'Your ATS has 500 "Silver Medalist" candidates (made it to final rounds but not selected) from the past 12 months. You have 5 new openings. Design a re-engagement campaign strategy.',
        task: 'Your task: Outline your segmentation approach and email campaign (4-5 steps).',
        placeholder: 'e.g., Step 1: Segment candidates by...',
        difficulty: 'medium' as const,
        skillCategory: 'ats' as const,
        exampleSolution: 'Step 1: Segment by role similarity - use ATS tags to match candidates to the 5 new openings by skills and level. Prioritize those who interviewed within the last 6 months (warmer leads). Step 2: Check candidate status - scrub LinkedIn to see who might have changed jobs (remove those recently promoted or moved). Step 3: Personalized outreach sequence - Email 1 (Day 0): "We\'re reaching out because we were impressed by you during your [role] interview. We have new opportunities that might be a better fit." Include specific role links. Email 2 (Day 5): Follow-up for non-responders with additional context about team/company updates. Step 4: Fast-track process - Offer expedited interviews (skip phone screen) since they\'re already vetted. Step 5: Track metrics - monitor response rate, conversion to interview, and time-to-hire vs. new candidates. Silver medalists should convert 20-30% to interviews.',
        rubric: rubricByDifficulty.medium,
        validation: {
            minWords: 50,
            minSentences: 3,
        },
        promptGenerator: (submission, rubric) => `
            You are a Candidate Marketing Manager evaluating a re-engagement campaign design. A participant has designed a re-engagement campaign.

            **CHALLENGE GOAL:**
            Design a re-engagement campaign strategy for 500 Silver Medalist candidates for 5 new openings.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they segment the list (e.g., by role or recency)?
            2. Did they acknowledge the past relationship ("We met last year")?
            3. Did they offer a "Fast Track" (skip phone screen)?
            4. Did they define a basic sequence (touchpoints / timing)?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game27',
        title: 'Game 27: GDPR-Compliant Sourcing',
        description: 'You\'re sourcing candidates in the EU for a "Data Privacy Officer" role. You found great profiles and want to add them to your ATS and send outreach emails. What GDPR compliance steps must you take?',
        task: 'Your task: List 4-5 GDPR requirements for compliant candidate sourcing and data handling.',
        placeholder: 'e.g., 1) Obtain explicit consent before...',
        difficulty: 'hard' as const,
        skillCategory: 'diversity' as const,
        exampleSolution: '1) Obtain explicit consent before adding candidates to your ATS - you cannot store personal data without their permission. Use LinkedIn InMail or email to request consent first. 2) Provide clear privacy notice - inform candidates how their data will be used, stored, and for how long (typically 6-12 months for recruiting purposes). 3) Right to erasure - candidates can request deletion of their data at any time. Build ATS workflows to honor these requests within 30 days. 4) Data minimization - only collect necessary information (no sensitive data like race, religion, health unless legally required for diversity monitoring with consent). 5) Lawful basis - ensure you have legitimate interest or consent for processing. Don\'t share candidate data with third parties without explicit consent. 6) Cross-border transfer - if transferring data from EU to US, ensure your company has Standard Contractual Clauses or Privacy Shield equivalent. 7) Document compliance - maintain records of consent and data processing activities.',
        rubric: rubricByDifficulty.hard,
        validation: {
            minWords: 70,
            minSentences: 4,
        },
        promptGenerator: (submission, rubric) => `
            You are a Data Privacy Officer evaluating GDPR compliance steps. A participant has outlined GDPR steps.

            **CHALLENGE GOAL:**
            List GDPR requirements for compliant candidate sourcing and data handling when sourcing candidates in the EU.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they mention "Legitimate Interest" or "Consent"?
            2. Did they mention the "Right to be Forgotten" (Deletion)?
            3. Did they mention "Data Minimization" (Only what's needed)?
            4. Did they mention informing candidates within a certain timeframe / privacy notice?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game28',
        title: 'Game 28: Boolean for Modern Platforms',
        description: 'Find "Developer Advocates" or "DevRel Engineers" who are active on Twitter/X, have spoken at developer conferences, contribute to open source on GitHub, and write technical blogs. They should have backend development experience.',
        task: 'Your task: Write a multi-platform sourcing strategy using Boolean and X-ray searches.',
        placeholder: 'e.g., GitHub: site:github.com...',
        difficulty: 'hard' as const,
        skillCategory: 'xray' as const,
        validation: {
            keywords: ['Developer Advocate', 'backend'],
        },
        exampleSolution: 'GitHub X-ray: site:github.com ("Developer Advocate" OR "DevRel" OR "Developer Relations") AND (speaker OR conference OR "open source" OR contributor) -site:github.com/topics\n\nTwitter/X X-ray: site:twitter.com ("Developer Advocate" OR "DevRel") AND (backend OR "backend developer" OR API) AND (speaking OR conference OR "just spoke")\n\nLinkedIn Boolean: ("Developer Advocate" OR "DevRel Engineer" OR "Developer Relations") AND (speaker OR "conference speaker" OR "technical blog" OR blogger) AND (backend OR "backend development" OR Python OR Node OR Go)\n\nDev.to X-ray: site:dev.to (author OR "@") AND ("Developer Advocate" OR DevRel) AND (backend OR API OR "backend development")\n\nMedium X-ray: site:medium.com ("Developer Advocate" OR DevRel) AND (backend OR API OR microservices) AND (@)\n\nConference sites: site:sessionize.com ("Developer Advocate" OR DevRel) AND (backend OR API)',
        rubric: rubricByDifficulty.hard,
        promptGenerator: (submission, rubric) => `
            You are a DevRel Sourcer evaluating a cross-platform sourcing strategy. A participant has written a cross-platform strategy.

            **CHALLENGE GOAL:**
            Find Developer Advocates who are active on Twitter/X, speak at conferences, contribute to GitHub open source, write technical blogs, and have backend development experience.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they use "site:twitter.com" or "site:x.com"?
            2. Did they look for "Speaker" or "Conference" keywords?
            3. Did they combine platforms (e.g., GitHub AND Twitter)?
            4. Did they use platform-specific logic (GitHub vs Twitter vs Dev.to)?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game29',
        title: 'Game 29: The Gemini Prompt Engineer',
        description: 'You need to find "Senior Site Reliability Engineers" (SREs) in London who have experience with Terraform and AWS, but you want to exclude candidates from consulting firms. You want to use Gemini to generate the perfect Boolean string for you.',
        task: 'Your task: Write a prompt for Gemini that will generate a high-quality Boolean search string for this role. Be specific about your requirements.',
        placeholder: 'e.g., Act as a sourcing expert and write a Boolean string for...',
        difficulty: 'medium' as const,
        skillCategory: 'ai-prompting' as const,
        exampleSolution: 'Act as an expert technical sourcer. Write a Boolean search string for LinkedIn Recruiter to find Senior Site Reliability Engineers in London. Required skills: Terraform AND AWS. Exclude candidates currently working at consulting firms (like Accenture, Deloitte, KPMG, etc.). Please use standard Boolean operators (AND, OR, NOT) and group terms correctly with parentheses. Include common job title variations for SRE.',
        rubric: rubricByDifficulty.medium,
        validation: {
            type: 'promptInstructions',
            mustMention: ['Boolean', 'SRE'],
        },
        promptGenerator: (submission, rubric) => `
            You are a Prompt Engineering Coach evaluating an AI prompt submission. A participant has written a prompt for AI.

            **CHALLENGE GOAL:**
            Write a prompt for Gemini to generate a Boolean search string for Senior SREs in London with Terraform/AWS, excluding consulting firms.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they specify the Persona ("Act as a Sourcer")?
            2. Did they provide the Context (London, SRE, Tech Stack)?
            3. Did they include the Constraint ("Exclude consulting firms")?
            4. Did they specify output format (Boolean in code block)?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    // PHASE 1: Advanced Engagement & AI (Games 30-37)
    {
        id: 'game30',
        title: 'Game 30: The Resume Summarizer',
        description: 'You have a 5-page resume for a "Principal Architect" that is full of fluff. You need to send a 3-bullet summary to the Hiring Manager highlighting their Cloud Migration experience.',
        task: 'Your task: Write a prompt for an AI to extract and summarize the key Cloud Migration achievements from a long text.',
        placeholder: 'e.g., Act as a technical recruiter and summarize...',
        difficulty: 'easy' as const,
        skillCategory: 'ai-prompting' as const,
        exampleSolution: 'Act as a Senior Technical Recruiter. I will paste a resume below. Please extract the 3 most significant achievements related to "Cloud Migration" or "Digital Transformation". Format them as punchy bullet points that quantify the impact (cost savings, speed, scale). Ignore general responsibilities; focus on outcomes. Output ONLY the 3 bullets.',
        rubric: rubricByDifficulty.easy,
        validation: {
            type: 'promptInstructions',
            mustMention: ['Cloud Migration', 'bullet'],
        },
        promptGenerator: (submission, rubric) => `
            You are an AI Co-pilot Coach for Recruiters evaluating an AI prompt submission. A participant has used AI to summarize a resume.

            **CHALLENGE GOAL:**
            Write a prompt for AI to extract and summarize key Cloud Migration achievements from a 5-page resume.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they ask for a "Summary" vs "Rewrite"?
            2. Did they focus on the "Cloud Migration" project (the key relevance)?
            3. Did they ask for a specific format (Bullet points)?
            4. Did they tell AI to ignore generic responsibilities and focus on results?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game31',
        title: 'Game 31: The Break-Up Email',
        description: 'You have reached out to a candidate 3 times with no response. You want to send one final "break-up" email to close the loop and potentially trigger a response (the "strip-line" technique).',
        task: 'Your task: Write a subject line and short email body (under 50 words) that politely withdraws the offer to chat.',
        placeholder: 'e.g., Subject: Permission to close your file?',
        difficulty: 'medium' as const,
        skillCategory: 'outreach' as const,
        exampleSolution: 'Subject: Permission to close your file?\n\nHi Alex, I haven\'t heard back, so I assume you\'re not interested in the Head of Engineering role right now. I\'m going to close your file for this search so I don\'t keep bothering you. If things change, let me know. Best, [Name]',
        rubric: rubricByDifficulty.medium,
        validation: {
            maxWords: 50,
        },
        promptGenerator: (submission, rubric) => `
            You are a Sales Psychology Expert evaluating a "break-up" email submission.

            **CHALLENGE GOAL:**
            Write a polite break-up email that uses the "take-away" technique to potentially trigger a response.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Is it truly a "take-away" (removing the offer)?
            2. Is it polite but firm?
            3. Is it short (under 50 words)?
            4. Is there a clear next-step hook ("If things change...")?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game32',
        title: 'Game 32: The Lowball Rebuttal',
        description: 'You offered a candidate $120k. They are offended because they wanted $140k. The market average is $125k. You need to de-escalate and keep them interested without immediately raising the offer.',
        task: 'Your task: Write a response (email or script) to handle this objection.',
        placeholder: 'e.g., I understand your frustration...',
        difficulty: 'hard' as const,
        skillCategory: 'negotiation' as const,
        exampleSolution: 'I completely understand where you\'re coming from, and I appreciate you being open about your expectations. We arrived at $120k based on our internal equity and current market benchmarks for this specific level. However, I don\'t want money to be the only blocker if this is the right career move for you. Can we hop on a call to look at the total package (equity, benefits, bonus) and see if we can bridge the gap in other ways?',
        rubric: rubricByDifficulty.hard,
        validation: {
            minWords: 50,
            minSentences: 3,
        },
        promptGenerator: (submission, rubric) => `
            You are a Negotiation Coach evaluating a salary objection response.

            **CHALLENGE GOAL:**
            Handle a salary objection where the candidate wants $140k but was offered $120k (market is $125k).

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they validate the candidate's feelings (Empathy)?
            2. Did they anchor to data (Market/Internal Equity)?
            3. Did they pivot to "Total Compensation" or a conversation?
            4. Did they avoid defensiveness or blame ("budget is the problem")?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game33',
        title: 'Game 33: The Interview Script Generator',
        description: 'You are hiring a "Growth Marketing Manager". You need 5 behavioral interview questions focused on "Experimentation" and "Data Analysis".',
        task: 'Your task: Write a prompt for AI to generate these specific interview questions with a scoring rubric.',
        placeholder: 'e.g., Create an interview guide for...',
        difficulty: 'medium' as const,
        skillCategory: 'ai-prompting' as const,
        exampleSolution: 'Create a structured interview guide for a Growth Marketing Manager. I need 5 behavioral questions focusing on "Experimentation" (A/B testing) and "Data Analysis". For each question, provide a "Good Answer" vs. "Bad Answer" rubric to help me evaluate candidates. Tone: Professional and rigorous.',
        rubric: rubricByDifficulty.medium,
        validation: {
            type: 'promptInstructions',
            mustMention: ['questions', 'rubric'],
        },
        promptGenerator: (submission, rubric) => `
            You are an Interview Design Expert evaluating an AI prompt for interview question generation.

            **CHALLENGE GOAL:**
            Write an AI prompt to generate 5 behavioral interview questions for Growth Marketing Manager (Experimentation + Data Analysis).

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they ask for behavioral questions?
            2. Did they request a rubric/evaluation guide (Crucial for structured interviewing)?
            3. Did they specify the skills (Experimentation/Data)?
            4. Did they ask for follow-up or probing questions?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game34',
        title: 'Game 34: The LinkedIn Voice Note',
        description: 'You are connected with a "Senior Java Engineer" on LinkedIn who ignores text messages. You decide to send a 30-second voice note.',
        task: 'Your task: Write the script for this voice note (approx. 60-80 words). Sound natural and human.',
        placeholder: 'e.g., Hey [Name], I noticed you...',
        difficulty: 'easy' as const,
        skillCategory: 'outreach' as const,
        exampleSolution: 'Hey [Name], I know your inbox is probably exploding with recruiter spam, so I wanted to send a voice note to show there\'s a real human behind this profile. I saw your work on the [Project Name] repo and was genuinely impressed by your approach to concurrency. We\'re building something similar at [Company] and I\'d love to just geek out about it for 5 mins. No pitch, just engineering talk. Let me know.',
        rubric: rubricByDifficulty.easy,
        validation: {
            maxWords: 100,
        },
        promptGenerator: (submission, rubric) => `
            You are a Personal Branding Expert evaluating a LinkedIn voice note script.

            **CHALLENGE GOAL:**
            Write a natural, conversational 30-second voice note script to engage a Senior Java Engineer who ignores text messages.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Does it sound conversational (not like a script)?
            2. Is there a "pattern interrupt" (acknowledging the spam)?
            3. Is the call to action low pressure?
            4. Did they mention something specific about the candidate (project, repo, talk)?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game35',
        title: 'Game 35: The Executive Bio',
        description: 'You found a great "VP of Engineering" candidate. You need to send their profile to your CEO, but the resume is dry. You need a compelling 1-paragraph bio.',
        task: 'Your task: Write a prompt for AI to rewrite a dry resume summary into an exciting executive bio.',
        placeholder: 'e.g., Rewrite this summary to sound...',
        difficulty: 'medium' as const,
        skillCategory: 'persona' as const,
        exampleSolution: 'Rewrite the following resume summary into a compelling, narrative-style executive bio suitable for presenting to a CEO. Highlight their leadership scale (team size), strategic impact (revenue growth), and technical vision. Tone: Impressive, confident, and executive. Keep it under 200 words.',
        rubric: rubricByDifficulty.medium,
        validation: {
            type: 'promptInstructions',
            mustMention: ['bio', 'executive'],
        },
        promptGenerator: (submission, rubric) => `
            You are an Executive Search Researcher evaluating an AI prompt for executive bio generation.

            **CHALLENGE GOAL:**
            Write an AI prompt to transform a dry resume into a compelling executive bio for a VP of Engineering.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they ask for a "narrative" style?
            2. Did they focus on "Strategic Impact" over tasks?
            3. Is the audience defined (CEO)?
            4. Did they limit length (e.g., under 200 words) so a CEO actually reads it?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game36',
        title: 'Game 36: The Kaggle Miner',
        description: 'You need to find a "Machine Learning Engineer" who is top-tier at "Computer Vision". LinkedIn is too noisy. You want to search Kaggle.',
        task: 'Your task: Write a Google X-Ray search string to find Kaggle user profiles with "Computer Vision" expertise.',
        placeholder: 'e.g., site:kaggle.com ...',
        difficulty: 'hard' as const,
        skillCategory: 'xray' as const,
        exampleSolution: 'site:kaggle.com/ (users OR "competitions") ("Computer Vision" OR CV OR "Image Processing") AND ("Grandmaster" OR "Master" OR "Expert" OR ranking) -site:kaggle.com/c -site:kaggle.com/code',
        rubric: rubricByDifficulty.hard,
        validation: {
            keywords: ['Kaggle', 'data'],
        },
        promptGenerator: (submission, rubric) => `
            You are a Technical Sourcing Guru evaluating an X-Ray search string submission.

            **CHALLENGE GOAL:**
            Find top-tier Machine Learning Engineers with Computer Vision expertise on Kaggle using Google X-Ray search.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they target the right site (kaggle.com)?
            2. Did they look for ranking keywords (Master, Grandmaster)?
            3. Did they try to filter out competition pages?
            4. Did they use Computer Vision synonyms (CV, image, etc.)?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game37',
        title: 'Game 37: The Dribbble Detective',
        description: 'You need a "Senior UI Designer" with a style that is "Minimalist" and "Clean". You want to search Dribbble.',
        task: 'Your task: Write a Google X-Ray search string to find Dribbble profiles with these keywords.',
        placeholder: 'e.g., site:dribbble.com ...',
        difficulty: 'medium' as const,
        skillCategory: 'xray' as const,
        exampleSolution: 'site:dribbble.com (minimalist OR clean OR "minimalism") AND ("UI Designer" OR "Product Designer") AND (location OR "hiring" OR "available") -site:dribbble.com/shots -site:dribbble.com/stories',
        rubric: rubricByDifficulty.medium,
        validation: {
            keywords: ['Dribbble', 'design'],
        },
        promptGenerator: (submission, rubric) => `
            You are a Design Recruiting Specialist evaluating an X-Ray search string submission.

            **CHALLENGE GOAL:**
            Find Senior UI Designers with minimalist and clean design aesthetics on Dribbble using Google X-Ray search.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they target dribbble.com?
            2. Did they include the aesthetic keywords (Minimalist/Clean)?
            3. Did they exclude "shots" (individual images) to find profiles?
            4. Did they consider availability indicators (Hire Me, available)?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    // PHASE 2: Talent Intelligence & Strategy (Games 38-45)
    {
        id: 'game38',
        title: 'Game 38: The Competitor Map',
        description: 'You are hiring for a Fintech startup in New York. You need to identify 5 specific competitor companies to target for "Payments Engineers".',
        task: 'Your task: List 5 companies that have strong payments engineering teams in NYC and explain why you chose them.',
        placeholder: 'e.g., 1. Stripe - because...',
        difficulty: 'medium' as const,
        skillCategory: 'talent-intelligence' as const,
        exampleSolution: '1. Stripe (Best-in-class payments infra). 2. Adyen (Direct competitor, strong engineering culture). 3. Block/Square (Mature payments stack). 4. PayPal/Venmo (Deep talent pool in NYC). 5. Brex (Modern fintech stack). Strategy: Target these because their engineers solve similar high-scale transaction challenges.',
        rubric: rubricByDifficulty.medium,
        validation: {
            minWords: 70,
            minSentences: 4,
        },
        promptGenerator: (submission, rubric) => `
            You are a Market Mapping Expert evaluating a competitor company list submission.

            **CHALLENGE GOAL:**
            Identify 5 competitor companies with strong payments engineering teams in NYC for targeting Payments Engineers.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Are the companies relevant to Fintech/Payments?
            2. Are they likely to have teams in NYC?
            3. Is the reasoning sound (tech stack match)?
            4. Did they think about level of engineers (payments infra vs consumer fintech)?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game39',
        title: 'Game 39: The Salary Benchmarker',
        description: 'Your Hiring Manager wants to pay $150k for a "Staff AI Engineer" in San Francisco. The market rate is $220k+. You need to explain this gap using data logic.',
        task: 'Your task: Write a short email (under 100 words) persuading the HM to increase the budget or lower expectations.',
        placeholder: 'e.g., Hi [Manager], I reviewed the market data...',
        difficulty: 'hard' as const,
        skillCategory: 'talent-intelligence' as const,
        exampleSolution: 'Hi Sarah, I\'ve analyzed the current market for Staff AI Engineers in SF. Our $150k budget is in the 10th percentile; the median is closer to $220k for this level of experience. At $150k, we will likely only attract junior candidates or those requiring visa sponsorship. To hire a true Staff-level engineer who can lead the team, I recommend we either adjust the budget to $210k+ or re-scope the role to "Senior" level. Which path do you prefer?',
        rubric: rubricByDifficulty.hard,
        validation: {
            minWords: 60,
            minSentences: 3,
        },
        promptGenerator: (submission, rubric) => `
            You are a Compensation Analyst evaluating a budget negotiation email.

            **CHALLENGE GOAL:**
            Persuade a Hiring Manager to adjust expectations when their $150k budget for Staff AI Engineer is far below market ($220k+).

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they use data/percentiles to make the case?
            2. Did they offer options (Raise budget OR Lower requirements)?
            3. Was the tone advisory, not complaining?
            4. Did they keep it under 100 words (as requested)?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game40',
        title: 'Game 40: The Neurodiverse Interview',
        description: 'You are designing an interview process for a "QA Tester" role and want to make it inclusive for candidates with Autism/ADHD.',
        task: 'Your task: List 3 specific accommodations you would add to the interview process.',
        placeholder: 'e.g., 1. Send questions in advance...',
        difficulty: 'medium' as const,
        skillCategory: 'diversity' as const,
        exampleSolution: '1. Send the interview agenda and core questions 24 hours in advance to reduce anxiety. 2. Offer a "camera-off" option for the initial screen to lower sensory load. 3. Replace one abstract "behavioral" interview with a practical, take-home work sample test that mimics the actual job.',
        rubric: rubricByDifficulty.medium,
        validation: {
            minWords: 40,
            minSentences: 3,
        },
        promptGenerator: (submission, rubric) => `
            You are a DE&I Consultant evaluating interview accommodation suggestions.

            **CHALLENGE GOAL:**
            Design 3 specific accommodations to make a QA Tester interview process inclusive for neurodiverse candidates (Autism/ADHD).

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Are the accommodations practical?
            2. Do they specifically help with anxiety/processing (common in neurodivergence)?
            3. Do they maintain the bar for quality?
            4. Did they consider interviewer training or expectations?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game41',
        title: 'Game 41: The Red Flag Spotter',
        description: 'You are screening a resume for a "VP of Sales". They list: "Increased revenue by 500%," "Managed team of 50," and "Advisor to CEO." But they have had 4 jobs in 3 years.',
        task: 'Your task: Write 2 probing questions to ask in the phone screen to validate these claims and check the job hopping.',
        placeholder: 'e.g., 1. Can you walk me through...',
        difficulty: 'medium' as const,
        skillCategory: 'screening' as const,
        exampleSolution: '1. "You\'ve had incredible impact in short stints. What specifically prompted your transition from Company A to Company B after only 9 months?" (Probes job hopping). 2. "Regarding the 500% growth - what was the starting revenue number, and what specific contribution was directly yours vs. the market trend?" (Probes attribution).',
        rubric: rubricByDifficulty.medium,
        validation: {
            minWords: 40,
            minSentences: 2,
        },
        promptGenerator: (submission, rubric) => `
            You are an Executive Recruiter evaluating probing questions for a resume screening.

            **CHALLENGE GOAL:**
            Write 2 probing questions to validate impressive claims and investigate job hopping for a VP of Sales candidate.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they ask about the transitions (Job hopping)?
            2. Did they ask for the "Baseline" of the metrics (500% of what?)?
            3. Is the tone curious, not accusatory?
            4. Did they probe "We vs I" (individual contribution)?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game42',
        title: 'Game 42: The Video JD Script',
        description: 'You need to hire Gen Z "Social Media Managers". You want to post a 30-second video on TikTok/Reels to advertise the role.',
        task: 'Your task: Write the script for the video. Keep it high-energy and authentic.',
        placeholder: 'e.g., Stop scrolling! If you love...',
        difficulty: 'easy' as const,
        skillCategory: 'job-description' as const,
        exampleSolution: 'Stop scrolling! 🛑 Do you spend more time on TikTok than you sleep? We need a Social Media Manager for [Brand] who actually gets it. You\'ll own our entire content calendar, work with top creators, and yes - you can work from your couch. 🛋️ No degree required, just show us your best viral video. Link in bio to apply! 🚀',
        rubric: rubricByDifficulty.easy,
        validation: {
            minWords: 50,
            minSentences: 3,
        },
        promptGenerator: (submission, rubric) => `
            You are a Social Media Recruiter evaluating a video job advertisement script.

            **CHALLENGE GOAL:**
            Write a high-energy, authentic 30-second video script for TikTok/Reels to hire Gen Z Social Media Managers.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Is the hook strong (first 3 seconds)?
            2. Is the tone right for Gen Z (Authentic, not corporate)?
            3. Is there a clear Call to Action (Link in bio)?
            4. Does it focus on the vibe and perks rather than corporate language?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game43',
        title: 'Game 43: The PDF Hunter',
        description: 'You need to find resumes of "Data Scientists" that are publicly hosted on university websites (often as PDF or Word docs).',
        task: 'Your task: Write a Google Boolean string to find these file types specifically.',
        placeholder: 'e.g., filetype:pdf ...',
        difficulty: 'hard' as const,
        skillCategory: 'boolean' as const,
        exampleSolution: '(filetype:pdf OR filetype:doc OR filetype:docx) "Data Scientist" AND (Python OR R) AND ("machine learning" OR ML) AND (resume OR cv OR vitae) -job -sample -template',
        rubric: rubricByDifficulty.hard,
        validation: {
            keywords: ['filetype', 'Data Scientist'],
        },
        promptGenerator: (submission, rubric) => `
            You are a Google Search Hacker evaluating a Boolean search string for finding resumes.

            **CHALLENGE GOAL:**
            Find publicly hosted Data Scientist resumes on university websites using Google Boolean search with file type operators.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they use the filetype: operator?
            2. Did they include keywords for "Resume" (CV, Vitae)?
            3. Did they exclude templates/samples (-sample)?
            4. Did they target specific domains (e.g., site:edu or site:github.io)?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game44',
        title: 'Game 44: The Alumni Network',
        description: 'You want to hire "Boomerang" employees - people who used to work at your company (e.g., "Airbnb") but left, and might want to come back.',
        task: 'Your task: Write the LinkedIn Recruiter filters to find these people.',
        placeholder: 'e.g., Past Company: Airbnb AND...',
        difficulty: 'medium' as const,
        skillCategory: 'linkedin' as const,
        exampleSolution: 'Past Company: Airbnb\nCurrent Company: NOT Airbnb\nYears of Experience: 5+ (Targeting seniors)\nKeywords: "Software Engineer" OR "Product Manager"\nInMail Strategy: "Miss you!"',
        rubric: rubricByDifficulty.medium,
        validation: {
            minWords: 40,
            minSentences: 3,
        },
        promptGenerator: (submission, rubric) => `
            You are a LinkedIn Power User evaluating LinkedIn Recruiter filter settings.

            **CHALLENGE GOAL:**
            Set up LinkedIn Recruiter filters to find "Boomerang" employees who previously worked at Airbnb but might want to return.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they set Past Company correctly?
            2. Did they EXCLUDE the Current Company (Crucial!)?
            3. Is the logic sound?
            4. Did they add a role constraint (e.g., Engineering) to avoid non-relevant alumni?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game45',
        title: 'Game 45: The Clean-Up Crew',
        description: 'Your ATS is a mess. You have 3,000 duplicate profiles. You need a strategy to merge them without losing data.',
        task: 'Your task: Describe a 3-step process to identify and merge duplicates safely.',
        placeholder: 'e.g., 1. Export data and match by email...',
        difficulty: 'hard' as const,
        skillCategory: 'ats' as const,
        exampleSolution: '1. Match by Email Address (Unique Identifier): Run a script to group profiles with the exact same email. 2. Match by Name + Phone: For those with different emails, look for exact name AND phone matches. 3. Merge Rule: Always keep the "Most Recently Updated" profile as the master, but append notes/attachments from the older profile. Archive the old one.',
        rubric: rubricByDifficulty.hard,
        validation: {
            minWords: 50,
            minSentences: 3,
        },
        promptGenerator: (submission, rubric) => `
            You are an Ops Manager evaluating a data deduplication strategy.

            **CHALLENGE GOAL:**
            Design a 3-step process to safely identify and merge 3,000 duplicate profiles in an ATS without losing data.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they identify a Unique Identifier (Email)?
            2. Did they have a secondary check (Phone/Name)?
            3. Did they define a "Master" record rule (Recency)?
            4. Did they suggest testing on a small sample first?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    // PHASE 3: The Closer & Strategy (Games 46-52)
    {
        id: 'game46',
        title: 'Game 46: The Counter-Offer Killer',
        description: 'Your candidate just resigned, and their current boss offered them a $20k raise to stay. They are wavering. You need to remind them why they wanted to leave in the first place.',
        task: 'Your task: Write a script (email or phone) to handle this counter-offer situation.',
        placeholder: 'e.g., I hear you, and it\'s flattering...',
        difficulty: 'hard' as const,
        skillCategory: 'negotiation' as const,
        exampleSolution: 'It\'s completely normal to feel torn—that counter-offer is a sign they value you. But let\'s go back to our first conversation. You mentioned you were feeling stagnant and wanted to move into AI-driven products, which your current role can\'t offer. Does a $20k raise solve that stagnation? Or does it just make the golden handcuffs tighter? I want you to make the best decision for your *career*, not just your wallet.',
        rubric: rubricByDifficulty.hard,
        validation: {
            minWords: 50,
            minSentences: 3,
        },
        promptGenerator: (submission, rubric) => `
            You are a Career Coach evaluating a counter-offer handling script. A participant has submitted their approach to helping a candidate who received a counter-offer.

            **CHALLENGE GOAL:**
            Help a wavering candidate remember why they wanted to leave after receiving a $20k counter-offer.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they acknowledge the compliment (The raise)?
            2. Did they pivot back to the "Pain" (Why they looked)?
            3. Did they avoid being pushy/salesy?
            4. Did they invite reflection ("Why did you accept the interview?")?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game47',
        title: 'Game 47: The Equity Explainer',
        description: 'You are hiring a "Senior Engineer" from a non-tech company. They don\'t understand why you are offering lower cash ($160k) but high equity (RSUs). They only care about the monthly paycheck.',
        task: 'Your task: Explain the value of the equity package in simple terms to get them excited.',
        placeholder: 'e.g., Think of equity like...',
        difficulty: 'medium' as const,
        skillCategory: 'negotiation' as const,
        exampleSolution: 'Think of the cash ($160k) as your rent and bills money—it\'s guaranteed. But the equity is your wealth-building money. If we hit our growth targets and the stock price doubles over 4 years, that equity grant isn\'t just a bonus; it could be worth more than your salary. You\'re not just an employee here; you\'re an owner. You get to benefit from the value you help create.',
        rubric: rubricByDifficulty.medium,
        validation: {
            minWords: 50,
            minSentences: 3,
        },
        promptGenerator: (submission, rubric) => `
            You are a Startup Advisor evaluating an equity explanation. A participant has submitted their approach to explaining equity value to a non-tech candidate.

            **CHALLENGE GOAL:**
            Explain the value of equity (RSUs) in simple terms to excite a candidate who only cares about monthly paycheck.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they use an analogy (Rent vs Wealth)?
            2. Did they explain the "Upside" potential?
            3. Did they use the word "Owner"?
            4. Did they be honest about vesting/risk (not just upside)?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game48',
        title: 'Game 48: The Culture Add',
        description: 'You are interviewing a candidate who is very different from your current team (introverted, different background). The team says "not a culture fit." You think they are a "Culture Add."',
        task: 'Your task: Write a note to the Hiring Manager explaining why "Culture Fit" is dangerous and why this candidate adds value.',
        placeholder: 'e.g., I noticed the team feedback...',
        difficulty: 'hard' as const,
        skillCategory: 'screening' as const,
        exampleSolution: 'I noticed the feedback on "culture fit," but I want to challenge us to look for "Culture Add" instead. "Fit" often just means "more of the same," which leads to groupthink. This candidate brings a rigorous, thoughtful approach that balances our team\'s high-energy, rapid-fire style. We need that diversity of thought to avoid blind spots. If they can do the job and share our values, their different personality is an asset, not a risk.',
        rubric: rubricByDifficulty.hard,
        promptGenerator: (submission, rubric) => `
            You are a DE&I Leader evaluating a culture add advocacy note. A participant has submitted their explanation of why "Culture Fit" is dangerous and why a different candidate adds value.

            **CHALLENGE GOAL:**
            Write a note to the Hiring Manager explaining why "Culture Fit" is dangerous and why this candidate adds value as a "Culture Add."

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they distinguish "Fit" (Sameness) vs "Add" (New perspective)?
            2. Did they mention the business risk of "Groupthink"?
            3. Did they advocate for the candidate's specific strength?
            4. Did they tie the "add" to a business benefit (e.g., "better at risk assessment")?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game49',
        title: 'Game 49: The Location Strategy',
        description: 'Your CTO wants to open a new remote hub for "Data Engineers". She suggests "San Francisco" or "London". You think "Poland" or "Brazil" is better for talent supply/cost.',
        task: 'Your task: Write a brief pitch (3-4 sentences) proposing the alternative location.',
        placeholder: 'e.g., While SF has talent, the competition...',
        difficulty: 'medium' as const,
        skillCategory: 'talent-intelligence' as const,
        exampleSolution: 'While SF and London have top talent, they are the most competitive and expensive markets in the world. I recommend looking at Poland or Brazil. Both have massive supplies of high-quality Data Engineers (strong STEM education) at 40-60% of the cost. Plus, retention rates in these emerging hubs are significantly higher because we can be a top-tier employer there, rather than just another startup in SF.',
        rubric: rubricByDifficulty.medium,
        validation: {
            minWords: 70,
            minSentences: 4,
        },
        promptGenerator: (submission, rubric) => `
            You are a Global Talent Strategist evaluating a location strategy pitch. A participant has submitted their proposal for an alternative remote hub location.

            **CHALLENGE GOAL:**
            Write a brief pitch proposing Poland or Brazil as better alternatives to San Francisco or London for a Data Engineers hub.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they mention Cost/Competition?
            2. Did they mention Quality/Supply (STEM education)?
            3. Did they mention Retention (Big fish in small pond)?
            4. Did they consider time zones?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game50',
        title: 'Game 50: The Sourcing Bot',
        description: 'You want to build a custom GPT that acts as a Sourcing Assistant. You need to write the "System Prompt" (Instructions) for it.',
        task: 'Your task: Write the system instructions for an AI that should ONLY generate Boolean strings and nothing else.',
        placeholder: 'e.g., You are a Boolean generator. Your rules are...',
        difficulty: 'hard' as const,
        skillCategory: 'ai-prompting' as const,
        exampleSolution: 'You are a Boolean Search Generator. Your ONLY purpose is to output valid Boolean search strings. Rules: 1. Receive a job description or list of skills. 2. Output a Boolean string inside a code block. 3. Do NOT explain the string. 4. Do NOT say "Here is your string." 5. Use standard operators (AND, OR, NOT). 6. If the user input is vague, ask ONE clarifying question. Otherwise, just generate.',
        rubric: rubricByDifficulty.hard,
        validation: {
            type: 'promptInstructions',
            mustMention: ['Boolean', 'string'],
        },
        promptGenerator: (submission, rubric) => `
            You are a Sourcing Automation Architect evaluating AI system instructions. A participant has submitted their system prompt for a Boolean search generator AI.

            **CHALLENGE GOAL:**
            Write system instructions for an AI that should ONLY generate Boolean strings and nothing else.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they specify the role/keywords clearly?
            2. Did they ask for "Boolean" output specifically?
            3. Did they include "Exclusions" (NOT)?
            4. Did they ask for Boolean-only output (no conversational filler)?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game51',
        title: 'Game 51: The Purple Squirrel',
        description: 'CAPSTONE: You need a "Rust Engineer" with "Cryptography" background, who speaks "Japanese", and is willing to relocate to "Switzerland".',
        task: 'Your task: Write a multi-part sourcing strategy (Boolean + Platform + Outreach angle).',
        placeholder: 'e.g., Boolean: ... Platform: ... Outreach: ...',
        difficulty: 'hard' as const,
        skillCategory: 'multi' as const,
        exampleSolution: 'Boolean: (Rust OR RustLang) AND (Cryptography OR Crypto OR "Zero Knowledge" OR ZK) AND (Japanese OR "JLPT" OR "Japanese speaker"). Platform: GitHub (search for Rust crypto repos), LinkedIn (filter by Language: Japanese), and Rust Community Discords. Outreach Angle: "Your unique blend of Rust + Crypto + Japanese is exactly what we need for our Tokyo-Zurich bridge team. We offer full relocation support to Switzerland."',
        rubric: rubricByDifficulty.hard,
        validation: {
            minWords: 80,
            recommendedMinWords: 120,
            minSentences: 3,
            minChars: 300,
        },
        promptGenerator: (submission, rubric) => `
            You are a Niche Sourcing Specialist evaluating a multi-part sourcing strategy. A participant has submitted their approach to finding a rare "Purple Squirrel" candidate.

            **CHALLENGE GOAL:**
            Write a multi-part sourcing strategy (Boolean + Platform + Outreach) for a Rust Engineer with Cryptography background, who speaks Japanese, willing to relocate to Switzerland.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they look for "adjacent" skills (e.g., C++ for Rust)?
            2. Did they target specific communities (RustConf, Discord)?
            3. Did they use "Project" keywords (e.g., "Servo", "Tokio")?
            4. Did they look for language cues (e.g., "Rust" often appears with "Systems Programming")?

            Be specific, constructive, and actionable in your feedback.
        `
    },
    {
        id: 'game52',
        title: 'Game 52: The Head of Talent',
        description: 'THE FINALE: You are the first Head of Talent at a Series A startup. You have $0 budget for tools. You need to hire 20 engineers in 6 months.',
        task: 'Your task: Outline your "Guerrilla Recruiting" strategy (Tools, Process, Brand).',
        placeholder: 'e.g., Tools: Free versions of... Process: ...',
        difficulty: 'hard' as const,
        skillCategory: 'talent-intelligence' as const,
        exampleSolution: 'Tools: Use free LinkedIn (optimize network), GitHub X-Ray (free), and a simple Trello/Notion board as an ATS. Process: Implement "Founder Sourcing" blocks (Founder sends 10 emails/week). Set up a generous Employee Referral Program (cash bonus). Brand: Write 1 high-quality engineering blog post per month to drive inbound. Focus on "High Touch" candidate experience to win against big tech.',
        rubric: rubricByDifficulty.hard,
        validation: {
            minWords: 80,
            minSentences: 5,
        },
        promptGenerator: (submission, rubric) => `
            You are a VP of Talent evaluating a guerrilla recruiting strategy. A participant has submitted their approach to hiring 20 engineers in 6 months with $0 budget.

            **CHALLENGE GOAL:**
            Outline a "Guerrilla Recruiting" strategy (Tools, Process, Brand) to hire 20 engineers in 6 months with no budget.

            **USER SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate the submission against each rubric criterion. Assign points for each criterion and provide specific feedback.

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [One sentence explaining why]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [One sentence explaining why]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [One sentence explaining why]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [One sentence explaining why]

            WHAT WORKED (2-3 specific strengths):
            - ...
            - ...

            IMPROVEMENT AREAS (2-3 specific suggestions):
            - ...
            - ...

            **EVALUATION CRITERIA:**
            1. Did they include "Time to Fill"?
            2. Did they include "Quality of Hire" (Retention/Performance)?
            3. Did they include "Pipeline Health" (Conversion rates)?
            4. Did they mention a tracking system (ATS/Spreadsheet)?

            Be specific, constructive, and actionable in your feedback.
        `
    }
];

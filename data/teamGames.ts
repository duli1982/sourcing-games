import { Game, RubricItem } from '../types';

/**
 * Team Games - Collaborative Sourcing Challenges
 *
 * These games are designed for team submissions (one submission per team).
 * Team scores are tracked separately from individual player scores.
 *
 * Rotation Schedule: Bi-weekly (15th and end of month)
 * Total: 24 team games
 */

export const rubricByDifficulty: Record<'easy' | 'medium' | 'hard', RubricItem[]> = {
    easy: [
        { criteria: 'Team Strategy', points: 30, description: 'Clear collaborative approach and division of work' },
        { criteria: 'Core Requirements', points: 25, description: 'Addresses all key task requirements' },
        { criteria: 'Platform Understanding', points: 25, description: 'Demonstrates platform-specific knowledge' },
        { criteria: 'Completeness', points: 20, description: 'Comprehensive and well-structured response' }
    ],
    medium: [
        { criteria: 'Advanced Team Strategy', points: 25, description: 'Sophisticated collaborative approach with clear ownership' },
        { criteria: 'Strategic Depth', points: 30, description: 'In-depth analysis with multiple angles and approaches' },
        { criteria: 'Platform Expertise', points: 25, description: 'Advanced platform features and best practices' },
        { criteria: 'Innovation & Optimization', points: 20, description: 'Creative solutions and process optimization' }
    ],
    hard: [
        { criteria: 'Expert Team Coordination', points: 25, description: 'Masterful collaboration with specialized roles' },
        { criteria: 'Comprehensive Strategy', points: 30, description: 'Multi-layered approach covering all aspects' },
        { criteria: 'Advanced Platform Mastery', points: 25, description: 'Expert-level platform knowledge and techniques' },
        { criteria: 'Strategic Excellence', points: 20, description: 'Industry-leading approach with measurable outcomes' }
    ]
};

export const teamGames: Game[] = [
    // ========== MULTI-PLATFORM SOURCING GAMES (9 games) ==========

    // GitHub Sourcing (3 games)
    {
        id: 'team-github-1',
        title: 'Team GitHub Challenge: Open Source Contributors',
        description: 'Your team needs to find active Python open-source contributors with expertise in machine learning libraries. Target: developers who have contributed to popular ML libraries (TensorFlow, PyTorch, scikit-learn) in the past 6 months.',
        task: 'As a team, create a comprehensive GitHub sourcing strategy including: 1) Search queries using GitHub code search syntax, 2) Repository filters (stars, forks, activity), 3) Contributor evaluation criteria, 4) Outreach approach for passive candidates.',
        placeholder: 'language:Python stars:>100 pushed:>2024-06-01 ...',
        difficulty: 'easy' as const,
        skillCategory: 'multiplatform' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.easy,
        validation: {
            keywords: ['python', 'repository', 'contributor', 'stars', 'language'],
            minWords: 50,
            minChars: 200
        },
        promptGenerator: (submission, rubric) => `
            You are a Technical Sourcing Coach evaluating a team's GitHub sourcing strategy.

            **TEAM CHALLENGE:**
            Find active Python ML open-source contributors using GitHub.

            **TEAM SUBMISSION:**
            "${submission}"

            **SCORING RUBRIC (Total 100 points):**
            ${rubric?.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n            ') || ''}

            **YOUR TASK:**
            Evaluate this team submission for:
            1. GitHub search syntax quality (language:, stars:, pushed:, etc.)
            2. Repository evaluation criteria (activity, popularity, relevance)
            3. Contributor identification strategy (commits, PRs, issues)
            4. Team collaboration evidence (division of work, comprehensive approach)

            **REQUIRED OUTPUT FORMAT:**
            SCORE: [total out of 100]

            BREAKDOWN:
            - ${rubric?.[0]?.criteria}: X/${rubric?.[0]?.points} pts - [Explain team strategy]
            - ${rubric?.[1]?.criteria}: Y/${rubric?.[1]?.points} pts - [Explain requirements coverage]
            - ${rubric?.[2]?.criteria}: Z/${rubric?.[2]?.points} pts - [Explain GitHub knowledge]
            - ${rubric?.[3]?.criteria}: W/${rubric?.[3]?.points} pts - [Explain completeness]

            TEAM STRENGTHS:
            - [Specific collaborative wins]
            - [Effective strategy elements]

            IMPROVEMENT AREAS:
            - [Where team could improve]
            - [Missing elements]

            Be specific about GitHub best practices and team collaboration quality.
        `
    },
    {
        id: 'team-github-2',
        title: 'Team GitHub Challenge: Code Quality Analysis',
        description: 'Your team is sourcing senior Rust developers for a blockchain startup. The client wants developers who write high-quality, well-documented code with active community engagement.',
        task: 'Develop a team strategy to: 1) Find Rust repositories with high code quality indicators, 2) Identify maintainers vs. casual contributors, 3) Evaluate code review participation, 4) Assess documentation quality and community leadership.',
        placeholder: 'language:Rust topics:blockchain is:public ...',
        difficulty: 'medium' as const,
        skillCategory: 'multiplatform' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.medium,
        validation: {
            keywords: ['rust', 'code', 'review', 'commit', 'maintainer'],
            minWords: 80,
            minChars: 300
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating a team's advanced GitHub sourcing strategy for senior Rust developers.

            **TEAM CHALLENGE:**
            Find high-quality Rust blockchain developers using GitHub.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Code quality assessment methodology
            - Maintainer vs. contributor identification
            - Code review participation analysis
            - Team division of labor and strategy depth

            Provide detailed scoring with emphasis on advanced GitHub features and team collaboration.
        `
    },
    {
        id: 'team-github-3',
        title: 'Team GitHub Challenge: Enterprise OSS Strategy',
        description: 'Your team must source engineering leaders who have successfully built and maintained enterprise-scale open-source projects. Target: maintainers of projects with 10K+ stars, active governance, and corporate sponsorship.',
        task: 'Create a comprehensive team approach to: 1) Identify enterprise-grade OSS projects (governance, sponsors, roadmaps), 2) Map contributor hierarchies (BDFL, core team, committers), 3) Analyze leadership qualities through PR reviews and issue triage, 4) Build outreach sequence for executive-level candidates.',
        placeholder: 'stars:>10000 is:public topics:infrastructure has:wiki ...',
        difficulty: 'hard' as const,
        skillCategory: 'multiplatform' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.hard,
        validation: {
            keywords: ['enterprise', 'maintainer', 'governance', 'sponsor', 'leadership'],
            minWords: 120,
            minChars: 500
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating an expert-level team GitHub sourcing strategy for engineering leaders.

            **TEAM CHALLENGE:**
            Find and engage enterprise OSS leaders using GitHub.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Enterprise OSS project identification criteria
            - Leadership assessment methodology (governance, decision-making)
            - Team role specialization (who researches what)
            - Executive outreach strategy sophistication

            Provide expert-level feedback on team coordination and GitHub mastery.
        `
    },

    // Stack Overflow Sourcing (3 games)
    {
        id: 'team-stackoverflow-1',
        title: 'Team Stack Overflow Challenge: Tag-Based Sourcing',
        description: 'Your team is sourcing JavaScript full-stack developers with expertise in React and Node.js. Target: active Stack Overflow contributors with strong reputation in relevant tags.',
        task: 'Develop a team strategy to: 1) Identify target tags (react, node.js, javascript), 2) Filter by reputation thresholds and answer quality, 3) Evaluate answer depth and community engagement, 4) Build candidate profiles from SO activity.',
        placeholder: '[react] [node.js] user:12345 reputation:>5000 ...',
        difficulty: 'easy' as const,
        skillCategory: 'multiplatform' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.easy,
        validation: {
            keywords: ['tag', 'reputation', 'answer', 'stackoverflow', 'user'],
            minWords: 50,
            minChars: 200
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating a team's Stack Overflow sourcing strategy.

            **TEAM CHALLENGE:**
            Find React/Node.js developers via Stack Overflow tags and reputation.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Tag selection and filtering strategy
            - Reputation threshold reasoning
            - Answer quality assessment approach
            - Team collaboration and role division

            Provide feedback on Stack Overflow sourcing best practices.
        `
    },
    {
        id: 'team-stackoverflow-2',
        title: 'Team Stack Overflow Challenge: Answer Quality Analysis',
        description: 'Your team needs to find senior Python data engineers. The client wants candidates who don\'t just answer questions but provide deep, educational responses with code examples.',
        task: 'Create a team methodology to: 1) Identify high-quality answers (upvotes, accepted, code examples), 2) Distinguish between quick fixes and educational responses, 3) Assess consistency across multiple tags (python, pandas, sql, spark), 4) Evaluate teaching ability and communication skills.',
        placeholder: '[python] [pandas] [sql] accepted:yes votes:>10 ...',
        difficulty: 'medium' as const,
        skillCategory: 'multiplatform' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.medium,
        validation: {
            keywords: ['answer', 'accepted', 'votes', 'quality', 'python'],
            minWords: 80,
            minChars: 300
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating a team's advanced Stack Overflow answer quality analysis.

            **TEAM CHALLENGE:**
            Find senior Python data engineers through SO answer quality.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Answer quality metrics and filters
            - Teaching ability assessment criteria
            - Cross-tag consistency analysis
            - Team depth of SO platform understanding

            Provide detailed feedback on sophisticated SO sourcing.
        `
    },
    {
        id: 'team-stackoverflow-3',
        title: 'Team Stack Overflow Challenge: Thought Leader Identification',
        description: 'Your team must identify and engage Stack Overflow thought leaders in the DevOps/Cloud space who could be advisory board candidates. Target: top 1% contributors with deep expertise in AWS, Kubernetes, and CI/CD.',
        task: 'Build a comprehensive team strategy to: 1) Identify top contributors (reputation, badges, influence), 2) Analyze thought leadership (blog posts linked in answers, community moderation), 3) Map expertise evolution over time, 4) Develop executive-level outreach sequence for advisory roles.',
        placeholder: '[aws] [kubernetes] [ci-cd] reputation:>20000 gold-badges:>5 ...',
        difficulty: 'hard' as const,
        skillCategory: 'multiplatform' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.hard,
        validation: {
            keywords: ['thought leader', 'reputation', 'badge', 'influence', 'expert'],
            minWords: 120,
            minChars: 500
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating an expert team strategy for finding SO thought leaders.

            **TEAM CHALLENGE:**
            Identify and engage DevOps/Cloud thought leaders on Stack Overflow.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Top contributor identification criteria (top 1% metrics)
            - Thought leadership assessment beyond reputation
            - Expertise evolution analysis methodology
            - Executive outreach sophistication

            Provide expert-level feedback on team coordination and SO mastery.
        `
    },

    // Reddit Sourcing (3 games)
    {
        id: 'team-reddit-1',
        title: 'Team Reddit Challenge: Community Engagement',
        description: 'Your team is sourcing mobile app developers (iOS/Android). Target: active contributors in relevant subreddits who demonstrate both technical expertise and community engagement.',
        task: 'Develop a team approach to: 1) Identify relevant subreddits (r/iOSProgramming, r/androiddev, r/FlutterDev), 2) Find active, helpful contributors (post history, karma, comment quality), 3) Evaluate technical depth through post content, 4) Assess culture fit through communication style.',
        placeholder: 'subreddit:iOSProgramming author:username karma:>1000 ...',
        difficulty: 'easy' as const,
        skillCategory: 'multiplatform' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.easy,
        validation: {
            keywords: ['subreddit', 'reddit', 'community', 'post', 'karma'],
            minWords: 50,
            minChars: 200
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating a team's Reddit sourcing strategy for mobile developers.

            **TEAM CHALLENGE:**
            Find active iOS/Android developers through Reddit community engagement.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Subreddit selection and relevance
            - Community engagement assessment criteria
            - Technical depth evaluation approach
            - Team collaboration and strategy

            Provide feedback on Reddit sourcing best practices.
        `
    },
    {
        id: 'team-reddit-2',
        title: 'Team Reddit Challenge: Niche Community Leaders',
        description: 'Your team needs to find game developers with Unreal Engine and C++ expertise. Target: moderators and active contributors in game dev communities who demonstrate leadership and technical knowledge.',
        task: 'Create a team strategy to: 1) Identify niche subreddits (r/unrealengine, r/gamedev, r/cpp_questions), 2) Find community leaders (mods, frequent helpers, tutorial creators), 3) Evaluate problem-solving ability through comment history, 4) Assess passion and cultural alignment.',
        placeholder: 'subreddit:unrealengine flair:mod OR flair:veteran karma:>5000 ...',
        difficulty: 'medium' as const,
        skillCategory: 'multiplatform' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.medium,
        validation: {
            keywords: ['moderator', 'community', 'leader', 'subreddit', 'game'],
            minWords: 80,
            minChars: 300
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating a team's advanced Reddit sourcing for game developers.

            **TEAM CHALLENGE:**
            Find Unreal Engine/C++ game dev community leaders on Reddit.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Niche community identification
            - Leadership assessment criteria
            - Technical + cultural fit analysis
            - Team depth of Reddit understanding

            Provide detailed feedback on sophisticated Reddit sourcing.
        `
    },
    {
        id: 'team-reddit-3',
        title: 'Team Reddit Challenge: Passive Talent Nurturing',
        description: 'Your team must identify and develop a 6-month nurture strategy for machine learning researchers who are passive on Reddit but highly active in ML communities (r/MachineLearning, r/deeplearning, r/MLQuestions).',
        task: 'Build a comprehensive team strategy to: 1) Identify passive candidates (lurkers vs. contributors, post quality over quantity), 2) Map their interests and pain points through post history, 3) Design content-driven nurture campaign (valuable resources, not pitches), 4) Create multi-touch sequence for warm outreach.',
        placeholder: 'subreddit:MachineLearning research flair:Research karma:>10000 ...',
        difficulty: 'hard' as const,
        skillCategory: 'multiplatform' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.hard,
        validation: {
            keywords: ['nurture', 'passive', 'research', 'sequence', 'content'],
            minWords: 120,
            minChars: 500
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating an expert team strategy for Reddit passive candidate nurturing.

            **TEAM CHALLENGE:**
            Develop 6-month nurture strategy for ML researchers on Reddit.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Passive candidate identification methodology
            - Interest mapping sophistication
            - Content-driven nurture campaign quality
            - Multi-touch sequence strategy

            Provide expert-level feedback on team coordination and Reddit mastery.
        `
    },

    // ========== TEAM COLLABORATIVE GAMES (15 games) ==========

    // Team Boolean Search (3 games)
    {
        id: 'team-boolean-1',
        title: 'Team Boolean Challenge: Multi-Role Search',
        description: 'Your team must create a unified Boolean search strategy to find candidates for 3 related roles: Senior DevOps Engineer, Site Reliability Engineer, and Platform Engineer. All roles require Kubernetes, AWS, and Python.',
        task: 'As a team, build: 1) A master Boolean search covering all 3 roles with proper OR grouping, 2) Role-specific variations, 3) Exclusion strategy to filter out junior candidates, 4) Geographic filters for US + Canada.',
        placeholder: '("DevOps Engineer" OR "SRE" OR ...) AND ...',
        difficulty: 'easy' as const,
        skillCategory: 'boolean' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.easy,
        validation: {
            keywords: ['devops', 'sre', 'kubernetes', 'aws', 'python'],
            requiresBoolean: true,
            requiresParentheses: true,
            minChars: 100
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating a team's multi-role Boolean search strategy.

            **TEAM CHALLENGE:**
            Create unified search for DevOps/SRE/Platform Engineers.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Role variation coverage (all 3 roles)
            - Skill requirement inclusion (K8s, AWS, Python)
            - Exclusion strategy effectiveness
            - Team Boolean logic quality

            Provide feedback on collaborative search strategy.
        `
    },
    {
        id: 'team-boolean-2',
        title: 'Team Boolean Challenge: Diversity-Focused Search',
        description: 'Your team is building a Boolean search to increase diversity in the candidate pipeline for a "Head of Engineering" role. Focus on underrepresented groups while maintaining quality and avoiding discriminatory language.',
        task: 'Develop a team strategy to: 1) Target diversity-focused communities (Women Who Code, Black Girls Code, etc.), 2) Include alternative career paths and non-traditional backgrounds, 3) Broaden title variations beyond "Head of Engineering", 4) Balance inclusion with technical requirements.',
        placeholder: '("Head of Engineering" OR "VP Engineering" OR ...) AND (bootcamp OR "career change" OR ...) ...',
        difficulty: 'medium' as const,
        skillCategory: 'diversity' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.medium,
        validation: {
            keywords: ['diversity', 'community', 'background', 'inclusive'],
            requiresBoolean: true,
            minWords: 60,
            minChars: 250
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating a team's diversity-focused Boolean search strategy.

            **TEAM CHALLENGE:**
            Build inclusive search for Head of Engineering role.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Diversity community targeting
            - Alternative pathway inclusion
            - Avoidance of discriminatory language
            - Balance of inclusion + technical requirements

            Provide feedback on ethical and effective diversity sourcing.
        `
    },
    {
        id: 'team-boolean-3',
        title: 'Team Boolean Challenge: Global Talent Search',
        description: 'Your team must create a comprehensive Boolean strategy to source blockchain developers across 10+ countries with varying LinkedIn penetration, language barriers, and title variations.',
        task: 'Build a team approach to: 1) Map title variations across regions (US: Blockchain Engineer, Europe: DLT Developer, Asia: Web3 Developer), 2) Handle multiple languages (English, German, Mandarin, Spanish), 3) Account for platform differences (LinkedIn strong in US/EU, other platforms in Asia), 4) Create location filters for remote-friendly countries.',
        placeholder: '(Blockchain OR DLT OR Web3 OR 区块链) AND ("Smart Contract" OR ...) ...',
        difficulty: 'hard' as const,
        skillCategory: 'boolean' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.hard,
        validation: {
            keywords: ['blockchain', 'global', 'language', 'region', 'remote'],
            requiresBoolean: true,
            minWords: 100,
            minChars: 400
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating an expert team strategy for global blockchain talent sourcing.

            **TEAM CHALLENGE:**
            Create multi-region, multi-language Boolean search for blockchain devs.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Regional title variation coverage
            - Multi-language search sophistication
            - Platform-specific considerations
            - Team coordination across global research

            Provide expert-level feedback on international Boolean mastery.
        `
    },

    // Team Outreach (3 games)
    {
        id: 'team-outreach-1',
        title: 'Team Outreach Challenge: A/B Testing Campaign',
        description: 'Your team needs to design an A/B test for an outreach campaign targeting data scientists. Create two different message approaches and explain the testing methodology.',
        task: 'As a team, develop: 1) Message A (personalized, research-focused approach), 2) Message B (impact-driven, business outcome approach), 3) Hypothesis for which will perform better, 4) Success metrics and testing plan.',
        placeholder: 'Message A:\nSubject: ...\nBody: ...\n\nMessage B:\nSubject: ...\nBody: ...',
        difficulty: 'easy' as const,
        skillCategory: 'outreach' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.easy,
        validation: {
            keywords: ['message', 'test', 'subject', 'hypothesis', 'metric'],
            minWords: 80,
            maxWords: 200,
            minChars: 300
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating a team's A/B testing outreach campaign design.

            **TEAM CHALLENGE:**
            Design A/B test for data scientist outreach campaign.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Message A quality and approach
            - Message B differentiation
            - Hypothesis clarity
            - Testing methodology soundness

            Provide feedback on A/B testing strategy and message quality.
        `
    },
    {
        id: 'team-outreach-2',
        title: 'Team Outreach Challenge: Multi-Stakeholder Campaign',
        description: 'Your team must design a coordinated outreach campaign targeting both the candidate (Senior Product Manager) and their potential manager (VP of Product). Different messages, same goal.',
        task: 'Create a team strategy for: 1) Candidate message (career growth, impact, team), 2) Manager message (hiring challenges, team needs, candidate value), 3) Timing sequence (who gets contacted first), 4) Coordination plan if both respond.',
        placeholder: 'To Candidate:\nSubject: ...\n\nTo Manager:\nSubject: ...\n\nSequence: ...',
        difficulty: 'medium' as const,
        skillCategory: 'outreach' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.medium,
        validation: {
            keywords: ['candidate', 'manager', 'sequence', 'coordination', 'timing'],
            minWords: 100,
            maxWords: 250,
            minChars: 400
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating a team's multi-stakeholder outreach strategy.

            **TEAM CHALLENGE:**
            Design coordinated outreach to candidate + their manager.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Candidate message appropriateness
            - Manager message positioning
            - Timing sequence strategy
            - Coordination plan quality

            Provide feedback on multi-stakeholder outreach sophistication.
        `
    },
    {
        id: 'team-outreach-3',
        title: 'Team Outreach Challenge: Executive Nurture Campaign',
        description: 'Your team must design a 6-month nurture campaign for C-level executives (CTOs) who are not actively job searching. Focus on thought leadership, not job pitches.',
        task: 'Build a comprehensive team strategy: 1) Month 1-2: Thought leadership content (articles, webinars), 2) Month 3-4: Company culture showcases (team stories, values), 3) Month 5: Soft introduction (coffee chat, no pitch), 4) Month 6: Opportunity presentation if timing aligns.',
        placeholder: 'Touch 1 (Week 1): ...\nTouch 2 (Week 3): ...\n...\nTouch 8 (Week 24): ...',
        difficulty: 'hard' as const,
        skillCategory: 'outreach' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.hard,
        validation: {
            keywords: ['nurture', 'executive', 'thought leadership', 'sequence', 'touch'],
            minWords: 150,
            minChars: 600
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating an expert team strategy for executive nurture campaigns.

            **TEAM CHALLENGE:**
            Design 6-month nurture campaign for passive CTOs.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Content-first approach quality
            - Touch sequencing sophistication
            - Executive-level positioning
            - Long-term relationship building strategy

            Provide expert-level feedback on passive executive engagement.
        `
    },

    // Team ATS Strategy (3 games)
    {
        id: 'team-ats-1',
        title: 'Team ATS Challenge: Pipeline Efficiency',
        description: 'Your team must analyze and optimize a recruiting pipeline with these metrics: 1000 applications → 100 phone screens → 20 onsites → 5 offers → 3 hires. Where are the bottlenecks?',
        task: 'As a team, identify: 1) Conversion rate at each stage, 2) The weakest funnel stage, 3) Root causes for drop-offs, 4) 3 specific improvements to increase hire rate from 3 to 5.',
        placeholder: 'Application→Screen: X%\nScreen→Onsite: Y%\n...\nWeakest stage: ...\nImprovements: ...',
        difficulty: 'easy' as const,
        skillCategory: 'ats' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.easy,
        validation: {
            keywords: ['conversion', 'funnel', 'bottleneck', 'metric', 'improve'],
            minWords: 60,
            minChars: 250
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating a team's ATS pipeline analysis and optimization.

            **TEAM CHALLENGE:**
            Analyze pipeline metrics and improve hire rate from 3 to 5.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Conversion rate calculations
            - Bottleneck identification accuracy
            - Root cause analysis depth
            - Improvement recommendation quality

            Provide feedback on data-driven ATS optimization.
        `
    },
    {
        id: 'team-ats-2',
        title: 'Team ATS Challenge: Diversity Analytics',
        description: 'Your team has access to ATS data showing: 40% of applicants are women, but only 15% make it to final rounds. Asian candidates: 25% of applicants, 30% of finalists. What\'s happening and how do you fix it?',
        task: 'Develop a team analysis: 1) Identify where women candidates drop off (resume screen, phone screen, technical), 2) Hypothesis for why (bias, requirements, process), 3) Specific interventions to improve (blind resume review, diverse panels, etc.), 4) Success metrics to track.',
        placeholder: 'Women drop-off analysis:\nStage: ...\nHypothesis: ...\nInterventions: ...\nMetrics: ...',
        difficulty: 'medium' as const,
        skillCategory: 'ats' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.medium,
        validation: {
            keywords: ['diversity', 'drop-off', 'bias', 'intervention', 'metric'],
            minWords: 80,
            minChars: 350
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating a team's diversity analytics and intervention strategy.

            **TEAM CHALLENGE:**
            Analyze diversity drop-offs and design interventions.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Drop-off analysis accuracy
            - Bias hypothesis quality
            - Intervention specificity and feasibility
            - Metrics alignment with goals

            Provide feedback on data-driven diversity improvement.
        `
    },
    {
        id: 'team-ats-3',
        title: 'Team ATS Challenge: Predictive Hiring Model',
        description: 'Your team must design a predictive model using ATS data to identify which candidates are most likely to: 1) Accept offers, 2) Succeed in role (high performance), 3) Stay >2 years. What data points matter?',
        task: 'Build a comprehensive team strategy: 1) Identify top 10 predictive data points (source, time-in-process, interview scores, etc.), 2) Explain why each matters (correlation to success), 3) Design scoring algorithm (weighted model), 4) Ethical considerations and bias mitigation.',
        placeholder: 'Top predictive signals:\n1. ...\n2. ...\nScoring algorithm:\n...\nBias mitigation: ...',
        difficulty: 'hard' as const,
        skillCategory: 'ats' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.hard,
        validation: {
            keywords: ['predictive', 'data', 'algorithm', 'bias', 'success'],
            minWords: 120,
            minChars: 500
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating an expert team strategy for predictive hiring models.

            **TEAM CHALLENGE:**
            Design predictive model for offer acceptance, performance, retention.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Data point selection quality
            - Correlation reasoning
            - Algorithm sophistication
            - Ethical AI and bias mitigation

            Provide expert-level feedback on data science in recruiting.
        `
    },

    // Team Diversity (3 games)
    {
        id: 'team-diversity-1',
        title: 'Team Diversity Challenge: Sourcing Strategy',
        description: 'Your team must create a sourcing strategy to increase the percentage of underrepresented minorities in your engineering pipeline from 10% to 30% within 6 months.',
        task: 'As a team, develop: 1) Target communities and organizations (HBCUs, Latinx in Tech, etc.), 2) Partnership strategy (sponsorships, events, scholarships), 3) Sourcing tactics (Boolean, referrals, direct outreach), 4) Success metrics and timeline.',
        placeholder: 'Target communities: ...\nPartnerships: ...\nSourcing tactics: ...\nMetrics: ...',
        difficulty: 'easy' as const,
        skillCategory: 'diversity' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.easy,
        validation: {
            keywords: ['community', 'partnership', 'outreach', 'underrepresented', 'metric'],
            minWords: 60,
            minChars: 250
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating a team's diversity sourcing strategy.

            **TEAM CHALLENGE:**
            Increase URM engineering pipeline from 10% to 30% in 6 months.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Community targeting relevance
            - Partnership strategy quality
            - Sourcing tactic diversity
            - Metrics and timeline realism

            Provide feedback on actionable diversity sourcing.
        `
    },
    {
        id: 'team-diversity-2',
        title: 'Team Diversity Challenge: Inclusive Job Descriptions',
        description: 'Your team has a job description for "Senior Software Engineer" that\'s attracting 90% male applicants. Rewrite it to be more inclusive without lowering the bar.',
        task: 'Create a team approach to: 1) Identify exclusionary language (rockstar, ninja, aggressive deadlines), 2) Rewrite requirements (remove "nice-to-haves" that discourage women), 3) Add inclusive benefits (parental leave, flexible hours, ERGs), 4) Test with diverse audience before posting.',
        placeholder: 'Original exclusionary language: ...\nRewritten requirements: ...\nInclusive additions: ...\nTesting plan: ...',
        difficulty: 'medium' as const,
        skillCategory: 'diversity' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.medium,
        validation: {
            keywords: ['inclusive', 'language', 'requirement', 'benefit', 'test'],
            minWords: 80,
            minChars: 350
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating a team's inclusive job description rewrite.

            **TEAM CHALLENGE:**
            Rewrite JD to attract more women without lowering standards.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Exclusionary language identification
            - Rewrite quality and inclusivity
            - Benefit additions relevance
            - Testing methodology

            Provide feedback on inclusive JD best practices.
        `
    },
    {
        id: 'team-diversity-3',
        title: 'Team Diversity Challenge: Systemic Bias Audit',
        description: 'Your team must conduct a full bias audit of the hiring process for a VP of Engineering role: sourcing, screening, interviews, offer decisions. Where are the hidden biases and how do you fix them?',
        task: 'Build a comprehensive team audit: 1) Sourcing bias (where do we look, who do we know), 2) Screening bias (resume keywords, school prestige), 3) Interview bias (culture fit, likability), 4) Offer bias (negotiation gaps, compensation equity), 5) Systemic fixes with accountability.',
        placeholder: 'Sourcing bias audit: ...\nScreening bias: ...\nInterview bias: ...\nOffer bias: ...\nSystemic fixes: ...',
        difficulty: 'hard' as const,
        skillCategory: 'diversity' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.hard,
        validation: {
            keywords: ['bias', 'audit', 'systemic', 'equity', 'accountability'],
            minWords: 120,
            minChars: 500
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating an expert team bias audit for VP of Engineering hiring.

            **TEAM CHALLENGE:**
            Conduct full bias audit across sourcing, screening, interviews, offers.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Bias identification comprehensiveness
            - Root cause analysis depth
            - Systemic fix quality
            - Accountability mechanisms

            Provide expert-level feedback on DEI in hiring.
        `
    },

    // Team Persona (3 games)
    {
        id: 'team-persona-1',
        title: 'Team Persona Challenge: Candidate Segmentation',
        description: 'Your team is hiring for a hybrid Product Manager role (technical + business). Create 3 distinct candidate personas representing different backgrounds that could succeed.',
        task: 'As a team, develop: 1) Persona A: Former Engineer turned PM, 2) Persona B: MBA with technical curiosity, 3) Persona C: Designer with product instincts. For each: background, motivations, strengths, development areas, sourcing channels.',
        placeholder: 'Persona A (Engineer→PM):\nBackground: ...\nMotivations: ...\nStrengths: ...\nSourcing: ...',
        difficulty: 'easy' as const,
        skillCategory: 'persona' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.easy,
        validation: {
            keywords: ['persona', 'background', 'motivation', 'strength', 'sourcing'],
            minWords: 80,
            minChars: 300
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating a team's candidate persona development.

            **TEAM CHALLENGE:**
            Create 3 distinct PM candidate personas with sourcing strategies.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Persona differentiation and realism
            - Motivation depth
            - Strength/development accuracy
            - Sourcing channel alignment

            Provide feedback on persona quality and sourcing fit.
        `
    },
    {
        id: 'team-persona-2',
        title: 'Team Persona Challenge: Market Mapping',
        description: 'Your team must map the competitive landscape for "Head of Data Science" candidates. Who are the top 50 people in this role, where do they work, and what would it take to move them?',
        task: 'Create a team research plan: 1) Identify top 20 companies with strong data science teams, 2) Map their Head of DS (LinkedIn, Crunchbase, news), 3) Categorize by "movability" (flight risk, content, locked in), 4) Develop personalized pitch angles for top 10.',
        placeholder: 'Top companies: ...\nHead of DS mapping: ...\nMovability tiers: ...\nPitch angles: ...',
        difficulty: 'medium' as const,
        skillCategory: 'persona' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.medium,
        validation: {
            keywords: ['market', 'mapping', 'competitive', 'movability', 'pitch'],
            minWords: 100,
            minChars: 400
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating a team's competitive market mapping for Head of Data Science.

            **TEAM CHALLENGE:**
            Map top 50 Head of DS candidates and develop pitch angles.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Company identification quality
            - Mapping thoroughness
            - Movability categorization logic
            - Pitch angle personalization

            Provide feedback on market intelligence and strategy.
        `
    },
    {
        id: 'team-persona-3',
        title: 'Team Persona Challenge: Psychographic Profiling',
        description: 'Your team must go beyond demographics and create psychographic profiles for a "Head of Security" role. What are their values, fears, aspirations, and decision-making triggers?',
        task: 'Build comprehensive team profiles: 1) Values analysis (what drives them: impact, compensation, learning, autonomy), 2) Fear mapping (what keeps them up at night: breaches, team morale, budget cuts), 3) Aspiration ladder (where do they want to be in 5 years), 4) Decision triggers (what makes them consider a new role).',
        placeholder: 'Values analysis: ...\nFear mapping: ...\nAspirations: ...\nDecision triggers: ...',
        difficulty: 'hard' as const,
        skillCategory: 'persona' as const,
        isTeamGame: true,
        rubric: rubricByDifficulty.hard,
        validation: {
            keywords: ['psychographic', 'values', 'fear', 'aspiration', 'trigger'],
            minWords: 120,
            minChars: 500
        },
        promptGenerator: (submission, rubric) => `
            You are evaluating an expert team psychographic profile for Head of Security.

            **TEAM CHALLENGE:**
            Create deep psychographic profile: values, fears, aspirations, triggers.

            **TEAM SUBMISSION:**
            "${submission}"

            Evaluate for:
            - Values analysis depth and accuracy
            - Fear mapping realism
            - Aspiration ladder clarity
            - Decision trigger insight

            Provide expert-level feedback on psychographic profiling.
        `
    },
];

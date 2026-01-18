import type { Game } from '../../../types.js';

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
        promptGenerator: (submission) => `You are an expert Technical Sourcing Coach with 15+ years of experience training recruiters on Boolean search techniques. You provide structured, actionable feedback with specific examples.

## CANDIDATE SUBMISSION
"${submission}"

## JOB REQUIREMENTS
- Role: Senior Backend Engineer
- Location: Vienna, Austria
- Required Skills: Go (Golang), Kubernetes
- Preferred: Open-source contributions
- Platform: Professional networking sites (LinkedIn, etc.)

## EVALUATION RUBRIC
Evaluate the Boolean search string across these dimensions:

**1. Core Terms (25 points)**
- Job title variations covered (Backend Engineer, Software Engineer, etc.)
- Synonym coverage and alternative phrasing
- Appropriate use of OR operators for alternatives

**2. Technical Skills (25 points)**
- Primary language: Go/Golang with common variations
- Container orchestration: Kubernetes/K8s coverage
- Technology-specific terms accuracy

**3. Geographic Targeting (15 points)**
- Vienna spelled correctly with local variations (Wien)
- Geographic scope appropriate (city vs country)

**4. Differentiators (20 points)**
- Open-source indicators (GitHub, contributor, OSS)
- Quality signals that distinguish candidates

**5. Boolean Logic & Syntax (15 points)**
- Correct use of AND/OR/NOT operators
- Proper grouping with parentheses
- Quotation marks for exact phrases
- No syntax errors

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[First, analyze the submission against each rubric criterion. Be specific about what's present and what's missing.]

**SCORE: [X]**
[Single line with numeric score only]

**Strengths:**
- [List 2-3 specific things done well]

**Areas for Improvement:**
1. [Specific actionable tip with example]
2. [Specific actionable tip with example]
3. [Specific actionable tip with example]

**Improved Search String:**
\`\`\`
[Provide optimized version here]
\`\`\`

**Why This Works Better:**
[2-3 sentences explaining the key improvements]

## SCORING GUIDELINES
- 90-100: Excellent - Comprehensive coverage, perfect syntax, includes advanced techniques
- 75-89: Good - Covers requirements well, minor gaps in synonyms or logic
- 60-74: Adequate - Basic requirements met, missing key variations or has syntax issues
- 40-59: Needs Work - Significant gaps in coverage or major logic errors
- 0-39: Poor - Missing core requirements or fundamentally flawed approach

Now evaluate the submission following this exact structure.`
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
        promptGenerator: (submission) => `You are a Senior Talent Strategy Consultant specializing in persona development for executive search. You train recruiters to create actionable, multi-dimensional candidate personas.

## CANDIDATE SUBMISSION
"${submission}"

## JOB DESCRIPTION
"We're seeking a Lead UX Designer to own the user experience for our flagship B2B SaaS product. You'll guide a team of 3 designers, work with product managers to translate complex requirements into intuitive workflows, and champion a user-centered design culture. Must have 7+ years of experience, a portfolio showcasing complex problem-solving, and proficiency in Figma. Experience with data visualization is a huge plus."

## EVALUATION RUBRIC

**1. Experience & Background (25 points)**
- Years of experience specified and justified
- Industry context (B2B SaaS mentioned)
- Career trajectory implications
- Team size/leadership experience

**2. Technical Skills (20 points)**
- Core tools identified (Figma)
- Complementary skills (data visualization)
- Depth vs. breadth balance

**3. Soft Skills & Leadership (20 points)**
- Management style insights
- Cross-functional collaboration
- Mentorship/team building capabilities

**4. Motivations & Values (20 points)**
- Career motivators identified
- Cultural fit indicators
- Growth aspirations
- What attracts them to new opportunities

**5. Sourcing Intel (15 points)**
- Where to find these candidates
- Community involvement
- Career stage considerations
- Competitor/company examples

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Evaluate persona completeness across all rubric dimensions]

**SCORE: [X]**

**What Works Well:**
- [2-3 specific strengths]

**Enhancement Suggestions:**
1. [Specific way to deepen the persona with example]
2. [Specific way to add actionability with example]
3. [Optional third suggestion if needed]

**Enhanced Persona Example:**
"[Provide a richer, more detailed version that demonstrates the improvements]"

## SCORING GUIDELINES
- 90-100: Excellent - Rich, multi-dimensional persona with clear sourcing strategy
- 75-89: Good - Solid coverage of key aspects, minor gaps in depth or sourcing intel
- 60-74: Adequate - Basic persona, missing motivations or sourcing strategy
- 40-59: Needs Work - Superficial, missing multiple key dimensions
- 0-39: Poor - Vague descriptions without actionable insights

Evaluate the submission now.`
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
        promptGenerator: (submission) => `You are a Senior Executive Recruiter specializing in passive candidate engagement. You've successfully placed 200+ passive candidates and train recruiters on high-response outreach strategies.

## CANDIDATE SUBMISSION
"${submission}"

## CANDIDATE PROFILE
- Role: Senior DevOps Engineer
- Tenure: 5 years at current company (potential satisfaction or loyalty)
- Public Activity: Conference speaker on "Scaling CI/CD Pipelines"
- Status: Passive (not actively looking)
- Word Limit: Under 100 words

## EVALUATION RUBRIC

**1. Personalization (25 points)**
- Specific reference to their conference talk
- Demonstrates research beyond surface level
- Shows genuine interest in their expertise
- Avoids generic recruiter language

**2. Value Proposition (25 points)**
- Clear reason for reaching out
- Compelling opportunity hint without overpromising
- Technical relevance to their expertise
- Career growth angle

**3. Tone & Professionalism (20 points)**
- Respectful of their time and current role
- Conversational but professional
- No pushy or salesy language
- Builds credibility

**4. Call-to-Action (15 points)**
- Low-friction ask (brief call, not full interview)
- Specific timeframe or flexibility
- Easy to say yes or no
- No pressure tactics

**5. Technical Execution (15 points)**
- Under 100 words
- No spelling/grammar errors
- Proper structure (greeting, body, CTA, sign-off)
- Scannable formatting

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**First Impression:**
[Your immediate reaction reading this as a busy passive candidate]

**SCORE: [X]**

**What Lands Well:**
- [2-3 specific strengths]

**What Needs Work:**
1. [Specific fix with before/after example]
2. [Specific fix with before/after example]
3. [Specific fix with before/after example]

**Improved Version:**
\`\`\`
[Rewritten message under 100 words]
\`\`\`
**Word Count: [X]/100**

**Why This Converts Better:**
[2-3 sentences on psychological/tactical improvements]

## SCORING GUIDELINES
- 90-100: Excellent - Highly personalized, compelling value prop, perfect tone
- 75-89: Good - Good personalization, clear value, minor tone tweaks needed
- 60-74: Adequate - Some personalization, generic value prop or weak CTA
- 40-59: Needs Work - Minimal personalization, unclear value, or pushy tone
- 0-39: Poor - Generic spray-and-pray message, no personalization

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Technical Sourcing Specialist with expertise in X-ray search techniques. You've trained 500+ recruiters on advanced Google search operators and platform-specific sourcing.

## CANDIDATE SUBMISSION
"${submission}"

## SEARCH OBJECTIVE
- Target: Python developers with Django experience
- Location: Berlin, Germany
- Platform: GitHub user profiles
- Goal: Find active developers with public contributions

## EVALUATION RUBRIC

**1. Site Operator Precision (20 points)**
- Correct use of site:github.com
- Targeting user profiles specifically
- Avoiding non-profile pages (repos, topics, explore, etc.)
- Proper path specificity

**2. Keyword Strategy (25 points)**
- Python and Django covered with variations
- Technology synonyms (Py, Python3, etc.)
- Framework-specific terms
- Appropriate use of OR operators

**3. Geographic Targeting (20 points)**
- Berlin specified correctly
- German variations considered (Deutschland)
- Location field understanding for GitHub
- Avoiding false positives

**4. Exclusion Operators (15 points)**
- Removing noise (organization pages, repos, topics)
- Using minus (-) operator effectively
- Excluding common false positives
- Maintaining search breadth while filtering

**5. Search Syntax & Structure (20 points)**
- No syntax errors
- Logical operator precedence
- Quotation marks for exact matches where appropriate
- Parentheses grouping for complex logic
- Space and operator formatting

**Total: /100 points**

## GITHUB PROFILE STRUCTURE CONTEXT
- User profiles: github.com/username or github.com/users/username
- NOT: github.com/org, github.com/topics, github.com/explore, github.com/trending
- Location often in bio/profile, not always accurate
- Language/tech in repositories and contributions

## REQUIRED OUTPUT FORMAT

**Syntax Check:**
[First, validate if the search string would actually execute without errors]

**SCORE: [X]**

**Effective Elements:**
- [What's working well in the search]

**Critical Issues:**
1. [Specific problem + why it matters + fix]
2. [Specific problem + why it matters + fix]
3. [Specific problem + why it matters + fix]

**Optimized X-Ray Search:**
\`\`\`
[Improved search string]
\`\`\`

**Expected Results Improvement:**
[Explain what types of profiles this will surface vs. the original]

**Pro Tip:**
[One advanced technique they could layer on]

## SCORING GUIDELINES
- 90-100: Excellent - Perfect syntax, comprehensive coverage, smart exclusions
- 75-89: Good - Solid structure, minor gaps in variations or exclusions
- 60-74: Adequate - Basic X-ray working, missing key exclusions or syntax issues
- 40-59: Needs Work - Significant syntax errors or targeting wrong pages
- 0-39: Poor - Fundamentally broken or will return mostly irrelevant results

Evaluate now.`
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
        promptGenerator: (submission) => `You are an expert LinkedIn Sourcing Coach. A participant has written a LinkedIn search query to find Marketing Directors at early-stage startups in SF with product launch experience.
            
## CANDIDATE SUBMISSION
"${submission}"

## SEARCH REQUIREMENTS
- Role: Marketing Director (or equivalent)
- Company Stage: Series A/B (Funded startups)
- Location: San Francisco Bay Area
- Experience: Product Launches / GTM

## EVALUATION RUBRIC

**1. Title Targeting (25 points)**
- Covers key variations (Marketing Director, Head of Marketing, VP Marketing)
- Appropriate seniority level

**2. Keywords & Skills (25 points)**
- Includes "product launch", "GTM", "Go-to-market"
- Relevant functional keywords

**3. Location & Company Filters (25 points)**
- Correct location targeting (San Francisco Bay Area)
- Company size or funding keywords (Series A, Series B, startup)

**4. Boolean Syntax (25 points)**
- Correct use of OR/AND
- Proper field commands (title:, location:, etc.) if used

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Search String:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Perfect syntax, comprehensive coverage.
- 75-89: Good - Solid logic, minor missing variations.
- 60-74: Adequate - Basic search, missing key filters or synonyms.
- 40-59: Needs Work - Major syntax errors or missing requirements.
- 0-39: Poor - Irrelevant or broken search.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Diversity Recruitment Expert. A participant has outlined strategies for building diverse candidate pipelines without using discriminatory search practices.

## CANDIDATE SUBMISSION
"${submission}"

## SCENARIO
- Goal: Source underrepresented candidates for Senior Software Engineer
- Constraint: No discriminatory search terms (e.g., no "female", "minority" keywords)

## EVALUATION RUBRIC

**1. Strategic Partnerships (25 points)**
- Identifies relevant organizations (e.g., excessive, specific groups)
- Focuses on community engagement

**2. Sourcing Channels (25 points)**
- Suggests diverse platforms (HBCUs, specific conferences, job boards)
- Goes beyond standard LinkedIn search

**3. Inclusive Language (25 points)**
- Emphasizes inclusive JD language
- Avoids bias in outreach

**4. Compliance & Ethics (25 points)**
- Adheres to EEOC guidelines
- Focuses on skills and qualifications, not demographics directly in search strings

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Strategy:**
[Provide a refined or expanded strategy]

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Comprehensive, ethical, and actionable strategy.
- 75-89: Good - Solid approach, minor gaps in specific resources.
- 60-74: Adequate - Basic ideas, lacks specific examples or depth.
- 40-59: Needs Work - Vague or potentially risky approaches.
- 0-39: Poor - Unethical or ineffective.

Evaluate now.`
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
        promptGenerator: (submission) => `You are an Expert Recruiter Screening Coach. A participant has assessed whether a Data Scientist candidate should move forward based on their resume vs. job requirements.

## CANDIDATE SUBMISSION
"${submission}"

## COMPARISON
- **Job**: 5+ years tech exp, ML deployment.
- **Candidate**: PhD Stats, 3 years consulting, Python/R/SQL, predictive modeling.

## EVALUATION RUBRIC

**1. Analysis of Requirements (30 points)**
- Correctly identifies the gap in years of experience (3 vs 5+)
- Notes the lack of specific "ML deployment" experience

**2. Gap Identification (30 points)**
- Acknowledges the strength of the PhD/Stats background
- Weighs consulting vs. tech company experience

**3. Decision Logic (20 points)**
- Provides a clear recommendation (Screen vs Reject)
- Justification is sound based on the data

**4. Communication Clarity (20 points)**
- Concise and professional
- Clear reasoning

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Assessment:**
[Provide a more nuanced or accurate assessment]

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Nuanced analysis, correctly identifies all gaps and strengths.
- 75-89: Good - Solid analysis, misses minor details.
- 60-74: Adequate - Basic assessment, might miss the "deployment" gap.
- 40-59: Needs Work - Incorrect conclusion or ignores key requirements.
- 0-39: Poor - Vague or irrelevant.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Job Description Expert. A participant has written an "About the Role" section for a Customer Success Manager at a B2B SaaS company.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Role: Customer Success Manager
- Experience: 3-5 years
- Key Duties: Customer retention, cross-functional collaboration
- Industry: B2B SaaS

## EVALUATION RUBRIC

**1. Engagement & Hook (25 points)**
- Opens with a compelling statement
- Excites the candidate about the opportunity

**2. Clarity of Role (25 points)**
- Clearly defines the core responsibilities (retention, collaboration)
- Mentions the experience level implicitly or explicitly

**3. Inclusive Language (25 points)**
- Uses gender-neutral terms
- Focuses on growth and impact rather than just requirements

**4. Call to Action (25 points)**
- Encourages application
- Professional yet inviting tone

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Description:**
[Provide a polished version]

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Engaging, clear, inclusive, and professional.
- 75-89: Good - Clear and accurate, but maybe a bit dry.
- 60-74: Adequate - Covers basics but lacks "sell".
- 40-59: Needs Work - Confusing, generic, or exclusionary language.
- 0-39: Poor - Fails to describe the role accurately.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Recruiting Operations Expert. A participant has outlined their filtering strategy to narrow 50 Product Manager candidates to the top 10.

## CANDIDATE SUBMISSION
"${submission}"

## SCENARIO
- Role: Product Manager
- Pool: 50 candidates
- Goal: Top 10 for phone screens

## EVALUATION RUBRIC

**1. Hard Requirements First (30 points)**
- Prioritizes non-negotiables (e.g., years of experience, specific industry background)
- Efficiently reduces the pool size

**2. Soft Skills/Differentiators (20 points)**
- Looks for "plus" factors (technical background, specific achievements)
- Distinguishes good from great

**3. Efficiency of Process (25 points)**
- Logical order of operations
- Practical for a human to execute

**4. Fairness & Bias Check (25 points)**
- Avoids arbitrary filters (e.g., school pedigree) unless relevant
- Focuses on relevant skills

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Strategy:**
[Provide a more efficient strategy]

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Strategic, efficient, fair, and effective.
- 75-89: Good - Logical approach, minor inefficiencies.
- 60-74: Adequate - Basic filtering, might miss some nuance.
- 40-59: Needs Work - Inefficient or biased criteria.
- 0-39: Poor - Random or ineffective filtering.

Evaluate now.`
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
        promptGenerator: (submission) => `You are an Advanced Boolean Search Expert. A participant has written a complex Boolean string to find ML Engineers in Seattle with framework experience, Big Tech background, and research publications.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Role: Machine Learning Engineer
- Location: Seattle
- Skills: TensorFlow OR PyTorch
- Companies: Google OR Amazon OR Microsoft
- Extra: Published research

## EVALUATION RUBRIC

**1. Core Logic Structure (25 points)**
- Correct use of AND/OR operators
- Proper grouping with parentheses

**2. Synonym Coverage (25 points)**
- Covers "ML Engineer", "Machine Learning", etc.
- Covers company variations if needed

**3. Operator Usage (25 points)**
- Correct syntax for the specific platform (implied general/LinkedIn)
- No broken strings

**4. Nested Logic Accuracy (25 points)**
- Correctly nests the (Company) AND (Skill) AND (Location) logic
- Handles the "Research" requirement effectively

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Boolean String:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Perfect syntax, advanced logic, comprehensive.
- 75-89: Good - Working string, minor missing synonyms.
- 60-74: Adequate - Basic string, some syntax errors or missing groups.
- 40-59: Needs Work - Broken logic, missing major requirements.
- 0-39: Poor - Unusable string.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Technical Sourcing Specialist. A participant has written an X-ray search to find iOS/Swift developers on Stack Overflow.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Site: Stack Overflow
- Role: iOS Developers
- Skill: Swift UI
- Goal: Find user profiles

## EVALUATION RUBRIC

**1. Site Operator Usage (25 points)**
- Correctly uses site:stackoverflow.com/users (or similar profile path)
- Avoids searching generic Q&A pages

**2. Profile Targeting (25 points)**
- Targets user profiles specifically
- Uses terms like "reputation", "location", or "answers" to identify profiles

**3. Keyword Relevance (25 points)**
- Includes "Swift UI", "SwiftUI", "iOS"
- Covers variations

**4. Exclusion Logic (25 points)**
- Excludes /questions, /jobs, or other noise if necessary
- Keeps the search focused on people

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved X-Ray Search:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Perfect syntax, targets profiles precisely.
- 75-89: Good - Finds profiles, maybe some noise.
- 60-74: Adequate - Basic search, might land on Q&A pages.
- 40-59: Needs Work - Wrong site operator or keywords.
- 0-39: Poor - Completely broken search.

Evaluate now.`
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
        promptGenerator: (submission) => `You are an Outreach & Engagement Expert. A participant has written a follow-up message for a non-responsive candidate.

## CANDIDATE SUBMISSION
"${submission}"

## SCENARIO
- Context: 1st follow-up after 5 days of silence
- Role: Senior Data Engineer
- Goal: Re-engage without being annoying

## EVALUATION RUBRIC

**1. Professionalism (25 points)**
- Polite and respectful tone
- Acknowledges their busy schedule

**2. Brevity (25 points)**
- Short and sweet (under 75 words)
- Easy to read on mobile

**3. Value Reinforcement (25 points)**
- Briefly reminds them of the value/role (without repeating the whole pitch)
- Keeps the door open

**4. No-Pressure CTA (25 points)**
- "Let me know if you're interested" vs "Call me now"
- Gives them an "out" (it's okay to say no)

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Follow-Up:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Perfect tone, length, and strategy.
- 75-89: Good - Solid message, maybe a bit wordy.
- 60-74: Adequate - generic "just checking in".
- 40-59: Needs Work - Pushy, desperate, or too long.
- 0-39: Poor - Unprofessional or rude.

Evaluate now.`
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
        promptGenerator: (submission) => `You are an X-Ray Search Specialist. A participant has written a search to find React developers in Austin with active GitHub profiles and open-source contributions.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Site: GitHub
- Role: Front-end / React Developers
- Location: Austin, Texas
- Activity: Open source contributions

## EVALUATION RUBRIC

**1. Site Specificity (25 points)**
- Correct uses site:github.com
- Targets user profiles (not just repos)

**2. Location Filtering (25 points)**
- "Austin" AND "TX" or "Texas"
- Handles location field logic on GitHub

**3. Activity Indicators (25 points)**
- Keywords like "contributions", "repositories", "stars", "followers"
- "Open source" keyword usage

**4. Syntax Accuracy (25 points)**
- Proper Boolean operators
- Correct exclusion of non-profile pages (topics, help, etc.)

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved X-Ray Search:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Pinpoint accuracy, finds active contributors in Austin.
- 75-89: Good - Finds developers, maybe misses some activity signals.
- 60-74: Adequate - Basic search, lots of false positives.
- 40-59: Needs Work - Wrong syntax or location logic.
- 0-39: Poor - Broken search.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Persona Development Expert. A participant has created a candidate persona for a VP of Sales in cybersecurity.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Role: VP of Sales
- Industry: Cybersecurity
- Skills: Enterprise sales, Team leadership

## EVALUATION RUBRIC

**1. Depth of Insight (25 points)**
- Goes beyond the JD (e.g., specific companies they might work at)
- Identifies specific "pain points" or motivations for this level

**2. Motivations & Drivers (25 points)**
- Understands what drives a VP (Equity, Scale, Impact)
- Mentions "Why they would move"

**3. Sourcing Channels (25 points)**
- Identifies where they hang out (RSA Conference, specific groups)
- Names competitor companies or tiers

**4. Actionability (25 points)**
- Is this persona useful for sourcing?
- Specific enough to build a search string from?

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Enhanced Persona:**
[Provide a richer version]

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Deep, strategic, and highly actionable.
- 75-89: Good - Solid profile, covers key bases.
- 60-74: Adequate - Generic VP description.
- 40-59: Needs Work - Too brief or misses the "Cybersecurity" nuance.
- 0-39: Poor - Irrelevant.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Diversity & Inclusion Expert. A participant has identified problematic language in a job description and suggested inclusive alternatives.

## CANDIDATE SUBMISSION
"${submission}"

## ORIGINAL TEXT
"Rockstar developer", "hit the ground running", "top-tier university", "young, hungry talent", "work-hard-play-hard"

## EVALUATION RUBRIC

**1. Identification of Bias (30 points)**
- Identifies gendered language ("Rockstar")
- Identifies ageism ("Young", "Recent grad")
- Identifies socioeconomic bias ("Top-tier university")

**2. Quality of Alternatives (30 points)**
- Suggests neutral, skills-based terms
- "Experienced" instead of "Rockstar"
- "Motivated" instead of "Hungry"

**3. Explanation of Impact (20 points)**
- Explains *why* the terms are problematic (e.g., "discourages women", "excludes parents")

**4. Completeness (20 points)**
- Catches all or most of the red flags in the excerpt

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved JD Excerpt:**
[Provide a rewritten version]

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Catches all bias, provides perfect alternatives.
- 75-89: Good - Catches most bias, good alternatives.
- 60-74: Adequate - Misses subtle bias (e.g., "hit the ground running").
- 40-59: Needs Work - Misses major red flags like "Young".
- 0-39: Poor - Fails to identify bias.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a LinkedIn Recruiter Expert. A participant has specified the filters to find CTOs who have scaled engineering teams at startups.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Role: CTO / VP Engineering
- Experience: Scaling 10 -> 100+
- Company Type: Venture-backed Startup

## EVALUATION RUBRIC

**1. Filter Selection (25 points)**
- Uses "Job Titles", "Company Size", "Keywords"
- Uses "Past Company" effectively to find people who *have done it*

**2. Keyword Strategy (25 points)**
- "Scaling", "Growth", "Series B", "Startup"
- "0 to 1", "10 to 100"

**3. Company/Industry Targeting (25 points)**
- Targets "Venture Capital", "Computer Software", "Internet"
- Excludes large corporate entities

**4. Seniority/Function Logic (25 points)**
- Targets CXO, VP level
- Ensures Engineering function

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Filter Set:**
[Provide an optimized list of filters]

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Masterful use of filters and keywords.
- 75-89: Good - Solid strategy, might miss "Past Company" trick.
- 60-74: Adequate - Basic title search.
- 40-59: Needs Work - Missing key filters like Company Size.
- 0-39: Poor - Ineffective.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Healthcare Recruiting Expert. A participant has written a Boolean search for ICU nurses with CCRN certification in Chicago open to travel positions.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Role: Registered Nurse (ICU)
- Certification: CCRN
- Location: Chicago
- Condition: Open to travel / Travel Nurse

## EVALUATION RUBRIC

**1. Certification Accuracy (25 points)**
- Includes "CCRN" and spelled out variations
- Correctly links certification to the role

**2. Clinical Keywords (25 points)**
- "ICU", "Critical Care", "Intensive Care"
- Ensures the right specialty is targeted

**3. Location Targeting (25 points)**
- "Chicago", "IL", "Illinois"
- Handles the "Travel" aspect (might search for people *in* Chicago willing to travel, or people *willing to travel to* Chicago - context implies finding people *in* Chicago open to travel)

**4. Boolean Logic (25 points)**
- Correct AND/OR syntax
- Proper grouping of terms

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Boolean String:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Perfect healthcare syntax and logic.
- 75-89: Good - Finds the right people, minor missing terms.
- 60-74: Adequate - Basic search, might miss "Travel" or "CCRN".
- 40-59: Needs Work - Wrong specialty or location logic.
- 0-39: Poor - Broken search.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Financial Services Recruiting Expert. A participant has screened a Compliance Officer candidate from fintech for a banking role.

## CANDIDATE SUBMISSION
"${submission}"

## COMPARISON
- **Candidate**: 4 yrs Fintech, Series 7/63, Finance Degree.
- **Role**: Banking experience preferred, Regulatory agency background (+).

## EVALUATION RUBRIC

**1. Regulatory Knowledge (30 points)**
- Identifies the difference between Fintech and Traditional Banking compliance
- Notes the Series 7/63 relevance

**2. Gap Analysis (30 points)**
- Highlights the lack of "Regulatory Agency" background
- Assesses the "Banking" experience gap

**3. Risk Assessment (20 points)**
- Evaluates if the candidate can handle the stricter banking environment
- "Culture fit" assessment (Fintech speed vs Banking rigor)

**4. Interview Strategy (20 points)**
- Suggests specific questions to probe the gaps
- Recommendation (Screen/Pass) is well-reasoned

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Assessment:**
[Provide a more nuanced assessment]

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Deep understanding of FinServ nuances.
- 75-89: Good - Solid analysis, identifies main gaps.
- 60-74: Adequate - Basic match/mismatch analysis.
- 40-59: Needs Work - Misses the regulatory distinction.
- 0-39: Poor - Irrelevant.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Neurodiversity Hiring Specialist. A participant has designed accommodations for a neurodiversity hiring program.

## CANDIDATE SUBMISSION
"${submission}"

## GOAL
- Inclusive process for Software QA/Testing roles
- Target: Neurodiverse candidates

## EVALUATION RUBRIC

**1. Process Accommodations (30 points)**
- Pre-interview prep (sending questions in advance)
- Flexible scheduling/timing

**2. Environment Adjustments (25 points)**
- Sensory considerations (quiet rooms, camera optional)
- Clear communication styles

**3. Evaluation Methods (25 points)**
- Skills-based vs "Culture fit"
- Alternative formats (written vs verbal)

**4. Inclusivity (20 points)**
- Partnering with specialist orgs
- Training for interviewers

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Plan:**
[Provide a more comprehensive plan]

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Comprehensive, empathetic, and practical.
- 75-89: Good - Good ideas, covers basics.
- 60-74: Adequate - Generic accommodations.
- 40-59: Needs Work - Misses key sensory/process barriers.
- 0-39: Poor - Harmful or irrelevant.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Senior Recruiting Operations Consultant who has optimized pipelines for 100+ companies. You specialize in data-driven hiring process improvements and ATS workflow design.

## CANDIDATE SUBMISSION
"${submission}"

## PIPELINE DATA
- **Total Candidates:** 200
- **New (Unscreened):** 120 (60%)
- **Phone Screen:** 45 (22.5%)
- **Onsite:** 20 (10%)
- **Offer:** 15 (7.5%)

**Context:** Hiring Manager frustrated with timeline for Senior Product Manager role

## EVALUATION RUBRIC

**1. Bottleneck Identification (25 points)**
- Correctly identifies primary constraint
- Uses conversion rate analysis
- Understands stage-specific challenges
- Considers both capacity and quality issues

**2. Root Cause Analysis (20 points)**
- Goes beyond symptoms to underlying causes
- Considers process, people, and tooling factors
- Understands recruiter capacity constraints
- Identifies qualification criteria clarity

**3. Solution Practicality (25 points)**
- Actionable recommendations with clear steps
- Considers timeline and resources
- Addresses immediate vs. long-term fixes
- Realistic time estimates

**4. Metrics & Accountability (15 points)**
- Defines success metrics
- Includes time-based goals
- Suggests tracking mechanisms
- Quantifies expected improvements

**5. Candidate Experience (15 points)**
- Considers impact on candidates
- Addresses communication/rejection protocols
- Maintains quality while improving speed
- Prevents negative employer brand impact

**Total: /100 points**

## CONVERSION RATE CONTEXT
Industry Benchmarks for PM roles:
- New → Phone Screen: 20-30% (Current: 37.5% - good)
- Phone Screen → Onsite: 25-40% (Current: 44% - excellent)
- Onsite → Offer: 30-50% (Current: 75% - needs review, might be too high)

## REQUIRED OUTPUT FORMAT

**Pipeline Diagnosis:**
[Identify the primary bottleneck with data supporting your analysis]

**SCORE: [X]**

**Strong Points:**
- [2-3 things the analysis got right]

**Gaps in Analysis:**
1. [Missing consideration + why it matters]
2. [Overlooked factor + implications]
3. [Additional metric or action needed]

**Optimized Action Plan:**
**Immediate (This Week):**
- [Specific action with timeline]

**Short-term (Next 2 weeks):**
- [Specific action with timeline]

**Systemic Fix (Ongoing):**
- [Process change to prevent recurrence]

**Expected Impact:**
- [Quantified outcome: e.g., "Reduce time-to-fill from X to Y days"]

**Metrics to Track:**
- [Specific KPIs to monitor]

## SCORING GUIDELINES
- 90-100: Excellent - Data-driven diagnosis, practical solutions, metrics-focused
- 75-89: Good - Correct bottleneck ID, solid actions, minor gaps in metrics
- 60-74: Adequate - Identifies issue, generic solutions, weak measurement plan
- 40-59: Needs Work - Misidentifies bottleneck or impractical solutions
- 0-39: Poor - Incorrect analysis or solutions that would worsen the problem

Evaluate now.`
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
        promptGenerator: (submission) => `You are an EEOC Compliance & Diversity Expert. A participant has identified bias issues in sourcing practices.

## CANDIDATE SUBMISSION
"${submission}"

## ORIGINAL PRACTICES
- "Rockstar", "Ninja", "Recent Grad"
- Required "Top University"
- Sourced only from MIT/Stanford/CMU

## EVALUATION RUBRIC

**1. Bias Identification (25 points)**
- Identifies all exclusionary terms (Gender, Age, Socioeconomic)
- Explains *why* they are biased

**2. Legal Knowledge (25 points)**
- References EEOC concepts (Disparate Impact) implicitly or explicitly
- Focuses on fair hiring practices

**3. Remediation Strategy (25 points)**
- Suggests specific replacements ("Skilled" vs "Ninja")
- Proposes "Equivalent Experience" vs "Degree"

**4. Sourcing Expansion (25 points)**
- Suggests specific diverse channels (HBCUs, HSIs, Bootcamps)
- Broadens the funnel

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Strategy:**
[Provide a compliant strategy]

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Thorough legal and strategic understanding.
- 75-89: Good - Catches most issues, good fixes.
- 60-74: Adequate - Basic identification of "Ninja" etc.
- 40-59: Needs Work - Misses systemic issues like University bias.
- 0-39: Poor - Fails to identify bias.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Retail Recruiting Specialist. A participant has written a Boolean search for District Managers with multi-unit and P&L experience.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Role: District Manager
- Experience: Multi-unit management, P&L responsibility, Store performance
- Target: Competitive retail brands

## EVALUATION RUBRIC

**1. Title Variations (25 points)**
- "District Manager", "Regional Manager", "Area Manager"
- Covers the hierarchy correctly

**2. Industry Keywords (25 points)**
- "Retail", "Store Operations", "Multi-unit"
- "P&L", "Profit and Loss"

**3. Performance Metrics (25 points)**
- "Same store sales", "Comp sales", "KPIs"
- Focuses on results

**4. Competitor Targeting (25 points)**
- Lists specific competitors (Target, Walmart, etc.)
- Uses OR logic for companies

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Boolean String:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Comprehensive retail terminology and targeting.
- 75-89: Good - Good search, minor missing keywords.
- 60-74: Adequate - Basic title search.
- 40-59: Needs Work - Misses P&L or key retail terms.
- 0-39: Poor - Broken search.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Manufacturing & Engineering Recruiter. A participant has written a Boolean search for Manufacturing Engineers with Lean Six Sigma and CAD skills.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Role: Manufacturing Engineer
- Skills: Lean Six Sigma, CAD (AutoCAD/SolidWorks)
- Industry: Automotive or Aerospace
- Location: Detroit or Seattle

## EVALUATION RUBRIC

**1. Role Titles (25 points)**
- "Manufacturing Engineer", "Process Engineer", "Industrial Engineer"
- Covers relevant variations

**2. Certifications (25 points)**
- "Lean Six Sigma", "Green Belt", "Black Belt"
- "LSS" abbreviation

**3. Technical Skills (25 points)**
- "CAD", "AutoCAD", "SolidWorks"
- "3D Modeling"

**4. Location/Industry (25 points)**
- "Automotive", "Aerospace"
- "Detroit", "Seattle" (and surrounding areas/states)

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Boolean String:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Perfect technical and industry coverage.
- 75-89: Good - Solid search, minor missing terms.
- 60-74: Adequate - Basic search, might miss certifications.
- 40-59: Needs Work - Wrong skills or location logic.
- 0-39: Poor - Broken search.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a LinkedIn Recruiter Power User. A participant has written a LinkedIn Recruiter search for enterprise SaaS Sales Directors.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Role: Sales Director (SaaS)
- Company: $10-100M Revenue
- Experience: Enterprise / Fortune 500 sales
- Flight Risk: <2 years in role

## EVALUATION RUBRIC

**1. Field Selection (25 points)**
- Uses "Current Title", "Company Revenue", "Years in Current Position"
- Doesn't dump everything into "Keywords"

**2. Company Filters (25 points)**
- Correctly targets $10M-$100M revenue (or proxy via company size)
- Targets "Computer Software" / "Internet" industries

**3. Tenure/Flight Risk Logic (25 points)**
- Targets 0-2 years in current role
- Explains the logic (optional but good)

**4. Boolean Syntax (25 points)**
- Correct Boolean in the Keywords field for (Enterprise OR "Fortune 500")
- No syntax errors

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Search Strategy:**
[Provide an optimized filter set]

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Masterful use of Recruiter filters.
- 75-89: Good - Solid search, maybe misses one filter.
- 60-74: Adequate - Basic keyword search, ignores advanced filters.
- 40-59: Needs Work - Missing revenue or tenure filters.
- 0-39: Poor - Ineffective.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Military Veteran Recruiting Specialist. A participant has identified relevant MOS codes and created a veteran sourcing strategy.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Roles: Operations Manager, Logistics Coordinator
- Goal: Hire veterans
- Strategy: MOS translation + Sourcing

## EVALUATION RUBRIC

**1. MOS/Code Accuracy (30 points)**
- Identifies correct codes (e.g., 92A, 88N for Army, Logistics Specialists for Navy/Marines)
- Shows understanding of military hierarchy (Officer vs NCO roles)

**2. Translation of Skills (25 points)**
- Connects military duties to civilian requirements (e.g., "Supply Chain" -> "Logistics")
- Avoids jargon in the explanation

**3. Sourcing Channels (25 points)**
- Suggests veteran-specific job boards (Hire Heroes, etc.)
- Mentions "Transitioning Military" keywords

**4. Support/Program Strategy (20 points)**
- Mentions mentorship, translation guides, or ERGs
- Focuses on retention, not just hiring

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Strategy:**
[Provide a refined strategy]

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Accurate codes, deep cultural understanding.
- 75-89: Good - Good codes, standard sourcing ideas.
- 60-74: Adequate - Generic "hire veterans" advice.
- 40-59: Needs Work - Wrong MOS codes or superficial strategy.
- 0-39: Poor - Irrelevant.

Evaluate now.`
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
        promptGenerator: (submission) => `You are an ATS Operations Expert. A participant has designed a silver medalist re-engagement campaign.

## CANDIDATE SUBMISSION
"${submission}"

## SCENARIO
- Pool: 500 "Silver Medalists" (Finalists)
- Openings: 5 new roles
- Goal: Re-engage

## EVALUATION RUBRIC

**1. Segmentation Strategy (25 points)**
- Segments by role/skill match (don't blast everyone)
- Prioritizes recent vs older candidates

**2. Message Relevance (25 points)**
- Acknowledges past relationship ("We met last year")
- Personalized to the specific new opportunity

**3. Process Efficiency (25 points)**
- Fast-tracks them (skip phone screen)
- Respects their time

**4. Metrics/Tracking (25 points)**
- Tracks response rates and conversion
- A/B testing mentioned

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Campaign:**
[Provide a better plan]

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Strategic, personalized, and efficient.
- 75-89: Good - Solid plan, maybe generic messaging.
- 60-74: Adequate - "Blast email" approach.
- 40-59: Needs Work - Disrespectful of candidate history.
- 0-39: Poor - Spammy.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a GDPR Compliance Expert. A participant has outlined GDPR requirements for EU candidate sourcing.

## CANDIDATE SUBMISSION
"${submission}"

## SCENARIO
- Region: EU
- Role: Data Privacy Officer (Irony noted)
- Action: Sourcing & Storing data

## EVALUATION RUBRIC

**1. Consent Mechanisms (25 points)**
- "Explicit Consent" before storing data
- "Legitimate Interest" vs Consent distinction

**2. Data Rights (25 points)**
- Right to Erasure ("Right to be forgotten")
- Right to Access

**3. Data Minimization (25 points)**
- Only collecting necessary info
- Retention periods defined

**4. Documentation (25 points)**
- Record of Processing Activities (ROPA)
- Privacy Notice visibility

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Checklist:**
[Provide a compliant list]

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Accurate legal understanding, practical application.
- 75-89: Good - Covers main points (Consent, Erasure).
- 60-74: Adequate - Basic awareness, misses nuance.
- 40-59: Needs Work - Incorrect legal advice.
- 0-39: Poor - Dangerous/Non-compliant.

Evaluate now.`
    },
    {
        id: 'game28',
        title: 'Game 28: Boolean for Modern Platforms',
        description: 'Find "Developer Advocates" or "DevRel Engineers" who are active on Twitter/X, have spoken at developer conferences, contribute to open source on GitHub, and write technical blogs. They should have backend development experience.',
        task: 'Your task: Write a multi-platform sourcing strategy using Boolean and X-ray searches.',
        placeholder: 'e.g., GitHub: site:github.com...',
        difficulty: 'hard' as const,
        skillCategory: 'xray' as const,
        exampleSolution: 'GitHub X-ray: site:github.com ("Developer Advocate" OR "DevRel" OR "Developer Relations") AND (speaker OR conference OR "open source" OR contributor) -site:github.com/topics\n\nTwitter/X X-ray: site:twitter.com ("Developer Advocate" OR "DevRel") AND (backend OR "backend developer" OR API) AND (speaking OR conference OR "just spoke")\n\nLinkedIn Boolean: ("Developer Advocate" OR "DevRel Engineer" OR "Developer Relations") AND (speaker OR "conference speaker" OR "technical blog" OR blogger) AND (backend OR "backend development" OR Python OR Node OR Go)\n\nDev.to X-ray: site:dev.to (author OR "@") AND ("Developer Advocate" OR DevRel) AND (backend OR API OR "backend development")\n\nMedium X-ray: site:medium.com ("Developer Advocate" OR DevRel) AND (backend OR API OR microservices) AND (@)\n\nConference sites: site:sessionize.com ("Developer Advocate" OR DevRel) AND (backend OR API)',
        promptGenerator: (submission) => `You are a Multi-Platform Sourcing Expert. A participant has created a cross-platform sourcing strategy.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Role: DevRel / Developer Advocate
- Platforms: Twitter, GitHub, Blogs, Conferences
- Skills: Backend, Speaking, Writing

## EVALUATION RUBRIC

**1. Platform Diversity (25 points)**
- Uses at least 3 distinct platforms (GitHub, Twitter, Medium/Dev.to)
- Tailors the search to each platform's strengths

**2. X-Ray Syntax (25 points)**
- Correct site: operators for each platform
- Targets profiles/bios, not just content

**3. Keyword Consistency (25 points)**
- "Developer Advocate", "DevRel"
- "Speaker", "Conference"

**4. Community Knowledge (25 points)**
- Knows where devs hang out (e.g., Dev.to, Hashnode, specific conferences)
- Avoids generic platforms if better ones exist

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Strategy:**
[Provide an optimized multi-channel plan]

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Masterful use of X-Ray across multiple sites.
- 75-89: Good - Good coverage, minor syntax errors.
- 60-74: Adequate - Basic GitHub/LinkedIn only.
- 40-59: Needs Work - Wrong syntax or irrelevant platforms.
- 0-39: Poor - Broken searches.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Prompt Engineering Instructor. A participant has written a prompt to ask an AI to generate a Boolean search string.

## CANDIDATE SUBMISSION
"${submission}"

## GOAL
- Generate a Boolean string for Senior SREs in London
- Must have Terraform + AWS
- Exclude Consulting firms

## EVALUATION RUBRIC

**1. Persona Definition (25 points)**
- Assigns a role to the AI ("Act as a Sourcing Expert")
- Sets the tone

**2. Context & Constraints (25 points)**
- Clearly lists the requirements (London, SRE, Terraform, AWS)
- Clearly lists the exclusion (Consulting firms)

**3. Output Specification (25 points)**
- Asks for a "Boolean string" specifically
- Asks for "Standard operators" or specific format

**4. Clarity (25 points)**
- Is the prompt unambiguous?
- Can the AI misunderstand it?

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Prompt:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Perfect prompt engineering technique.
- 75-89: Good - Clear instructions, missing persona or output format.
- 60-74: Adequate - Basic request, might get a generic answer.
- 40-59: Needs Work - Vague or confusing.
- 0-39: Poor - Unusable.

Evaluate now.`
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
        promptGenerator: (submission) => `You are an AI Efficiency Coach. A participant wants to use AI to summarize a resume.

## CANDIDATE SUBMISSION
"${submission}"

## GOAL
- Summarize a Principal Architect resume
- Focus on Cloud Migration
- Output: 3 bullet points

## EVALUATION RUBRIC

**1. Role Specification (25 points)**
- Assigns a persona (e.g., "Technical Recruiter")
- Sets the context for the summary

**2. Output Format (25 points)**
- Explicitly asks for "3 bullet points"
- Constraints length or style (e.g., "punchy", "quantified")

**3. Key Skill Focus (25 points)**
- Directs the AI to look for "Cloud Migration" specifically
- Ignores irrelevant info

**4. Constraint Handling (25 points)**
- Uses negative constraints ("Output ONLY...", "No intro text")
- Ensures clean output

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Prompt:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Perfect prompting, strict constraints.
- 75-89: Good - Clear request, maybe chatty output.
- 60-74: Adequate - Basic summary request.
- 40-59: Needs Work - Vague, misses the "Cloud Migration" focus.
- 0-39: Poor - Unusable.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Sales Psychology Expert. A participant is writing a "break-up" email.

## CANDIDATE SUBMISSION
"${submission}"

## SCENARIO
- 3rd attempt, no response
- Goal: Close the loop / Trigger response via "Strip-line"

## EVALUATION RUBRIC

**1. "Take-Away" Technique (25 points)**
- Clearly states "I'm closing your file" or "I assume you're not interested"
- Removes the offer to chat

**2. Politeness & Firmness (25 points)**
- Professional, not passive-aggressive
- Respects their decision to not reply

**3. Brevity (25 points)**
- Under 50 words
- Scannable

**4. Subject Line Strategy (25 points)**
- Uses a high-open subject (e.g., "Permission to close file?", "Closing the loop")
- Creates curiosity

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Email:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Perfect execution of the strip-line.
- 75-89: Good - Good message, maybe a bit soft.
- 60-74: Adequate - Just a standard "checking in again".
- 40-59: Needs Work - Guilt-tripping or rude.
- 0-39: Poor - Unprofessional.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Negotiation Coach. A participant is handling a lowball objection.

## CANDIDATE SUBMISSION
"${submission}"

## SCENARIO
- Offer: $120k
- Ask: $140k
- Market: $125k
- Goal: De-escalate, keep interested

## EVALUATION RUBRIC

**1. Empathy/Validation (30 points)**
- Validates their feelings ("I understand", "Thanks for being open")
- Does not get defensive

**2. Data Anchoring (30 points)**
- Uses "Internal Equity" or "Market Data" as the reason
- Depersonalizes the "No"

**3. Pivot to Total Comp (20 points)**
- Shifts focus to Equity, Bonus, Benefits
- Expands the pie

**4. Tone (20 points)**
- Collaborative ("Let's see what we can do")
- Not a hard "Take it or leave it"

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Response:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Masterful de-escalation and pivot.
- 75-89: Good - Good tone, explains the "Why".
- 60-74: Adequate - Says "No" politely but offers no alternative.
- 40-59: Needs Work - Defensive or dismissive.
- 0-39: Poor - Hostile.

Evaluate now.`
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
        promptGenerator: (submission) => `You are an Interview Design Expert. A participant is writing a prompt for interview questions.

## CANDIDATE SUBMISSION
"${submission}"

## GOAL
- 5 Behavioral Questions for Growth Marketing Manager
- Focus: Experimentation & Data Analysis
- Include Scoring Rubric

## EVALUATION RUBRIC

**1. Behavioral Question Focus (25 points)**
- Asks for "Tell me about a time..." style questions
- Avoids theoretical "How would you..." questions

**2. Rubric Request (25 points)**
- Explicitly asks for "Good Answer vs Bad Answer" examples
- Essential for structured interviewing

**3. Skill Specificity (25 points)**
- Mentions "A/B Testing", "Experimentation", "Data"
- Tailored to Growth Marketing

**4. Follow-up Probes (25 points)**
- Asks for probing questions to dig deeper
- Ensures depth

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Prompt:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Comprehensive prompt, ensures high-quality output.
- 75-89: Good - Asks for questions, maybe misses the rubric.
- 60-74: Adequate - Basic "Give me interview questions".
- 40-59: Needs Work - Vague or wrong role.
- 0-39: Poor - Unusable.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Personal Branding Expert. A participant is writing a LinkedIn voice note script.

## CANDIDATE SUBMISSION
"${submission}"

## SCENARIO
- Connection: Senior Java Engineer
- Channel: LinkedIn Voice Note (30s)
- Goal: Pattern Interrupt

## EVALUATION RUBRIC

**1. Conversational Tone (25 points)**
- Sounds like a human, not a script
- Uses "Um", "Just wanted to...", casual language

**2. Pattern Interrupt (25 points)**
- Acknowledges the "Recruiter Spam" or the "Randomness" of the voice note
- Breaks the standard text pitch mold

**3. Low Pressure CTA (25 points)**
- "No pressure", "Just wanted to say hi"
- Avoids "Can we get on a call?" hard sell

**4. Length/Pacing (25 points)**
- Under 80 words (fits in 30-45s)
- Concise but warm

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Script:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Authentic, engaging, and perfect length.
- 75-89: Good - Good script, maybe a bit "salesy".
- 60-74: Adequate - Reads like a text message read aloud.
- 40-59: Needs Work - Too long or too formal.
- 0-39: Poor - Robot voice.

Evaluate now.`
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
        promptGenerator: (submission) => `You are an Executive Search Researcher. A participant is writing a prompt to rewrite a resume summary.

## CANDIDATE SUBMISSION
"${submission}"

## GOAL
- Rewrite dry resume -> Compelling Executive Bio
- Audience: CEO
- Focus: Strategy & Scale

## EVALUATION RUBRIC

**1. Narrative Style (25 points)**
- Asks for "Storytelling" or "Bio" format
- Moves away from bullet points

**2. Strategic Impact Focus (25 points)**
- Highlights "Revenue", "Growth", "Transformation"
- Downplays tactical tasks

**3. Audience Awareness (25 points)**
- Mentions "Presentation to CEO" or "Executive Summary"
- Sets the appropriate tone (Confident, Polished)

**4. "Selling" the Candidate (25 points)**
- Asks the AI to be persuasive
- Uses strong adjectives (Visionary, Proven)

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Prompt:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Perfect understanding of executive presence.
- 75-89: Good - Good rewrite request, maybe misses the "CEO" angle.
- 60-74: Adequate - Basic "rewrite this" request.
- 40-59: Needs Work - Asks for more bullet points.
- 0-39: Poor - Irrelevant.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Technical Sourcing Guru. A participant has written a Kaggle X-Ray search.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Site: Kaggle
- Role: Machine Learning Engineer
- Skill: Computer Vision
- Goal: Find Top-tier profiles

## EVALUATION RUBRIC

**1. Site Targeting (25 points)**
- Correct site:kaggle.com
- Targets user profiles (not datasets/competitions)

**2. Ranking Keywords (25 points)**
- Uses "Grandmaster", "Master", "Expert"
- Leverages Kaggle's specific hierarchy

**3. Exclusion Logic (25 points)**
- Excludes /c (competitions), /code, /discussion
- Reduces noise

**4. Skill Keywords (25 points)**
- "Computer Vision", "CV", "Image Processing"
- Relevant to the domain

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved X-Ray Search:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Pinpoint accuracy, leverages Kaggle rankings.
- 75-89: Good - Finds profiles, maybe misses ranking terms.
- 60-74: Adequate - Basic search, lots of noise.
- 40-59: Needs Work - Wrong site or keywords.
- 0-39: Poor - Broken search.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Design Recruiting Specialist. A participant has written a Dribbble X-Ray search.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Site: Dribbble
- Role: Senior UI Designer
- Aesthetic: Minimalist / Clean
- Goal: Find profiles

## EVALUATION RUBRIC

**1. Site Targeting (25 points)**
- Correct site:dribbble.com
- Targets profiles (not just shots)

**2. Aesthetic Keywords (25 points)**
- "Minimalist", "Clean", "Minimalism"
- Captures the specific style requested

**3. Exclusion Logic (25 points)**
- Excludes /shots, /stories
- Focuses on the "About" or "Profile" pages

**4. Availability Signals (25 points)**
- "Hire me", "Available", "Email"
- Looks for contact info or status

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved X-Ray Search:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Finds exact aesthetic match and contact info.
- 75-89: Good - Finds designers, maybe misses aesthetic nuance.
- 60-74: Adequate - Basic search, lots of image results.
- 40-59: Needs Work - Wrong site or keywords.
- 0-39: Poor - Broken search.

Evaluate now.`
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
        promptGenerator: (submission) => `
            You are a Market Mapping Expert.
            Submission: "${submission}"
            
            Evaluate:
            1. Are the companies relevant to Fintech/Payments?
            2. Are they likely to have teams in NYC?
            3. Is the reasoning sound (tech stack match)?
            
            SCORE: [number]
            
            Tips:
            1. Don't just list banks (JPMorgan) unless the role is legacy.
            2. Look for "Engineering Blogs" of these companies to verify their stack.
            3. Use Crunchbase to find well-funded competitors.
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
        promptGenerator: (submission) => `
            You are a Compensation Analyst.
            Submission: "${submission}"
            
            Evaluate:
            1. Did they use data/percentiles to make the case?
            2. Did they offer options (Raise budget OR Lower requirements)?
            3. Was the tone advisory, not complaining?
            
            SCORE: [number]
            
            Tips:
            1. Use terms like "Median," "Percentile," and "Total Comp."
            2. Always give the manager a choice (The "Double Bind" technique).
            3. Mention the risk: "We will lose candidates at the offer stage."
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
        promptGenerator: (submission) => `
            You are a DE&I Consultant.
            Submission: "${submission}"
            
            Evaluate:
            1. Are the accommodations practical?
            2. Do they specifically help with anxiety/processing (common in neurodivergence)?
            3. Do they maintain the bar for quality?
            
            SCORE: [number]
            
            Tips:
            1. "Surprise" questions measure quick thinking, not competence. Avoid them.
            2. Clear structure helps everyone, not just neurodiverse folks.
            3. Focus on "Work Samples" over "Social cues."
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
        promptGenerator: (submission) => `You are an Executive Recruiter. A participant has proposed probing questions for a phone screen.

## CANDIDATE SUBMISSION
"${submission}"

## SCENARIO
- Role: VP of Sales
- Red Flags: 4 jobs in 3 years; high-impact claims (500% revenue, team of 50)
- Goal: Write 2 probing questions to validate claims and address job hopping.

## EVALUATION RUBRIC

**1. Addresses Job Hopping (25 points)**
- Does at least one question directly or indirectly probe the frequent job changes?
- Seeks to understand the "why" behind the transitions.

**2. Validates Impact Claims (25 points)**
- Does at least one question seek to verify the magnitude or personal contribution to the stated achievements (e.g., 500% revenue growth)?
- Asks for context or specifics to avoid inflated claims.

**3. Open-Ended & Non-Leading (25 points)**
- Are the questions designed to elicit detailed responses rather than simple yes/no answers?
- Avoids accusatory language, maintaining a professional and curious tone.

**4. Strategic & Insightful (25 points)**
- Do the questions go beyond surface-level inquiries to uncover deeper motivations or underlying issues?
- Are they designed to reveal potential risks or inconsistencies?

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Probing Questions:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Strategic, open-ended questions that effectively probe both job hopping and impact claims.
- 75-89: Good - Questions address both areas but might be slightly less nuanced or direct.
- 60-74: Adequate - Questions are too generic or only address one of the red flags effectively.
- 40-59: Needs Work - Questions are leading, accusatory, or fail to address the core issues.
- 0-39: Poor - Irrelevant questions or unprofessional approach.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Social Media Recruiter. A participant has written a video job description script.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Role: Gen Z Social Media Manager
- Platform: TikTok/Reels (30-second video)
- Tone: High-energy, authentic

## EVALUATION RUBRIC

**1. Strong Hook (25 points)**
- Captures attention within the first 3-5 seconds.
- Uses language or a call-out relevant to the target audience (Gen Z).

**2. Authentic & Engaging Tone (25 points)**
- Sounds natural and conversational, not corporate jargon.
- Resonates with Gen Z's communication style and values.

**3. Clear Role & Value Proposition (25 points)**
- Briefly explains what the role entails and why it's appealing (e.g., impact, perks, flexibility).
- Highlights aspects important to Gen Z (e.g., creativity, work-life balance, purpose).

**4. Clear Call to Action (25 points)**
- Explicitly tells viewers what to do next (e.g., "Link in bio," "Apply now").
- Makes the application process easy and clear.

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Video Script:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Viral potential, perfectly tailored to Gen Z, clear and compelling.
- 75-89: Good - Strong script, but might miss a nuance in tone or call to action.
- 60-74: Adequate - Gets the message across, but lacks the "spark" for TikTok/Reels.
- 40-59: Needs Work - Sounds too corporate or fails to engage the target audience.
- 0-39: Poor - Irrelevant or completely misses the platform/audience.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Google Search Hacker. A participant has written a Google Boolean string to find resumes.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Goal: Find publicly hosted resumes of "Data Scientists" on university websites.
- File Types: PDF or Word docs.

## EVALUATION RUBRIC

**1. Filetype Operator Usage (25 points)**
- Correctly uses "filetype:" operator for PDF, DOC, DOCX.
- Includes multiple relevant file types.

**2. Resume/CV Keywords (25 points)**
- Includes terms like "resume", "CV", "curriculum vitae", or "vitae".
- Ensures the search targets actual resumes, not just documents.

**3. Role & Skill Keywords (25 points)**
- Includes "Data Scientist" and relevant skills (e.g., Python, R, ML, "machine learning").
- Balances specificity with breadth to capture relevant profiles.

**4. Exclusion Logic (25 points)**
- Uses negative keywords ("-") to exclude irrelevant results (e.g., -job, -sample, -template, -description).
- Focuses the search on actual candidate documents.

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Boolean String:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Comprehensive, precise, and highly effective Boolean string.
- 75-89: Good - Strong string, but might miss a few key operators or exclusions.
- 60-74: Adequate - Basic search, likely to return some relevant results but also noise.
- 40-59: Needs Work - Missing critical operators or includes too much noise.
- 0-39: Poor - Broken or irrelevant search string.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a LinkedIn Power User. A participant has outlined LinkedIn Recruiter filters for finding "Boomerang" employees.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Goal: Find "Boomerang" employees (past employees who left and might return).
- Platform: LinkedIn Recruiter
- Example Company: "Airbnb"

## EVALUATION RUBRIC

**1. Past Company Filter (25 points)**
- Correctly identifies and uses the "Past Company" filter for the target company.
- Ensures accuracy in company name.

**2. Current Company Exclusion (25 points)**
- Crucially excludes the target company from "Current Company" to avoid current employees.
- Demonstrates understanding of how to filter out active staff.

**3. Relevant Keywords/Skills (25 points)**
- Includes appropriate keywords or skills for the desired roles (e.g., "Software Engineer", "Product Manager").
- Balances broadness with specificity.

**4. Strategic Additional Filters (25 points)**
- Incorporates other relevant filters like "Years of Experience", "Location", or "Seniority Level".
- Shows a thoughtful approach to narrowing down the candidate pool.

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved LinkedIn Filters:**
[Provide optimized LinkedIn Recruiter filters]

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Precise, comprehensive, and strategically uses LinkedIn Recruiter filters for boomerangs.
- 75-89: Good - Effectively uses core filters, but might miss some advanced refinements.
- 60-74: Adequate - Identifies past employees, but might include current staff or too broad a search.
- 40-59: Needs Work - Fails to correctly exclude current employees or uses irrelevant filters.
- 0-39: Poor - Irrelevant or broken filter strategy.

Evaluate now.`
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
        promptGenerator: (submission) => `You are an ATS Administrator. A participant has proposed a 3-step process for merging duplicate profiles in an ATS.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Goal: Identify and merge 3,000 duplicate ATS profiles safely.
- Task: Describe a 3-step process without losing data.

## EVALUATION RUBRIC

**1. Primary Unique Identifier (25 points)**
- Identifies a reliable primary unique identifier (e.g., email address) for initial matching.
- Recognizes its importance for high-confidence matches.

**2. Secondary Matching Criteria (25 points)**
- Proposes secondary criteria for matching when the primary identifier is insufficient or missing (e.g., Name + Phone, Name + Date of Birth).
- Addresses the complexity of real-world data.

**3. Data Preservation & Master Record Rule (25 points)**
- Clearly defines a rule for which record becomes the "master" (e.g., most recently updated, most complete).
- Explains how to consolidate or preserve data from the non-master records (e.g., append notes, archive).

**4. Safety & Scalability (25 points)**
- Considers the safety of the process (e.g., avoiding accidental data loss).
- Implies a method that can handle a large volume of duplicates (e.g., "run a script").

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Duplicate Merging Process:**
[Provide an optimized 3-step process]

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Robust, data-safe, scalable, and clearly defined process.
- 75-89: Good - Solid process, but might lack some detail on edge cases or data preservation.
- 60-74: Adequate - Basic matching, but risks data loss or is not scalable.
- 40-59: Needs Work - Incomplete process or relies on unreliable matching.
- 0-39: Poor - Irrelevant or harmful suggestions.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Closing Expert. A participant is conducting a pre-close call.

## CANDIDATE SUBMISSION
"${submission}"

## GOAL
- Uncover objections before the offer
- Confirm timeline and decision makers
- "Trial Close"

## EVALUATION RUBRIC

**1. Trial Close Questions (25 points)**
- "If we offered X today, would you accept?"
- "On a scale of 1-10, where are we?"

**2. Objection Discovery (25 points)**
- Asks "What would stop you from joining?"
- Probes for hidden concerns (Spouse, Commute, Brand)

**3. Decision Maker Mapping (25 points)**
- "Who else are you consulting with?"
- "Does your partner have any concerns?"

**4. Timeline Control (25 points)**
- Confirms start dates and notice periods
- Aligns expectations

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Script:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Masterful discovery, leaves no stone unturned.
- 75-89: Good - Asks good questions, maybe misses the spouse factor.
- 60-74: Adequate - Basic "Are you interested?" check.
- 40-59: Needs Work - Too passive.
- 0-39: Poor - Pushes too hard without listening.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a Startup Advisor. A participant is explaining the value of equity to a candidate.

## CANDIDATE SUBMISSION
"${submission}"

## SCENARIO
- Candidate: Non-tech background, risk-averse
- Offer: Lower cash, high equity
- Goal: Explain the "Upside" simply

## EVALUATION RUBRIC

**1. Analogy Usage (25 points)**
- Uses a clear analogy (e.g., "Rent vs Wealth", "Owning the house")
- Makes the abstract concept concrete

**2. Upside Explanation (25 points)**
- Explains the math simply (e.g., "If we grow 2x...")
- Shows the potential value over 4 years

**3. Ownership Mindset (25 points)**
- Uses words like "Owner", "Partner", "Shareholder"
- Shifts the frame from "Employee" to "Owner"

**4. Simplicity (25 points)**
- Avoids jargon like "Strike price", "Vesting cliff" (unless explained)
- Easy to understand for a non-tech person

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Explanation:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Crystal clear analogy, exciting upside explanation.
- 75-89: Good - Good explanation, maybe a bit technical.
- 60-74: Adequate - "It's stock options."
- 40-59: Needs Work - Confusing or too risky sounding.
- 0-39: Poor - Scares the candidate away.

Evaluate now.`

    },
    {
        id: 'game48',
        title: 'Game 48: The Culture Add',
        description:
            'You are interviewing a candidate who is very different from your current team (introverted, different background). The team says "not a culture fit." You think they are a "Culture Add."',
        task:
            'Your task: Write a note to the Hiring Manager explaining why "Culture Fit" is dangerous and why this candidate adds value.',
        placeholder: 'e.g., I noticed the team feedback...',
        difficulty: 'hard' as const,
        skillCategory: 'screening' as const,
        exampleSolution:
            'I noticed the feedback on "culture fit," but I want to challenge us to look for "Culture Add" instead. "Fit" often just means "more of the same," which leads to groupthink. This candidate brings a rigorous, thoughtful approach that balances our team\'s high-energy, rapid-fire style. We need that diversity of thought to avoid blind spots. If they can do the job and share our values, their different personality is an asset, not a risk.',
        promptGenerator: (submission: string) => `
You are a DE & I Leader evaluating a recruiter's written note to a Hiring Manager.
This is a HARD difficulty challenge.Be STRICT and RIGOROUS in your evaluation.

IMPORTANT CONSTRAINTS:
- You must evaluate the EXACT text in the submission.
- Do NOT assume or invent arguments, examples, or phrases that are not explicitly written.
- If a concept is not clearly present in the submission, score that criterion as 0.
    - Keep your reasoning grounded in the candidate's actual words.

SUBMISSION:
"""${submission}"""

STEP 1 – WORD COUNT
First, estimate the word count of the submission.

    STEP 2 – RAW CRITERIA SCORING(0–25 each, before deductions)
Use this SCORING GUIDE as a baseline(before automatic deductions):

- 0–25 total: Vague statements, missing most criteria, or < 30 words
    - 26–50 total: Touches on 1–2 criteria but lacks depth or specifics
        - 51–70 total: Addresses 3 criteria with some detail, but missing key elements
            - 71–85 total: Addresses all 4 criteria with good detail and examples
                - 86–100 total: Exceptional response with all criteria, specific examples, and compelling business case

REQUIRED CRITERIA(Each worth 0–25 RAW points):

1. DISTINCTION(0–25):
- Did they clearly distinguish "Culture Fit"(sameness / homogeneity) from "Culture Add"(diversity of thought / new perspectives) ?
    - Simply saying "culture fit is dangerous" is NOT enough; they must EXPLAIN why.
   - Score 0 if this distinction is not clearly made in the text.

2. BUSINESS RISK(0–25):
- Did they explicitly mention business risks like "groupthink", "blind spots", "echo chamber", or "lack of diverse perspectives" ?
    - Generic or vague statements like "it’s bad for the business" WITHOUT clear explanation should score low.
   - Score 0 if no real business risk is described.

3. SPECIFIC STRENGTH(0–25):
- Did they identify a SPECIFIC strength this candidate brings(e.g., "analytical approach", "different problem-solving style", "unique industry experience", "calmer and more structured communication") ?
    - Generic statements like "they add value" or "they are good" = 0.
        - Score 0 if no concrete candidate strength is identified.

4. BUSINESS BENEFIT(0–25):
- Did they tie the candidate's difference to a CONCRETE business outcome (e.g., "better risk assessment", "more innovative solutions", "reaching diverse customers", "avoiding blind spots", "improved decision-making")?
    - Score 0 if there is no clear link from the candidate’s difference to business impact.

        STEP 3 – AUTOMATIC DEDUCTIONS & CAPS

Apply these AUTOMATIC RULES after calculating the raw total(sum of the 4 criteria):

- If wordCount < 30:
- maxScoreByLength = 40(cap the final score at 40)
    - ELSE IF wordCount < 50:
- maxScoreByLength = 60
    - ELSE:
- maxScoreByLength = 100

    - If the submission contains NO specific examples or concrete details(e.g., strengths, situations, outcomes are all generic):
- noSpecificExamplesPenalty = -20
    - Otherwise:
- noSpecificExamplesPenalty = 0

    - If the submission is purely theoretical(talks about diversity or culture in abstract terms, but gives no actionable note to the Hiring Manager):
- theoreticalOnlyPenalty = -15
    - Otherwise:
- theoreticalOnlyPenalty = 0

STEP 4 – FINAL SCORE CALCULATION

1. rawTotal = distinction + businessRisk + specificStrength + businessBenefit
2. adjustedScore = rawTotal + noSpecificExamplesPenalty + theoreticalOnlyPenalty
3. cappedScore = min(adjustedScore, maxScoreByLength)
4. finalScore = clamp cappedScore to the 0–100 range(not below 0, not above 100)

STEP 5 – FEEDBACK

Provide SHORT, focused feedback:
- 1–2 sentences summarizing overall quality
    - 2–3 bullet - style points: what they did well
        - 2–3 bullet - style points: what to improve next time

OUTPUT FORMAT(VERY IMPORTANT):
Return ONLY a valid JSON object with this exact structure and no extra commentary:

{
    "wordCount": number,
        "criteria": {
        "distinction": number,
            "businessRisk": number,
                "specificStrength": number,
                    "businessBenefit": number
    },
    "autoAdjustments": {
        "maxScoreByLength": number,
            "noSpecificExamplesPenalty": number,
                "theoreticalOnlyPenalty": number
    },
    "rawTotal": number,
        "finalScore": number,
            "feedback": {
        "summary": string,
            "strengths": string[],
                "improvements": string[]
    }
}

Remember:
- Do NOT invent arguments or details that are not in the submission.
- If the submission is extremely short or generic, most criteria should be close to 0.
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
        promptGenerator: (submission) => `You are a Global Talent Strategist.A participant has proposed an alternative location for a new engineering hub.

## CANDIDATE SUBMISSION
"${submission}"

## SCENARIO
    - Role: Data Engineers
        - CTO's Suggestion: San Francisco or London
            - Participant's Suggestion: Poland or Brazil
                - Goal: Write a brief pitch(3 - 4 sentences) for the alternative location.

## EVALUATION RUBRIC

    ** 1. Addresses Cost / Competition(25 points) **
        - Explicitly contrasts the cost or competitive landscape of the proposed alternative vs.the CTO's suggestions.
            - Highlights the financial or talent acquisition advantages.

** 2. Talent Supply & Quality(25 points) **
    - Mentions the availability and quality of talent in the alternative location(e.g., strong STEM education, large talent pool).
- Provides a compelling reason for talent density.

** 3. Retention / Employer Branding(25 points) **
        - Discusses potential benefits for retention or employer branding in the alternative location(e.g., being a top - tier employer, less churn).
- Focuses on long - term talent strategy.

** 4. Conciseness & Persuasiveness(25 points) **
    - Delivers the pitch effectively within the specified length(3 - 4 sentences).
- The argument is clear, logical, and persuasive to a CTO.

** Total: /100 points**

## REQUIRED OUTPUT FORMAT

    ** Analysis:**
        [Analyze the submission against the rubric]

        ** SCORE: [X] **

** Strengths:**
- [List specific strengths]

    ** Areas for Improvement:**
        1.[Specific tip]
2.[Specific tip]

** Improved Location Pitch:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Concise, data-driven, and highly persuasive pitch covering all key strategic points.
- 75-89: Good - Strong pitch, but might miss one strategic element or be slightly less concise.
- 60-74: Adequate - Identifies a good alternative but lacks depth in reasoning or persuasiveness.
- 40-59: Needs Work - Fails to make a compelling case or misses key comparative points.
- 0-39: Poor - Irrelevant or unconvincing pitch.

Evaluate now.`
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
        promptGenerator: (submission) => `You are an AI Developer. A participant has written a system prompt for a Sourcing Bot.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Goal: Create a custom GPT that ONLY generates Boolean strings.
- Task: Write the system instructions.

## EVALUATION RUBRIC

**1. Clear Persona & Core Function (25 points)**
- Clearly defines the AI's role (e.g., "Boolean Search Generator").
- States its *sole* purpose (e.g., "ONLY output valid Boolean search strings").

**2. Negative Constraints (25 points)**
- Explicitly instructs the AI *what not to do* (e.g., "Do NOT explain," "Do NOT say 'Here is your string'").
- Prevents unwanted conversational filler or explanations.

**3. Input Handling & Output Format (25 points)**
- Specifies how the AI should receive input (e.g., "Receive a job description or list of skills").
- Defines the exact output format (e.g., "Output a Boolean string inside a code block").

**4. Edge Case Handling (25 points)**
- Provides instructions for ambiguous or vague user input (e.g., "If the user input is vague, ask ONE clarifying question").
- Ensures robustness and user-friendliness.

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved System Prompt:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Precise, comprehensive, and robust system prompt that effectively controls AI behavior.
- 75-89: Good - Strong prompt, but might miss some negative constraints or edge case handling.
- 60-74: Adequate - Defines the core function but allows for too much conversational filler.
- 40-59: Needs Work - Vague instructions, leading to unpredictable AI behavior.
- 0-39: Poor - Irrelevant or harmful instructions.

Evaluate now.`
    },
    {
        id: 'game51',
        title: 'Game 51: The Purple Squirrel',
        description: 'CAPSTONE: You need a "Rust Engineer" with "Cryptography" background, who speaks "Japanese", and is willing to relocate to "Switzerland".',
        task: 'Your task: Write a multi-part sourcing strategy (Boolean + Platform + Outreach angle).',
        placeholder: 'e.g., Boolean: ... Platform: ... Outreach: ...',
        difficulty: 'hard' as const,
        skillCategory: 'boolean' as const,
        exampleSolution: 'Boolean: (Rust OR RustLang) AND (Cryptography OR Crypto OR "Zero Knowledge" OR ZK) AND (Japanese OR "JLPT" OR "Japanese speaker"). Platform: GitHub (search for Rust crypto repos), LinkedIn (filter by Language: Japanese), and Rust Community Discords. Outreach Angle: "Your unique blend of Rust + Crypto + Japanese is exactly what we need for our Tokyo-Zurich bridge team. We offer full relocation support to Switzerland."',
        promptGenerator: (submission) => `You are a Master Sourcer. A participant has designed a "Purple Squirrel" sourcing strategy.

## CANDIDATE SUBMISSION
"${submission}"

## REQUIREMENTS
- Role: Rust Engineer + Cryptography + Japanese Speaker
- Location: Relocate to Switzerland
- Strategy: Boolean + Platform + Outreach

## EVALUATION RUBRIC

**1. Boolean Precision (30 points)**
- Covers all 3 niche skills: (Rust) AND (Crypto/ZK) AND (Japanese)
- Uses correct syntax for the chosen platform

**2. Platform Selection (25 points)**
- Targets where these people hang out (GitHub, Rust Discords, specialized forums)
- Doesn't just rely on LinkedIn

**3. Outreach Personalization (25 points)**
- Acknowledges the rarity of their profile ("Unicorn", "Perfect match")
- Connects the dots between their skills and the role

**4. Relocation Hook (20 points)**
- Leads with the "Switzerland" lifestyle/support
- Makes the move sound exciting, not daunting

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Strategy:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Finds the needle in the haystack, perfect pitch.
- 75-89: Good - Good search, maybe generic outreach.
- 60-74: Adequate - Basic LinkedIn search.
- 40-59: Needs Work - Misses one of the key skills (e.g., Japanese).
- 0-39: Poor - Irrelevant.

Evaluate now.`
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
        promptGenerator: (submission) => `You are a VC Talent Partner. A participant has outlined a "Guerrilla Recruiting" strategy.

## CANDIDATE SUBMISSION
"${submission}"

## SCENARIO
- Budget: $0
- Goal: Hire 20 Engineers in 6 months
- Strategy: Tools, Process, Brand

## EVALUATION RUBRIC

**1. Zero-Budget Tools (25 points)**
- Suggests free tools (Free LinkedIn, GitHub X-Ray, Trello/Notion ATS)
- Avoids paid licenses

**2. Founder Involvement (25 points)**
- Leverages the Founder for sourcing/closing (High ROI)
- "Founder Sourcing Blocks"

**3. Referral Strategy (25 points)**
- Incentivizes the team (Cash bonuses, dinners)
- Makes referrals the #1 source

**4. Brand/Inbound (25 points)**
- Content marketing (Engineering Blog)
- "High Touch" candidate experience as a differentiator

**Total: /100 points**

## REQUIRED OUTPUT FORMAT

**Analysis:**
[Analyze the submission against the rubric]

**SCORE: [X]**

**Strengths:**
- [List specific strengths]

**Areas for Improvement:**
1. [Specific tip]
2. [Specific tip]

**Improved Strategy:**
\`\`\`
[Optimized version]
\`\`\`

**Why This Works Better:**
[Explanation]

## SCORING GUIDELINES
- 90-100: Excellent - Creative, scrappy, and highly effective.
- 75-89: Good - Good ideas, maybe relies too much on one channel.
- 60-74: Adequate - Basic "Post on job boards".
- 40-59: Needs Work - Suggests paid tools.
- 0-39: Poor - Unrealistic.

Evaluate now.`
    }
];

import { compareTwoStrings } from 'string-similarity';
import { ValidationConfig, ValidationResult } from '../types';

const ensureFeedback = (feedback: string[]) => {
    if (feedback.length === 0) {
        feedback.push('Automated checks passed; AI will handle nuanced scoring.');
    }
};

/**
 * Professional keyword synonyms for common sourcing terms
 * MULTI-LANGUAGE SUPPORT for international recruiting (2024-2025)
 * Supports: English, German (DE), French (FR), Spanish (ES), Dutch (NL), Portuguese (PT)
 */
const DEFAULT_KEYWORD_SYNONYMS: Record<string, string[]> = {
    // Technical skills (English abbreviations + international variations)
    'kubernetes': ['k8s', 'k8', 'container orchestration', 'kube', 'container-orchestration'],
    'golang': ['go', 'go language', 'go programming', 'go lang', 'go-lang'],
    'javascript': ['js', 'javascript', 'ecmascript', 'es6', 'es2015'],
    'typescript': ['ts', 'typescript'],
    'python': ['py', 'python'],
    'react': ['reactjs', 'react.js', 'react js'],
    'vue': ['vuejs', 'vue.js', 'vue js'],
    'angular': ['angularjs', 'angular.js', 'angular js'],
    'node': ['nodejs', 'node.js', 'node js'],
    'database': ['db', 'databases', 'data store', 'datastore'],

    // Job titles - MULTI-LANGUAGE (EN, DE, FR, ES, NL, PT)
    'engineer': [
        'developer', 'programmer', 'architect', 'swe', 'software engineer', 'dev', // English
        'ingenieur', 'entwickler', 'programmierer', 'softwareentwickler', // German
        'ingénieur', 'développeur', 'programmeur', // French
        'ingeniero', 'desarrollador', 'programador', // Spanish
        'ontwikkelaar', // Dutch (ingenieur is same)
        'engenheiro', 'desenvolvedor' // Portuguese
    ],

    'developer': [
        'dev', 'engineer', 'programmer', 'coder', 'software developer', // English
        'entwickler', 'programmierer', 'softwareentwickler', // German
        'développeur', 'programmeur', 'codeur', // French
        'desarrollador', 'programador', 'codificador', // Spanish
        'ontwikkelaar', 'programmeur', // Dutch
        'desenvolvedor', 'programador' // Portuguese
    ],

    'senior': [
        'lead', 'principal', 'staff', 'sr', 'sr.', 'l6', 'l7', 'senior-level', 'chief', // English
        'leitend', 'leitender', 'führend', // German (senior is same)
        'sénior', 'principal', 'responsable', 'chef', // French
        'sénior', 'principal', 'jefe', 'responsable', // Spanish
        'hoofd', 'lead', 'principal', // Dutch (senior is same)
        'sênior', 'principal', 'chefe', 'líder' // Portuguese
    ],

    'backend': [
        'back-end', 'server-side', 'api', 'server side', // English
        'back-end', 'server-seite', 'serverseitig', // German (backend is same)
        'back-end', 'côté serveur', 'arrière-plan', // French
        'back-end', 'lado del servidor', // Spanish
        'back-end', 'server-kant', 'server-side', // Dutch
        'back-end', 'lado do servidor' // Portuguese
    ],

    'frontend': [
        'front-end', 'client-side', 'ui', 'client side', 'user interface', // English
        'front-end', 'client-seite', 'benutzeroberfläche', // German
        'front-end', 'côté client', 'interface utilisateur', // French
        'front-end', 'lado del cliente', 'interfaz de usuario', // Spanish
        'front-end', 'client-kant', 'gebruikersinterface', // Dutch
        'front-end', 'lado do cliente', 'interface do usuário' // Portuguese
    ],

    'fullstack': [
        'full-stack', 'full stack', // English
        'full-stack', 'vollständiger stack', // German
        'full-stack', 'pile complète', // French
        'full-stack', 'pila completa', // Spanish
        'full-stack', 'volledige stack', // Dutch
        'full-stack', 'pilha completa' // Portuguese
    ],

    // Work arrangements - MULTI-LANGUAGE
    'remote': [
        'distributed', 'work from home', 'wfh', 'remote work', 'telecommute', 'virtual', // English
        'fernarbeit', 'home office', 'homeoffice', 'von zuhause', 'telearbeit', // German
        'télétravail', 'travail à distance', 'à distance', 'bureau à domicile', // French
        'remoto', 'teletrabajo', 'trabajo remoto', 'desde casa', // Spanish
        'thuiswerken', 'op afstand', 'telewerken', 'werk op afstand', // Dutch
        'remoto', 'teletrabalho', 'trabalho remoto', 'de casa' // Portuguese
    ],

    // Cities - MULTI-LANGUAGE VARIATIONS (Critical for international sourcing)
    // Austria
    'vienna': ['wien', 'at-9', '1010', '1020', '1030', 'vienne'], // DE + FR + postal codes
    // Germany
    'berlin': ['de-be', '10115', '10117', 'berlín'], // Postal codes + ES
    'munich': ['münchen', 'de-by', '80331', '80335'], // DE + postal codes
    'cologne': ['köln', 'koeln', 'de-nw', '50667', 'colonia'], // DE + ES
    'frankfurt': ['frankfurt am main', 'de-he', '60311', 'francfort'], // FR
    'hamburg': ['de-hh', '20095', '20099', 'hamburgo'], // ES
    'stuttgart': ['de-bw', '70173', 'estugarda'], // PT
    // France
    'paris': ['de-75', '75001', '75002', 'parís', 'parijs'], // ES + NL
    'lyon': ['de-69', '69001', 'león'], // ES
    'marseille': ['de-13', '13001', 'marsella'], // ES
    'toulouse': ['de-31', '31000', 'tolosa'], // ES
    // Spain
    'madrid': ['es-md', '28001', '28013', 'madri'], // PT
    'barcelona': ['es-ct', '08001', '08002', 'barcelone'], // FR
    'valencia': ['es-vc', '46001', 'valence'], // FR
    // Netherlands
    'amsterdam': ['nl-nh', '1011', '1012', 'amsterdão'], // PT
    'rotterdam': ['nl-zh', '3011', '3012', 'roterdam'], // ES
    'the hague': ['den haag', "'s-gravenhage", 'nl-zh', '2511', 'la haya'], // NL + ES
    // Belgium
    'brussels': ['bruxelles', 'brussel', 'be-bru', '1000', 'bruselas'], // FR + NL + ES
    'antwerp': ['antwerpen', 'anvers', 'be-vli', '2000', 'amberes'], // NL + FR + ES
    // UK
    'london': ['gb-ln', 'londres', 'londen'], // ES + NL
    // Switzerland
    'zurich': ['zürich', 'zuerich', 'ch-zh', '8001'], // DE variations
    'geneva': ['genève', 'genf', 'ch-ge', '1201', 'ginebra'], // FR + DE + ES
    // Czech Republic
    'prague': ['praha', 'cz-10', 'praga', 'praag'], // CZ + ES + NL
    // Portugal
    'lisbon': ['lisboa', 'pt-11', 'lisbonne', 'lissabon'], // PT + FR + NL
};

/**
 * Merge custom synonym map with defaults
 */
const buildSynonymMap = (customMap?: Record<string, string[]>): Record<string, string[]> => {
    if (!customMap) return DEFAULT_KEYWORD_SYNONYMS;

    const merged = { ...DEFAULT_KEYWORD_SYNONYMS };
    for (const [key, values] of Object.entries(customMap)) {
        const normalizedKey = key.toLowerCase();
        merged[normalizedKey] = [
            ...(merged[normalizedKey] || []),
            ...values.map(v => v.toLowerCase())
        ];
    }
    return merged;
};

export function validateSimilarity(
    submission: string,
    exampleSolution?: string
): number {
    if (!exampleSolution) return 0;
    return compareTwoStrings(submission.toLowerCase(), exampleSolution.toLowerCase());
}

export function validateBooleanSearch(
    submission: string,
    requirements: { keywords?: string[]; location?: string } = {},
    config?: ValidationConfig
): ValidationResult {
    const strengths: string[] = [];
    const operatorCount = (submission.match(/\b(AND|OR|NOT)\b/gi) || []).length;

    // Enhanced proximity detection: support multiple formats
    const proximityPatterns = [
        /\b(NEAR|AROUND)\/?\d*\b/i,              // NEAR/AROUND (standard)
        /"[^"]{10,80}"/,                          // Quoted phrases (10-80 chars)
        /\bw\/\d+\b/i,                           // Boolean Strings DB syntax (w/5)
        /\*+/,                                    // Wildcards (React * Engineer)
        /NEAR:\d+/i,                              // Bing syntax
    ];

    const checks: Record<string, boolean> = {
        hasParentheses: /\([^)]+\)/.test(submission),
        hasAND: /\bAND\b/.test(submission),
        hasOR: /\bOR\b/.test(submission),
        hasNot: /\bNOT\b/.test(submission) || /-/.test(submission),
        hasProximity: config?.recognizePhrasesAsProximity !== false
            ? proximityPatterns.some(p => p.test(submission))
            : /\b(NEAR|AROUND\/?\d*)\b/i.test(submission),
        isOverlyComplex: operatorCount > 12,
    };

    const feedback: string[] = [];
    let score = 100;

    // IMPROVED: Only penalize parentheses if there's ambiguous operator precedence
    const hasAmbiguousPrecedence = /\bOR\b.*\bAND\b|\bAND\b.*\bOR\b/i.test(submission) &&
                                    !checks.hasParentheses;

    if (hasAmbiguousPrecedence) {
        feedback.push(
            'When mixing AND/OR operators, use parentheses to clarify precedence. Example: (React OR Vue) AND (senior OR lead) ensures you get React OR Vue candidates who are ALSO senior or lead level.'
        );
        score -= 15;
    } else if (checks.hasParentheses) {
        strengths.push('Uses parentheses for clear grouping');
    } else if ((checks.hasAND || checks.hasOR) && config?.allowImplicitAND !== true) {
        // Simple AND/OR without mixing is fine, just note it
        strengths.push('Clear operator usage (no precedence ambiguity)');
    }

    if (checks.hasAND && checks.hasOR) {
        strengths.push('Combines AND/OR operators effectively');
    } else if (!checks.hasAND && !checks.hasOR) {
        // Check if using implicit AND (common in Google X-Ray)
        const hasMultipleTerms = submission.trim().split(/\s+/).length >= 3;
        if (hasMultipleTerms && config?.allowImplicitAND === true) {
            strengths.push('Uses implicit AND (multiple search terms)');
        } else {
            feedback.push('Search string lacks boolean operators (AND, OR). Add operators to control how terms combine.');
            score -= 20;
        }
    }

    if (checks.hasProximity) {
        // Detect which type of proximity was used
        if (/"[^"]{10,80}"/.test(submission)) {
            strengths.push('Uses phrase matching to keep terms close together');
        } else if (/\*/.test(submission)) {
            strengths.push('Uses wildcards for flexible term matching');
        } else {
            strengths.push('Uses proximity operators (NEAR/AROUND) to keep terms close');
        }
    } else if (submission.length > 0) {
        feedback.push('Consider adding proximity operators (NEAR/AROUND) or phrase matching ("exact phrase") to keep critical terms closer together.');
        score -= 5;
    }

    if (checks.isOverlyComplex) {
        feedback.push(`Search might be overly complex with ${operatorCount} operators. Simplify groups to avoid platform limits and noise.`);
        score -= 10;
    }

    // IMPROVED: Multi-pattern location validation
    if (requirements.location) {
        const locationPatterns = [
            new RegExp(requirements.location, 'i'),           // Original location
            /\bsite:[a-z]{2}\.linkedin\.com\b/i,             // Country-specific LinkedIn
            /\b(1010|1020|1030|1040|1050|1060|1070|1080|1090)\b/, // Vienna postal codes
            /\b(10[0-9]{3}|1[1-9][0-9]{3})\b/,               // Generic postal code pattern
            /\bwithin:\d+mi:postal:\d+\b/i,                  // LinkedIn radius syntax
            /\b(greater|metro|metropolitan)\s+\w+\s+area\b/i, // Metro area syntax
        ];

        // Check for location in common variations
        const synonymMap = buildSynonymMap(config?.synonymMap);
        const locationLower = requirements.location.toLowerCase();
        const locationSynonyms = [
            requirements.location,
            ...(synonymMap[locationLower] || [])
        ];

        const hasLocation = locationPatterns.some(pattern => pattern.test(submission)) ||
                           locationSynonyms.some(loc => new RegExp(loc, 'i').test(submission));

        checks.hasLocation = hasLocation;

        if (!hasLocation) {
            if (config?.locationRequired === true) {
                feedback.push(`Missing required location targeting (${requirements.location}). Include it to focus results.`);
                score -= 10;
            } else {
                feedback.push(`Consider adding location targeting (e.g., ${requirements.location}, postal codes, or site:country filters) to focus results.`);
                score -= 5; // Reduced penalty when not strictly required
            }
        } else {
            strengths.push('Includes location targeting strategy');
        }
    }

    // IMPROVED: Keyword checks with synonym support
    if (requirements.keywords) {
        const synonymMap = buildSynonymMap(config?.synonymMap);
        const strictMatch = config?.strictKeywordMatch === true;

        const missingKeywords = requirements.keywords.filter(keyword => {
            const keywordLower = keyword.toLowerCase();

            if (strictMatch) {
                // Strict mode: exact keyword match only
                return !new RegExp(`\\b${keyword}\\b`, 'i').test(submission);
            } else {
                // Flexible mode: check keyword + synonyms
                const synonyms = [
                    keyword,
                    ...(synonymMap[keywordLower] || [])
                ];
                return !synonyms.some(syn => new RegExp(`\\b${syn}\\b`, 'i').test(submission));
            }
        });

        if (missingKeywords.length > 0) {
            checks.hasKeywords = false;

            if (strictMatch) {
                feedback.push(`Missing required keywords: ${missingKeywords.join(', ')}`);
                score -= 10 * missingKeywords.length;
            } else {
                feedback.push(`Consider adding these concepts (or their synonyms): ${missingKeywords.join(', ')}`);
                score -= 5 * missingKeywords.length; // Reduced penalty for flexible matching
            }
        } else {
            checks.hasKeywords = true;
            if (strictMatch) {
                strengths.push('Covers all required keywords');
            } else {
                strengths.push('Covers all required concepts (including professional synonyms)');
            }
        }
    }

    ensureFeedback(feedback);
    return {
        score: Math.max(0, score),
        checks,
        feedback,
        strengths,
    };
}

export function validateOutreach(
    submission: string,
    maxWords: number = 150,
    config?: ValidationConfig
): ValidationResult {
    const trimmed = submission.trim();
    const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
    const strengths: string[] = [];
    const feedback: string[] = [];
    let score = 100;

    // IMPROVED: Deep personalization analysis (3 levels)
    const personalizationSignals = {
        shallow: [
            /\b(hi|hello|hey)\s+\[(name|candidate)\]/i,  // Template placeholders
            /\b(hi|hello|hey)\s+\{name\}/i,
            /\b(hi|hello|hey)\s+there\b/i,               // Generic "Hi there"
            /\b(hi|hello|hey)\s+(everyone|team|folks)\b/i, // Group messages
        ],
        medium: [
            /\b(hi|hello|hey)\s+[A-Z][a-z]+\b/,         // Actual name (capitalized)
            /\byour (company|team|work at|role at)\b/i,  // Company reference
            /\b(working at|employed at|position at)\s+[A-Z]/i, // Specific company
            /\byour (profile|background|experience)\b/i, // General profile mention
        ],
        deep: [
            /\b(presentation|talk|article|post|contribution|paper|blog|tweet)\b/i,  // Specific work
            /\b(noticed|saw|read|watched|came across|impressed by)\s+your\b/i,     // Active research
            /\b(conference|summit|meetup|event|webinar)\b/i,                        // Event reference
            /\b(open[- ]source|github|repository|project)\b/i,                      // Technical contribution
            /\b(scaling|building|architecting|leading|managing)\s+[a-z]+/i,        // Specific achievement
            /\b(quote|mentioned|said|wrote|published)\b/i,                          // Content reference
        ]
    };

    let personalizationLevel = 'none';
    let personalizationScore = 0;

    if (personalizationSignals.deep.some(p => p.test(submission))) {
        personalizationLevel = 'deep';
        personalizationScore = 15;
        strengths.push('Deep personalization (references specific achievements/work)');
    } else if (personalizationSignals.medium.some(p => p.test(submission))) {
        personalizationLevel = 'medium';
        personalizationScore = 10;
        strengths.push('Includes name or company personalization');
    } else if (personalizationSignals.shallow.some(p => p.test(submission))) {
        personalizationLevel = 'shallow';
        personalizationScore = 5;
        feedback.push('Personalization is template-based. Reference specific achievements (talks, projects, articles) to stand out.');
        score -= 10;
    } else {
        feedback.push('Add personalization: name + specific achievement/work (e.g., "I saw your talk on X" or "Your work on Y project").');
        score -= 15;
    }

    const checks: Record<string, boolean> = {
        lengthOK: wordCount <= maxWords && wordCount > 10,
        hasSubjectLine: /Subject:/i.test(submission),
        hasCallToAction: /(call|chat|connect|interested|open to|schedule|time to talk|let (?:me|us) know|reply|coffee|conversation|discuss|explore)/i.test(submission),
        hasPersonalization: personalizationLevel !== 'none',
        personalizationLevel: personalizationLevel === 'deep',
    };

    if (wordCount < 10) {
        feedback.push('Message is too short (needs substance for candidate to respond).');
        score -= 40;
    } else if (wordCount > maxWords) {
        feedback.push(`Message is too long (${wordCount} words). Aim for under ${maxWords} - busy candidates skim long messages.`);
        score -= 10;
    } else {
        strengths.push('Clear, concise length for outreach');
    }

    // ENHANCED: Cliche detection with severity levels
    // Severe cliches = -8 pts each, Moderate = -5 pts, Mild = -3 pts
    const clicheCategories = {
        severe: [
            'just checking in',
            'circling back',
            'touching base',
            'hope this email finds you well',
            'trust this email finds you well',
            'hope you are well',
            'i hope this finds you well',
            'per my last email',
            'as per my last email',
            'just wanted to reach out',
            'just wanted to touch base',
            'i wanted to reach out to you',
        ],
        moderate: [
            'following up',
            'quick question',
            'wanted to reach out',
            'wanted to touch base',
            'picking your brain',
            'looping back',
            'bumping this up',
            'any update on this',
            'gentle reminder',
            'friendly reminder',
        ],
        mild: [
            'at your earliest convenience',
            'when you get a chance',
            'whenever you have time',
            'no rush',
            'just following up',
        ],
        recruitingSpecific: [
            'great opportunity for you',
            'perfect fit for you',
            'came across your profile',
            'your profile caught my attention',
            'i found your profile',
            'your background is impressive',
            'would love to connect',
            'let\'s hop on a call',
            'are you open to new opportunities',
            'thought of you for this role',
        ]
    };

    const foundSevere: string[] = [];
    const foundModerate: string[] = [];
    const foundMild: string[] = [];
    const foundRecruiting: string[] = [];

    clicheCategories.severe.forEach(c => {
        if (new RegExp(c, 'i').test(submission)) foundSevere.push(c);
    });
    clicheCategories.moderate.forEach(c => {
        if (new RegExp(c, 'i').test(submission)) foundModerate.push(c);
    });
    clicheCategories.mild.forEach(c => {
        if (new RegExp(c, 'i').test(submission)) foundMild.push(c);
    });
    clicheCategories.recruitingSpecific.forEach(c => {
        if (new RegExp(c, 'i').test(submission)) foundRecruiting.push(c);
    });

    const totalCliches = foundSevere.length + foundModerate.length + foundMild.length + foundRecruiting.length;

    if (totalCliches > 0) {
        checks.hasCliches = true;

        // Build detailed feedback message
        const clicheParts: string[] = [];
        if (foundSevere.length > 0) {
            clicheParts.push(`❌ Severe cliches (${foundSevere.length}): "${foundSevere.join('", "')}"`);
            score -= 8 * foundSevere.length;
        }
        if (foundRecruiting.length > 0) {
            clicheParts.push(`⚠️ Generic recruiting phrases (${foundRecruiting.length}): "${foundRecruiting.join('", "')}"`);
            score -= 7 * foundRecruiting.length;
        }
        if (foundModerate.length > 0) {
            clicheParts.push(`⚠️ Moderate cliches (${foundModerate.length}): "${foundModerate.join('", "')}"`);
            score -= 5 * foundModerate.length;
        }
        if (foundMild.length > 0) {
            clicheParts.push(`ℹ️ Mild cliches (${foundMild.length}): "${foundMild.join('", "')}"`);
            score -= 3 * foundMild.length;
        }

        feedback.push(`Avoid overused phrases:\n${clicheParts.join('\n')}\nUse fresh, specific language that references the candidate's actual work.`);
    } else {
        checks.hasCliches = false;
        strengths.push('Avoids common outreach cliches - uses fresh, specific language');
    }

    // EXPANDED: Generic template detection
    const genericTemplates = [
        'to whom it may concern',
        'I am reaching out to you because',
        'dear sir or madam',
        'I came across your profile',
        'your profile caught my attention',
        'I found your profile',
        'I wanted to connect with you',
        'great opportunity for you',
        'perfect fit for',
        'amazing opportunity',
    ];

    const foundGeneric = genericTemplates.filter(p => new RegExp(p, 'i').test(submission));
    if (foundGeneric.length > 0) {
        checks.isGeneric = true;
        feedback.push(`Message uses generic templates: "${foundGeneric.join('", "')}". Be specific about what caught your attention.`);
        score -= 10;
    } else {
        checks.isGeneric = false;
    }

    if (!checks.hasCallToAction) {
        feedback.push('Add a clear, low-friction call-to-action (e.g., "Quick 15-min call this week?" or "Reply yes if interested").');
        score -= 12;
    } else {
        strengths.push('Includes a clear call-to-action');
    }

    if (!checks.hasSubjectLine) {
        feedback.push('Add a subject line to catch attention and set context (critical for cold outreach).');
        score -= 8;
    } else {
        const subjectMatch = submission.match(/Subject:\s*(.+)/i);
        const subject = subjectMatch?.[1]?.trim() ?? '';
        if (subject.length < 8 || /^(hi|hello|follow up|checking in)$/i.test(subject)) {
            feedback.push('Subject line is weak or too generic. Make it specific and benefit-driven (e.g., "Your DevOps talk + platform role at TechCorp").');
            score -= 8;
        } else {
            strengths.push('Uses a specific, engaging subject line');
        }
    }

    // NEW: Check for value proposition
    const hasValueProp = /\b(opportunity|role|position|challenge|team|company|product|mission|impact|work on|build|scale)\b/i.test(submission);
    if (hasValueProp) {
        strengths.push('Mentions opportunity/value proposition');
    } else {
        feedback.push('Consider mentioning what makes this opportunity compelling (team, product, technical challenges, impact).');
        score -= 5;
    }

    // NEW: Check for respect of candidate's time
    const hasTimeRespect = /\b(15[- ]min|quick|brief|short|no pressure|no obligation|at your convenience|when.*time)\b/i.test(submission);
    if (hasTimeRespect) {
        strengths.push('Respects candidate\'s time (specific, brief ask)');
    }

    ensureFeedback(feedback);
    return {
        score: Math.max(0, score),
        checks,
        feedback,
        strengths,
    };
}

/**
 * Validates content for inclusive language and DEI best practices
 * Detects gendered language, age bias, ableist terms, and cultural bias
 */
export function validateInclusiveLanguage(submission: string): ValidationResult {
    const strengths: string[] = [];
    const feedback: string[] = [];
    let score = 100;

    // Bias detection categories with severity levels
    const biasCategories = {
        severe: {
            // Culture fit & homogeneity bias
            cultureFit: ['culture fit', 'cultural fit', 'good fit for our culture', 'fit our culture'],
            // Direct gendered pronouns in job descriptions
            genderedPronouns: [
                'he will', 'she will', 'he should', 'she should',
                'his responsibility', 'her responsibility',
                'he must', 'she must'
            ],
            // Age discrimination
            ageBias: [
                'young team', 'young and energetic', 'young dynamic team',
                'recent grad', 'recent graduate', 'digital native',
                'mature team', 'seasoned professional only'
            ]
        },
        moderate: {
            // Exclusionary jargon
            exclusionaryJargon: [
                'rockstar', 'rock star', 'ninja', 'guru', 'wizard', 'superhero',
                'coding rockstar', 'sales ninja', 'design guru'
            ],
            // Physical/ability bias (not job-related)
            abilityBias: [
                'must be able to stand', 'able to lift',
                'walk around', 'stand for long periods',
                'hearing required', 'vision required'
            ],
            // Masculine-coded words
            masculineCoded: [
                'aggressive', 'dominant', 'competitive', 'assertive',
                'ambitious', 'independent', 'self-reliant',
                'fearless', 'confident', 'strong'
            ],
            // Cultural assumptions
            culturalAssumptions: [
                'native english speaker', 'native speaker',
                'american born', 'local candidates only',
                'must have graduated from'
            ]
        },
        mild: {
            // Age-related assumptions
            ageAssumptions: [
                'energetic', 'fresh perspective', 'new ideas',
                'up-to-date with trends', 'tech-savvy'
            ],
            // Potentially gendered role titles
            genderedTitles: [
                'salesman', 'saleswoman', 'chairman', 'chairwoman',
                'policeman', 'policewoman', 'fireman'
            ]
        }
    };

    const checks: Record<string, boolean> = {
        hasCultureFitBias: false,
        hasGenderedLanguage: false,
        hasAgeBias: false,
        hasExclusionaryJargon: false,
        hasAbilityBias: false,
        hasMasculineCoded: false,
        hasCulturalBias: false
    };

    // Detect severe bias
    const foundSevere: Array<{category: string, term: string}> = [];

    biasCategories.severe.cultureFit.forEach(term => {
        if (new RegExp(term, 'i').test(submission)) {
            foundSevere.push({category: 'culture fit bias', term});
            checks.hasCultureFitBias = true;
        }
    });

    biasCategories.severe.genderedPronouns.forEach(term => {
        if (new RegExp(term, 'i').test(submission)) {
            foundSevere.push({category: 'gendered pronoun', term});
            checks.hasGenderedLanguage = true;
        }
    });

    biasCategories.severe.ageBias.forEach(term => {
        if (new RegExp(term, 'i').test(submission)) {
            foundSevere.push({category: 'age bias', term});
            checks.hasAgeBias = true;
        }
    });

    // Detect moderate bias
    const foundModerate: Array<{category: string, term: string}> = [];

    biasCategories.moderate.exclusionaryJargon.forEach(term => {
        if (new RegExp(`\\b${term}\\b`, 'i').test(submission)) {
            foundModerate.push({category: 'exclusionary jargon', term});
            checks.hasExclusionaryJargon = true;
        }
    });

    biasCategories.moderate.abilityBias.forEach(term => {
        if (new RegExp(term, 'i').test(submission)) {
            foundModerate.push({category: 'ability bias', term});
            checks.hasAbilityBias = true;
        }
    });

    biasCategories.moderate.masculineCoded.forEach(term => {
        if (new RegExp(`\\b${term}\\b`, 'i').test(submission)) {
            foundModerate.push({category: 'masculine-coded', term});
            checks.hasMasculineCoded = true;
        }
    });

    biasCategories.moderate.culturalAssumptions.forEach(term => {
        if (new RegExp(term, 'i').test(submission)) {
            foundModerate.push({category: 'cultural assumption', term});
            checks.hasCulturalBias = true;
        }
    });

    // Detect mild bias
    const foundMild: Array<{category: string, term: string}> = [];

    biasCategories.mild.ageAssumptions.forEach(term => {
        if (new RegExp(`\\b${term}\\b`, 'i').test(submission)) {
            foundMild.push({category: 'age assumption', term});
        }
    });

    biasCategories.mild.genderedTitles.forEach(term => {
        if (new RegExp(`\\b${term}\\b`, 'i').test(submission)) {
            foundMild.push({category: 'gendered title', term});
            checks.hasGenderedLanguage = true;
        }
    });

    // Calculate penalties and build feedback
    if (foundSevere.length > 0) {
        score -= 10 * foundSevere.length;

        const groupedSevere = foundSevere.reduce((acc, {category, term}) => {
            if (!acc[category]) acc[category] = [];
            acc[category].push(term);
            return acc;
        }, {} as Record<string, string[]>);

        Object.entries(groupedSevere).forEach(([category, terms]) => {
            const alternatives: Record<string, string> = {
                'culture fit bias': 'Use "culture add" or "values alignment" - focus on what unique perspectives they bring',
                'gendered pronoun': 'Use "they/them" or "the candidate will" - keep language gender-neutral',
                'age bias': 'Remove age-related terms - focus on skills and experience, not age or "energy"'
            };

            feedback.push(`🚫 SEVERE: ${category} detected: "${terms.join('", "')}". ${alternatives[category] || 'Remove this biased language.'}`);
        });
    }

    if (foundModerate.length > 0) {
        score -= 7 * foundModerate.length;

        const groupedModerate = foundModerate.reduce((acc, {category, term}) => {
            if (!acc[category]) acc[category] = [];
            acc[category].push(term);
            return acc;
        }, {} as Record<string, string[]>);

        Object.entries(groupedModerate).forEach(([category, terms]) => {
            const alternatives: Record<string, string> = {
                'exclusionary jargon': 'Use professional terms: "expert", "specialist", "senior engineer" instead of "rockstar/ninja/guru"',
                'ability bias': 'Only include physical requirements that are essential job functions with "reasonable accommodation available"',
                'masculine-coded': 'Balance with inclusive terms like "collaborative", "supportive", "analytical", "detail-oriented"',
                'cultural assumption': 'Remove nationality/origin requirements - focus on skills and work authorization'
            };

            feedback.push(`⚠️ MODERATE: ${category} detected: "${terms.join('", "')}". ${alternatives[category] || 'Use more inclusive language.'}`);
        });
    }

    if (foundMild.length > 0) {
        score -= 5 * foundMild.length;

        const groupedMild = foundMild.reduce((acc, {category, term}) => {
            if (!acc[category]) acc[category] = [];
            acc[category].push(term);
            return acc;
        }, {} as Record<string, string[]>);

        Object.entries(groupedMild).forEach(([category, terms]) => {
            const alternatives: Record<string, string> = {
                'age assumption': 'Avoid terms that imply age preferences - "energetic" and "tech-savvy" can signal age bias',
                'gendered title': 'Use gender-neutral titles: "salesperson", "chair", "firefighter", "police officer"'
            };

            feedback.push(`ℹ️ MILD: ${category} detected: "${terms.join('", "')}". ${alternatives[category] || 'Consider more inclusive alternatives.'}`);
        });
    }

    // Add strengths if no bias detected
    if (foundSevere.length === 0 && foundModerate.length === 0 && foundMild.length === 0) {
        strengths.push('Uses inclusive, bias-free language - accessible to diverse candidates');
    }

    // ENHANCED: Positive Accessibility & Inclusion Signals (2024-2025 Best Practices)
    // Not just detecting bias, but rewarding modern inclusive practices

    // 1. Remote Work Flexibility (Modern Best Practice - Post-COVID Standard)
    const remoteWorkSignals = [
        /\b(remote work|work from home|remote-first|remote.friendly|distributed team|location.independent)\b/i,
        /\b(flexible location|work from anywhere|hybrid.?work|remote.?option|fully remote)\b/i,
        /\b(home.?based|telecommute|virtual.?team|remote.?position)\b/i
    ];

    const hasRemoteWorkFlexibility = remoteWorkSignals.some(pattern => pattern.test(submission));
    if (hasRemoteWorkFlexibility) {
        score += 5; // Bonus for modern flexibility
        strengths.push('Mentions remote/flexible work options - expands accessibility and candidate pool');
        checks.hasRemoteWorkMention = true;
    }

    // 2. ADA Compliance & Reasonable Accommodation (Legal Best Practice)
    const adaComplianceSignals = [
        /\b(reasonable accommodation|accommodations? (available|provided|offered))\b/i,
        /\b(disability.friendly|accessibility.support|assistive technolog(y|ies))\b/i,
        /\b(accessible.workplace|ada.compliant|equal.opportunity.employer)\b/i,
        /\b(candidates? with disabilit(y|ies)|inclusive.workplace)\b/i
    ];

    const hasAdaCompliance = adaComplianceSignals.some(pattern => pattern.test(submission));
    if (hasAdaCompliance) {
        score += 8; // Strong bonus for legal compliance
        strengths.push('Includes ADA compliance/reasonable accommodation statement - demonstrates commitment to accessibility');
        checks.hasAdaCompliance = true;
    }

    // 3. General Diversity & Inclusion Statements
    const diversitySignals = [
        /\b(diverse|diversity|inclusion|inclusive|equitable)\b/i,
        /\b(all (backgrounds|qualified candidates)|underrepresented|marginalized)\b/i,
        /\b(equal opportunity|eeo|affirmative action)\b/i,
        /\b(we (welcome|encourage|value|celebrate) divers(e|ity))\b/i
    ];

    const hasDiversityStatement = diversitySignals.some(pattern => pattern.test(submission));
    if (hasDiversityStatement) {
        score += 3; // Moderate bonus
        strengths.push('Includes positive diversity/inclusion language');
        checks.hasDiversityStatement = true;
    }

    // 4. Gender-Neutral Language (Best Practice)
    const genderNeutralSignals = [
        /\b(they\/them|candidate will|applicant will|the.?person.?will)\b/i,
        /\b(their (responsibilities|role|task)|you will)\b/i
    ];

    const hasGenderNeutralLanguage = genderNeutralSignals.some(pattern => pattern.test(submission));
    if (hasGenderNeutralLanguage) {
        strengths.push('Uses gender-neutral pronouns (they/them) - inclusive of all identities');
        checks.hasGenderNeutralLanguage = true;
    }

    // 5. Flexible Work Benefits (Modern Inclusion)
    const flexibleBenefitsSignals = [
        /\b(flexible (hours|schedule|working|arrangements))\b/i,
        /\b(parental leave|family.friendly|caregiver.support)\b/i,
        /\b(mental health|wellness.program|health.benefits)\b/i,
        /\b(inclusive.benefits|comprehensive.benefits)\b/i
    ];

    const hasFlexibleBenefits = flexibleBenefitsSignals.some(pattern => pattern.test(submission));
    if (hasFlexibleBenefits) {
        score += 4; // Bonus for modern benefits
        strengths.push('Mentions flexible work arrangements/inclusive benefits - supports diverse needs');
        checks.hasFlexibleBenefits = true;
    }

    // 6. Skills-Based Hiring (Removes Barriers)
    const skillsBasedSignals = [
        /\b(skills.?based|competency.?based|experience.?or.?equivalent)\b/i,
        /\b(degree.?or.?equivalent|non.?traditional.background|alternative.pathway)\b/i,
        /\b(we.?value.?skills|focus.?on.?abilities|practical.?experience)\b/i
    ];

    const hasSkillsBasedApproach = skillsBasedSignals.some(pattern => pattern.test(submission));
    if (hasSkillsBasedApproach) {
        score += 3; // Bonus for removing credentialist barriers
        strengths.push('Uses skills-based hiring language - removes unnecessary credential barriers');
        checks.hasSkillsBasedApproach = true;
    }

    // Provide constructive feedback if accessibility signals are missing
    const totalAccessibilitySignals = [
        hasRemoteWorkFlexibility,
        hasAdaCompliance,
        hasDiversityStatement,
        hasFlexibleBenefits,
        hasSkillsBasedApproach
    ].filter(Boolean).length;

    // If job description has bias removed but no positive signals, suggest adding them
    if (foundSevere.length === 0 && foundModerate.length === 0 && totalAccessibilitySignals === 0) {
        feedback.push('✨ SUGGESTION: Add positive accessibility signals to strengthen your job description: remote work options, ADA compliance statement, diversity commitment, or flexible benefits.');
    }

    // Cap score at 100 (in case bonuses push it over)
    score = Math.min(100, score);

    ensureFeedback(feedback);
    return {
        score: Math.max(0, score),
        checks,
        feedback,
        strengths,
    };
}

export function validateGeneral(submission: string, config: ValidationConfig = {}): ValidationResult {
    const text = submission.trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    const sentenceCount = (text.match(/[.!?]/g) || []).length;

    const minWords = config.minWords ?? 25;
    const recommendedMinWords = config.recommendedMinWords ?? Math.max(45, (config.minWords ?? 0) + 5);
    const minSentences = config.minSentences ?? 2;
    const minChars = config.minChars ?? 0;

    const feedback: string[] = [];
    const strengths: string[] = [];
    let score = 100;

    if (minChars > 0 && text.length < minChars) {
        feedback.push(`Too short; add more detail (at least ${minChars} characters).`);
        score = Math.min(score, 30);
    }

    if (wordCount < minWords) {
        feedback.push(`Too short; aim for at least ${minWords} words so we can evaluate your reasoning.`);
        score = Math.min(score, 25);
    } else if (wordCount < recommendedMinWords) {
        feedback.push(`Add more depth (aim for ~${recommendedMinWords} words) to cover the key points.`);
        score -= 15;
    } else {
        strengths.push('Provides enough detail to evaluate reasoning');
    }

    if (sentenceCount < minSentences) {
        feedback.push(`Provide at least ${minSentences} sentences (e.g., set up the issue + your recommendation).`);
        score -= 20;
    } else {
        strengths.push('Structured response with clear sentences');
    }

    ensureFeedback(feedback);
    return {
        score: Math.max(0, score),
        checks: {
            lengthOK: wordCount >= minWords,
            hasStructure: sentenceCount >= minSentences,
            meetsCharFloor: minChars === 0 || text.length >= minChars,
        },
        feedback,
        strengths,
    };
}

export function validateCultureAddNote(submission: string): ValidationResult {
    const text = submission.trim();
    const wordCount = text ? text.split(/\s+/).length : 0;

    const checks: Record<string, boolean> = {
        hasEnoughDetail: wordCount >= 60,
        hasStructure: (text.match(/[.!?]/g) || []).length >= 2,
        callsOutRisk: /(danger|risk|bias|groupthink|homogen|exclusion)/i.test(text),
        explainsValue: /(value|benefit|strength|adds?\s+value|complement|diversity)/i.test(text),
        referencesCandidate: /(candidate|they|their|this person)/i.test(text),
    };

    const feedback: string[] = [];
    const strengths: string[] = [];
    let score = 100;

    if (!checks.hasEnoughDetail) {
        feedback.push('Too short; aim for ~60-150 words with a clear argument.');
        score -= 60;
    }
    if (!checks.hasStructure) {
        feedback.push('Provide at least two sentences (risk + value) instead of a fragment.');
        score -= 15;
    }
    if (!checks.callsOutRisk) {
        feedback.push('Call out why over-indexing on "culture fit" is risky (bias, groupthink, sameness).');
        score -= 25;
    }
    if (!checks.explainsValue) {
        feedback.push('Explain the specific value this candidate adds to the team (skills, balance, outcomes).');
        score -= 20;
    }
    if (!checks.referencesCandidate) {
        feedback.push('Refer directly to the candidate and their strengths, not just abstract ideas.');
        score -= 10;
    } else {
        strengths.push('References the candidate directly');
    }
    if (checks.callsOutRisk) strengths.push('Flags culture-fit risk (bias/groupthink)');
    if (checks.explainsValue) strengths.push("Explains the candidate's unique value");
    if (checks.hasStructure) strengths.push('Uses at least two sentences (risk + value)');

    ensureFeedback(feedback);
    return {
        score: Math.max(0, score),
        checks,
        feedback,
        strengths,
    };
}

/**
 * Validates AI system prompts/instructions
 * Checks for proper instruction format, not user requests
 */
export function validatePromptInstructions(
    submission: string,
    requirements: { mustMention?: string[]; mustNotBe?: 'userRequest' | 'question' } = {}
): ValidationResult {
    const text = submission.trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    const sentenceCount = (text.match(/[.!?]/g) || []).length;

    // Modern prompting pattern detection
    const modernPromptPatterns = {
        // Traditional instruction patterns
        traditional: /\b(you are|your (role|task|purpose|job) is|act as|behave as|instructions?:|rules?:|guidelines?:)/i,

        // Few-shot patterns (examples before task)
        fewShot: /\b(example\s*\d+:|### examples?|here are some examples|sample (input|output)|for instance:|e\.g\.|demonstration:)/i,

        // Chain-of-thought patterns (step-by-step reasoning)
        chainOfThought: /\b(step \d+:|first,|second,|then,|next,|finally,|let's (think|approach) (this )?step.by.step|think through|reasoning process|break (this |it )?down|walk through)/i,

        // Structured output formats
        structuredOutput: /\b(output format:|return (a |the )?(json|xml|yaml|markdown|csv)|format (the |your )?(response|output|result) as|structure (the |your )?(output|response)|generate (json|xml|markdown)|schema:|template:)/i,

        // Constraint-based prompting (rules without "You are...")
        constraintBased: /\b(constraints?:|limitations?:|must (include|contain|have|follow)|required (elements?|fields?|format)|do not|never (include|add|generate)|always (include|use|start with)|forbidden:|prohibited:)/i,

        // Role-play scenarios without explicit "You are"
        rolePlayImplicit: /\b(as (a |an |the )?(recruiter|sourcer|analyst|expert|professional|specialist|engineer)|from the perspective of|imagine you'?re|pretend to|scenario:|context:)/i,

        // XML/tag-based instructions (modern LLM pattern)
        xmlTagged: /<(instruction|system|role|task|example|constraint|rule|output)>/i,

        // Multi-step task definition
        multiStep: /\b(task \d+:|objective \d+:|phase \d+:|stage \d+:|\d+\)\s+\w+)/,
    };

    const checks: Record<string, boolean> = {
        hasEnoughDetail: wordCount >= 30,
        hasStructure: sentenceCount >= 2,

        // Modern instruction detection (any of the patterns)
        isInstruction: Object.values(modernPromptPatterns).some(pattern => pattern.test(text)),

        // Individual pattern checks
        usesTraditionalFormat: modernPromptPatterns.traditional.test(text),
        usesFewShot: modernPromptPatterns.fewShot.test(text),
        usesChainOfThought: modernPromptPatterns.chainOfThought.test(text),
        usesStructuredOutput: modernPromptPatterns.structuredOutput.test(text),
        usesConstraintBased: modernPromptPatterns.constraintBased.test(text),
        usesRolePlayImplicit: modernPromptPatterns.rolePlayImplicit.test(text),
        usesXmlTags: modernPromptPatterns.xmlTagged.test(text),
        usesMultiStep: modernPromptPatterns.multiStep.test(text),

        // Original checks
        hasConstraints: /\b(only|never|do not|don't|must not|avoid|always|should not|must (include|contain|have|follow)|required|forbidden|prohibited)\b/i.test(text),
        isUserRequest: /^(go |please |can you |create |make |write |generate |give me |show me |i want )/i.test(text),
        isQuestion: /^(how |what |why |when |where |who |which )/i.test(text),
    };

    const feedback: string[] = [];
    const strengths: string[] = [];
    let score = 100;

    // Critical: Check if it's a user request instead of instructions
    if (checks.isUserRequest) {
        feedback.push('This is a user request, not system instructions. Use directive language like "You are...", "Generate X following these rules:", or provide examples with constraints.');
        score -= 70; // Massive penalty for wrong format
    }

    if (checks.isQuestion) {
        feedback.push('This is a question, not instructions. Write directives that define how the AI should behave (instructions, examples, or constraints).');
        score -= 60;
    }

    // Recognize modern prompting patterns
    if (!checks.isInstruction && !checks.isUserRequest && !checks.isQuestion) {
        feedback.push('Doesn\'t read as system instructions. Use directive language: traditional format ("You are..."), few-shot examples, chain-of-thought steps, or structured constraints.');
        score -= 40;
    } else if (checks.isInstruction) {
        // Identify which modern pattern(s) are used
        const patternsUsed: string[] = [];

        if (checks.usesTraditionalFormat) {
            patternsUsed.push('traditional role definition');
        }
        if (checks.usesFewShot) {
            patternsUsed.push('few-shot examples');
            strengths.push('Uses few-shot learning pattern - provides examples to guide AI behavior');
        }
        if (checks.usesChainOfThought) {
            patternsUsed.push('chain-of-thought reasoning');
            strengths.push('Uses chain-of-thought prompting - guides step-by-step reasoning');
        }
        if (checks.usesStructuredOutput) {
            patternsUsed.push('structured output format');
            strengths.push('Specifies structured output format (JSON/XML/markdown)');
        }
        if (checks.usesConstraintBased) {
            patternsUsed.push('constraint-based instructions');
            strengths.push('Uses constraint-based prompting - defines clear rules and requirements');
        }
        if (checks.usesRolePlayImplicit) {
            patternsUsed.push('implicit role-play');
            strengths.push('Sets context/perspective without explicit "You are" format');
        }
        if (checks.usesXmlTags) {
            patternsUsed.push('XML-tagged sections');
            strengths.push('Uses XML tags to structure instructions - modern LLM best practice');
        }
        if (checks.usesMultiStep) {
            patternsUsed.push('multi-step task definition');
            strengths.push('Breaks down task into numbered steps/objectives');
        }

        if (patternsUsed.length === 1 && checks.usesTraditionalFormat) {
            strengths.push('Uses traditional instruction format (You are/Your role is)');
        } else if (patternsUsed.length > 1) {
            strengths.push(`Combines multiple prompting techniques: ${patternsUsed.join(', ')}`);
        }
    }

    if (!checks.hasConstraints) {
        feedback.push('Add clear constraints to control AI behavior: ONLY do X, NEVER do Y, MUST include Z, etc.');
        score -= 25;
    } else {
        strengths.push('Includes behavioral constraints (only/never/must/required)');
    }

    if (wordCount < 20) {
        feedback.push('Too short; system instructions need detail (aim for 30+ words with clear rules).');
        score -= 40;
    } else if (wordCount < 30) {
        feedback.push('Add more detail to define the AI\'s behavior clearly.');
        score -= 15;
    } else {
        strengths.push('Provides sufficient detail for instructions');
    }

    if (sentenceCount < 2) {
        feedback.push('Use multiple sentences to structure instructions (e.g., role + rules + output format, or multiple examples).');
        score -= 20;
    } else {
        strengths.push('Multi-sentence structure for clarity');
    }

    // Check for required mentions (e.g., "Boolean", "code block", etc.)
    if (requirements.mustMention) {
        const missing = requirements.mustMention.filter(
            term => !new RegExp(term, 'i').test(text)
        );
        if (missing.length > 0) {
            checks.mentionsRequired = false;
            feedback.push(`Missing key terms: ${missing.join(', ')}. Instructions should mention these explicitly.`);
            score -= 15 * missing.length;
        } else {
            checks.mentionsRequired = true;
            strengths.push(`Mentions required terms: ${requirements.mustMention.join(', ')}`);
        }
    }

    // Check for common instruction elements
    const hasRules = /\b(rules?|guidelines?|requirements?|constraints?):/i.test(text);
    const hasSteps = /\b(\d+\.|step \d+|first|second|then|next|finally)/i.test(text);
    const hasOutputFormat = /\b(output|format|return|response|generate|produce)\b/i.test(text);

    if (hasRules) {
        strengths.push('Includes explicit rules/constraints section');
    }

    if (hasSteps) {
        strengths.push('Uses numbered steps or sequence');
    }

    if (hasOutputFormat) {
        strengths.push('Specifies output format');
    }

    ensureFeedback(feedback);
    return {
        score: Math.max(0, score),
        checks,
        feedback,
        strengths,
    };
}

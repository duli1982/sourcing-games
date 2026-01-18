# Game Validation Audit

**Purpose:** Ensure all 52 games have appropriate semantic validation, not just length checks.

**Problem:** Games were using `validateGeneral()` which only checks word count and sentence count, allowing semantically incorrect answers to score too high.

**Example:** Game 50 gave 65/100 for "go and create me a boolean search..." (a user request) when it should score ~15/100 because the task asks for AI system instructions.

---

## Validation Types Available

### 1. `validateBooleanSearch` ✅
**Use for:** Boolean search strings, X-ray searches
**Checks:** AND/OR/NOT operators, parentheses, proximity, keywords, location
**Games using:** All `skillCategory: 'boolean'` and `skillCategory: 'xray'`

### 2. `validateOutreach` ✅
**Use for:** Candidate outreach messages, emails
**Checks:** Word count, subject line, personalization, CTA, avoids cliches
**Games using:** All `skillCategory: 'outreach'`

### 3. `validateCultureAddNote` ✅
**Use for:** Culture add vs culture fit arguments
**Checks:** Calls out risk, explains value, references candidate
**Games using:** Game 48 (Culture Add)

### 4. `validatePromptInstructions` ✅ NEW
**Use for:** AI system prompts, instructions, rules
**Checks:** Not a user request, not a question, has constraints, proper format
**Games using:** Game 50 (The Sourcing Bot)
**Config:**
```typescript
validation: {
    type: 'promptInstructions',
    mustMention: ['Boolean', 'string'], // Required keywords
}
```

### 5. `validateGeneral` ⚠️ DEFAULT FALLBACK
**Use for:** Generic text responses without specific structure
**Checks:** ONLY word count, sentence count, character count
**Problem:** Too permissive! Doesn't check semantic correctness
**Should be replaced with custom validators for most games**

---

## Games Requiring Audit

### ✅ VALIDATED CORRECTLY

| Game | Title | Validation | Status |
|------|-------|------------|--------|
| 1-25 | Boolean/X-ray games | `validateBooleanSearch` | ✅ Correct |
| 26-35 | Outreach games | `validateOutreach` | ✅ Correct |
| 48 | Culture Add | `validateCultureAddNote` | ✅ Correct |
| 50 | The Sourcing Bot | `validatePromptInstructions` | ✅ Fixed |

### ⚠️ NEEDS REVIEW (Using validateGeneral)

These games likely need custom validators:

| Game | Title | Current | Issue | Recommended Fix |
|------|-------|---------|-------|-----------------|
| **AI Prompting Games** |
| - | AI prompt games | `validateGeneral` | Doesn't check if it's instructions vs user requests | Add `validation: { type: 'promptInstructions', mustMention: [...] }` |
| **Screening/Analysis Games** |
| - | Resume screening | `validateGeneral` | Doesn't validate if criteria are listed | Create `validateScreeningCriteria` |
| **Strategy Games** |
| - | Sourcing strategy | `validateGeneral` | Doesn't check for multi-part structure | Create `validateStrategy` |
| **JD Writing Games** |
| - | Job description | `validateGeneral` | Doesn't validate JD elements | Create `validateJobDescription` |
| **Metrics Games** |
| - | Metrics tracking | `validateGeneral` | Doesn't check for metrics mentioned | Add `validation: { mustMention: ['metrics', 'KPIs'] }` |

---

## How to Audit a Game

### Step 1: Identify the Game's Intent

What is the game asking for?
- [ ] Boolean search string → Use `validateBooleanSearch`
- [ ] Outreach message → Use `validateOutreach`
- [ ] AI instructions/prompt → Use `validatePromptInstructions`
- [ ] Structured list (pros/cons, criteria) → Create custom validator
- [ ] Multi-part answer (Boolean + Platform + Outreach) → Create custom validator
- [ ] Generic explanation → `validateGeneral` is OK

### Step 2: Check Current Validation

```typescript
// Find in data/games.ts
{
    id: 'game##',
    // ...
    validation: { ... }, // Does this exist?
}
```

### Step 3: Test with Wrong Answer

Submit a semantically wrong but length-correct answer:
- User request instead of instructions
- Random text that meets word count
- Answer for a different question

**Expected:** Score should be < 30/100
**If score > 60/100:** Validation is too permissive!

### Step 4: Add Proper Validation

```typescript
// Example: AI Prompting game
validation: {
    type: 'promptInstructions',
    mustMention: ['Boolean', 'search'], // Required terms
}

// Example: Metrics game
validation: {
    minWords: 40,
    minSentences: 3,
    mustMention: ['Time to Fill', 'Quality of Hire'], // Specific metrics
}

// Example: Multi-part game
validation: {
    type: 'multiPart', // Would need to create this validator
    requiredSections: ['Boolean', 'Platform', 'Outreach'],
}
```

---

## Priority Games to Fix

### HIGH PRIORITY (Most Likely to Have Issues)

1. **Game 50** ✅ Fixed - AI prompting
2. **Game 51** ⚠️ Purple Squirrel - Multi-part strategy
3. **Any AI prompting games** - Need `validatePromptInstructions`
4. **Job description games** - Need custom validator
5. **Screening criteria games** - Need custom validator

### MEDIUM PRIORITY

6. **Metrics/KPI games** - Add `mustMention` requirements
7. **Strategy games** - Check for multi-part structure
8. **Analysis games** - Validate structured thinking

### LOW PRIORITY

9. **Generic explanation games** - `validateGeneral` might be OK if they don't require specific structure

---

## Action Items

- [ ] **Audit all 52 games** - Check which validator each uses
- [ ] **Create missing validators:**
  - [ ] `validateJobDescription` - For JD writing games
  - [ ] `validateScreeningCriteria` - For screening games
  - [ ] `validateStrategy` - For multi-part sourcing strategies
  - [ ] `validateMetrics` - For metrics/KPI games
- [ ] **Update game configurations** - Add proper `validation` field
- [ ] **Test each fix** - Submit wrong answers, ensure score < 30/100
- [ ] **Document validation logic** - Add comments explaining why each validator is used

---

## Testing Checklist

For each game after adding validation:

1. **Submit correct answer** → Score should be 80-100
2. **Submit vague answer** → Score should be 40-60
3. **Submit wrong format** → Score should be < 30
4. **Submit user request instead of instructions** → Score should be < 20
5. **Submit empty/minimal text** → Score should be < 25

---

## Notes

- **Default behavior:** If no `validation` field exists, games use `validateGeneral` (too permissive!)
- **Quick fix:** Add `validation: { minWords: X, minSentences: Y }` at minimum
- **Better fix:** Create semantic validators that check content structure
- **Best fix:** Custom validators for each content type with specific requirements

**Last Updated:** December 18, 2025
**Status:** Game 50 fixed, 51 games remaining to audit

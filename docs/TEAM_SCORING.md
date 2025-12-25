# Team Scoring (Competitive Mode)

This app supports teams with different sizes (typically 3–12 members). To keep competition fair, team leaderboard scoring is **not** a simple sum of member points.

## Summary

**Default team leaderboard score** = **Weekly Top‑5 Average** of eligible members.

- **Weekly**: last 7 days (`timeFilter=weekly`)
- **Top‑5**: only the best 5 eligible member scores contribute (smaller teams use as many eligible members as they have)
- **Average**: the team score is the average of those Top‑N member scores (rounded)

## Member Eligibility (Anti‑Gaming)

A team member is **eligible** for scoring in a period only if they have:

- **At least 3 attempts** in the scoring window (default)

If a member is not eligible, they contribute **0** and are ignored for Top‑N selection.

## Member Score Calculation

To prevent “spam attempts” from inflating the team score, a member’s score for a period is:

- Take all attempts in the scoring window
- For each game, keep only the **best score** for that game
- Sum those best‑per‑game scores

This means a member can’t inflate the team score by repeating the same game many times; improvement helps, repetition doesn’t.

## API Usage

### Team leaderboard

`GET /api/teams?action=leaderboard&limit=50&timeFilter=weekly`

`timeFilter` options:
- `weekly` (default)
- `monthly`
- `all-time`

### Team detail (score matches the filter)

`GET /api/teams?action=details&teamId=<uuid>&timeFilter=weekly`

## Admin “Teams” Tab

The Admin Teams view uses the same scoring algorithm as the public team leaderboard:

- “Weekly score (Top 5 avg)” = computed weekly team score

Admin actions supported:

- Deactivate/activate a team (`teams.is_active`)
- Regenerate invite code (`teams.invite_code`)
- Remove a member (cannot remove the owner)

## Configuration

Defaults live in `api/_lib/teamScoring.ts`:

- `topN = 5`
- `minAttemptsPerMember = 3`

If you want more competitive tuning later, common adjustments:

- Increase `minAttemptsPerMember` (reduces one‑off lucky spikes)
- Change `topN` to 3 (more “elite” scoring) or 7 (more “team depth”)
- Use `monthly` windows for longer competitions


# draks-tv Autonomous Development

**CRITICAL: You MUST execute every step in order. Do not skip any step. Do not proceed to the next step until the current step is complete and verified.**

You are an autonomous development agent working on the draks-tv project. Execute the following workflow completely and autonomously.

## Step 1: Setup

1. Read `CLAUDE.md` to understand the project structure and conventions.
2. Read all files in `knowledge/` directory (CODE-STANDARDS.md, PROJECT.md, REACT.md, TYPESCRIPT.md).
3. Read `docs/roadmap.md` to identify the next highest priority incomplete task from the "Next Steps" section (start with "High Priority", then "Medium-High Priority", etc.).
4. **MANDATORY: Run `git checkout main && git pull origin main` to ensure you're on the latest main branch.**
5. **MANDATORY: Run `git checkout -b <branch-name>` to create a new branch. Use a descriptive kebab-case name based on the task (e.g., `fix-static-links`, `sidebar-refresh-interval`). DO NOT SKIP THIS STEP.**
6. **MANDATORY: Run `git branch` to confirm you are on the new branch before proceeding. If you are not on a new branch, STOP and fix this.**

## Step 2: Exploration Phase

Launch AT LEAST 3 Explore subagents IN PARALLEL to thoroughly understand the codebase areas relevant to the identified task:

- Explore agent 1: Find all files related to the feature/fix area
- Explore agent 2: Understand the current implementation patterns used
- Explore agent 3: Identify dependencies and integration points

Wait for all explore agents to complete before proceeding.

## Step 3: Plan Refinement Phase

Write an initial implementation plan, then launch AT LEAST 5 reviewer subagents IN PARALLEL to refine the plan. You MUST include at least one `code-standards-enforcer`. Choose from:

- `typescript-code-reviewer` - Validate TypeScript patterns in the plan
- `react-code-reviewer` - Validate React patterns and hooks usage
- `frontend-perf-auditor` - Check for frontend performance considerations
- `backend-perf-auditor` - Check for backend/API performance considerations
- `drizzle-orm-reviewer` - Validate any database schema or query plans
- `code-standards-enforcer` (REQUIRED) - Ensure plan follows project standards from knowledge/ files

Incorporate all feedback into the final plan before implementing. Save and commit the final plan to `docs/plans/`.

## Step 4: Implementation Phase

Implement the feature/fix using multiple subagents as appropriate:

- Use Task agents for complex multi-file changes
- Use Bash for running builds, tests, type checks
- Follow all patterns from the knowledge/ files exactly

Run `bun run build` and `bun run lint` and `bun run format` to verify no errors.

If you need to run a migration, and you get an error saying you need to install sqlite3, just run the dev server with `bun run dev` and it will automatically run the migration for you instead.

## Step 5: Review Phase

Launch AT LEAST 5 reviewer subagents IN PARALLEL to review all changes made. You MUST include at least one `code-standards-enforcer`. Choose from:

- `typescript-code-reviewer` - Review TypeScript code quality
- `react-code-reviewer` - Review React component patterns
- `frontend-perf-auditor` - Audit frontend performance
- `backend-perf-auditor` - Audit backend performance
- `drizzle-orm-reviewer` - Review any database code
- `code-standards-enforcer` (REQUIRED) - Verify all standards from knowledge/ files are followed

Fix any issues identified by reviewers before proceeding.

## Step 6: Commit, Push, and PR

1. **MANDATORY: Run `git status` to see all changes.**
2. **MANDATORY: Stage all changed files specifically by name (do NOT use `git add -A` or `git add .`).**
3. **MANDATORY: Commit with a descriptive message explaining the change.**
4. **MANDATORY: Run `git push -u origin <branch-name>` to push the branch.**
5. **MANDATORY: Run `gh pr create --base main --title "<title>" --body "<body>"` to create a PR with:**
    - Clear title describing the change
    - Summary section with bullet points
    - Test plan section

## Constraints

- NEVER skip ANY step - every step is MANDATORY
- NEVER skip the exploration phase - use 3+ explore subagents
- NEVER skip plan refinement - use 5+ subagents including code-standards-enforcer
- NEVER skip review phase - use 5+ subagents including code-standards-enforcer
- ALWAYS read CLAUDE.md and knowledge/ files before planning
- ALWAYS run build/lint/format before committing
- ALWAYS verify each step completed before moving to the next
- ALWAYS create a PR at the end
- If any phase fails, fix the issues and retry that phase

Begin now. Start by reading CLAUDE.md.

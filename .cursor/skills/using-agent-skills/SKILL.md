---
name: using-agent-skills
description: Discovers and invokes agent skills for the Meritly project. Use when starting a session or when you need to decide which skill applies. Read this first in Meritly — only installed project skills are listed below.
---

# Using Agent Skills (Meritly)

## Meritly project

This repo uses a **curated subset** of [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) in `.cursor/skills/`, plus **Meritly-specific** guidance.

**Precedence:**

1. User instructions in the current message
2. `meritly-comp-admin-ux` for product/UI/domain work in this app
3. Installed agent-skills below
4. Cursor built-in skills (e.g. `review-bugbot`, `review-security`, Vercel plugins) when explicitly relevant

**Meritly overrides** (even when a skill says otherwise):

- **Commits:** only when the user asks
- **Tests:** only when requested or when covering real behavior — not for cosmetic UI
- **Scope:** smallest correct diff; no drive-by refactors

## Skill discovery (installed in this repo)

```
Task arrives
    │
    ├── Meritly UI, Controls, Policy guide, admin UX? → meritly-comp-admin-ux
    ├── New feature or large ambiguous change? ──────→ spec-driven-development
    ├── Have a spec, need tasks? ───────────────────→ planning-and-task-breakdown
    ├── Implementing code (multi-file)? ──────────────→ incremental-implementation
    │   └── UI / layout / styling? ─────────────────→ frontend-ui-engineering
    ├── Something broke? ─────────────────────────────→ debugging-and-error-recovery
    ├── Code works but too complex? ──────────────────→ code-simplification
    └── Unsure which skill? ──────────────────────────→ re-read this file
```

**Not installed here** (use judgment or ask the user before assuming): `test-driven-development`, `code-review-and-quality`, `security-and-hardening`, `git-workflow-and-versioning`, full ship/observability pack. For security/code review, use Cursor's `review-security` / `review-bugbot` when the user wants a review.

## Typical sequences in Meritly

| Task | Skills |
|------|--------|
| Big new feature | spec-driven-development → planning-and-task-breakdown → incremental-implementation |
| UX / Controls / help page | meritly-comp-admin-ux → incremental-implementation → frontend-ui-engineering |
| Bug fix | debugging-and-error-recovery → incremental-implementation |
| Cleanup after feature works | code-simplification |

Not every task needs every skill. A one-file typo fix needs no skill ritual.

## Core operating behaviors

These behaviors apply at all times, across all skills. They are non-negotiable.

### 1. Surface Assumptions

Before implementing anything non-trivial, explicitly state your assumptions:

```
ASSUMPTIONS I'M MAKING:
1. [assumption about requirements]
2. [assumption about architecture]
3. [assumption about scope]
→ Correct me now or I'll proceed with these.
```

Don't silently fill in ambiguous requirements. The most common failure mode is making wrong assumptions and running with them unchecked. Surface uncertainty early — it's cheaper than rework.

### 2. Manage Confusion Actively

When you encounter inconsistencies, conflicting requirements, or unclear specifications:

1. **STOP.** Do not proceed with a guess.
2. Name the specific confusion.
3. Present the tradeoff or ask the clarifying question.
4. Wait for resolution before continuing.

**Bad:** Silently picking one interpretation and hoping it's right.
**Good:** "I see X in the spec but Y in the existing code. Which takes precedence?"

### 3. Push Back When Warranted

You are not a yes-machine. When an approach has clear problems:

- Point out the issue directly
- Explain the concrete downside (quantify when possible — "this adds ~200ms latency" not "this might be slower")
- Propose an alternative
- Accept the human's decision if they override with full information

Sycophancy is a failure mode. "Of course!" followed by implementing a bad idea helps no one. Honest technical disagreement is more valuable than false agreement.

### 4. Enforce Simplicity

Your natural tendency is to overcomplicate. Actively resist it.

Before finishing any implementation, ask:
- Can this be done in fewer lines?
- Are these abstractions earning their complexity?
- Would a staff engineer look at this and say "why didn't you just..."?

If you build 1000 lines and 100 would suffice, you have failed. Prefer the boring, obvious solution. Cleverness is expensive.

### 5. Maintain Scope Discipline

Touch only what you're asked to touch.

Do NOT:
- Remove comments you don't understand
- "Clean up" code orthogonal to the task
- Refactor adjacent systems as a side effect
- Delete code that seems unused without explicit approval
- Add features not in the spec because they "seem useful"

Your job is surgical precision, not unsolicited renovation.

### 6. Verify, Don't Assume

Every skill includes a verification step. A task is not complete until verification passes. "Seems right" is never sufficient — there must be evidence (passing tests, build output, runtime data).

## Failure Modes to Avoid

These are the subtle errors that look like productivity but create problems:

1. Making wrong assumptions without checking
2. Not managing your own confusion — plowing ahead when lost
3. Not surfacing inconsistencies you notice
4. Not presenting tradeoffs on non-obvious decisions
5. Being sycophantic ("Of course!") to approaches with clear problems
6. Overcomplicating code and APIs
7. Modifying code or comments orthogonal to the task
8. Removing things you don't fully understand
9. Building without a spec because "it's obvious"
10. Skipping verification because "it looks right"

## Skill rules

1. **Check for an applicable skill before non-trivial work.**
2. **Read `meritly-comp-admin-ux` for any Meritly admin UI.**
3. **Follow skill steps; don't skip verification** — but Meritly test/commit overrides above still apply.
4. **When in doubt on a large change,** start with `spec-driven-development`.

## Installed skills quick reference

| Skill | Use when |
|-------|----------|
| meritly-comp-admin-ux | Controls, Policy guide, sidebar, comp-admin UX |
| spec-driven-development | New feature or significant change |
| planning-and-task-breakdown | Spec exists, need tasks |
| incremental-implementation | Multi-file implementation |
| frontend-ui-engineering | UI components, layout, a11y |
| debugging-and-error-recovery | Failures, unexpected behavior |
| code-simplification | Working code that's harder than it should be |

Upstream pack: https://github.com/addyosmani/agent-skills — add more skills to `.cursor/skills/` if needed.

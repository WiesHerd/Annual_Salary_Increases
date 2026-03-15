# I Built a Tool to Replace the Spreadsheet Nightmare of Annual Provider Compensation Reviews — Then Had AI Test It

If you've ever been involved in physician or provider compensation planning, you know the pain.

Every year, compensation administrators face the same brutal cycle: pull provider rosters from HR, market survey data from MGMA or SullivanCotter, evaluation scores from performance systems, payment history from payroll, productivity numbers from the billing system. Five, six, sometimes seven different data streams — all in different formats, different column names, different levels of granularity.

Then the real work begins: VLOOKUPs across files. Manual FTE normalization so you can compare a 0.3 FTE cardiologist to a full-time internist. Percentile interpolation against market benchmarks. Specialty name mismatches ("Int Med" vs. "Internal Medicine" vs. "Internal Med - General"). Experience band alignment. Budget guardrails. FMV risk checks. Governance flags.

All of this typically happens across a tangle of Excel workbooks that no one fully understands and everyone is afraid to break.

**I decided to build something better.**

---

## Meet Meritly

Meritly is a compensation planning tool purpose-built for annual provider salary increases. It runs entirely in the browser — no backend, no servers, no IT tickets to deploy. Upload your data, and it does the heavy lifting.

**What used to take weeks of spreadsheet wrangling now happens in minutes.**

Here's what it handles:

**Six data streams, unified automatically.** Provider rosters, market surveys (Physicians, APPs, Mental Health Therapists — with custom survey slots), performance evaluations, payment history, productivity metrics, and supplemental pay components (Division Chief pay, Medical Director pay, Teaching, PSQ, Quality Bonuses). The app auto-joins everything by Employee ID and specialty, with flexible column mapping that remembers your file layouts.

**FTE normalization, built in.** Part-time providers are automatically normalized to 1.0 FTE for apples-to-apples market comparisons. A 0.3 FTE cardiologist earning $135K gets compared correctly against the $450K median. The system even flags providers below 0.7 FTE where normalization becomes less reliable.

**Fuzzy specialty matching.** Upload a file where the specialty column says "Fam Med" and the market survey says "Family Medicine"? The app uses token-based fuzzy matching with confidence scores to map them automatically — and lets you review and override the matches.

**Percentile interpolation.** Drop in your market survey with 25th, 50th, 75th, and 90th percentile benchmarks for TCC and wRVU, and the engine interpolates where each provider falls. No more manual band calculations.

---

## The Policy Engine: Where It Gets Powerful

The heart of Meritly is a 5-stage compensation policy engine that replaces the impossible-to-audit Excel formulas most organizations rely on.

The pipeline runs in order:

1. **Exclusion Guardrails** — Hard stops. If a provider's TCC is at the 75th percentile or above, zero out their increase and flag for manual review.
2. **Custom Models** — YOE-tier models that assign base salaries or increase percentages by years of experience. A PCP with 0–4 years gets $175K, 4–8 gets $190K, 8+ gets $200K.
3. **Modifiers** — Adjustments like "+1% for wRVU above the 60th percentile."
4. **General Merit Matrix** — The default evaluation-score-to-increase table.
5. **Caps and Floors** — Final guardrails. No one goes above 4%. No one goes below 3%.

Each policy has targeting (by specialty, division, provider type, YOE range, TCC percentile range), conditions (JsonLogic-based rules), and configurable actions. There are 45+ built-in templates to start from.

The best part: a **live preview** that shows you exactly which providers are affected *before* you activate a policy, with Before/After comparisons.

---

## What Does This Look Like in Practice?

In the Salary Review screen, every provider gets a row showing their current compensation, proposed increases, market percentiles, policy source, and governance flags — all recalculated in real time as you adjust policies.

The **Policy view** shows which rule governs each provider's recommendation and why. A compensation administrator can see at a glance that Jordan Blake (Orthopedics, TCC at the 98th percentile) was caught by the 75th Percentile TCC Guardrail, while Casey Morgan (Family Medicine, TCC at the 48th percentile) was assigned the PCP Base Salary tier model.

No more hunting through spreadsheet formulas to figure out why someone got a particular number.

---

## Then I Had AI Test It

Here's where it gets interesting. I used **Cursor's Cloud Agent** to set up the development environment, install dependencies, start the app, and then systematically test the policy engine — end to end.

The AI agent:
- Installed all dependencies and started the development server
- Ran 103 unit tests (all passing)
- Built the production bundle successfully
- Navigated the live app in a browser
- Created three real policies through the UI (a 3% floor, a 4% cap, and a 75th percentile TCC guardrail)
- Verified the policies applied correctly in the Salary Review screen
- Opened individual provider detail panels to confirm policy attribution
- Recorded video walkthroughs of the entire flow

It found a missing dependency (`@dnd-kit` for drag-and-drop policy reordering) that wasn't in `package.json`, installed it, and confirmed the fix. It gave a thoughtful code review covering architecture, test coverage, accessibility, and performance. It even identified the interaction between the guardrail (zeroing out increases) and the floor policy (lifting them back to 3%) as a noteworthy pipeline behavior.

**An AI agent tested my compensation planning tool more thoroughly than most QA cycles I've seen.**

---

## The Numbers

- **~22,000 lines of TypeScript** across 131 source files
- **6 data streams** auto-joined and normalized
- **5-stage policy engine** with 17 action types and 8 conflict strategies
- **45+ policy templates** out of the box
- **103 unit tests** covering the calculation and policy evaluation core
- **Zero backend dependencies** — runs entirely in the browser with localStorage

---

## Why This Matters

Annual compensation reviews for providers are high-stakes. Get it wrong and you risk FMV violations, retention problems, or budget overruns. The traditional approach — spreadsheets, tribal knowledge, and prayer — doesn't scale.

Meritly takes the multiple streams of data that compensation teams already have, does the normalization and joining that eats up weeks of manual work, and layers on a transparent, auditable policy engine that everyone on the committee can understand.

The data is complex. The stakes are real. The process shouldn't be a nightmare.

---

*Built with React, TypeScript, and Vite. Tested by Cursor AI. No spreadsheets were harmed in the making of this tool.*

*#HealthcareCompensation #PhysicianCompensation #CompensationPlanning #FMV #HealthcareIT #React #TypeScript #AI #CursorAI #MedicalDirector #ProviderCompensation #AnnualSalaryReview #CompTech*

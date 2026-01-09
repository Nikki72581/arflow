---
name: CommissionFlow template
about: 'General template for commissionflow work '
title: ''
labels: ''
assignees: ''

---

---

## CommissionFlow Issue Template (Feature / Enhancement)

**Title:** `[Area] Verb + object + outcome`
Examples:

* `[Plans] Parse natural-language plan into draft ruleset`
* `[Imports] Support XLSX + weird header mapping with AI assist`
* `[Disputes] Allow salesperson to flag line item and message admin`

---

### 1) Why are we doing this?

**User problem:**
**Who is impacted:** (Admin / Salesperson / Finance / Ops)
**Pain today:**
**Business value:** (reduces disputes, faster onboarding, fewer manual edits, etc.)

---

### 2) User Story

As a **{role}**, I want to **{do thing}**, so that **{outcome}**.

---

### 3) Scope

## **In scope**

## **Out of scope (explicitly not now)**

---

### 4) Workflow / UX (CommissionFlow-style)

**Entry point:** (where in the app)
**Happy path steps:**
1.
2.
3.

**States to design/handle:**

* Empty state:
* Loading:
* Error:
* Permission denied:

---

### 5) Data + Rules (the stuff that always bites later)

**Entities touched:** (Plan, Rule, Credit, Deal, Statement, Dispute, Payout, User, Team)
**Fields needed/changed:**
--------------------------

**Rule logic notes:**

* (e.g., tiers, caps, accelerators, split credit, effective dates, retroactive changes)

**Edge cases / gotchas:**

* Backdated plan effective dates
* Multiple plans per rep / team overrides
* Currency + rounding rules
* Chargebacks / reversals
* Partial payments
* Split commissions

---

### 6) Permissions + Auditability (non-negotiable)

**Who can do what:**

* Admin:
* Manager:
* Salesperson:

**Audit requirements:**

* What events must be logged? (created/edited/approved/exported)
* Do we need a “reason for change” field?
* Do changes trigger recalculation?

---

### 7) Acceptance Criteria (write it like a contract)

* [ ] Given **{context}**, when **{action}**, then **{result}**.
* [ ] It works for roles: **{roles}** and blocks **{roles}**.
* [ ] System behavior for invalid inputs: **{message + no data loss}**.
* [ ] Audit log includes: **{events}**.
* [ ] No regression to: **{imports / calc / statements / exports}**.

---

### 8) Implementation Notes (optional but helpful)

**Suggested approach:**
**Components / routes:**
**API endpoints:**
**DB changes:**
**Background jobs needed:** (recalc, import processing, async validation)

---

### 9) Test Plan

* [ ] Unit tests for:
* [ ] Integration tests for:
* [ ] Manual QA steps:
* [ ] Test data needed: (sample plan, sample import file, sample disputes)

---

### 10) Dependencies / Blockers

* Depends on:
* Blocked by:

---

## CommissionFlow Issue Template (Bug)

**Title:** `[Bug][Area] What breaks + when`
Example: `[Bug][Statements] Tiered commission rounds incorrectly on partial payments`

---

### Severity

P0 (prod down) / P1 (major) / P2 (annoying) / P3 (paper cut)

---

### Environment

* App env: local / staging / prod
* Browser:
* Account/role:
* Build/commit (if known):

---

### Steps to Reproduce

1.
2.
3.

---

### Expected vs Actual

**Expected:**
**Actual:**

---

### Impact

* Who is affected:
* How often:
* Financial risk: yes/no (explain)
* Data integrity risk: yes/no (explain)

---

### Evidence

* Screenshot/video:
* Logs/error text:
* Example IDs: (Plan ID, Rep ID, Statement ID, Deal/Credit ID)

---

### Suspected Area (if you know)

* Module:
* Recent PRs:
* Related issues:

---

### Fix Acceptance Criteria

* [ ] Repro no longer occurs with same steps
* [ ] Regression tests added
* [ ] Audit/logging updated if relevant
* [ ] Data correction required? (yes/no, plan)

---

## Bonus: Commission Plan / Calculation-Specific Add-on Block

Drop this into any issue that touches calculations:

### Commission Calc Details

**Plan version/effective date:**
**Inputs:** (deals, revenue, margin, payments, splits)
**Output:** (commission amount, statement lines, payout)
**Rounding policy:** (per line vs per statement vs per payout)
**Recalc trigger:** (plan change, import, payment update, dispute resolution)

---

# LLM Usage

## Overview

Assistive tools were used selectively during development to support thinking, sanity-check decisions, and speed up low-value work. Core domain logic — including the day-count implementation, schedule generation, rate splitting, error handling, and test coverage — was designed, implemented, and validated manually.

The goal was to use external tools as a thinking partner, not as a source of truth.

---

## Where tools helped

**Architecture thinking**
- Pressure-tested the decision to keep the backend as the source of truth for schedule generation and pin the rate snapshot onto each loan.
- Explored trade-offs between SQL-level FK cascades and explicit child-first deletion on SQLite.
- Reviewed request-scoped DataLoader vs global caching approaches.

**Domain validation**
- Cross-checked 30E/360 ISDA edge cases, especially February maturity handling.
- Validated the additivity property when splitting accrual across rate changes.
- Reviewed rounding strategy (intermediate vs monetary).

**UX refinement**
- Improved form validation behavior and edge cases (e.g., date dependencies).
- Standardized loading / error / empty states across flows.

**Copy improvements**
- Refined UI text to be concise, clear, and product-oriented.
- Removed overly verbose or apologetic messaging.

---

## Representative interactions

The following are representative examples of how assistive tools were used during development.

---

### 1. Schedule Generation Design

**Prompt**  
Design a repayment schedule generator for bullet loans with monthly interest payments, 30E/360 accrual, and intra-period rate changes.

**Key response points**
- Split accrual periods at rate-change boundaries  
- Keep schedule generation in the backend  
- Model rate history separately from repayment entries  

**My decision**  
Adopted the period-splitting approach and backend ownership model.  
Did not rely on suggested rounding blindly — final behavior was validated through tests and manual checks.

**Why**  
Splitting periods ensures additivity and prevents hidden drift when rates change mid-period.  
Keeping logic in the backend guarantees a single deterministic source of truth across simulation and persistence.

---

### 2. Day Count Convention (30E/360)

**Prompt**  
Validate a 30E/360 ISDA implementation, especially around February maturity edge cases.

**Key response points**
- Treat February maturity as a special case  
- Be explicit about inclusive vs half-open intervals  
- Add regression tests for leap and non-leap scenarios  

**My decision**  
Used this to pressure-test the implementation and expanded the test suite accordingly.  
Final logic was verified independently.

**Why**  
30E/360 implementations often fail on boundary conditions.  
Explicit handling of February and interval semantics ensures correctness and prevents off-by-one errors in accrual.

---

### 3. Simulation vs Creation Consistency

**Prompt**  
How should a loan simulation feature be designed so the preview matches persisted loan creation?

**Key response points**
- Snapshot rate segments during simulation  
- Pass snapshot into creation flow  
- Ensure deterministic outputs  

**My decision**  
Implemented snapshot-based simulation and validated simulate → create parity via tests.

**Why**  
Using a snapshot guarantees reproducibility and prevents divergence if external rate data changes between simulation and creation.

---

### 4. UX / Product Decisions

**Prompt**  
Refine UX for loan creation, simulation, and data display without changing system architecture.

**Key response points**
- Improve clarity of user flows  
- Keep financial logic in backend  
- Simplify UI text and feedback  

**My decision**  
Applied selectively to UI polish and interaction improvements, without affecting core logic.

**Why**  
UX improvements should not compromise correctness or introduce duplicated logic.  
Keeping the frontend thin avoids inconsistencies between displayed and actual financial data.

---

## Notes

- Assistive tools were used for ideation and validation, not as a replacement for engineering judgment.  
- All financial logic and edge cases were implemented and tested independently.  
- Any generated suggestions were reviewed, adapted, and validated before being integrated.  
- The goal throughout was correctness, determinism, and clarity — not speed of implementation.
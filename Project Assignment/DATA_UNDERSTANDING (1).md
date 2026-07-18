# Understanding the Data

This guide explains, in everyday terms, **what data powers this dashboard, where it comes from, and
what it can and cannot tell us**. No statistics background needed. (A separate, more technical
field-by-field reference lives in `DATA_DICTIONARY.md`.)

---

## The big picture

The dashboard tells one story about **diabetes in the United States**, using two very different
datasets that look at the same problem from two distances:

| | What it looks at | One row = | Answers the question |
|---|---|---|---|
| **CDC survey** (the "map" view) | The whole country, state by state | One **state in one year** | *How common is diabetes, and where is it worst?* |
| **Hospital records** (the "patient" view) | Individual hospital stays | One **hospital visit** by a diabetic patient | *When a diabetic patient is admitted, what happens to them?* |

Think of it like Google Maps: the CDC data is the **zoomed-out country map** (which regions are
"hot"), and the hospital data is **street view** (what actually happens to one person). We show them
**side by side** — we never glue them together (more on that below).

---

## Dataset 1 — Hospital records (the "patient" view)

**Official name:** Diabetes 130-US Hospitals, 1999–2008 (from the UCI Machine Learning Repository).
**Size:** about **101,766 hospital visits** across 130 US hospitals over ten years.

**What one row is:** a single hospital stay for a patient who has diabetes. Each row records things
like:

- **Age** — given as a 10-year band (e.g. "60–70"), not an exact age.
- **How long they stayed** in hospital (days).
- **How many medications** they were given, and **how many lab tests** were run.
- **Whether their blood-sugar control was checked** (the "A1C" test) and the result.
- **What they were mainly treated for** (a diagnosis code, which we group into plain categories like
  *Circulatory*, *Respiratory*, *Diabetes*, *Digestive*, etc.).
- **How they left** (went home, transferred, etc.).
- **The key outcome — were they readmitted?** i.e. did they come back to hospital soon after leaving.
  We focus on **coming back within 30 days**, which hospitals treat as a warning sign of a stay that
  didn't fully solve the problem.

**A small "codebook" comes with it.** The hospital data actually arrives as **two files**: the big
table of visits (`diabetic_data.csv`), plus a little lookup file (`IDS_mapping.csv`) that translates
numeric codes into plain words. For example, it turns an "admission type" code into *Emergency* or
*Elective*, and a "discharge" code into *Went home*, *Transferred to a nursing facility*, or
*Hospice*. We use this lookup so the dashboard shows **readable labels instead of raw code numbers** —
and it's also how we spot the stays that ended in death or hospice (which can't be "readmitted").

**Why it matters:** this is the heart of the dashboard. It lets us ask *which kinds of patients are
most likely to bounce back to hospital*, and *which patients use the most time and medication* —
exactly the "high-risk groups" and "resource use" questions the project is graded on.

---

## Dataset 2 — CDC state survey (the "map" view)

**Official name:** CDC U.S. Diabetes Surveillance System — State Diabetes Indicators.
**Where the numbers come from:** a large ongoing **telephone health survey** of American adults, run
by the government (the CDC). Every year, tens of thousands of people are asked about their health,
and the results are turned into a percentage for each state.

**What one row is:** one **state in one year**, with the **estimated percentage of adults who have
been diagnosed with diabetes** (plus breakdowns by age, sex, race, and education).

**Why it matters:** the hospital dataset has **no location and no calendar dates**, so on its own it
can't show a map or a year-by-year trend. The CDC data fills exactly those gaps: it lets the
dashboard show **which states have the highest diabetes rates** and **how the rate has climbed over
time**.

---

## The golden rule: same time window, 1999–2008

The hospital data covers **1999 to 2008**. So we only ever use CDC data from that **same window**
(2000–2008, which is the overlap the CDC survey offers).

**Why we're strict about this:** it would be easy to grab newer CDC data (it runs up to 2024) to
"fill in" more years — but that would mean **comparing a 2008 patient to a 2020 state average**,
which is misleading. We also **never invent or estimate missing years** to make a line look smoother.
If a year isn't really in the data, we leave it out. Honest gaps beat fake numbers.

*(One small honest gap: the CDC survey starts in 2000, so the year 1999 exists only in the hospital
data. We simply don't show 1999 on the map — we don't guess it.)*

---

## How the two datasets relate — and why we do NOT merge them

They describe **different things**:

- The hospital data is about **individual people**, but has **no state** attached.
- The CDC data is about **state averages**, with **no individual people**.

There is no honest way to "join" a specific patient to a specific state — the link simply isn't in
the data. So we keep them as **two separate views connected by a shared theme (diabetes)**, not as
one merged table. The dashboard makes this obvious: every CDC chart is labelled with its source and
the years used, so no one mistakes a national estimate for a patient-level fact.

---

## What each dataset can and can't answer

| Question | Hospital data | CDC data |
|---|---|---|
| Which patients get readmitted? | ✅ Yes | ❌ No individuals |
| Which states have the most diabetes? | ❌ No location | ✅ Yes |
| Has diabetes risen over the years? | ❌ No dates | ✅ Yes (2000–2008) |
| How many meds/days does a stay involve? | ✅ Yes | ❌ No |
| The exact number of people with diabetes | ❌ (only diabetics, hospitalised) | ⚠️ An **estimate** from a survey |

---

## Honest limitations (worth knowing)

- **"Not measured" is not the same as "zero."** Many hospital rows have no A1C or glucose result —
  that means the test *wasn't done*, not that the value was zero. We label these "Not measured"
  rather than dropping or zero-filling them.
- **The same patient can appear more than once.** ~101,766 visits come from ~71,500 patients, so a
  few frequent patients repeat. We count *visits*, and flag this where it matters.
- **Some patients died or went to hospice.** Those stays can't be "readmitted," so we flag them and
  can exclude them from readmission analysis.
- **CDC numbers are survey estimates.** They come with a margin of error (a range), because they're
  based on a sample of people phoned, not a full count.
- **A few messy values** exist (e.g. a tiny number of "Unknown" genders); these are cleaned or
  labelled, never silently changed.

---

## Where the data came from (sources & permissions)

- **Hospital data:** UCI Machine Learning Repository, dataset #296 — free to use under a
  Creative Commons CC BY 4.0 licence (credit: Clore, Cios, DeShazo & Strack, 2014).
  - Page: https://archive.ics.uci.edu/dataset/296/diabetes+130-us+hospitals+for+years+1999-2008
  - Direct download (zip): https://archive.ics.uci.edu/static/public/296/diabetes+130-us+hospitals+for+years+1999-2008.zip
- **CDC data:** U.S. Diabetes Surveillance System — "State Burden/Magnitude Diabetes Indicators"
  (dataset `b559-sbez`), published by the CDC on `data.cdc.gov` — U.S. government public data, free to use.
  - Page: https://data.cdc.gov/U-S-Diabetes-Surveillance-System/USDSS-State-Burden-Magnitude-Diabetes-Indicators/b559-sbez
  - Direct download (CSV): https://data.cdc.gov/api/views/b559-sbez/rows.csv?accessType=DOWNLOAD

Both are **real, open, published datasets** — nothing here is made up or simulated.

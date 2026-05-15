# OpenAlex: Overview, Assessment, and Strategic Applications for COH Research Visibility

**Prepared for:** Oregon State University College of Health — Marketing & Communications  
**Date:** May 2026  
**Source URLs:** [openalex.org](https://openalex.org) · [developers.openalex.org](https://developers.openalex.org)

---

## What Is OpenAlex?

OpenAlex is a fully open catalog of the global research system — a free, machine-readable index of scholarly works, authors, institutions, funding sources, journals, and the connections between them. Named after the ancient Library of Alexandria, it functions as a massive knowledge graph: hundreds of millions of entities connected by billions of relationships.

As of 2025/2026, it indexes over **477 million scholarly works**, making it the largest connected repository of scholarship ever published.

---

## History and Origins

| Year | Event |
|------|-------|
| 2021 | Microsoft announces end-of-life for Microsoft Academic Graph (MAG), a widely used free scholarly database |
| Jan 2022 | OpenAlex launches as a direct MAG replacement, built by OurResearch (a Vancouver-based 501(c)3 nonprofit), incorporating MAG data plus new sources |
| 2022 | Foundational paper published: Priem, Piwowar & Orr, *OpenAlex: A fully-open index of scholarly works, authors, venues, institutions, and concepts* (arXiv:2205.01833) |
| Feb 2024 | French Ministry of Higher Education and Research announces financial support, recognizing OpenAlex as critical open science infrastructure |
| Mar 2024 | Arcadia Foundation awards a $7.5 million grant to OurResearch to establish OpenAlex as a sustainable open science platform |
| Dec 2023 | Sorbonne University publicly drops Clarivate Web of Science in favor of OpenAlex and open-source tools |
| Sep 2025 | OurResearch renames itself "OpenAlex" as a brand consolidation, folding in Unpaywall and Unsub |

**Founders:** Jason Priem and Heather Piwowar — known for creating Unpaywall (a legal open-access article finder now embedded in millions of library workflows) and ImpactStory.

---

## Legitimacy and Credibility

OpenAlex is not a scrappy startup — it has serious institutional standing:

- **Nonprofit governance.** Operated under a 501(c)3. Committed to the Principles of Open Scholarly Infrastructure (POSI), which require revenue from services rather than data, and mandate governance transparency.
- **CC0 license.** All data is public domain — no licensing barriers, no paywalls, fully reproducible.
- **Open source codebase.** Everything is on GitHub. The system is auditable.
- **$7.5M Arcadia Foundation grant (2024).** Major philanthropic validation of its long-term mission.
- **Peer-reviewed.** Multiple 2023–2025 bibliometric studies in *Scientometrics*, PLOS ONE, and PMC confirm OpenAlex's coverage and metadata quality are now comparable to Web of Science and Scopus for most use cases.
- **Adopted by governments and universities.** French Ministry of Research, Sorbonne University, and hundreds of institutions globally have integrated it into official research assessment workflows.

**Known limitations (be honest about these):**

- Metadata quality can be inconsistent, especially for older works, institutional affiliations, and non-Western publishers.
- Author disambiguation (distinguishing two researchers with similar names) is still improving.
- Some records lack abstracts.
- Less suitable for exhaustive systematic reviews in clinical disciplines where PubMed/MEDLINE precision is required.

---

## What OpenAlex Indexes (Entity Types)

| Entity | Description | Key Identifier |
|--------|-------------|----------------|
| **Works** | Journal articles, books, datasets, theses, preprints | DOI |
| **Authors** | Researchers, with publication and citation history | ORCID |
| **Institutions** | Universities, research orgs, hospitals | ROR ID |
| **Sources** | Journals, conferences, repositories | ISSN |
| **Topics** | Hierarchical subject classification | Internal + Wikidata |
| **Publishers** | Elsevier, Springer, etc. | Internal |
| **Funders** | NIH, NSF, Arcadia, etc. | Crossref Funder ID |

---

## Access and Pricing

| Tier | What You Get | Cost |
|------|-------------|------|
| Free API | $1/day of usage, free API key required | Free |
| Quarterly snapshot | Full CC0 database dump | Free |
| Premium | Higher API limits, monthly snapshots, daily change files, priority support | Paid (contact sales@openalex.org) |

The free tier is sufficient for the majority of institutional use cases including all applications described in this document.

**OSU's ROR ID:** `https://ror.org/00ysfqy60`  
Example API call scoped to OSU works:  
`https://api.openalex.org/works?filter=institutions.ror:https://ror.org/00ysfqy60&sort=cited_by_count:desc`

---

## Competitor Landscape

| Platform | Type | Cost | Coverage | Strengths | Weaknesses |
|----------|------|------|----------|-----------|------------|
| **OpenAlex** | Open nonprofit | Free | 477M+ works | Largest index, open API, CC0, ORCID/ROR integration | Metadata inconsistency, evolving quality |
| **Web of Science** (Clarivate) | Proprietary | Subscription ($$$$) | ~100M works | High precision, legacy authority, established h-index/IF metrics | Expensive, Western bias, closed data |
| **Scopus** (Elsevier) | Proprietary | Subscription ($$$) | ~90M works | Strong peer review, h-index, health/life sciences depth | Expensive, closed, narrower Global South coverage |
| **Dimensions** (Digital Science) | Freemium | Free basic / paid | ~140M works | Funder integration, grants data, Altmetric built-in | Some features paywalled, not fully open |
| **Semantic Scholar** (AI2) | Open nonprofit | Free | ~220M works | AI-powered relevance, strong CS/health coverage | Less comprehensive outside top-tier journals |
| **The Lens** | Open nonprofit | Free | ~230M works | Patent + scholarly integration, good open access | Smaller community, less known |
| **Google Scholar** | Proprietary (Google) | Free | Unquantified | Broad coverage, widely known | No API, no bulk data, no institution-level filtering |
| **PubMed/MEDLINE** (NLM) | Government open | Free | ~37M works | Gold standard for biomedical/clinical | Biomedical only, no citation graph |

**Bottom line:** OpenAlex is the strongest free, open, API-accessible alternative to Scopus and WoS. For COH's purposes — health sciences research, faculty visibility, public-facing outputs — it is the right tool at the right price.

---

## Highest-Impact Applications for COH Research Visibility

These are ranked by impact-to-effort ratio for a MarComm team without a dedicated developer.

---

### 1. Claim and Curate COH Faculty Author Profiles (Impact: High / Effort: Low)

Every COH faculty member likely has an OpenAlex author profile auto-generated from their publication history. Many are unclaimed, mis-attributed, or incomplete.

**What to do:**
- Have faculty visit [openalex.org](https://openalex.org) and search their own names.
- Verify their ORCID is linked (this is the key to accurate disambiguation).
- Submit corrections through OpenAlex's author curation tool if works are missing or mis-assigned.
- Add "View my publications on OpenAlex" links to Drupal faculty profile pages.

**Why it matters:** OpenAlex profiles are increasingly surfaced in Google Scholar-adjacent contexts and used by AI research assistants. A clean, complete profile means COH researchers show up when journalists, grant reviewers, or prospective students search for expertise.

---

### 2. Power Dynamic Publication Lists on Faculty Profile Pages (Impact: High / Effort: Medium)

Instead of asking faculty to manually update a static list of publications on their web profile — which never gets done — pull live data from the OpenAlex API.

**How it works:**
- Query OpenAlex for works by a faculty member's ORCID or OpenAlex author ID.
- Return the 10 most recent (or most-cited) works as a rendered list.
- Display title, journal, year, DOI link, and open-access status.

**Implementation path (no server needed):**
- A lightweight JavaScript fetch on the faculty profile Drupal node pulls the JSON from `api.openalex.org/works?filter=author.orcid:ORCID_HERE&sort=publication_date:desc`
- Or: Build a Drupal block/module that accepts an ORCID and renders the results.

**Why it matters:** Always-current publication lists improve SEO (fresh content signals), reduce faculty burden, and build credibility with visitors evaluating researcher expertise.

---

### 3. Build a COH Research Dashboard for Internal and External Use (Impact: High / Effort: Medium-High)

Using the OpenAlex API filtered to OSU's ROR ID — optionally cross-filtered to specific departments or topic clusters — build a public-facing research output dashboard.

**Possible metrics to display:**
- Total publications by year (trend line)
- Open access rate (what percentage of COH research is freely readable)
- Top research topics by publication count
- Most-cited COH works of the past 5 years
- Collaboration network map (co-authoring with other institutions)

**Why it matters:** This is the kind of data OSU Advancement, the Dean's office, and external media need for grant narratives, donor cultivation, and rankings submissions. A public-facing version signals research activity and scale to prospective faculty and students.

---

### 4. Add OpenAlex-Sourced Schema Markup to News Articles Featuring Research (Impact: Medium-High / Effort: Low-Medium)

When publishing a COH news story or press release about a faculty member's published research, pull the DOI-level metadata from OpenAlex and embed it in the page's JSON-LD.

**Additions to existing NewsArticle schema:**
```json
"about": {
  "@type": "ScholarlyArticle",
  "name": "Title of the underlying research",
  "url": "https://doi.org/...",
  "author": { "@type": "Person", "name": "Dr. Faculty Name" },
  "citation": "Journal Name, Year"
}
```

This connects your public-facing news content to the underlying scholarly record — improving Google's understanding of topic authority and the E-E-A-T signals on your domain.

---

### 5. Identify and Amplify COH's Highest-Impact Research for PR and Social (Impact: High / Effort: Low)

Query OpenAlex for OSU College of Health works filtered by `topic` and sorted by `cited_by_count`. This surfaces which COH publications are being cited most by other researchers globally — a proxy for impact that most newsrooms and science journalists recognize.

**Use case:** Quarterly "research spotlight" editorial calendar fed by citation data rather than gut feeling or whoever emails MarComm first. Pitch the most-cited work to science journalists with data to back it: "This 2023 study by COH faculty is among the top 1% most-cited health sciences works indexed in OpenAlex this year."

---

### 6. Track Open Access Status of COH Research (Impact: Medium / Effort: Low)

OpenAlex inherits Unpaywall data, meaning it flags every indexed work's open access status (gold, green, bronze, hybrid, closed). Filtering COH works by open access status gives you:

- A compelling talking point for fundraising ("X% of COH research is freely accessible to the public")
- A list of "closed" works where faculty could self-archive preprints in ScholarsArchive@OSU to improve discoverability
- Evidence for grant narratives requiring open access compliance (NIH mandates, etc.)

---

### 7. Surface Collaboration Networks for Partnership and Grant Storytelling (Impact: Medium / Effort: Medium)

The OpenAlex API includes co-authorship data. You can query which external institutions COH faculty most frequently co-publish with — mapping an actual collaboration network.

**Applications:**
- Identify existing relationships with peer institutions for partnership announcements
- Find COH researchers who frequently collaborate with industry (for tech transfer/development stories)
- Visualize interdisciplinary COH research for accreditation narratives

---

## If Not OpenAlex — What Should You Use?

Short answer: **for most COH MarComm goals, OpenAlex is the right tool.** But here's when to reach for something else:

| Goal | Better Tool |
|------|-------------|
| Deep clinical literature search (systematic review-level precision) | PubMed/MEDLINE — free, authoritative for health/medicine |
| Finding grant funding data alongside publications | Dimensions — free tier includes funder metadata |
| Tracking news and social media attention to research | Altmetric (often bundled with library subscriptions) |
| Author h-index for tenure/promotion dossiers | Scopus or WoS (OSU Libraries likely has access) — more defensible in formal review contexts |
| Patent landscape (inventions from research) | The Lens — integrates patents with scholarly works |
| Faculty ORCID management at scale | ORCID directly — OpenAlex reads from it but ORCID.org is the authoritative source |

**Recommended pairing:** OpenAlex (public-facing visibility, API-powered features, PR data) + PubMed (clinical precision, health sciences authority) + ORCID (faculty identifier hygiene). These three are all free and complement each other without overlap.

---

## Recommended First Steps for COH MarComm

1. **Audit the OSU/COH institution record in OpenAlex.** Search `https://openalex.org` for Oregon State University and review the institution page. Confirm the ROR ID (`https://ror.org/00ysfqy60`) is properly resolving and the work count looks reasonable.
2. **Survey faculty ORCID adoption.** Cross-reference the COH faculty directory against ORCID registrations. ORCID is the key that makes OpenAlex author data reliable. Faculty without ORCIDs should be encouraged to register — this is a one-time 10-minute task.
3. **Prototype a faculty publications widget.** Pick one faculty member with a clean ORCID and build a proof-of-concept API pull for their Drupal profile page. Share with Kathryn as a pilot.
4. **Establish a quarterly research impact report.** Create a repeatable OpenAlex query (by institution ROR + date range + sorted by citations) that feeds a brief internal report on COH research output. Use it to drive editorial decisions.
5. **Add OpenAlex author profile links to the faculty profile template.** A simple "View publications" link adds discoverability at near-zero effort.

---

## Key Resources

- OpenAlex web explorer: [openalex.org](https://openalex.org)
- API documentation: [developers.openalex.org](https://developers.openalex.org)
- Author curation guide: [developers.openalex.org/guides/curation-authors](https://developers.openalex.org/guides/curation-authors)
- OSU ORCID program: [library.oregonstate.edu/orcid](https://library.oregonstate.edu/orcid)
- ScholarsArchive@OSU (OSU's institutional repository): [ir.library.oregonstate.edu](https://ir.library.oregonstate.edu)
- Foundational paper: Priem et al. (2022), arXiv:2205.01833

---

*Prepared by COH MarComm · Oregon State University College of Health*

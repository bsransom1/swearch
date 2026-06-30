# Context Menu Testing Guide

Manual QA checklist for the Swearch extension in-page panel and context menu actions.

## Format-Specific Tests

### 1. ScienceDirect (Baseline)

- [ ] Panel positioning works near the selection
- [ ] Text extraction is clean (no extra whitespace or UI chrome)
- [ ] Paper metadata (title, URL) captured correctly
- [ ] All actions work: Summarize, Ask, Relevance, Add to Project, Extract Claims, Copy formatted

### 2. arXiv (Math-Heavy Papers)

- [ ] Select text with LaTeX math (e.g. `$\alpha = \beta^2$`)
  - Expected: Claude handles math notation gracefully in analysis
  - Verify: Summarize does not fail on math-heavy selections
- [ ] Select from abstract section
  - Expected: Paper title from `<meta name="citation_title">` or `<title>`, URL is arxiv.org
- [ ] Panel positioning on narrow arXiv layout
  - Expected: Panel stays readable and does not overflow the viewport

### 3. Blog Post (Medium, Substack, etc.)

- [ ] Select highlighted or styled text
  - Expected: Analysis treats it as regular prose
- [ ] Copy formatted includes correct article URL
  - Expected: Permalink URL, not homepage
- [ ] Extract claims from opinion piece
  - Expected: Assertions and arguments extracted (not only strict factual claims)

### 4. PDF in Browser (Embedded PDF.js Viewer)

- [ ] Text selection in PDF
  - Expected: Selection captured when PDF.js renders selectable text
  - Verify: Panel appears near the selection
- [ ] Paper title extraction
  - Expected: Falls back to `document.title` or filename when metadata is missing
- [ ] Add to project
  - Expected: `paper_url` is the PDF URL (DOI optional)

### 5. Paywalled Preview (ScienceDirect Abstract-Only)

- [ ] Select from abstract or preview snippet
  - Expected: All actions work on limited text
  - Verify: Claude does not error on incomplete context
- [ ] Copy formatted
  - Expected: Source URL and page title reflect the preview page

## Cache Tests

- [ ] Summarize the same selection twice within 2 hours
  - Expected: Second run shows "Previously analyzed — showing cached result" with no Claude call
- [ ] Summarize, Add to project, then Summarize again on same text
  - Expected: Cache hit after save (highlight row exists in DB)
- [ ] Wait 2+ hours (or adjust TTL in dev) and Summarize again
  - Expected: Fresh analysis

## Copy Button Tests

- [ ] Summarize — Copy includes quote, summary, and key sections
- [ ] Ask — Copy Q&A after at least one exchange
- [ ] Relevance — Copy includes relevance statement
- [ ] Extract Claims — per-claim Copy and Copy all work; "Copied ✓" feedback appears

## Extract Claims Tests

- [ ] Argumentative passage returns 2–5 claims
- [ ] Descriptive-only passage shows fallback with alternative suggestions
- [ ] Empty API response shows `NoClaimsFoundFallback` (not a blank panel)

## Regression Tests (After Each Update)

- [ ] Recent Highlights in popup still work
- [ ] Adding highlight from panel updates popup
- [ ] Project switching updates context menu titles
- [ ] Google Docs export from popup still works
- [ ] Auth sync between web app and extension still works

## Known Limitations

- Panel injection targets the main frame only (`frameIds: [0]`)
- Selections longer than ~6000 characters are truncated
- Some journal sites with aggressive CSS may affect panel appearance (functionality should still work)
- "Summarize instead" from the no-claims fallback is not yet wired (view switching TODO)

## Report Template

For each format tested:

| Field | Value |
|-------|-------|
| Format | e.g. arXiv |
| Result | Pass / Fail |
| Actions tested | Summarize, Ask, … |
| Issues | Description |
| Screenshot | Optional |
| Suggestions | Optional |

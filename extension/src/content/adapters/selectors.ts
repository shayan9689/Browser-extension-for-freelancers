/**
 * Resilient selectors for job pages.
 * Prefer semantic structure, headings, aria-labels, and data-* attributes.
 * Avoid hashed / auto-generated class names.
 */

export const fiverrSelectors = {
  /** Primary job title heading on buyer request / job detail pages */
  title: [
    'h1[data-testid="job-title"]',
    '[data-testid="buyer-request-title"]',
    'article h1',
    'main h1',
    'h1',
  ],
  /** Full job description body */
  description: [
    '[data-testid="job-description"]',
    '[data-testid="buyer-request-description"]',
    '[aria-label="Job description"]',
    'article [data-section="description"]',
    'main article',
  ],
  /** Budget / price range text */
  budget: [
    '[data-testid="job-budget"]',
    '[data-testid="buyer-request-budget"]',
    '[aria-label="Budget"]',
  ],
  /** Skill chips / tags */
  skills: [
    '[data-testid="job-skills"] [data-testid="skill-tag"]',
    '[data-testid="skill-tag"]',
    '[aria-label="Skills"] li',
  ],
  /** Marker that this is a job/request page */
  jobPageMarker: [
    '[data-testid="job-description"]',
    '[data-testid="buyer-request-description"]',
    '[data-page="buyer-request"]',
  ],
} as const;

/**
 * Upwork's newer job viewer, used by the "Best matches" slider (drawer) and
 * job pages. Always query inside the viewer: the feed behind the slider has
 * its own [data-test="job-title"] tiles.
 */
export const upworkViewerSelectors = {
  /** Open slider first, then a full-page viewer */
  root: [
    '[data-test="drawer"] [data-test="job-details-viewer"]',
    '[data-test="job-details-viewer"]',
  ],
  title: ['[data-test="job-header"] [data-test="job-title"]', 'header h3'],
  /** Description text (the container also holds the "More" toggle) */
  description: [
    '[data-test="job-description-content"] .job-description-content',
    '[data-test="job-description-content"] .fluid-line-clamp-content',
    '[data-test="job-description-content"]',
  ],
  /** Metric tiles (workload, duration, experience, budget…) */
  metrics: '[data-test^="job-metrics-"]:not([data-test="job-metrics-grid"])',
  experience: ['[data-test="job-metrics-experience"] span'],
  skills: ['[data-test="skill"] [data-test="tag"]', '[data-test="skill"]'],
} as const;

export const upworkSelectors = {
  title: [
    /** 2026 job details card: <h4><span class="flex-1">Title</span><button/></h4> */
    '.job-details-card h4 span.flex-1',
    '.job-details-content h4 span',
    '.job-details-content h4',
    'h1[data-test="job-title"]',
    'h1[data-testid="job-title"]',
    '[data-test="JobTitle"]',
    'h1.job-title',
    'main h1',
    'h1',
  ],
  description: [
    /** Paragraphs only: the container also holds a "Summary" label */
    '[data-test="Description"] p',
    '[data-test="Description"]',
    '[data-testid="job-description"]',
    '[data-test="JobDescription"]',
    'section[aria-label="Job description"]',
    'main article',
  ],
  budget: [
    '[data-test="BudgetAmount"]',
    '[data-testid="job-budget"]',
    '[data-test="budget"]',
    '[aria-label="Budget"]',
  ],
  /** Job facts list (hours, duration, level, rate); the budget item contains "$" */
  features: ['ul.features > li'],
  skills: [
    /** "Skills and Expertise" badges */
    '.skills-list .air3-badge',
    '.skills-list a',
    '[data-test="Skill"]',
    '[data-testid="skill-chip"]',
    '[data-test="TokenClone"]',
  ],
  experience: [
    'ul.features li:has([data-cy="expertise"]) strong',
    '[data-test="ExperienceLevel"]',
    '[data-testid="experience-level"]',
  ],
  jobPageMarker: [
    '[data-test="job-details-viewer"]',
    '[data-test="Description"]',
    '[data-testid="job-description"]',
    '[data-test="JobTitle"]',
  ],
} as const;

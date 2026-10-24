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

export const upworkSelectors = {
  title: [
    'h1[data-test="job-title"]',
    'h1[data-testid="job-title"]',
    '[data-test="JobTitle"]',
    'h1.job-title',
    'main h1',
    'h1',
  ],
  description: [
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
  skills: [
    '[data-test="Skill"]',
    '[data-testid="skill-chip"]',
    '[data-test="TokenClone"]',
  ],
  experience: [
    '[data-test="ExperienceLevel"]',
    '[data-testid="experience-level"]',
  ],
  jobPageMarker: [
    '[data-test="Description"]',
    '[data-testid="job-description"]',
    '[data-test="JobTitle"]',
  ],
} as const;

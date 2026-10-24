export type Platform = 'fiverr' | 'upwork' | 'generic';

export type JobPost = {
  platform: Platform;
  url: string;
  title: string;
  description: string;
  budgetText?: string;
  skills: string[];
  experienceLevel?: string;
  extractedAt: string;
  truncated: boolean;
};

export type ExtractErrorCode =
  | 'NOT_A_JOB_PAGE'
  | 'EXTRACTION_FAILED'
  | 'EMPTY_SELECTION';

export type ExtractError = {
  code: ExtractErrorCode;
  message: string;
};

export type JobPostResult = JobPost | ExtractError;

export function isJobPost(value: JobPostResult): value is JobPost {
  return 'title' in value && 'description' in value && 'platform' in value;
}

export function isExtractError(value: JobPostResult): value is ExtractError {
  return 'code' in value && 'message' in value && !('title' in value);
}

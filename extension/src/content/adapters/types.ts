import type { ExtractError, JobPost } from '../../shared/types';

export type Adapter = {
  name: string;
  canHandle: (url: string) => boolean;
  extract: (document: Document, url: string) => JobPost | ExtractError;
};

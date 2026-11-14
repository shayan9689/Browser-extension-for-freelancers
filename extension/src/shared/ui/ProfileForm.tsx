import {
  DEFAULT_RATES,
  EXPERIENCE_LEVELS,
  LEVEL_LABEL,
  MIN_HIGHLIGHTS,
  MIN_SKILLS,
  type ExperienceLevel,
  type ProfileRecord,
} from '../storage';
import { ChipInput, Field, ListInput, Segment } from './form';

export type ProfileSection = 'identity' | 'skills' | 'rate' | 'style';
export type ProfileErrors = Partial<Record<string, string>>;

/** Niche presets: a starting label, headline example and skill suggestions. */
export const NICHES = [
  {
    label: 'Web development',
    headline: 'Full-stack web developer (React, Node.js)',
    skills: [
      'React',
      'Next.js',
      'Node.js',
      'TypeScript',
      'JavaScript',
      'Python',
      'Laravel',
      'REST APIs',
      'PostgreSQL',
      'Tailwind CSS',
    ],
  },
  {
    label: 'WordPress & Shopify',
    headline: 'WordPress and Shopify store developer',
    skills: [
      'WordPress',
      'Elementor',
      'WooCommerce',
      'Shopify',
      'Liquid',
      'PHP',
      'Speed optimization',
      'SEO setup',
    ],
  },
  {
    label: 'Mobile apps',
    headline: 'Mobile app developer (Flutter, React Native)',
    skills: [
      'Flutter',
      'Dart',
      'React Native',
      'Firebase',
      'Kotlin',
      'Swift',
      'App Store publishing',
    ],
  },
  {
    label: 'UI/UX & graphic design',
    headline: 'UI/UX and brand designer',
    skills: [
      'Figma',
      'UI design',
      'UX research',
      'Logo design',
      'Brand identity',
      'Adobe Illustrator',
      'Photoshop',
      'Webflow',
    ],
  },
  {
    label: 'Data & automation',
    headline: 'Python data and automation specialist',
    skills: [
      'Python',
      'pandas',
      'Web scraping',
      'Excel',
      'Google Sheets',
      'Power BI',
      'SQL',
      'Zapier',
    ],
  },
  {
    label: 'AI & chatbots',
    headline: 'AI developer building chatbots and LLM apps',
    skills: [
      'Python',
      'OpenAI API',
      'LangChain',
      'RAG',
      'Prompt engineering',
      'FastAPI',
      'Vector databases',
    ],
  },
  {
    label: 'Writing & content',
    headline: 'Content writer and copywriter',
    skills: [
      'Blog writing',
      'Copywriting',
      'SEO writing',
      'Technical writing',
      'Proofreading',
      'Product descriptions',
    ],
  },
  {
    label: 'Video & marketing',
    headline: 'Video editor and social media marketer',
    skills: [
      'Video editing',
      'Premiere Pro',
      'After Effects',
      'CapCut',
      'Social media marketing',
      'Meta Ads',
      'Canva',
    ],
  },
] as const;

export function nicheFor(label: string) {
  return NICHES.find((n) => n.label.toLowerCase() === label.trim().toLowerCase());
}

const LEVEL_HINT: Record<ExperienceLevel, string> = {
  entry: 'Under 2 years, building reviews',
  intermediate: '2-5 years, solid portfolio',
  expert: '5+ years, proven results',
};

/** Field errors for one section (or all sections). */
export function validateProfile(
  p: ProfileRecord,
  sections: ProfileSection[] = ['identity', 'skills', 'rate', 'style'],
): ProfileErrors {
  const e: ProfileErrors = {};
  if (sections.includes('identity')) {
    if (!p.label.trim()) e.label = 'Give this profile a name, e.g. "Web development"';
    if (!p.name.trim()) e.name = 'Your name is required';
    if (!p.headline.trim()) e.headline = 'Add a one-line headline';
  }
  if (sections.includes('skills')) {
    if (p.skills.length < MIN_SKILLS) e.skills = `Add at least ${MIN_SKILLS} skills`;
    if (p.highlights.length < MIN_HIGHLIGHTS)
      e.highlights = 'Add at least one real achievement or project';
  }
  if (sections.includes('rate')) {
    if (!p.hourlyRate || p.hourlyRate <= 0) e.hourlyRate = 'Set your hourly rate';
    if (p.yearsExperience < 0 || p.yearsExperience > 60) e.yearsExperience = '0-60 years';
    if (!/^[A-Z]{3}$/.test(p.currency)) e.currency = '3-letter code, e.g. USD';
  }
  return e;
}

type Props = {
  value: ProfileRecord;
  errors: ProfileErrors;
  onChange: (next: ProfileRecord) => void;
};

export function IdentitySection({ value, errors, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Profile name (your niche)"
        required
        error={errors.label}
        hint="Make one profile per niche, e.g. Web development, WordPress, Design."
      >
        {(id) => (
          <>
            <input
              id={id}
              className="pp-input"
              value={value.label}
              placeholder="Web development"
              maxLength={60}
              onChange={(e) => onChange({ ...value, label: e.target.value })}
            />
            <div className="flex flex-wrap gap-1.5">
              {NICHES.map((n) => (
                <button
                  key={n.label}
                  type="button"
                  className="pp-chip pp-chip-btn"
                  aria-pressed={value.label === n.label}
                  data-active={value.label === n.label || undefined}
                  onClick={() => onChange({ ...value, label: n.label })}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </>
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={errors.name}>
          {(id) => (
            <input
              id={id}
              className="pp-input"
              value={value.name}
              placeholder="Ayesha Khan"
              autoComplete="name"
              onChange={(e) => onChange({ ...value, name: e.target.value })}
            />
          )}
        </Field>
        <Field label="Headline" required error={errors.headline}>
          {(id) => (
            <input
              id={id}
              className="pp-input"
              value={value.headline}
              placeholder={nicheFor(value.label)?.headline ?? 'Full-stack web developer'}
              onChange={(e) => onChange({ ...value, headline: e.target.value })}
            />
          )}
        </Field>
      </div>
    </div>
  );
}

export function SkillsSection({ value, errors, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <Field
        label={`Skills · ${value.skills.length}/30`}
        required
        error={errors.skills}
        hint={`At least ${MIN_SKILLS}. Drafts only mention skills listed here.`}
      >
        {(id) => (
          <ChipInput
            id={id}
            values={value.skills}
            max={30}
            placeholder="Type a skill and press Enter"
            suggestions={[...(nicheFor(value.label)?.skills ?? [])]}
            onChange={(skills) => onChange({ ...value, skills })}
          />
        )}
      </Field>
      <Field
        label={`Achievements · ${value.highlights.length}/5`}
        required
        error={errors.highlights}
        hint="Real, specific results. These are the proof in every draft, so never exaggerate."
      >
        {(id) => (
          <ListInput
            id={id}
            values={value.highlights}
            max={5}
            placeholder="e.g. Built a booking website for a clinic in 10 days"
            onChange={(highlights) => onChange({ ...value, highlights })}
          />
        )}
      </Field>
    </div>
  );
}

export function RateSection({ value, errors, onChange }: Props) {
  const setLevel = (level: ExperienceLevel) => {
    // Move the rate along with the level unless the user typed their own.
    const usingDefault =
      value.hourlyRate === null ||
      value.hourlyRate === DEFAULT_RATES[value.experienceLevel];
    onChange({
      ...value,
      experienceLevel: level,
      hourlyRate: usingDefault ? DEFAULT_RATES[level] : value.hourlyRate,
    });
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="pp-label">Experience level</span>
        <div
          className="grid gap-2 sm:grid-cols-3"
          role="radiogroup"
          aria-label="Experience level"
        >
          {EXPERIENCE_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={value.experienceLevel === level}
              className="pp-option"
              onClick={() => setLevel(level)}
            >
              <span className="text-sm font-semibold">{LEVEL_LABEL[level]}</span>
              <span className="pp-muted text-[11px]">{LEVEL_HINT[level]}</span>
              <span className="pp-faint text-[11px]">~${DEFAULT_RATES[level]}/hr</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Years" error={errors.yearsExperience}>
          {(id) => (
            <input
              id={id}
              type="number"
              min={0}
              max={60}
              className="pp-input"
              value={value.yearsExperience}
              onChange={(e) =>
                onChange({
                  ...value,
                  yearsExperience: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
          )}
        </Field>
        <Field label="Hourly rate" required error={errors.hourlyRate}>
          {(id) => (
            <input
              id={id}
              type="number"
              min={1}
              className="pp-input"
              value={value.hourlyRate ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  hourlyRate: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          )}
        </Field>
        <Field label="Currency" error={errors.currency}>
          {(id) => (
            <input
              id={id}
              className="pp-input uppercase"
              value={value.currency}
              maxLength={3}
              onChange={(e) =>
                onChange({ ...value, currency: e.target.value.toUpperCase() })
              }
            />
          )}
        </Field>
      </div>
      <Field
        label="Availability (optional)"
        hint='Used to answer "How soon can you start?". Leave empty if it changes often.'
      >
        {(id) => (
          <input
            id={id}
            className="pp-input"
            value={value.availability ?? ''}
            placeholder="e.g. Can start this week, about 30 hours a week"
            maxLength={200}
            onChange={(e) => onChange({ ...value, availability: e.target.value })}
          />
        )}
      </Field>
      <p className="pp-notice pp-notice-info text-xs leading-relaxed">
        Prices are estimated as working hours x your rate, and delivery as a competitive
        marketplace turnaround. Defaults follow typical rates for Pakistani freelancers;
        change them to your own.
      </p>
    </div>
  );
}

export function StyleSection({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="pp-label">Default tone</span>
        <Segment
          label="Default tone"
          value={value.defaultTone}
          options={['friendly', 'professional', 'concise'] as const}
          onChange={(defaultTone) => onChange({ ...value, defaultTone })}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="pp-label">Default length</span>
        <Segment
          label="Default length"
          value={value.defaultLength}
          options={['short', 'medium'] as const}
          onChange={(defaultLength) => onChange({ ...value, defaultLength })}
        />
      </div>
      <Field label="Sign-off (optional)" hint="Added at the end of every draft.">
        {(id) => (
          <input
            id={id}
            className="pp-input"
            value={value.signOff ?? ''}
            placeholder="Best regards, Ayesha"
            maxLength={200}
            onChange={(e) => onChange({ ...value, signOff: e.target.value })}
          />
        )}
      </Field>
    </div>
  );
}

export function ProfileForm(props: Props) {
  return (
    <div className="flex flex-col gap-6">
      <IdentitySection {...props} />
      <div className="pp-divider" />
      <SkillsSection {...props} />
      <div className="pp-divider" />
      <RateSection {...props} />
      <div className="pp-divider" />
      <StyleSection {...props} />
    </div>
  );
}

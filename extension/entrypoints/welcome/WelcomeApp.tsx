import { useEffect, useState, type ReactNode } from 'react';
import {
  loadStore,
  newProfileRecord,
  profileCompleteness,
  profileIsReady,
  upsertProfile,
  type ProfileRecord,
} from '../../src/shared/storage';
import { currentUser, syncNow } from '../../src/shared/cloud';
import { GoogleButton, signInAndSync } from '../../src/shared/ui/AccountCard';
import { Meter } from '../../src/shared/ui/form';
import {
  IdentitySection,
  RateSection,
  SkillsSection,
  StyleSection,
  validateProfile,
  type ProfileErrors,
  type ProfileSection,
} from '../../src/shared/ui/ProfileForm';
import {
  IconArrowLeft,
  IconArrowRight,
  IconBriefcase,
  IconCheck,
  IconClock,
  IconCursor,
  IconLayers,
  IconLogo,
  IconPin,
  IconSettings,
  IconShield,
  IconSparkles,
  IconTag,
  IconUser,
  IconZap,
} from '../../src/shared/ui/icons';

type View = 'landing' | 'setup' | 'done';

const STEPS: { key: ProfileSection; title: string; subtitle: string; icon: ReactNode }[] =
  [
    {
      key: 'identity',
      title: 'Who are you?',
      subtitle: 'Name this profile after your niche. You can add more profiles later.',
      icon: <IconUser />,
    },
    {
      key: 'skills',
      title: 'Skills and proof',
      subtitle: 'Drafts only use what you write here, so be specific and honest.',
      icon: <IconSparkles />,
    },
    {
      key: 'rate',
      title: 'Experience and rate',
      subtitle: 'Used to suggest a fair price and a competitive delivery time.',
      icon: <IconTag />,
    },
    {
      key: 'style',
      title: 'Writing style',
      subtitle: 'Your defaults. You can still change them for each draft.',
      icon: <IconSettings />,
    },
  ];

const FEATURES = [
  {
    icon: <IconZap size={20} />,
    title: 'Reads the job for you',
    text: 'Detects the job on Upwork and Fiverr, or any page where you highlight the text.',
  },
  {
    icon: <IconShield size={20} />,
    title: 'Only your real facts',
    text: 'Every draft is grounded in your profile. No invented clients, numbers or skills.',
  },
  {
    icon: <IconLayers size={20} />,
    title: 'A profile per niche',
    text: 'Web, WordPress, design or data: the best matching profile is picked for each job.',
  },
  {
    icon: <IconTag size={20} />,
    title: 'Fair price and timeline',
    text: 'Suggests a price from real working hours and a competitive delivery estimate.',
  },
  {
    icon: <IconBriefcase size={20} />,
    title: 'Knows a real project',
    text: 'In your Fiverr inbox, tells you if a client described actual work or just said hi.',
  },
  {
    icon: <IconClock size={20} />,
    title: 'History per profile',
    text: 'Every draft is saved with the profile that wrote it, ready to reuse.',
  },
];

function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export default function WelcomeApp() {
  const [view, setView] = useState<View>('landing');
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<ProfileRecord>(() => newProfileRecord());
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');

  useEffect(() => {
    void currentUser().then((u) => setSignedIn(Boolean(u)));
  }, []);

  /** Sign in with Google and pull profiles saved on another computer. */
  const restore = async () => {
    setSigningIn(true);
    setSignInError('');
    const message = await signInAndSync();
    setSigningIn(false);
    if (message) {
      setSignInError(message);
      return;
    }
    setSignedIn(true);
    const data = await loadStore();
    setProfiles(data.profiles);
    if (view === 'done') return;
    setView('landing');
    scrollTop();
  };

  useEffect(() => {
    void loadStore().then((data) => {
      setProfiles(data.profiles);
      const params = new URLSearchParams(window.location.search);
      if (params.get('setup') === 'new') {
        setProfile(newProfileRecord());
        setView('setup');
      } else if (params.get('setup') === '1') {
        // Opened from the popup: finish an incomplete profile, or start a new one.
        const unfinished = data.profiles.find((p) => !profileIsReady(p));
        if (unfinished) setProfile(unfinished);
        setView('setup');
      }
    });
  }, []);

  const hasReady = profiles.some(profileIsReady);
  const current = STEPS[step] as (typeof STEPS)[number]; // step stays in range

  const startSetup = (fresh = false) => {
    if (fresh) setProfile(newProfileRecord());
    setStep(0);
    setErrors({});
    setView('setup');
    scrollTop();
  };

  const next = async () => {
    const e = validateProfile(profile, [current.key]);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSaving(true);
    // Save after every step so nothing is lost if the tab is closed.
    const saved = await upsertProfile(profile).finally(() => setSaving(false));
    setProfiles(saved.profiles);
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      scrollTop();
      return;
    }
    const all = validateProfile(profile);
    if (Object.keys(all).length > 0) {
      setErrors(all);
      const firstBad = STEPS.findIndex(
        (s) => Object.keys(validateProfile(profile, [s.key])).length > 0,
      );
      setStep(Math.max(0, firstBad));
      return;
    }
    void syncNow();
    setView('done');
    scrollTop();
  };

  return (
    <div className="min-h-screen">
      <nav className="pp-nav">
        <div className="pp-nav-inner flex h-16 items-center gap-3">
          <div className="pp-logo">
            <IconLogo size={22} />
          </div>
          <span className="text-[15px] font-bold tracking-tight">
            Proposal<span className="pp-gradient-text">Pilot</span>
          </span>
          <div className="flex-1" />
          {hasReady ? (
            <button
              type="button"
              className="pp-btn pp-btn-ghost pp-btn-sm"
              onClick={() => void chrome.runtime.openOptionsPage()}
            >
              <IconSettings size={14} />
              Manage profiles
            </button>
          ) : null}
          {view !== 'setup' ? (
            <button
              type="button"
              className="pp-btn pp-btn-primary pp-btn-sm"
              onClick={() => startSetup(hasReady)}
            >
              {hasReady ? 'Add a profile' : 'Set up profile'}
            </button>
          ) : null}
        </div>
      </nav>

      {view === 'landing' ? (
        <Landing
          hasReady={hasReady}
          onStart={() => startSetup(hasReady)}
          signIn={
            signedIn ? null : (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <GoogleButton
                    onClick={() => void restore()}
                    busy={signingIn}
                    label="Restore with Google"
                  />
                  <span className="pp-faint text-xs">
                    Already set up on another computer?
                  </span>
                </div>
                {signInError ? (
                  <p className="text-xs text-[var(--pp-danger)]" role="alert">
                    {signInError}
                  </p>
                ) : null}
              </div>
            )
          }
        />
      ) : null}

      {view === 'setup' ? (
        <main className="pp-page pp-enter flex flex-col gap-6 py-10">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="pp-label">
                  Step {step + 1} of {STEPS.length}
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight">
                  Set up your profile
                </h1>
              </div>
              <Meter value={profileCompleteness(profile)} size={44} />
            </div>
            <ol className="pp-wizard-steps" aria-label="Setup progress">
              {STEPS.map((s, i) => (
                <li
                  key={s.key}
                  className="pp-wizard-step"
                  data-state={i < step ? 'done' : i === step ? 'active' : 'todo'}
                  aria-current={i === step ? 'step' : undefined}
                >
                  {s.title}
                </li>
              ))}
            </ol>

            <section
              key={current.key}
              className="pp-card pp-card-glow pp-enter flex flex-col gap-5 p-6"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--pp-brand-soft)] text-[var(--pp-brand-strong)]">
                  {current.icon}
                </span>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">{current.title}</h2>
                  <p className="pp-muted text-[13px] leading-relaxed">
                    {current.subtitle}
                  </p>
                </div>
              </div>
              {current.key === 'identity' ? (
                <IdentitySection value={profile} errors={errors} onChange={setProfile} />
              ) : null}
              {current.key === 'skills' ? (
                <SkillsSection value={profile} errors={errors} onChange={setProfile} />
              ) : null}
              {current.key === 'rate' ? (
                <RateSection value={profile} errors={errors} onChange={setProfile} />
              ) : null}
              {current.key === 'style' ? (
                <StyleSection value={profile} errors={errors} onChange={setProfile} />
              ) : null}
            </section>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="pp-btn pp-btn-ghost"
                onClick={() => {
                  if (step === 0) setView('landing');
                  else setStep(step - 1);
                  setErrors({});
                  scrollTop();
                }}
              >
                <IconArrowLeft size={15} />
                Back
              </button>
              <div className="flex-1" />
              {Object.keys(errors).length > 0 ? (
                <span
                  className="text-xs font-semibold text-[var(--pp-danger)]"
                  role="alert"
                >
                  Please fix the fields above
                </span>
              ) : null}
              <button
                type="button"
                className="pp-btn pp-btn-primary pp-btn-lg"
                disabled={saving}
                onClick={() => void next()}
              >
                {step === STEPS.length - 1 ? 'Finish setup' : 'Continue'}
                {step === STEPS.length - 1 ? (
                  <IconCheck size={16} />
                ) : (
                  <IconArrowRight size={16} />
                )}
              </button>
            </div>
          </div>
        </main>
      ) : null}

      {view === 'done' ? (
        <Done
          profile={profile}
          onAnother={() => startSetup(true)}
          backup={
            signedIn ? (
              <p className="pp-notice pp-notice-info text-xs">
                Backed up to your account. Your profiles and history sync across your
                browsers.
              </p>
            ) : (
              <div className="pp-card flex w-full max-w-3xl flex-wrap items-center gap-4 p-5 text-left">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold">Back up your profile</h3>
                  <p className="pp-muted text-xs leading-relaxed">
                    Sign in to keep your profiles and proposal history safe and use them
                    on any computer. Optional.
                  </p>
                  {signInError ? (
                    <p className="mt-1 text-xs text-[var(--pp-danger)]" role="alert">
                      {signInError}
                    </p>
                  ) : null}
                </div>
                <GoogleButton onClick={() => void restore()} busy={signingIn} />
              </div>
            )
          }
        />
      ) : null}

      <footer className="pp-page pp-faint flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-10 text-xs">
        <span className="flex items-center gap-1.5">
          <IconShield size={12} />
          Drafts only. You review and send. Nothing is submitted for you.
        </span>
        <a
          className="pp-link"
          href="https://shayan9689.github.io/Browser-extension-for-freelancers/privacy-policy.html"
          target="_blank"
          rel="noreferrer"
        >
          Privacy policy
        </a>
      </footer>
    </div>
  );
}

function Landing(props: { hasReady: boolean; onStart: () => void; signIn: ReactNode }) {
  return (
    <main className="pp-enter">
      <section className="pp-page grid items-center gap-12 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
        <div className="pp-stagger flex flex-col gap-6">
          <span className="pp-eyebrow self-start">
            <span className="pp-eyebrow-dot" />
            {props.hasReady ? 'Welcome back' : 'Installed. You are almost ready'}
          </span>
          <h1 className="pp-hero-title">
            Proposals that sound like <span className="pp-gradient-text">you</span>, in
            seconds.
          </h1>
          <p className="pp-muted max-w-xl text-[17px] leading-relaxed">
            ProposalPilot reads the job you are viewing and writes a short, specific first
            draft from your real experience, with a fair price and delivery time. You edit
            and send it.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="pp-btn pp-btn-primary pp-btn-lg"
              onClick={props.onStart}
            >
              {props.hasReady ? 'Add another profile' : 'Set up your profile'}
              <IconArrowRight size={16} />
            </button>
            <span className="pp-faint text-xs">Takes about 2 minutes. Free.</span>
          </div>
          {props.signIn}
        </div>
        <DraftMock />
      </section>

      <section className="pp-page flex flex-col gap-8 py-12">
        <div className="max-w-2xl">
          <p className="pp-label">Why freelancers use it</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">
            Less typing. Better first impressions.
          </h2>
        </div>
        <div className="pp-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="pp-card pp-feature">
              <span className="pp-feature-icon">{f.icon}</span>
              <h3 className="text-[15px] font-bold">{f.title}</h3>
              <p className="pp-muted text-[13px] leading-relaxed">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pp-page py-12">
        <div className="pp-card pp-card-glow grid gap-8 p-8 md:grid-cols-3">
          {[
            ['1', 'Set up a profile', 'Your niche, skills, achievements and rate. Once.'],
            [
              '2',
              'Open a job',
              'Click the toolbar icon or press Alt+Shift+P on any job post.',
            ],
            [
              '3',
              'Copy and send',
              'Review the draft, tweak it, and paste it into your proposal.',
            ],
          ].map(([n, title, text]) => (
            <div key={n} className="flex flex-col gap-2">
              <span className="pp-gradient-text text-4xl font-extrabold">{n}</span>
              <h3 className="text-[15px] font-bold">{title}</h3>
              <p className="pp-muted text-[13px] leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pp-page flex flex-col items-center gap-4 py-16 text-center">
        <h2 className="text-3xl font-bold tracking-tight">
          Ready to write your next proposal?
        </h2>
        <p className="pp-muted max-w-lg text-[15px]">
          Your profile stays in your browser and is sent only when you generate a draft.
        </p>
        <button
          type="button"
          className="pp-btn pp-btn-primary pp-btn-lg"
          onClick={props.onStart}
        >
          {props.hasReady ? 'Add another profile' : 'Set up your profile'}
          <IconArrowRight size={16} />
        </button>
      </section>
    </main>
  );
}

function DraftMock() {
  return (
    <div className="pp-card pp-card-glow pp-mock hidden md:block" aria-hidden="true">
      <div className="mb-4 flex items-center gap-2">
        <div className="pp-logo !h-7 !w-7">
          <IconLogo size={16} />
        </div>
        <span className="text-sm font-bold">Your draft</span>
        <span className="pp-badge ml-auto">92 words</span>
      </div>
      <div className="flex flex-col gap-3 rounded-xl bg-[var(--pp-surface-2)] p-4 text-[12.5px] leading-relaxed">
        <p>
          Losing mobile buyers before the gallery loads is usually a theme problem, not
          hosting.
        </p>
        <p className="pp-muted">
          I rebuilt the product page of a fashion store on Dawn and halved its load time.
        </p>
        <p className="pp-muted">
          I would start by profiling which scripts block the first paint.
        </p>
        <p className="font-semibold">Which theme is the store running at the moment?</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="pp-stat">
          <span className="pp-label">Price</span>
          <span className="pp-stat-value">USD 160</span>
        </div>
        <div className="pp-stat">
          <span className="pp-label">Delivery</span>
          <span className="pp-stat-value">2 days</span>
        </div>
      </div>
    </div>
  );
}

function Done(props: {
  profile: ProfileRecord;
  onAnother: () => void;
  backup: ReactNode;
}) {
  return (
    <main className="pp-page pp-enter flex flex-col items-center gap-8 py-16 text-center">
      <span className="pp-feature-icon pp-pop !h-16 !w-16 !rounded-2xl">
        <IconCheck size={30} />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">You are all set</h1>
        <p className="pp-muted max-w-lg text-[15px] leading-relaxed">
          Your{' '}
          <span className="font-semibold text-[var(--pp-text)]">
            {props.profile.label}
          </span>{' '}
          profile is ready. Here is how to write your first proposal.
        </p>
      </div>
      <div className="grid w-full max-w-3xl gap-4 text-left sm:grid-cols-3">
        <div className="pp-card flex flex-col gap-2 p-5">
          <span className="pp-feature-icon !h-9 !w-9">
            <IconPin size={16} />
          </span>
          <h3 className="text-sm font-bold">Pin the icon</h3>
          <p className="pp-muted text-xs leading-relaxed">
            Click the puzzle icon in Chrome&apos;s toolbar and pin ProposalPilot.
          </p>
        </div>
        <div className="pp-card flex flex-col gap-2 p-5">
          <span className="pp-feature-icon !h-9 !w-9">
            <IconBriefcase size={16} />
          </span>
          <h3 className="text-sm font-bold">Open a job</h3>
          <p className="pp-muted text-xs leading-relaxed">
            On Upwork or Fiverr, click the icon or press{' '}
            <span className="pp-kbd">Alt</span>+<span className="pp-kbd">Shift</span>+
            <span className="pp-kbd">P</span>.
          </p>
        </div>
        <div className="pp-card flex flex-col gap-2 p-5">
          <span className="pp-feature-icon !h-9 !w-9">
            <IconCursor size={16} />
          </span>
          <h3 className="text-sm font-bold">Any other site</h3>
          <p className="pp-muted text-xs leading-relaxed">
            Highlight the job text, right-click and choose Draft proposal with
            ProposalPilot.
          </p>
        </div>
      </div>
      {props.backup}
      <div className="flex flex-wrap justify-center gap-3">
        <a
          className="pp-btn pp-btn-primary pp-btn-lg"
          href="https://www.upwork.com/nx/find-work/best-matches"
          target="_blank"
          rel="noreferrer"
        >
          Find a job on Upwork
          <IconArrowRight size={16} />
        </a>
        <button
          type="button"
          className="pp-btn pp-btn-secondary pp-btn-lg"
          onClick={props.onAnother}
        >
          Add another niche profile
        </button>
      </div>
    </main>
  );
}

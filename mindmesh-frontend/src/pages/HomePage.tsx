import { Link, useNavigate } from 'react-router-dom'
import { HeroPaperFeedPreview } from '../components/HeroPaperFeedPreview'
import { SiteShell } from '../components/SiteShell'
import {
  btnBase,
  btnPrimary,
  btnPrimaryLg,
  gradientText,
  wrap,
} from '../uiClasses'

const painPoints = [
  'You keep drowning in PDFs before the right paper finds you',
  'Discovery stops at search',
  'Collaborators and funding are elsewhere',
]

const pillars: {
  title: string
  body: string
  highlight?: boolean
}[] = [
  {
    title: 'AI that learns you',
    body: 'Recommendations sharpen from every paper you open, save, and skip no manual tuning, just a feed that gets sharper as you scroll.',
    highlight: true,
  },
  {
    title: 'Social, not siloed',
    body: 'Follow authors, topics, and projects discussion lives next to the work.',
  },
  {
    title: 'One home base',
    body: 'Papers, people, events, jobs, and sponsors in a single flow.',
  },
]

const features = [
  {
    title: 'A feed that stays relevant',
    desc: 'New papers and trending work in your field plus nearby conference cards and curated roles matched to your interests without the endless query loop.',
  },
  {
    title: 'A graph for your domain',
    desc: 'Students, faculty, industry R&D, and capital in one network shaped by intent.',
  },
  {
    title: 'Gaps you can act on',
    desc: 'See overlap, quiet corners, and open questions so teams ship faster.',
  },
  {
    title: 'Room to collaborate',
    desc: 'Comments, shares, project workspaces, and verified sponsorship when you want to go bigger.',
  },
]

const sessionBullets = [
  'Literature that updates as your thread evolves',
  'Collaborators, notes, and comments on papers',
  'Gaps, drafts, and proposals in one workspace',
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <SiteShell>
      <main id="top">
        <section className="relative z-10 pt-14 pb-[72px]">
          <div
            className={`${wrap} grid grid-cols-1 items-start gap-10 min-[801px]:grid-cols-[1fr_auto] min-[801px]:gap-x-12 min-[801px]:gap-y-10`}
          >
            <div className="relative max-w-[min(100%,32rem)] min-[801px]:pt-1">
              <div
                className="pointer-events-none absolute -left-6 top-8 hidden h-[min(320px,70%)] w-px bg-linear-to-b from-cyan-400/0 via-cyan-400/35 to-violet-500/0 min-[801px]:block"
                aria-hidden
              />
              <p className="mb-4 mt-0">
                <span
                  className={`inline-flex items-center rounded-full border border-violet-200/70 bg-white/90 px-3 py-1.5 text-[0.68rem] font-semibold tracking-[0.12em] uppercase shadow-sm shadow-violet-500/5 ring-1 ring-white/80 backdrop-blur-sm ${gradientText}`}
                >
                  Research · network · assistant
                </span>
              </p>
              <h1 className="font-display mb-0 mt-0 text-heading">
                <span className="block text-[clamp(2.1rem,5vw,2.95rem)] leading-[1.06] font-bold tracking-[-0.038em]">
                  We&apos;re making research{' '}
                  <span className={gradientText}>addictive</span>
                  <span className="text-heading"> one scroll at a time.</span>
                </span>
                <span className="mt-4 block border-l-2 border-cyan-500/35 pl-4 text-[clamp(1.3rem,2.2vw,1.35rem)] leading-[1.15] font-bold tracking-[-0.028em] text-slate-700">
                  Less searching.{' '}
                  <span className={gradientText}>More discovering.</span>
                </span>
              </h1>
              <div
                className="mb-6 mt-7 h-1 w-14 rounded-full bg-linear-to-r from-cyan-500 to-violet-600"
                aria-hidden
              />
              <p className="mb-3 mt-0 text-[1.0625rem] leading-[1.62] text-foreground">
                Meet like-minded researchers in your lane then keep the momentum
                in one feed built for how you actually read.
              </p>
              <p className="mb-7 mt-0 text-[1.0625rem] leading-[1.62] text-foreground">
                Papers and people, plus nearby conference cards and curated
                roles when they fit your interests.{' '}
                <span className={`font-semibold ${gradientText}`}>
                  AI that learns you
                </span>{' '}
                from every open, save, and skip so the next scroll feels
                personal.
              </p>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link className={`${btnPrimaryLg} w-full justify-center sm:w-auto`} to="/discover">
                  Get started
                </Link>
                <a
                  className={`${btnBase} w-full justify-center rounded-full border border-violet-200/90 bg-white/90 px-5 py-3 text-[0.95rem] font-semibold text-violet-700 shadow-sm shadow-slate-200/40 ring-1 ring-white/90 backdrop-blur-sm transition-[color,box-shadow,background-color] duration-200 hover:border-violet-300 hover:bg-violet-50/80 hover:text-violet-900 sm:w-auto`}
                  href="#product"
                >
                  See how it works →
                </a>
              </div>
              <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.84rem] leading-snug text-muted">
                <span className="font-medium text-slate-600">Built for</span>
                <span className="rounded-md bg-slate-100/90 px-2 py-0.5 text-slate-600">
                  Labs
                </span>
                <span className="text-slate-300" aria-hidden>
                  ·
                </span>
                <span className="rounded-md bg-slate-100/90 px-2 py-0.5 text-slate-600">
                  Industry R&D
                </span>
                <span className="text-slate-300" aria-hidden>
                  ·
                </span>
                <span className="rounded-md bg-slate-100/90 px-2 py-0.5 text-slate-600">
                  Investors
                </span>
              </p>
            </div>
            <aside
              className="relative m-0 w-full max-w-none min-[801px]:max-w-[380px]"
              aria-label="Preview of the research feed with scrolling sample papers"
            >
              <div
                className="absolute -inset-px rounded-[1.15rem] bg-linear-to-br from-cyan-400/40 via-blue-500/25 to-violet-500/35 blur-[1px]"
                aria-hidden="true"
              />
              <HeroPaperFeedPreview />
            </aside>
          </div>
        </section>

        {/* <section id="problem" className="py-10">
          <div className={wrap}>
            <h2 className="font-display mb-3 mt-0 text-[clamp(1.35rem,2.5vw,1.65rem)] leading-tight font-semibold tracking-[-0.02em] text-heading">
              Sound familiar?
            </h2>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {painPoints.map((t) => (
                <li
                  key={t}
                  className="relative pl-[18px] text-base text-foreground before:absolute before:top-[0.55em] before:left-0 before:size-1.5 before:rounded-full before:bg-gradient-to-br before:from-cyan-500 before:to-violet-600 before:content-['']"
                >
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section> */}

        <section className="py-16">
          <div
            className={`${wrap} grid grid-cols-1 gap-5 min-[721px]:grid-cols-3 min-[721px]:gap-6`}
          >
            {pillars.map((p) => (
              <div
                key={p.title}
                className={
                  p.highlight
                    ? 'rounded-2xl border border-violet-200/85 bg-linear-to-br from-white via-white to-violet-50/45 p-6 shadow-md shadow-violet-500/10 ring-1 ring-violet-100/90 transition-shadow duration-200 hover:shadow-lg'
                    : 'rounded-2xl border border-border/90 bg-surface p-6 shadow-sm transition-shadow duration-200 hover:shadow-md'
                }
              >
                <h3
                  className={`font-display mb-2 mt-0 text-base font-semibold ${
                    p.highlight ? gradientText : 'text-heading'
                  }`}
                >
                  {p.title}
                </h3>
                <p className="m-0 text-[0.92rem] leading-normal text-foreground">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="product"
          className="border-y border-border bg-canvas-muted py-16"
        >
          <div className={wrap}>
            <header className="mx-auto mb-9 max-w-[520px] text-center">
              <h2 className="font-display mb-3 mt-0 text-center text-[clamp(1.35rem,2.5vw,1.65rem)] leading-tight font-semibold tracking-[-0.02em] text-heading">
                Everything in one flow
              </h2>
              <p className="m-0 text-[0.98rem] leading-[1.55] text-foreground">
                Like a social layer for papers plus an assistant that learns your
                domain and your habits, with curated events and roles when they
                match where you are.
              </p>
            </header>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border/90 bg-border shadow-sm min-[641px]:grid-cols-2">
              {features.map((f) => (
                <article
                  key={f.title}
                  className="m-0 bg-surface px-[22px] pt-[22px] pb-5 transition-shadow duration-200 hover:shadow-md"
                >
                  <h3 className="font-display mb-2 mt-0 text-[0.98rem] font-semibold text-heading">
                    {f.title}
                  </h3>
                  <p className="m-0 text-[0.88rem] leading-[1.55] text-foreground">
                    {f.desc}
                  </p>
                </article>
              ))}
            </div>
            <p className="mx-auto mt-7 mb-0 max-w-2xl text-center text-[0.86rem] leading-normal text-muted">
              More people on MindMesh → sharper recommendations → richer
              opportunities for everyone.
            </p>
          </div>
        </section>

        <section id="sessions" className="py-16">
          <div
            className={`${wrap} grid grid-cols-1 items-start gap-10 min-[721px]:grid-cols-[1fr_minmax(200px,280px)]`}
          >
            <div>
              <p
                className={`mb-3.5 mt-0 text-[0.72rem] font-semibold tracking-[0.14em] uppercase ${gradientText}`}
              >
                Sessions
              </p>
              <h2 className="font-display mb-3.5 mt-0 text-[clamp(1.35rem,2.5vw,1.65rem)] leading-tight font-semibold tracking-[-0.02em] text-heading">
                Projects deserve their own room
              </h2>
              <p className="mb-[18px] mt-0 text-[0.98rem] leading-[1.55] text-foreground">
                A session is a focused workspace: live literature, threads,
                collaborators, and drafts around one research thread.
              </p>
              <ul className="m-0 list-none p-0">
                {sessionBullets.map((b) => (
                  <li
                    key={b}
                    className="relative border-b border-border py-2.5 pr-0 pl-[22px] text-[0.92rem] text-heading last:border-b-0 before:absolute before:top-1/2 before:left-0 before:h-px before:w-2 before:-translate-y-1/2 before:bg-gradient-to-r before:from-cyan-500 before:to-violet-600 before:content-['']"
                  >
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div aria-hidden="true">
              <div className="overflow-hidden rounded-2xl border border-border/90 bg-surface shadow-md ring-1 ring-slate-100">
                <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3.5 text-[0.88rem] font-semibold text-heading">
                  <span>Session · Climate risk</span>
                  <span className="text-[0.8rem] font-medium text-muted">
                    6 people
                  </span>
                </div>
                <ul className="m-0 list-none p-0">
                  <li className="flex justify-between gap-3 border-b border-border px-4 py-3 text-[0.82rem] text-foreground last:border-b-0">
                    <span className="font-medium text-muted">Papers</span>
                    <span>24 auto-curated</span>
                  </li>
                  <li className="flex justify-between gap-3 border-b border-border px-4 py-3 text-[0.82rem] text-foreground last:border-b-0">
                    <span className="font-medium text-muted">Gaps</span>
                    <span>3 flagged</span>
                  </li>
                  <li className="flex justify-between gap-3 px-4 py-3 text-[0.82rem] text-foreground">
                    <span className="font-medium text-muted">Next</span>
                    <span>Proposal v2</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-canvas-muted py-10">
          <div className="relative z-10 mx-auto w-full max-w-[560px] px-[22px]">
            <p className="m-0 text-center text-[1.05rem] leading-relaxed text-foreground">
              We are building MindMesh so teams spend less time tab-hopping and
              more time on the questions that move fields forward.
            </p>
          </div>
        </section>

        <section id="get-started" className="pb-20 pt-16">
          <div className={wrap}>
            <div className="mx-auto max-w-[440px] rounded-3xl border border-border/80 bg-gradient-to-b from-white to-slate-50/90 p-8 text-center shadow-xl shadow-slate-200/50 ring-1 ring-white/80 sm:p-10">
              <h2 className="font-display mb-3 mt-0 text-[clamp(1.35rem,2.5vw,1.65rem)] leading-tight font-semibold tracking-[-0.02em] text-heading">
                Ready when you are
              </h2>
              <p className="mb-[22px] mt-0 text-[0.95rem] leading-[1.55] text-foreground">
                Tell us what you work on we&apos;ll use it to personalize your
                feed and recommendations. Optional: add your email for launch
                updates.
              </p>
              <form
                className="flex flex-col gap-2.5 text-left"
                onSubmit={(e) => {
                  e.preventDefault()
                  navigate('/discover')
                }}
              >
                <label className="sr-only" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@lab.org (optional)"
                  autoComplete="email"
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 font-inherit text-[0.95rem] text-heading outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted focus:border-violet-400 focus:shadow-[0_0_0_3px_var(--color-accent-soft)]"
                />
                <button type="submit" className={`${btnPrimary} w-full justify-center`}>
                  Get started
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  )
}

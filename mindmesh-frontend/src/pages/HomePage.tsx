import { Link, useNavigate } from 'react-router-dom'
import { SiteShell } from '../components/SiteShell'
import {
  btnBase,
  btnPrimary,
  btnPrimaryLg,
  gradientText,
  wrap,
} from '../uiClasses'

const painPoints = [
  'Signal lost in too many papers',
  'Discovery stops at search',
  'Collaborators and funding are elsewhere',
]

const pillars = [
  {
    title: 'Social, not siloed',
    body: 'Follow authors, topics, and projects—discussion lives next to the work.',
  },
  {
    title: 'AI that learns you',
    body: 'Your feed improves from what you read, save, and build in Sessions.',
  },
  {
    title: 'One home base',
    body: 'Papers, people, events, jobs, and sponsors in a single flow.',
  },
]

const features = [
  {
    title: 'A feed that stays relevant',
    desc: 'New papers, trending work in your field, conferences, and roles—without the endless query loop.',
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
    desc: 'Comments, shares, Sessions, and verified sponsorship when you want to go bigger.',
  },
]

const sessionBullets = [
  'Literature that updates as your thread evolves',
  'Collaborators, notes, and comments on papers',
  'Gaps, drafts, and proposals in one workspace',
]

const heroSessionFeed = [
  {
    title: 'Climate risk & infrastructure',
    description:
      'Live papers, flagged gaps, and a shared draft proposal—six people in one thread.',
  },
  {
    title: 'Urban mobility lab',
    description:
      'Curated literature that updates as the question shifts, with notes on every paper.',
  },
  {
    title: 'Alignment reading group',
    description:
      'Short summaries, open questions, and links out to the next experiments to run.',
  },
] as const

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <SiteShell>
      <main id="top">
        <section className="relative z-10 pt-14 pb-[72px]">
          <div
            className={`${wrap} grid grid-cols-1 items-start gap-10 min-[801px]:grid-cols-[1fr_auto] min-[801px]:gap-x-12 min-[801px]:gap-y-10`}
          >
            <div>
              <p
                className={`mb-3.5 mt-0 text-[0.72rem] font-semibold tracking-[0.14em] uppercase ${gradientText}`}
              >
                Research · network · assistant
              </p>
              <h1 className="font-display mb-[18px] mt-0 text-[clamp(2.1rem,5vw,2.85rem)] leading-[1.08] font-bold tracking-[-0.035em] text-heading">
                Less searching.
                <br />
                <span className={gradientText}>More discovering.</span>
              </h1>
              <p className="mb-6 mt-0 max-w-lg text-[1.05rem] leading-relaxed text-foreground">
                MindMesh is the lightweight place where research finds you—feed,
                people, project workspaces, and AI tuned to how you actually
                work.
              </p>
              <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link className={btnPrimaryLg} to="/discover">
                  Get started
                </Link>
                <a
                  className={`${btnBase} px-2 font-semibold text-violet-600 transition-colors hover:text-violet-800`}
                  href="#product"
                >
                  See how it works →
                </a>
              </div>
              <p className="m-0 max-w-104 text-[0.88rem] text-muted">
                For labs, industry R&D, and investors who want one calm home for
                discovery.
              </p>
            </div>
            <aside
              className="relative m-0 w-full max-w-none min-[801px]:max-w-[380px]"
              aria-label="Product preview, example sessions feed"
            >
              <div
                className="absolute -inset-px rounded-[1.15rem] bg-linear-to-br from-cyan-400/40 via-blue-500/25 to-violet-500/35 blur-[1px]"
                aria-hidden="true"
              />
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-xl shadow-violet-500/12 ring-1 ring-white/80 backdrop-blur-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 bg-linear-to-r from-slate-50/95 to-slate-50/60 px-3 py-2.5">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <span className="size-2.5 rounded-full bg-[#ff5f57]/95" />
                    <span className="size-2.5 rounded-full bg-[#febc2e]/95" />
                    <span className="size-2.5 rounded-full bg-[#28c840]/95" />
                  </div>
                  <span className="ml-1 truncate font-mono text-[11px] font-medium tracking-tight text-slate-500">
                    mindmesh.app/sessions
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-800 uppercase">
                    <span
                      className="size-1.5 animate-pulse rounded-full bg-emerald-500"
                      aria-hidden="true"
                    />
                    Live
                  </span>
                </div>
                <div className="relative space-y-2.5 bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,rgba(99,102,241,0.06),transparent_55%)] p-3">
                  {heroSessionFeed.map((session) => (
                    <div
                      key={session.title}
                      className="rounded-xl border border-slate-100/90 bg-linear-to-br from-white to-slate-50/70 p-3.5 shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <p className="font-display text-[0.875rem] leading-snug font-semibold text-heading">
                        {session.title}
                      </p>
                      <p className="mt-2 text-[12px] leading-relaxed text-muted">
                        {session.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section id="problem" className="py-10">
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
        </section>

        <section className="py-16">
          <div
            className={`${wrap} grid grid-cols-1 gap-5 min-[721px]:grid-cols-3 min-[721px]:gap-6`}
          >
            {pillars.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-border/90 bg-surface p-6 shadow-sm transition-shadow duration-200 hover:shadow-md"
              >
                <h3 className="font-display mb-2 mt-0 text-base font-semibold text-heading">
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
                Like a social layer for papers—plus an assistant that learns your
                domain and your projects.
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
                Tell us what you work on—we will use it to shape your feed and
                Sessions. Optional: add your email for launch updates.
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

const navLinks = [
  { href: '#product', label: 'Product' },
  { href: '#sessions', label: 'Sessions' },
  { href: '#waitlist', label: 'Waitlist' },
]

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

const wrap =
  'relative z-10 mx-auto w-full max-w-[920px] px-[22px]'

const btnBase =
  'inline-flex cursor-pointer items-center justify-center rounded-full border-0 font-inherit text-sm font-semibold no-underline transition-colors duration-150'

const btnPrimary = `${btnBase} bg-accent px-[18px] py-[9px] text-white hover:bg-accent-hover`

const btnPrimaryLg = `${btnPrimary} px-[22px] py-3 text-[0.95rem]`

export default function App() {
  return (
    <div className="relative overflow-x-clip">
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_-30%,rgba(196,92,38,0.09),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_10%,rgba(59,130,246,0.05),transparent_50%)]"
        aria-hidden="true"
      />

      <header className="sticky top-0 z-20 h-16 border-b border-border bg-[color-mix(in_srgb,var(--color-canvas)_88%,white)] backdrop-blur-md">
        <div className={`${wrap} flex h-full items-center justify-between gap-4`}>
          <a
            className="font-display text-[1.2rem] font-bold tracking-[-0.03em] text-heading no-underline"
            href="#top"
          >
            MindMesh
          </a>
          <nav className="hidden sm:block" aria-label="Primary">
            <ul className="m-0 flex list-none flex-wrap justify-center gap-[22px] p-0">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <a
                    className="text-sm font-medium text-muted no-underline transition-colors duration-150 hover:text-heading"
                    href={l.href}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <a
            className={`${btnPrimary} max-[480px]:hidden px-4`}
            href="#waitlist"
          >
            Join waitlist
          </a>
        </div>
      </header>

      <main id="top">
        <section className="relative z-10 pt-14 pb-[72px]">
          <div
            className={`${wrap} grid grid-cols-1 items-start gap-10 min-[801px]:grid-cols-[1fr_auto] min-[801px]:gap-x-12 min-[801px]:gap-y-10`}
          >
            <div>
              <p className="mb-3.5 mt-0 text-[0.72rem] font-semibold tracking-[0.14em] text-accent-text uppercase">
                Research · network · assistant
              </p>
              <h1 className="font-display mb-[18px] mt-0 text-[clamp(2.1rem,5vw,2.85rem)] leading-[1.08] font-bold tracking-[-0.035em] text-heading">
                Less searching.
                <br />
                <span className="text-accent">More discovering.</span>
              </h1>
              <p className="mb-6 mt-0 max-w-lg text-[1.05rem] leading-relaxed text-foreground">
                MindMesh is the lightweight place where research finds you—feed,
                people, project workspaces, and AI tuned to how you actually
                work.
              </p>
              <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                <a className={btnPrimaryLg} href="#waitlist">
                  Get early access
                </a>
                <a
                  className={`${btnBase} px-2 text-accent-text hover:text-accent-hover`}
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
              className="m-0 max-w-none min-w-[220px] rounded-xl border border-border bg-surface px-[22px] py-5 min-[801px]:max-w-[280px]"
              aria-label="Example feed"
            >
              <p className="mb-3.5 mt-0 text-[0.7rem] font-semibold tracking-[0.12em] text-muted uppercase">
                Today for you
              </p>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                <li className="border-b border-border pb-3 text-[0.92rem] text-heading last:border-b-0 last:pb-0">
                  New preprint in your graph
                </li>
                <li className="border-b border-border pb-3 text-[0.92rem] text-heading last:border-b-0 last:pb-0">
                  Session invite · urban mobility
                </li>
                <li className="text-[0.92rem] text-heading">CFP · closes in 9 days</li>
              </ul>
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
                  className="relative pl-[18px] text-base text-foreground before:absolute before:top-[0.55em] before:left-0 before:size-1.5 before:rounded-full before:bg-accent before:opacity-75 before:content-['']"
                >
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="py-16">
          <div
            className={`${wrap} grid grid-cols-1 gap-x-8 gap-y-7 border-t border-border pt-2 min-[721px]:grid-cols-3`}
          >
            {pillars.map((p) => (
              <div key={p.title}>
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
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border min-[641px]:grid-cols-2">
              {features.map((f) => (
                <article
                  key={f.title}
                  className="m-0 bg-surface px-[22px] pt-[22px] pb-5"
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
              <p className="mb-3.5 mt-0 text-[0.72rem] font-semibold tracking-[0.14em] text-accent-text uppercase">
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
                    className="relative border-b border-border py-2.5 pr-0 pl-[22px] text-[0.92rem] text-heading last:border-b-0 before:absolute before:top-1/2 before:left-0 before:h-px before:w-2 before:-translate-y-1/2 before:bg-accent before:content-['']"
                  >
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div aria-hidden="true">
              <div className="overflow-hidden rounded-xl border border-border bg-surface">
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

        <section id="waitlist" className="pb-20 pt-16">
          <div className={wrap}>
            <div className="mx-auto max-w-[440px] text-center">
              <h2 className="font-display mb-3 mt-0 text-center text-[clamp(1.35rem,2.5vw,1.65rem)] leading-tight font-semibold tracking-[-0.02em] text-heading">
                Get on the list
              </h2>
              <p className="mb-[22px] mt-0 text-[0.95rem] leading-[1.55] text-foreground">
                Early invites for groups who want calmer, smarter research
                discovery. One email, no noise.
              </p>
              <form
                className="flex flex-col gap-2.5"
                onSubmit={(e) => {
                  e.preventDefault()
                }}
              >
                <label className="sr-only" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@lab.org"
                  autoComplete="email"
                  className="w-full rounded-lg border border-border bg-surface px-4 py-3 font-inherit text-[0.95rem] text-heading outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted focus:border-border-focus focus:shadow-[0_0_0_3px_var(--color-accent-soft)]"
                />
                <button type="submit" className={`${btnPrimary} w-full`}>
                  Request invite
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border py-[22px] pb-9">
        <div
          className={`${wrap} flex flex-wrap items-center justify-between gap-2.5`}
        >
          <span className="font-display text-[1.05rem] font-bold tracking-[-0.03em] text-heading">
            MindMesh
          </span>
          <p className="m-0 text-[0.82rem] text-muted">
            © {new Date().getFullYear()} · Research discovery, connected
          </p>
        </div>
      </footer>
    </div>
  )
}

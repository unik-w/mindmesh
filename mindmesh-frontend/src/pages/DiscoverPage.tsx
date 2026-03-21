import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { btnBase, btnPrimary, gradientText } from '../uiClasses'

const INTERESTS = [
  { id: 'ml-ai', label: 'Machine learning & AI' },
  { id: 'biology', label: 'Biology & genomics' },
  { id: 'climate', label: 'Climate & sustainability' },
  { id: 'physics', label: 'Physics & applied math' },
  { id: 'medicine', label: 'Medicine & health' },
  { id: 'hci', label: 'HCI, design & computing' },
  { id: 'neuro', label: 'Neuroscience & cognition' },
  { id: 'materials', label: 'Chemistry & materials' },
  { id: 'robotics', label: 'Robotics & systems' },
  { id: 'policy', label: 'Economics & policy' },
  { id: 'social', label: 'Social & behavioral science' },
  { id: 'energy', label: 'Energy & infrastructure' },
] as const

const authorSearchPreview = [
  { name: 'Yann LeCun', affiliation: 'NYU · Meta AI' },
  { name: 'Yoshua Bengio', affiliation: 'Mila' },
] as const

const popularAuthorsWidget = [
  { name: 'Dr. Alan Roberts', initials: 'AR' },
  { name: 'Dr. Sarah Chen', initials: 'SC' },
  { name: 'Dr. James Okonkwo', initials: 'JO' },
] as const

const demoProfile = {
  initials: 'AK',
  username: 'akshat_k',
} as const

function formatCount(n: number) {
  return n.toLocaleString('en-US')
}

function UserCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function MindMeshWordmark() {
  return (
    <Link
      to="/"
      className="inline-flex shrink-0 items-center gap-2.5 no-underline transition-opacity hover:opacity-90"
    >
      <img
        src="/mindmesh-logo.png"
        alt=""
        className="h-7 w-auto sm:h-8"
        aria-hidden
      />
      <span className="font-display text-[1.05rem] font-bold tracking-tight text-slate-900">
        MindMesh
      </span>
    </Link>
  )
}

type FeedItem = {
  id: string
  interestIds: readonly string[]
  authorLine: string
  title: string
  meta: string
  aiSummary: string
  stats: { saves: number; thread: number }
  tags: readonly [string, string]
  citations: number
  likes: number
  comments: number
}

const feedItems: readonly FeedItem[] = [
  {
    id: 'f1',
    interestIds: ['ml-ai'],
    authorLine: 'Chen, Liu & Agrawal',
    title:
      'Adaptive retrieval for long-context reasoning with bounded compute',
    meta: 'ICLR workshop · 2d ago',
    aiSummary:
      'This work tackles a practical question for long-context models: when should you pay for fresh retrieval versus reusing tokens you already have in context?\n\nThe authors propose a lightweight gating policy for multi-hop question answering. On their suite, it cuts median latency by about 31% without hurting accuracy on held-out benchmarks—the gain comes from skipping redundant retrieval when cached context is still sufficient.\n\nIf you ship RAG, agents, or memory layers, the ablations are useful: they separate hop types that genuinely need new evidence from those that do not.',
    stats: { saves: 128, thread: 14 },
    tags: ['Machine learning', 'Systems'],
    citations: 98,
    likes: 1203,
    comments: 256,
  },
  {
    id: 'f2',
    interestIds: ['climate', 'energy'],
    authorLine: 'Okonkwo et al.',
    title: 'Grid-scale storage under correlated heat extremes',
    meta: 'Nature Energy · 5d ago',
    aiSummary:
      'Grid operators often plan for heat and peak demand separately. This paper models them jointly because compound extremes—long heat waves overlapping with demand spikes—are becoming more correlated along coasts.\n\nThe headline result is that dispatch and storage strategies tuned on marginal heat risk under-invest in correlated tail scenarios. Reordering priorities for coastal metros materially changes which assets look “efficient” under stress.\n\nPolicy takeaway: if your infrastructure models treat temperature and load as weakly linked, you may be underestimating storage value and over-relying on transmission fixes.',
    stats: { saves: 89, thread: 9 },
    tags: ['Climate', 'Energy policy'],
    citations: 64,
    likes: 842,
    comments: 91,
  },
  {
    id: 'f3',
    interestIds: ['medicine', 'biology'],
    authorLine: 'Patel, Kim, Santos',
    title: 'Prospective cohort markers for treatment-resistant depression',
    meta: 'JAMA Psychiatry · 1w ago',
    aiSummary:
      'Treatment-resistant depression is hard to catch early. The study combines two signals clinicians rarely fuse at intake: night-to-night sleep variability from wearables and baseline inflammation markers from blood panels.\n\nIn a prospective cohort of roughly 2,400 people, the combined profile improved early stratification compared with either signal alone—suggesting heterogeneity that standard severity scores miss.\n\nCaveat: this is observational; the value is in triage and trial design, not a standalone diagnostic. Still, it is a credible template for digital + lab fusion in psychiatry.',
    stats: { saves: 56, thread: 6 },
    tags: ['Psychiatry', 'Digital health'],
    citations: 41,
    likes: 512,
    comments: 48,
  },
  {
    id: 'f4',
    interestIds: ['hci', 'social'],
    authorLine: 'Nguyen & Brooks',
    title: 'Participatory design for crisis informatics on low bandwidth',
    meta: 'CHI · 3d ago',
    aiSummary:
      'Crisis informatics tools often assume bandwidth that NGOs in the field do not have. The authors ran participatory design sessions with frontline groups to understand what “good enough” sync looks like when uploads are expensive and intermittent.\n\nThe resulting patterns batch and compress state changes, defer non-critical sync, and still preserve audit trails that funders require. The paper is explicit about the tension between low bandwidth and accountability.\n\nUseful if you build offline-first civic or humanitarian tech—the requirements read like a checklist for respectful deployment.',
    stats: { saves: 41, thread: 11 },
    tags: ['HCI', 'Crisis informatics'],
    citations: 33,
    likes: 389,
    comments: 72,
  },
  {
    id: 'f5',
    interestIds: ['physics', 'materials'],
    authorLine: 'Ibrahim, Frost',
    title: 'Stability windows in hybrid perovskites under pulsed illumination',
    meta: 'ACS Energy Letters · 4d ago',
    aiSummary:
      'Hybrid perovskites look great in the lab but outdoor performance still surprises people. Steady-state spectroscopy has missed a trap state that shows up clearly under pulsed illumination.\n\nThe key point is reversibility: the trap fills and empties on timescales relevant to real sunlight flicker and partial shading, so lab IV curves can be overly optimistic.\n\nFor materials and PV engineers, the implication is to validate stability protocols that mimic dynamic outdoor light, not just continuous illumination.',
    stats: { saves: 33, thread: 5 },
    tags: ['Materials', 'Photovoltaics'],
    citations: 27,
    likes: 276,
    comments: 31,
  },
]

const climateSessionPapers: readonly FeedItem[] = [
  {
    id: 'ci1',
    interestIds: ['climate', 'policy'],
    authorLine: 'Martinez, Singh & Okafor',
    title: 'Municipal bond spreads after repeated coastal flood shocks',
    meta: 'Journal of Urban Economics · 4d ago',
    aiSummary:
      'Credit markets react slowly to chronic flooding until a threshold of repeat losses is crossed. The authors link FEMA claims, tide-gauge anomalies, and secondary-market spreads for county-level bonds.\n\nAfter three major flood seasons within a decade, spreads widen in ways that simple “one-off disaster” models miss—suggesting markets are pricing a higher tail for maintenance backlogs and migration risk.\n\nUseful if you model infrastructure finance: the paper separates liquidity shocks from slow-moving adaptation capital needs.',
    stats: { saves: 72, thread: 8 },
    tags: ['Climate finance', 'Infrastructure'],
    citations: 55,
    likes: 418,
    comments: 39,
  },
  {
    id: 'ci2',
    interestIds: ['energy', 'climate'],
    authorLine: 'Hansen et al.',
    title: 'Transformer thermal derating under compound heat and humidity',
    meta: 'IEEE Transactions on Power Systems · 6d ago',
    aiSummary:
      'Grid planners often derate transformers using dry-bulb temperature alone. This study shows wet-bulb conditions materially shorten insulation life during heat waves—especially when night-time cooling is weak.\n\nThe empirical section uses utility telemetry from three regions; the headline is that correlated heat-humidity events push effective ratings lower than legacy tables assume.\n\nPractical implication: if you optimize storage siting or maintenance windows, joint heat-humidity stress should enter the constraint set.',
    stats: { saves: 61, thread: 7 },
    tags: ['Energy systems', 'Extreme heat'],
    citations: 38,
    likes: 302,
    comments: 28,
  },
  {
    id: 'ci3',
    interestIds: ['climate', 'energy'],
    authorLine: 'Kowalski & Rahman',
    title: 'Nature-based buffers and peak runoff in retrofit watersheds',
    meta: 'Water Resources Research · 1w ago',
    aiSummary:
      'Retrofits like bioswales and permeable pavement rarely get evaluated as a portfolio. The authors simulate paired watersheds with heterogeneous soil and impervious cover.\n\nThe surprising piece is timing: distributed green infrastructure can shave peaks more than centralized detention when storms arrive in quick succession—because local storage refills asynchronously.\n\nIf you work on urban hydrology or resilience bonds, the scenarios are a decent template for co-benefit accounting.',
    stats: { saves: 44, thread: 5 },
    tags: ['Hydrology', 'Green infrastructure'],
    citations: 29,
    likes: 198,
    comments: 19,
  },
  {
    id: 'ci4',
    interestIds: ['climate', 'policy'],
    authorLine: 'Duarte, Blake',
    title: 'Satellite flood extent maps for parametric reinsurance design',
    meta: 'Nature Climate Change · 3d ago',
    aiSummary:
      'Parametric insurance hinges on triggers that are fast and hard to dispute. The paper benchmarks several flood masks against hydrology-grade references and shows where coarse resolution creates false positives near levees.\n\nThey propose a conservative fusion rule that trades a little sensitivity for fewer payout disputes—important when products cover low-income counties.\n\nTakeaway: remote sensing can scale coverage, but trigger design needs explicit error budgets, not just headline AUC.',
    stats: { saves: 58, thread: 9 },
    tags: ['Remote sensing', 'Risk transfer'],
    citations: 47,
    likes: 356,
    comments: 44,
  },
]

const urbanMobilityPapers: readonly FeedItem[] = [
  {
    id: 'um1',
    interestIds: ['robotics', 'policy'],
    authorLine: 'Fischer & Adeyemi',
    title: 'Headway instability and passenger-perceived reliability on BRT corridors',
    meta: 'Transportation Research Part C · 5d ago',
    aiSummary:
      'Bus rapid transit fails in the rider experience when bunching collapses effective frequency. The authors fit a lightweight model to AVL data and show how small disruptions propagate under dedicated-lane designs with limited overtaking.\n\nTheir intervention menu is operational—holding policies, short-turning, and targeted driver coaching—rather than capital-heavy.\n\nIf you build transit analytics, the paper is a good reminder that reliability metrics should be distribution-based, not averages.',
    stats: { saves: 51, thread: 10 },
    tags: ['Transit', 'Operations'],
    citations: 36,
    likes: 267,
    comments: 61,
  },
  {
    id: 'um2',
    interestIds: ['hci', 'policy'],
    authorLine: 'Torres et al.',
    title: 'Street redesigns and injury rates after micromobility adoption waves',
    meta: 'Injury Prevention · 2w ago',
    aiSummary:
      'Cities often add bike lanes reactively after crashes spike. This natural-experiment stack compares injury trends around protected lanes, painted lanes, and “shared street” pilots.\n\nProtected infrastructure shows the clearest drop for mixed traffic speeds above ~25 mph; paint-only improvements fade when curb cuts and loading zones create conflict points.\n\nUseful framing for planners: the safety case is strongest when design enforces predictable separation, not just signage.',
    stats: { saves: 39, thread: 12 },
    tags: ['Micromobility', 'Street design'],
    citations: 24,
    likes: 511,
    comments: 103,
  },
  {
    id: 'um3',
    interestIds: ['robotics', 'ml-ai'],
    authorLine: 'Zhao, Mensah',
    title: 'Robust routing under stochastic dwell times for multimodal trips',
    meta: 'ACM SIGSPATIAL · 1w ago',
    aiSummary:
      'Multimodal trip planners usually treat transfers as deterministic. The authors learn dwell-time distributions from smart-card taps and show that risk-aware routing reduces missed-connection rates without huge time penalties.\n\nThe trick is a small set of “fragile transfer” hubs where variance dominates mean wait—targeting those edges changes recommended paths materially.\n\nIf you ship navigation products, the method is a pragmatic way to encode reliability preferences without full simulation.',
    stats: { saves: 33, thread: 6 },
    tags: ['Routing', 'Public transit'],
    citations: 19,
    likes: 184,
    comments: 22,
  },
  {
    id: 'um4',
    interestIds: ['policy', 'energy'],
    authorLine: 'Ellis & Park',
    title: 'Curb digitization pilots and last-mile delivery dwell externalities',
    meta: 'Transport Policy · 4d ago',
    aiSummary:
      'Loading zones are still allocated with rules written for box trucks. The paper evaluates digital curb bookings in two downtowns, linking permit data to double-parking citations and bus delay.\n\nBooked curbs cut illegal stops in treated blocks, but spillover shows up on adjacent streets unless the pilot expands capacity or shifts time windows.\n\nPolicy point: curb management is a network problem—partial digitization can shuffle congestion rather than eliminate it.',
    stats: { saves: 47, thread: 8 },
    tags: ['Urban freight', 'Curbside'],
    citations: 31,
    likes: 229,
    comments: 35,
  },
]

const alignmentSessionPapers: readonly FeedItem[] = [
  {
    id: 'ar1',
    interestIds: ['ml-ai', 'neuro'],
    authorLine: 'Bridges, Yamamoto',
    title: 'Sparse dictionary features track harmfulness cues in refusal behavior',
    meta: 'NeurIPS safety workshop · 3d ago',
    aiSummary:
      'Interpretability often stops at pretty dashboards. Here the authors train sparse autoencoders on a mid-size chat model and link specific latents to refusal triggers—jailbreak templates, medical risk hedging, and coercion framings cluster on different features.\n\nThe evaluation is careful: they intervene by steering small subsets and measure downstream harm proxies on red-team suites.\n\nIf you care about monitoring, the takeaway is that localized feature edits can be a cheaper probe than full fine-tunes for understanding failure modes.',
    stats: { saves: 94, thread: 18 },
    tags: ['Interpretability', 'Safety'],
    citations: 62,
    likes: 891,
    comments: 142,
  },
  {
    id: 'ar2',
    interestIds: ['ml-ai', 'social'],
    authorLine: 'Caldwell et al.',
    title: 'Sycophancy gradients in human preference datasets for chat assistants',
    meta: 'ACL · 5d ago',
    aiSummary:
      'RLHF datasets compress a messy social contract into pairwise labels. The paper measures how often annotators reward agreeable-but-wrong answers, and shows the effect is stronger on politically charged prompts.\n\nThey propose a simple debiasing filter that down-weights pairs where the “preferred” response flatters a false premise—without nuking overall helpfulness scores on benign tasks.\n\nPractical note: the fix is dataset-level, not a new loss; teams can trial it without retraining base models.',
    stats: { saves: 112, thread: 22 },
    tags: ['RLHF', 'Data quality'],
    citations: 71,
    likes: 1104,
    comments: 198,
  },
  {
    id: 'ar3',
    interestIds: ['ml-ai'],
    authorLine: 'Nair & Kostova',
    title: 'Debate-style critics improve oversight on long-form coding tasks',
    meta: 'ICML · 1w ago',
    aiSummary:
      'Scalable oversight breaks when tasks are too long for a single rater. The authors pit two critic models against each other with a judge, then distill the outcome into a cheaper verifier.\n\nOn multi-file patches, the debate protocol reduces false approvals compared with single-critic review at matched token budget.\n\nCaveat: collusion-style failures still appear on adversarially chosen prompts—so the method is a wedge, not a guarantee.',
    stats: { saves: 88, thread: 15 },
    tags: ['Scalable oversight', 'Code models'],
    citations: 54,
    likes: 756,
    comments: 91,
  },
  {
    id: 'ar4',
    interestIds: ['ml-ai', 'robotics'],
    authorLine: 'Petrov, Silva',
    title: 'Specification gaming in RL from human feedback for embodied agents',
    meta: 'CoRL · 2w ago',
    aiSummary:
      'Embodied RLHF is tempting because humans can score trajectories quickly. The authors catalog ways agents satisfy the reward interface while violating intent—contact-minimizing “hover” policies, camera occlusion tricks, and tool misuse that looks compliant in logs.\n\nThey propose logging richer state constraints and periodic counterfactual rollouts judged by humans on short clips.\n\nIf you ship sim-to-real stacks, the case studies read like a preflight checklist for reward hacking.',
    stats: { saves: 76, thread: 13 },
    tags: ['RLHF', 'Embodied AI'],
    citations: 48,
    likes: 623,
    comments: 87,
  },
]

const sessions = [
  {
    id: 'climate-infra',
    title: 'Climate risk & infrastructure',
    meta: '6 collaborators · 24 papers',
    papers: climateSessionPapers,
  },
  {
    id: 'urban-mobility',
    title: 'Urban mobility lab',
    meta: '3 collaborators · curated stream',
    papers: urbanMobilityPapers,
  },
  {
    id: 'alignment-reading',
    title: 'Alignment reading group',
    meta: '8 members · weekly digest',
    papers: alignmentSessionPapers,
  },
] as const

type MainPanel = 'feed' | 'discover' | 'authors'

type NewSessionModalStep = 'choose' | 'paper' | 'upload'

function IconPaper({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  )
}

function IconAuthor({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconUploadPdf({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  )
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="12" x2="12" y1="5" y2="19" />
      <line x1="5" x2="19" y1="12" y2="12" />
    </svg>
  )
}

function SidebarNavIconDiscover({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  )
}

function SidebarNavIconSearch({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

const sidebarNavBtn =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[0.8125rem] font-medium text-slate-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50'

const sidebarNavBtnActive =
  'border border-violet-200/80 bg-linear-to-r from-cyan-500/[0.16] via-violet-500/[0.14] to-violet-600/[0.16] font-semibold text-slate-900 shadow-md shadow-violet-500/15 ring-2 ring-violet-500/45'

const sidebarNavBtnIdle = 'border border-transparent hover:bg-slate-200/70'

const sessionRowBtn =
  'w-full truncate rounded-lg border border-transparent px-3 py-2.5 text-left text-[0.8125rem] text-slate-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 hover:bg-slate-200/70'

const sessionRowActive =
  'border-violet-200/80 bg-linear-to-r from-cyan-500/[0.14] via-violet-500/[0.12] to-violet-600/[0.14] font-semibold text-slate-900 shadow-md shadow-violet-500/12 ring-2 ring-violet-500/40'

export default function DiscoverPage() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [phase, setPhase] = useState<'interests' | 'done'>('interests')
  const [mainPanel, setMainPanel] = useState<MainPanel>('discover')
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [newSessionOpen, setNewSessionOpen] = useState(false)
  const [newSessionStep, setNewSessionStep] =
    useState<NewSessionModalStep>('choose')
  const [paperQuery, setPaperQuery] = useState('')
  const [pdfLabel, setPdfLabel] = useState<string | null>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleContinue = () => {
    if (selected.size === 0) return
    setPhase('done')
  }

  const closeNewSessionModal = useCallback(() => {
    setNewSessionOpen(false)
    setNewSessionStep('choose')
    setPaperQuery('')
    setPdfLabel(null)
    const el = pdfInputRef.current
    if (el) el.value = ''
  }, [])

  const finishNewSessionFromPaperOrPdf = useCallback(() => {
    closeNewSessionModal()
    setActiveSessionId(null)
    setMainPanel('discover')
  }, [closeNewSessionModal])

  const prioritizedFeed = useMemo(() => {
    const session = activeSessionId
      ? sessions.find((s) => s.id === activeSessionId)
      : undefined

    if (session) {
      return [...session.papers]
    }

    const scored = feedItems.map((item) => {
      const match = item.interestIds.some((id) => selected.has(id))
      return { item, match }
    })
    return scored
      .sort((a, b) => Number(b.match) - Number(a.match))
      .map((s) => s.item)
  }, [selected, activeSessionId])

  useEffect(() => {
    if (phase !== 'interests') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'done' || !newSessionOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [phase, newSessionOpen])

  const interestsModal =
    phase === 'interests' ? (
      <div className="fixed inset-0 z-10000 flex items-end justify-center p-4 pb-6 sm:items-center sm:pb-4">
        <div
          className="absolute inset-0 bg-white/90 backdrop-blur-2xl backdrop-saturate-150"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-20%,rgba(6,182,212,0.06),transparent_50%),radial-gradient(ellipse_80%_55%_at_100%_15%,rgba(124,58,237,0.05),transparent_45%),radial-gradient(ellipse_60%_50%_at_0%_90%,rgba(59,130,246,0.04),transparent_45%)]"
          aria-hidden="true"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="interest-dialog-title"
          aria-describedby="interest-dialog-desc"
          className="relative flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/40 bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.28),0_0_0_1px_rgba(255,255,255,0.6)_inset] ring-1 ring-slate-200/50"
        >
          <div className="shrink-0 border-b border-slate-100/90 bg-white px-5 pt-5 pb-4">
            <p
              className={`text-[0.72rem] font-semibold tracking-[0.12em] uppercase ${gradientText}`}
            >
              Discover
            </p>
            <h2
              id="interest-dialog-title"
              className="font-display mt-2 text-[clamp(1.15rem,3.5vw,1.35rem)] leading-tight font-bold tracking-[-0.02em] text-heading"
            >
              What are you interested in?
            </h2>
            <p
              id="interest-dialog-desc"
              className="mt-2 text-[0.875rem] leading-relaxed text-muted"
            >
              Select the areas that match your research. Choose as many as you
              like—we will use this to tune recommendations and Session ideas.
            </p>
          </div>

          <p id="interest-hint" className="sr-only">
            Toggle each topic on or off. Select at least one to continue.
          </p>

          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4">
            <div
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              role="group"
              aria-label="Research interests"
              aria-describedby="interest-hint"
            >
              {INTERESTS.map((item) => {
                const isOn = selected.has(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => toggle(item.id)}
                    className={`rounded-xl border px-3.5 py-3 text-left text-[0.875rem] font-medium transition-all duration-150 ${
                      isOn
                        ? 'border-transparent bg-linear-to-r from-cyan-500/15 via-blue-500/12 to-violet-500/15 text-heading shadow-md shadow-violet-500/10 ring-2 ring-violet-500/40'
                        : 'border-border/90 bg-white text-foreground hover:border-violet-200 hover:bg-slate-50/70'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 text-[10px] font-bold ${
                          isOn
                            ? 'border-violet-600 bg-violet-600 text-white'
                            : 'border-slate-300 bg-white text-transparent'
                        }`}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="shrink-0 space-y-3 border-t border-slate-100/80 bg-white px-5 py-4">
            <p className="text-center text-xs text-muted">
              {selected.size === 0
                ? 'Select at least one topic to continue.'
                : `${selected.size} selected`}
            </p>
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <Link
                to="/"
                className={`${btnBase} justify-center border border-border bg-white px-5 py-2.5 text-foreground shadow-sm hover:bg-canvas-muted sm:min-w-0`}
              >
                Cancel
              </Link>
              <button
                type="button"
                disabled={selected.size === 0}
                onClick={handleContinue}
                className={`${btnPrimary} justify-center px-6 disabled:pointer-events-none disabled:opacity-40`}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    ) : null

  const newSessionModal =
    phase === 'done' && newSessionOpen ? (
      <div className="fixed inset-0 z-10001 flex items-end justify-center p-4 pb-6 sm:items-center sm:pb-4">
        <button
          type="button"
          className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
          aria-label="Close dialog"
          onClick={closeNewSessionModal}
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-20%,rgba(6,182,212,0.07),transparent_50%),radial-gradient(ellipse_80%_55%_at_100%_15%,rgba(124,58,237,0.06),transparent_45%)]"
          aria-hidden
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-session-title"
          aria-describedby="new-session-desc"
          className="relative flex max-h-[min(90vh,680px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/40 bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.28),0_0_0_1px_rgba(255,255,255,0.6)_inset] ring-1 ring-slate-200/50"
        >
          <div className="shrink-0 border-b border-slate-100/90 bg-white px-5 pt-5 pb-4">
            {newSessionStep !== 'choose' ? (
              <button
                type="button"
                onClick={() => {
                  setNewSessionStep('choose')
                  setPaperQuery('')
                  setPdfLabel(null)
                  const el = pdfInputRef.current
                  if (el) el.value = ''
                }}
                className="mb-3 -ml-1 flex items-center gap-1 rounded-lg px-1 py-1 text-[0.8125rem] font-medium text-violet-700 transition-colors hover:bg-violet-50"
              >
                <span aria-hidden>←</span> Back
              </button>
            ) : null}
            <p
              className={`text-[0.72rem] font-semibold tracking-[0.12em] uppercase ${gradientText}`}
            >
              Sessions
            </p>
            <h2
              id="new-session-title"
              className="font-display mt-2 text-[clamp(1.1rem,3.2vw,1.3rem)] leading-tight font-bold tracking-[-0.02em] text-heading"
            >
              {newSessionStep === 'choose'
                ? 'Start a new session'
                : newSessionStep === 'paper'
                  ? 'Start from a paper'
                  : 'Start from a PDF'}
            </h2>
            <p
              id="new-session-desc"
              className="mt-2 text-[0.875rem] leading-relaxed text-muted"
            >
              {newSessionStep === 'choose'
                ? 'Pick how you want to seed your session—we will build a feed and collaborators around it.'
                : newSessionStep === 'paper'
                  ? 'Search by title, DOI, arXiv ID, or keywords.'
                  : 'Upload a PDF to extract metadata and related work (demo: file stays in your browser).'}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4">
            {newSessionStep === 'choose' ? (
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => setNewSessionStep('paper')}
                  className="flex w-full items-start gap-3 rounded-xl border border-slate-200/90 bg-white px-3.5 py-3.5 text-left shadow-sm transition-all hover:border-violet-200 hover:bg-slate-50/80 hover:shadow-md focus-visible:ring-2 focus-visible:ring-violet-400/50"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-cyan-500/15 to-violet-500/20 text-violet-700">
                    <IconPaper className="text-violet-700" />
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className="block text-[0.9rem] font-semibold text-heading">
                      Search for a paper
                    </span>
                    <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">
                      Find a publication to anchor recommendations and threads.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeNewSessionModal()
                    setActiveSessionId(null)
                    setMainPanel('authors')
                  }}
                  className="flex w-full items-start gap-3 rounded-xl border border-slate-200/90 bg-white px-3.5 py-3.5 text-left shadow-sm transition-all hover:border-violet-200 hover:bg-slate-50/80 hover:shadow-md focus-visible:ring-2 focus-visible:ring-violet-400/50"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-cyan-500/15 to-violet-500/20 text-violet-700">
                    <IconAuthor className="text-violet-700" />
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className="block text-[0.9rem] font-semibold text-heading">
                      Search for an author
                    </span>
                    <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">
                      Open author search and start a session from their graph.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewSessionStep('upload')}
                  className="flex w-full items-start gap-3 rounded-xl border border-slate-200/90 bg-white px-3.5 py-3.5 text-left shadow-sm transition-all hover:border-violet-200 hover:bg-slate-50/80 hover:shadow-md focus-visible:ring-2 focus-visible:ring-violet-400/50"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-cyan-500/15 to-violet-500/20 text-violet-700">
                    <IconUploadPdf className="text-violet-700" />
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className="block text-[0.9rem] font-semibold text-heading">
                      Upload a PDF
                    </span>
                    <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">
                      Drop a preprint or paper file to bootstrap your session.
                    </span>
                  </span>
                </button>
              </div>
            ) : null}

            {newSessionStep === 'paper' ? (
              <div className="flex flex-col gap-4">
                <label className="block" htmlFor="new-session-paper-q">
                  <span className="sr-only">Search papers</span>
                  <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-2.5 shadow-inner shadow-slate-100 focus-within:ring-2 focus-within:ring-violet-400/40">
                    <input
                      id="new-session-paper-q"
                      type="search"
                      value={paperQuery}
                      onChange={(e) => setPaperQuery(e.target.value)}
                      placeholder="Title, DOI, arXiv, keywords…"
                      className="m-0 w-full border-0 bg-transparent p-0 font-inherit text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      autoComplete="off"
                    />
                  </div>
                </label>
                <button
                  type="button"
                  disabled={!paperQuery.trim()}
                  onClick={finishNewSessionFromPaperOrPdf}
                  className={`${btnPrimary} w-full justify-center py-2.5 disabled:pointer-events-none disabled:opacity-40`}
                >
                  Start session
                </button>
              </div>
            ) : null}

            {newSessionStep === 'upload' ? (
              <div className="flex flex-col gap-4">
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  id="new-session-pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    setPdfLabel(f ? f.name : null)
                  }}
                />
                <label
                  htmlFor="new-session-pdf"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const f = e.dataTransfer.files[0]
                    if (f?.type === 'application/pdf' || f?.name.toLowerCase().endsWith('.pdf')) {
                      setPdfLabel(f.name)
                    }
                  }}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300/90 bg-slate-50/60 px-4 py-10 text-center transition-colors hover:border-violet-300 hover:bg-violet-50/30"
                >
                  <IconUploadPdf className="mx-auto text-slate-400" />
                  <span className="mt-3 text-sm font-semibold text-slate-800">
                    Choose PDF or drop file here
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    {pdfLabel ?? 'PDF only · processed locally in this demo'}
                  </span>
                </label>
                <button
                  type="button"
                  disabled={!pdfLabel}
                  onClick={finishNewSessionFromPaperOrPdf}
                  className={`${btnPrimary} w-full justify-center py-2.5 disabled:pointer-events-none disabled:opacity-40`}
                >
                  Start session
                </button>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-slate-100/80 bg-white px-5 py-4">
            <button
              type="button"
              onClick={closeNewSessionModal}
              className={`${btnBase} w-full justify-center border border-border bg-white px-5 py-2.5 text-foreground shadow-sm hover:bg-canvas-muted`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    ) : null

  return (
    <main
      className={
        phase === 'done'
          ? 'flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-white'
          : 'flex min-h-dvh flex-col bg-white'
      }
    >
        {phase === 'done' ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
            <aside
              className="flex max-h-[42vh] w-full min-h-0 shrink-0 flex-col overflow-y-auto border-slate-200 bg-[#ececf0] lg:max-h-none lg:h-full lg:min-h-0 lg:w-[260px] lg:shrink-0 lg:border-r"
              aria-label="Workspace"
            >
              <div className="shrink-0 px-3 pt-3 pb-2">
                <MindMeshWordmark />
              </div>
              <div className="flex flex-col gap-1 p-2 pt-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSessionId(null)
                    setMainPanel((p) =>
                      p === 'discover' ? 'feed' : 'discover',
                    )
                  }}
                  className={`${sidebarNavBtn} ${mainPanel === 'discover' ? sidebarNavBtnActive : sidebarNavBtnIdle}`}
                >
                  <SidebarNavIconDiscover
                    className={`shrink-0 ${mainPanel === 'discover' ? 'text-violet-700' : 'text-slate-600 opacity-80'}`}
                  />
                  Discover
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSessionId(null)
                    setMainPanel((p) => (p === 'authors' ? 'discover' : 'authors'))
                  }}
                  className={`${sidebarNavBtn} ${mainPanel === 'authors' ? sidebarNavBtnActive : sidebarNavBtnIdle}`}
                >
                  <SidebarNavIconSearch
                    className={`shrink-0 ${mainPanel === 'authors' ? 'text-violet-700' : 'text-slate-600 opacity-80'}`}
                  />
                  Search author
                </button>
              </div>

              <div className="mx-2 border-t border-slate-300/50" />

              <div className="flex min-h-0 flex-1 flex-col px-2 pt-2 pb-2">
                <p className="px-3 py-2 text-[0.6875rem] font-medium tracking-wide text-slate-500 uppercase">
                  Sessions
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNewSessionOpen(true)
                    setNewSessionStep('choose')
                    setPaperQuery('')
                    setPdfLabel(null)
                    const el = pdfInputRef.current
                    if (el) el.value = ''
                  }}
                  className={`${sidebarNavBtn} ${sidebarNavBtnIdle} mb-1.5 font-medium text-slate-800`}
                >
                  <IconPlus className="shrink-0 text-violet-600 opacity-90" />
                  New session
                </button>
                <ul className="m-0 flex min-h-0 list-none flex-col gap-0.5 overflow-y-auto p-0 [scrollbar-width:thin]">
                  {sessions.map((s) => {
                    const isActive =
                      activeSessionId === s.id && mainPanel === 'feed'
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setMainPanel('feed')
                            setActiveSessionId(s.id)
                          }}
                          className={`${sessionRowBtn} ${isActive ? sessionRowActive : ''}`}
                          title={s.meta}
                        >
                          {s.title}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div className="mt-auto border-t border-slate-300/50 p-2">
                <Link
                  to="/"
                  className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white/95 px-2.5 py-2 shadow-md shadow-slate-300/25 ring-1 ring-white/80 transition-colors outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-violet-400/50 no-underline"
                  aria-label={`Go to home (signed in as @${demoProfile.username})`}
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-violet-600 text-[0.65rem] font-bold text-white shadow-sm"
                    aria-hidden
                  >
                    {demoProfile.initials}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-left text-[0.8125rem] font-semibold text-slate-800">
                    @{demoProfile.username}
                  </span>
                </Link>
              </div>
            </aside>

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100/95">
                <div
                  className="pointer-events-none absolute inset-0 opacity-100"
                  aria-hidden
                  style={{
                    backgroundImage:
                      'radial-gradient(ellipse 70% 50% at 80% 20%, rgba(139,92,246,0.06), transparent), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(6,182,212,0.05), transparent)',
                  }}
                />
                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                  {mainPanel === 'feed' || mainPanel === 'discover' ? (
                      <section
                        className="flex min-h-0 flex-1 flex-col overflow-hidden"
                        aria-label="Research feed"
                      >
                        <h1 className="sr-only">Research feed</h1>
                        <div
                          className="min-h-0 flex-1 basis-0 snap-y snap-mandatory overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] touch-pan-y"
                          tabIndex={0}
                          role="region"
                          aria-label="Paper reels—scroll up or down to go to the next paper"
                        >
                        {prioritizedFeed.map((post, reelIndex) => {
                          const matched = post.interestIds.some((id) =>
                            selected.has(id),
                          )
                          const progressPct =
                            ((reelIndex + 1) / prioritizedFeed.length) * 100
                          return (
                            <article
                              key={post.id}
                              className="flex min-h-full snap-start snap-always shrink-0 flex-col justify-center px-4 py-3"
                            >
                              <div className="relative mx-auto w-full min-h-[min(472px,66svh)] max-w-[420px] overflow-hidden rounded-[1.25rem] border border-slate-200/90 bg-white/95 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.12)] ring-1 ring-slate-100/80 backdrop-blur-sm">
                                <div
                                  className="pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full bg-violet-400/15 blur-3xl"
                                  aria-hidden
                                />
                                <div
                                  className="pointer-events-none absolute bottom-1/3 -left-12 h-32 w-32 rounded-full bg-cyan-400/12 blur-3xl"
                                  aria-hidden
                                />
                                <div className="relative px-5 pt-3 pb-1 sm:pt-3.5">
                                  <div className="flex items-start justify-between gap-3">
                                    <h2 className="m-0 min-w-0 flex-1 text-[1.35rem] leading-[1.2] font-bold tracking-tight text-slate-900 sm:text-[1.45rem]">
                                      {post.title}
                                    </h2>
                                    <button
                                      type="button"
                                      className="-mr-1 -mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
                                      aria-label={
                                        matched
                                          ? 'More options (recommended for you)'
                                          : 'More options'
                                      }
                                    >
                                      <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        aria-hidden="true"
                                      >
                                        <circle cx="5" cy="12" r="2" />
                                        <circle cx="12" cy="12" r="2" />
                                        <circle cx="19" cy="12" r="2" />
                                      </svg>
                                    </button>
                                  </div>
                                  <div className="mt-2.5 flex items-center gap-2.5">
                                    <div
                                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-violet-600 text-white shadow-md shadow-violet-500/20"
                                      aria-hidden
                                    >
                                      <UserCircleIcon className="size-[15px]" />
                                    </div>
                                    <p className="m-0 text-[0.8125rem] text-slate-500">
                                      {post.authorLine}
                                    </p>
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {post.tags.map((tag) => (
                                      <span
                                        key={tag}
                                        className="rounded-full border border-slate-200/90 bg-slate-100/90 px-3 py-1.5 text-[0.7rem] font-medium text-slate-700"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div
                                  className="relative mx-4 mb-0.5 mt-1 rounded-xl border border-slate-200/85 bg-linear-to-b from-slate-50/98 to-white px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-slate-100/70"
                                  aria-label="AI-generated summary"
                                >
                                  <p
                                    className={`m-0 text-[0.68rem] font-semibold tracking-[0.14em] uppercase ${gradientText}`}
                                  >
                                    AI summary
                                  </p>
                                  <div className="mt-2.5 space-y-2.5 text-[0.9rem] leading-[1.58] text-slate-700">
                                    {post.aiSummary.split('\n\n').map((para, i) => (
                                      <p key={`${post.id}-s-${i}`} className="m-0">
                                        {para}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                                <div className="relative flex items-center justify-between gap-3 px-5 pb-1 pt-4">
                                  <span className="text-[0.8125rem] font-medium text-slate-800">
                                    {formatCount(post.citations)} Citations
                                  </span>
                                  <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1.5 text-[0.8125rem] text-slate-600">
                                      <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        className="text-slate-400"
                                        aria-hidden="true"
                                      >
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                      </svg>
                                      {formatCount(post.likes)}
                                    </span>
                                    <span className="flex items-center gap-1.5 text-[0.8125rem] text-slate-600">
                                      <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="text-slate-400"
                                        aria-hidden="true"
                                      >
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                      </svg>
                                      {formatCount(post.comments)}
                                    </span>
                                  </div>
                                </div>
                                <div className="px-5 pb-5 pt-3">
                                  <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200/90">
                                    <div
                                      className="h-full rounded-full bg-linear-to-r from-cyan-500 to-violet-600 transition-[width] duration-300"
                                      style={{
                                        width: `${progressPct}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </article>
                          )
                        })}
                        </div>
                      </section>
                  ) : null}

                  {mainPanel === 'authors' ? (
                    <section
                      className="flex min-h-0 flex-1 basis-0 flex-col overflow-y-auto px-6 py-6"
                      aria-labelledby="authors-panel-title"
                    >
                      <h1
                        id="authors-panel-title"
                        className="m-0 text-lg font-semibold text-slate-900"
                      >
                        Search author
                      </h1>
                      <p className="mt-1 text-sm text-slate-500">
                        Find people in your research graph
                      </p>
                      <label className="sr-only" htmlFor="author-search-demo">
                        Search authors
                      </label>
                      <div className="mt-6 max-w-md rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 shadow-inner shadow-slate-100">
                        <input
                          id="author-search-demo"
                          type="search"
                          readOnly
                          defaultValue="lecun"
                          className="m-0 w-full border-0 bg-transparent p-0 font-inherit text-sm text-slate-900 outline-none placeholder:text-slate-400"
                          placeholder="Search authors…"
                          aria-label="Search authors (demo)"
                        />
                      </div>
                      <h2 className="mt-8 mb-0 max-w-md text-[0.8125rem] font-semibold tracking-wide text-slate-800">
                        Popular authors
                      </h2>
                      <ul className="mt-3 max-w-md list-none divide-y divide-slate-200/80 overflow-hidden rounded-xl border border-slate-200/90 bg-white p-0 shadow-sm">
                        {popularAuthorsWidget.map((a) => (
                          <li key={a.name}>
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                            >
                              <span
                                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-500 via-blue-600 to-cyan-400 text-[0.65rem] font-bold text-white shadow-md shadow-violet-500/25"
                                aria-hidden
                              >
                                {a.initials}
                              </span>
                              <span className="truncate text-[0.8125rem] font-medium text-slate-800">
                                {a.name}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      <h2 className="mt-8 mb-0 max-w-md text-[0.8125rem] font-semibold tracking-wide text-slate-800">
                        Matches
                      </h2>
                      <ul className="mt-3 max-w-md list-none space-y-2 p-0">
                        {authorSearchPreview.map((a) => (
                          <li key={a.name}>
                            <button
                              type="button"
                              className="w-full rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-slate-50"
                            >
                              <p className="m-0 text-sm font-semibold text-slate-900">
                                {a.name}
                              </p>
                              <p className="mt-0.5 mb-0 text-xs text-slate-500">
                                {a.affiliation}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
            </div>
          </div>
        ) : null}
        {interestsModal ? createPortal(interestsModal, document.body) : null}
        {newSessionModal
          ? createPortal(newSessionModal, document.body)
          : null}
    </main>
  )
}

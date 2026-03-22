import type { FeedItem } from './types'

export const INTERESTS = [
  { id: 'ml', label: 'Machine learning' },
  { id: 'ai', label: 'AI' },
  { id: 'biology', label: 'Biology' },
  { id: 'genomics', label: 'Genomics' },
  { id: 'climate', label: 'Climate' },
  { id: 'sustainability', label: 'Sustainability' },
  { id: 'physics', label: 'Physics' },
  { id: 'applied-math', label: 'Applied math' },
  { id: 'medicine', label: 'Medicine' },
  { id: 'health', label: 'Health' },
  { id: 'hci', label: 'HCI' },
  { id: 'design', label: 'Design' },
  { id: 'computing', label: 'Computing' },
  { id: 'neuro', label: 'Neuroscience' },
  { id: 'cognition', label: 'Cognition' },
  { id: 'chemistry', label: 'Chemistry' },
  { id: 'materials', label: 'Materials' },
  { id: 'robotics', label: 'Robotics' },
  { id: 'systems', label: 'Systems' },
  { id: 'economics', label: 'Economics' },
  { id: 'policy', label: 'Policy' },
  { id: 'social-science', label: 'Social science' },
  { id: 'behavioral-science', label: 'Behavioral science' },
  { id: 'energy', label: 'Energy' },
  { id: 'infrastructure', label: 'Infrastructure' },
] as const

export const authorSearchPreview = [
  { name: 'Yann LeCun', affiliation: 'NYU · Meta AI' },
  { name: 'Yoshua Bengio', affiliation: 'Mila' },
] as const

export const popularAuthorsWidget = [
  { name: 'Dr. Alan Roberts', initials: 'AR' },
  { name: 'Dr. Sarah Chen', initials: 'SC' },
  { name: 'Dr. James Okonkwo', initials: 'JO' },
] as const

export const demoProfile = {
  initials: 'AK',
  username: 'akshat_k',
  fullName: 'Akshat Khair',
  email: 'akshat@example.com',
  affiliation: 'MindMesh · Research',
  bio: 'Building tools for research discovery, sessions, and collaboration.',
} as const

export const demoSponsoredResearches = [
  {
    id: 'sp1',
    title: 'Benchmark suite for long-context retrieval under latency caps',
    sponsor: 'Helix Labs',
    status: 'Active',
    period: 'Jan 2025 – Dec 2025',
  },
  {
    id: 'sp2',
    title: 'Open dataset: municipal climate risk signals for bond markets',
    sponsor: 'Urban Futures Fund',
    status: 'Reporting',
    period: 'Pilot complete · final report due Q2',
  },
  {
    id: 'sp3',
    title: 'Safety monitoring hooks for instruction-tuned assistants',
    sponsor: 'Northwind AI',
    status: 'Completed',
    period: 'Wrapped Nov 2024',
  },
] as const

export const DEMO_ARXIV_IDS = [
  '1706.03762',
  '1810.04805',
  '1412.6980',
  '1509.06461',
  '2005.14165',
  '1607.06450',
  '1711.00105',
] as const

export const feedItems: readonly FeedItem[] = [
  {
    id: 'f1',
    interestIds: ['ml', 'ai'],
    authorLine:
      'Chen, Liu, Agrawal, Nakamura, Stojanović, van der Berg, Okonkwo, Patel, Frost, Kim, Santos, Brooks, Ibrahim & the LongContext Consortium',
    title:
      'Adaptive retrieval for long-context reasoning with bounded compute: a systems view across multi-hop QA, tool-using agents, and memory-augmented transformers under strict latency budgets',
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
    interestIds: ['hci', 'social-science'],
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

export const climateSessionPapers: readonly FeedItem[] = [
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

export const urbanMobilityPapers: readonly FeedItem[] = [
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
    interestIds: ['robotics', 'ml'],
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

export const alignmentSessionPapers: readonly FeedItem[] = [
  {
    id: 'ar1',
    interestIds: ['ml', 'ai', 'neuro'],
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
    interestIds: ['ml', 'ai', 'social-science'],
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
    interestIds: ['ml', 'ai'],
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
    interestIds: ['ml', 'ai', 'robotics'],
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

export const sessions = [
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

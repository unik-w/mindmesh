"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";

const SUGGESTED_TOPICS = [
  "Artificial Intelligence",
  "Neuroscience",
  "Climate Technology",
  "Longevity Research",
  "Quantum Computing",
  "Productivity Science",
];

const VALUE_PILLARS = [
  {
    title: "Personalized Discovery Feed",
    description:
      "Get papers, authors, conferences, jobs, and collaboration opportunities tailored to your domain and active projects.",
  },
  {
    title: "Sessions for Active Research",
    description:
      "Create project-based workspaces where papers, notes, collaborators, drafts, and discussions stay organized together.",
  },
  {
    title: "AI Gap Identification",
    description:
      "Spot what is solved, what is under-explored, and where high-impact research opportunities are emerging.",
  },
  {
    title: "Social + Funding Layer",
    description:
      "Follow topics and authors, join discussions, and connect with verified businesses, sponsors, and investors.",
  },
];

const ECOSYSTEM_ROLES = [
  "Students and early researchers",
  "Academic researchers",
  "Industry R&D teams",
  "Investors and sponsors",
  "Companies hiring research talent",
];

export default function Home() {
  const [topicInput, setTopicInput] = useState("");
  const [topics, setTopics] = useState<string[]>([]);

  const canAddTopic = useMemo(() => topicInput.trim().length > 1, [topicInput]);

  const addTopic = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;

    setTopics((previous) => {
      if (previous.some((topic) => topic.toLowerCase() === normalized.toLowerCase())) {
        return previous;
      }
      return [...previous, normalized];
    });
    setTopicInput("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addTopic(topicInput);
  };

  const removeTopic = (topicToRemove: string) => {
    setTopics((previous) => previous.filter((topic) => topic !== topicToRemove));
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div className="pointer-events-none absolute -top-36 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-300/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-violet-300/35 blur-3xl" />

      <main className="mx-auto w-full max-w-6xl px-6 py-16 lg:px-12">
        <section className="grid items-center gap-12 lg:min-h-screen lg:grid-cols-2">
          <div className="space-y-6">
            <Image
              src="/mindmesh-logo.png"
              alt="MindMesh logo"
              width={250}
              height={250}
              priority
            />
            <p className="inline-flex rounded-full border border-cyan-300/70 bg-cyan-100 px-4 py-1 text-sm text-cyan-700">
              Intelligent research social network
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Discover relevant research, collaborate faster, and turn ideas into innovation.
            </h1>
            <p className="max-w-xl text-lg text-slate-600">
              MindMesh combines AI-powered recommendations with project-based collaboration.
              Instead of searching endlessly, your research feed continuously brings the right
              papers, people, and opportunities to you.
            </p>
            <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                Personalized paper + author feed
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                Sessions for project workspaces
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                Research gap and trend detection
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                Collaboration, funding, and jobs
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-300/40 sm:p-8">
            <h2 className="text-2xl font-semibold">What are you curious about?</h2>
            <p className="mt-2 text-slate-600">
              Add topics to personalize your discovery feed.
            </p>

            <form className="mt-6 flex gap-3" onSubmit={handleSubmit}>
              <input
                type="text"
                value={topicInput}
                onChange={(event) => setTopicInput(event.target.value)}
                placeholder="e.g., AI in healthcare, startup finance"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!canAddTopic}
                className="rounded-xl bg-linear-to-r from-cyan-500 to-violet-600 px-5 py-3 text-sm font-semibold text-white transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTED_TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => addTopic(topic)}
                  className="rounded-full border border-cyan-300 bg-cyan-100 px-3 py-1 text-xs text-cyan-700 transition hover:bg-cyan-200"
                >
                  {topic}
                </button>
              ))}
            </div>

            <div className="mt-6 min-h-20 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {topics.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Your selected topics will show up here.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => removeTopic(topic)}
                      className="rounded-full border border-violet-300 bg-violet-100 px-3 py-1 text-xs text-violet-700 hover:bg-violet-200"
                    >
                      {topic} x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="button" className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Build My Research Feed
            </button>
          </div>
        </section>

        <section className="py-10">
          <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Why MindMesh
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Research is fragmented. MindMesh brings it into one intelligent loop.
            </h2>
            <p className="mt-3 max-w-4xl text-slate-700">
              Today, researchers spend too much time searching, filtering, and context-switching
              across tools. MindMesh reduces research friction so people spend less time hunting
              and more time creating.
            </p>
          </div>
        </section>

        <section className="py-10">
          <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">Core capabilities</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {VALUE_PILLARS.map((pillar) => (
              <article
                key={pillar.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h4 className="text-lg font-semibold text-slate-900">{pillar.title}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">{pillar.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 py-10 lg:grid-cols-2">
          <article className="rounded-2xl border border-violet-200 bg-violet-50 p-6">
            <h3 className="text-xl font-semibold">Built for the full research ecosystem</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {ECOSYSTEM_ROLES.map((role) => (
                <li key={role}>- {role}</li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6">
            <h3 className="text-xl font-semibold">Long-term platform effect</h3>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              More users create more papers, better recommendations, stronger discussions, and
              deeper collaboration. That network effect helps MindMesh become the default research
              discovery and collaboration layer across academia and industry.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}

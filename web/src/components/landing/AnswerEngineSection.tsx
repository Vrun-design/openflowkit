import React from 'react';

const proofPoints = [
  {
    title: 'Local-first by default',
    description:
      'Your diagrams, workspace state, and AI-related browser data stay on-device unless you choose to remove them.',
  },
  {
    title: 'Useful for real architecture work',
    description:
      'OpenFlowKit supports freeform diagramming, architecture mapping, AI-assisted drafting, structured imports, and handoff exports.',
  },
  {
    title: 'Built for editable output',
    description:
      'You can keep iterating in the canvas, export to Mermaid, or hand work off through SVG, PNG, and Figma-friendly paths.',
  },
];

const faqs = [
  {
    question: 'What is OpenFlowKit?',
    answer:
      'OpenFlowKit is an open-source, local-first diagramming tool for architecture diagrams, flowcharts, and AI-assisted visual workflows.',
  },
  {
    question: 'Who is OpenFlowKit for?',
    answer:
      'It is designed for engineers, architects, technical founders, and product teams who need editable diagrams instead of static AI image output.',
  },
  {
    question: 'Does OpenFlowKit require an account?',
    answer:
      'No. You can open the app and start diagramming without creating an account.',
  },
  {
    question: 'How does AI work in OpenFlowKit?',
    answer:
      'AI is optional. You bring your own API key in the settings modal, then use AI to draft, refine, or expand diagrams inside the editor.',
  },
];

export function AnswerEngineSection(): React.ReactElement {
  return (
    <section className="py-24 md:py-28 bg-white border-y border-brand-border/60">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.28em] text-brand-primary mb-4">
              Why OpenFlowKit
            </p>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-brand-dark leading-[0.95] mb-6">
              A local-first AI diagramming tool built for editable technical work.
            </h2>
            <p className="text-lg md:text-xl text-brand-secondary leading-relaxed max-w-2xl">
              OpenFlowKit helps teams turn rough system ideas into diagrams they can keep
              editing, exporting, and sharing. It is designed for architecture flows, system
              design, process mapping, and other diagram-heavy workflows where static output is
              not enough.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {proofPoints.map((item) => (
                <article
                  key={item.title}
                  className="rounded-3xl border border-brand-border bg-brand-canvas p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)]"
                >
                  <h3 className="text-lg font-semibold text-brand-dark mb-2">{item.title}</h3>
                  <p className="text-sm leading-6 text-brand-secondary">{item.description}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-brand-border bg-[#0f172a] p-8 text-white shadow-2xl">
            <p className="text-xs font-mono uppercase tracking-[0.28em] text-white/60 mb-4">
              Frequently Asked
            </p>
            <div className="space-y-5">
              {faqs.map((item) => (
                <article
                  key={item.question}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
                >
                  <h3 className="text-base font-semibold mb-2">{item.question}</h3>
                  <p className="text-sm leading-6 text-white/75">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface Props {
  content: string;
  variant?: "panel" | "insight-accent" | "insight-neutral";
  className?: string;
}

const baseComponents: Components = {
  p: ({ children }) => (
    <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-text-primary">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-text-secondary">{children}</em>,
  ul: ({ children }) => (
    <ul className="my-2 ml-4 list-disc space-y-1.5 marker:text-text-tertiary">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 ml-4 list-decimal space-y-1.5 marker:text-text-tertiary">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent underline underline-offset-2 hover:text-accent-hover break-all"
    >
      {children}
    </a>
  ),
  h1: ({ children }) => (
    <p className="mb-2 mt-1 font-semibold text-text-primary">{children}</p>
  ),
  h2: ({ children }) => (
    <p className="mb-2 mt-1 font-semibold text-text-primary">{children}</p>
  ),
  h3: ({ children }) => (
    <p className="mb-1.5 mt-1 font-medium text-text-primary">{children}</p>
  ),
  code: ({ children }) => (
    <code className="rounded bg-surface-2 px-1 py-0.5 text-[0.85em] font-mono text-text-secondary">
      {children}
    </code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-border-default pl-3 text-text-secondary italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border-subtle" />,
};

const insightAccentComponents: Components = {
  ...baseComponents,
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed text-accent">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-accent">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-accent/90">{children}</em>,
  ul: ({ children }) => (
    <ul className="my-2 ml-4 list-disc space-y-1.5 marker:text-accent/70">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 ml-4 list-decimal space-y-1.5 marker:text-accent/70">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed pl-0.5 text-accent">{children}</li>,
  h1: ({ children }) => <p className="mb-2 mt-1 font-semibold text-accent">{children}</p>,
  h2: ({ children }) => <p className="mb-2 mt-1 font-semibold text-accent">{children}</p>,
  h3: ({ children }) => <p className="mb-1.5 mt-1 font-medium text-accent">{children}</p>,
};

const insightNeutralComponents: Components = {
  ...baseComponents,
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed text-text-secondary">{children}</p>
  ),
  li: ({ children }) => <li className="leading-relaxed pl-0.5 text-text-secondary">{children}</li>,
  h1: ({ children }) => <p className="mb-2 mt-1 font-semibold text-text-primary">{children}</p>,
  h2: ({ children }) => <p className="mb-2 mt-1 font-semibold text-text-primary">{children}</p>,
  h3: ({ children }) => <p className="mb-1.5 mt-1 font-medium text-text-primary">{children}</p>,
};

export default function MarkdownContent({ content, variant = "panel", className = "" }: Props) {
  const components =
    variant === "insight-accent"
      ? insightAccentComponents
      : variant === "insight-neutral"
        ? insightNeutralComponents
        : baseComponents;

  const sizeClass =
    variant === "insight-accent" || variant === "insight-neutral" ? "text-xs" : "text-sm";

  return (
    <div className={`${sizeClass} text-text-primary ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

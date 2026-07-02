import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface Props {
  content: string;
  variant?: "assistant" | "user" | "panel";
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

const assistantComponents: Components = {
  ...baseComponents,
  p: ({ children }) => (
    <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-text-primary">{children}</strong>
  ),
  ol: ({ children }) => (
    <ol className="my-3 ml-5 list-decimal space-y-2 marker:text-text-primary">{children}</ol>
  ),
  ul: ({ children }) => (
    <ul className="my-3 ml-5 list-disc space-y-2 marker:text-text-primary">{children}</ul>
  ),
};

const userComponents: Components = {
  ...baseComponents,
  strong: ({ children }) => (
    <strong className="font-semibold text-text-primary">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-text-secondary">{children}</em>,
  code: ({ children }) => (
    <code className="rounded-md bg-[#f5e0e0] px-1.5 py-0.5 text-[0.85em] font-mono text-[#8b2942]">
      {children}
    </code>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent underline underline-offset-2 break-all hover:text-accent-hover"
    >
      {children}
    </a>
  ),
};

export default function MarkdownContent({
  content,
  variant = "panel",
  className = "",
}: Props) {
  const components =
    variant === "user"
      ? userComponents
      : variant === "assistant"
        ? assistantComponents
        : baseComponents;

  return (
    <div className={`text-sm text-text-primary ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

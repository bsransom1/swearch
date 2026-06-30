import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface Props {
  content: string;
  variant?: "assistant" | "user";
}

const assistantComponents: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-medium text-accent">{children}</strong>
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
    <p className="mb-2 font-medium text-text-primary">{children}</p>
  ),
  h2: ({ children }) => (
    <p className="mb-2 font-medium text-text-primary">{children}</p>
  ),
  h3: ({ children }) => (
    <p className="mb-1.5 font-medium text-text-primary">{children}</p>
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

const userComponents: Components = {
  ...assistantComponents,
  strong: ({ children }) => <strong className="font-medium text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-white/90">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 break-all text-white/90 hover:text-white"
    >
      {children}
    </a>
  ),
};

export default function ChatMarkdown({ content, variant = "assistant" }: Props) {
  const components = variant === "user" ? userComponents : assistantComponents;

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}

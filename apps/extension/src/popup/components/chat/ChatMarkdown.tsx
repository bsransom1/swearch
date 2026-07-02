import MarkdownContent from "../../../components/MarkdownContent";
import { withoutEmDash } from "@swearch/shared/text/without-em-dash";

interface Props {
  content: string;
  variant?: "assistant" | "user";
}

export default function ChatMarkdown({ content, variant = "assistant" }: Props) {
  const text = variant === "assistant" ? withoutEmDash(content) : content;
  return <MarkdownContent content={text} variant={variant} />;
}

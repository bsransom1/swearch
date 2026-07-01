import { SUGGESTION_CHIP } from "../../../lib/theme";

interface Props {
  questions: readonly string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export default function SuggestedQuestions({ questions, onSelect, disabled }: Props) {
  return (
    <div className="px-4 pb-2 flex-shrink-0">
      <div className="flex flex-col items-start gap-2">
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onSelect(question)}
            disabled={disabled}
            className={SUGGESTION_CHIP}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}

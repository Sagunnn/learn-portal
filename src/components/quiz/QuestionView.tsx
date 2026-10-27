import type { Question } from "../../types/content";
import FillQuestion from "./FillQuestion";
import McqQuestion from "./McqQuestion";

export interface QuestionProps {
  question: Question;
  onResolved?: (r: { firstTry: boolean }) => void;
  keyboard?: boolean;
  review?: boolean;
}

export default function QuestionView({ question, ...rest }: QuestionProps) {
  return question.type === "mcq" ? <McqQuestion question={question} {...rest} /> : <FillQuestion question={question} {...rest} />;
}

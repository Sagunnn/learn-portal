import { Atom, BookOpen, Calculator, Compass, Feather, FlaskConical, Globe, Leaf, type LucideIcon } from "lucide-react";
import type { Subject } from "../../types/content";

/** Crisp SVG icons for subjects (set `iconKey` in content/subjects.json). Falls back to the emoji. */
export const SUBJECT_ICONS: Record<string, LucideIcon> = {
  flask: FlaskConical,
  atom: Atom,
  calculator: Calculator,
  compass: Compass,
  book: BookOpen,
  feather: Feather,
  globe: Globe,
  leaf: Leaf,
};

export default function SubjectIcon({ subject, size = 24, className }: { subject: Subject; size?: number; className?: string }) {
  const Icon = subject.iconKey ? SUBJECT_ICONS[subject.iconKey] : undefined;
  if (!Icon) {
    return (
      <span className={className} style={{ fontSize: size }} aria-hidden>
        {subject.icon}
      </span>
    );
  }
  return <Icon size={size} strokeWidth={2.25} className={className} aria-hidden />;
}

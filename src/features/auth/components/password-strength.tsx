import { Progress, ProgressLabel } from "@/components/ui/progress";
import { m } from "@/paraglide/messages";

interface IPasswordStrengthProps {
  score: number | null;
}

const LABELS = [
  () => m.auth_password_strength_0(),
  () => m.auth_password_strength_1(),
  () => m.auth_password_strength_2(),
  () => m.auth_password_strength_3(),
  () => m.auth_password_strength_4(),
];

export default function PasswordStrength({ score }: IPasswordStrengthProps) {
  if (score === null) return null;
  return (
    <Progress value={(score + 1) * 20} aria-live="polite">
      <ProgressLabel>
        {m.auth_password_strength()}: {LABELS[score]?.()}
      </ProgressLabel>
    </Progress>
  );
}

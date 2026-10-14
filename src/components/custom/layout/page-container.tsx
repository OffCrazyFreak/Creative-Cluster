import { cn } from "cn";
import type { ReactNode } from "react";

const SIZES = {
  narrow: "max-w-md",
  prose: "max-w-3xl",
  default: "max-w-4xl",
  wide: "max-w-6xl",
} as const;

interface IPageContainerProps {
  size?: keyof typeof SIZES;
  as?: "section" | "article" | "div";
  className?: string;
  children: ReactNode;
}

// One centred column with the same page padding everywhere, so pages line up at every width.
export default function PageContainer({
  size = "default",
  as: Tag = "section",
  className,
  children,
}: IPageContainerProps) {
  return (
    <Tag
      className={cn(
        "mx-auto flex w-full min-w-0 flex-col gap-6 p-4 sm:p-8",
        SIZES[size],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

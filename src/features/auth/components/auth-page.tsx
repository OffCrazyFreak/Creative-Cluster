import type { ReactNode } from "react";

interface IAuthPageProps {
  title: string;
  intro?: string;
  children: ReactNode;
}

export default function AuthPage({ title, intro, children }: IAuthPageProps) {
  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {intro && <p>{intro}</p>}
      {children}
    </section>
  );
}

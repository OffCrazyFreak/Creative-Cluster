import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import PageContainer from "@/components/custom/layout/page-container";
import { m } from "@/paraglide/messages";

import type { IListItem } from "../directory-schemas";
import DirectoryEntryCard from "./directory-entry-card";
import DirectoryPagination from "./directory-pagination";

interface IDirectoryListPageProps {
  title: string;
  intro?: string;
  items: IListItem[];
  total: number;
  page: number;
  pageCount: number;
  children?: ReactNode;
}

export default function DirectoryListPage({
  title,
  intro,
  items,
  total,
  page,
  pageCount,
  children,
}: IDirectoryListPageProps) {
  return (
    <PageContainer>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {intro ? <p>{intro}</p> : null}
        <p>
          <Link to="/">{m.directory_view_on_map()}</Link>
        </p>
      </header>
      {children}
      <section aria-labelledby="directory-list" className="flex flex-col gap-4">
        <h2 id="directory-list" className="font-semibold">
          {m.directory_list_label()} ({m.directory_total({ total })})
        </h2>
        {items.length === 0 ? (
          <p>{m.directory_empty()}</p>
        ) : (
          <ul className="flex flex-col gap-5">
            {items.map((item) => (
              <DirectoryEntryCard key={item.slug} item={item} />
            ))}
          </ul>
        )}
        <DirectoryPagination page={page} pageCount={pageCount} />
      </section>
    </PageContainer>
  );
}

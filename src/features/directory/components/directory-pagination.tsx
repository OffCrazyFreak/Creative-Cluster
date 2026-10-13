import { Link } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

interface IDirectoryPaginationProps {
  page: number;
  pageCount: number;
}

export default function DirectoryPagination({
  page,
  pageCount,
}: IDirectoryPaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label={m.directory_pagination_label()}
      className="flex flex-wrap items-center justify-between gap-2"
    >
      {page > 1 ? (
        <Link
          to="."
          search={{ page: page - 1 }}
          rel="prev"
          className={buttonVariants({ variant: "outline" })}
        >
          {m.directory_pagination_previous()}
        </Link>
      ) : (
        <span />
      )}
      <span aria-current="page">
        {m.directory_page_label({ page, pageCount })}
      </span>
      {page < pageCount ? (
        <Link
          to="."
          search={{ page: page + 1 }}
          rel="next"
          className={buttonVariants({ variant: "outline" })}
        >
          {m.directory_pagination_next()}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

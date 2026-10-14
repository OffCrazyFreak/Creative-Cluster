import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { m } from "@/paraglide/messages";

import { unpinnedImportsQueryOptions } from "../import-queries";

export default function UnpinnedTable() {
  const { data } = useQuery(unpinnedImportsQueryOptions());
  if (!data) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{m.import_pins_title()}</h2>
      <p>{m.import_pins_intro()}</p>
      {data.length === 0 ? (
        <p>{m.import_pins_none()}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.import_col_name()}</TableHead>
              <TableHead className="hidden sm:table-cell">
                {m.import_col_address()}
              </TableHead>
              <TableHead>{m.import_col_pin()}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Link to="/admin/entry/$id" params={{ id: item.id }}>
                    {item.name}
                  </Link>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {item.addressText}
                </TableCell>
                <TableCell>
                  {item.precision === "town"
                    ? m.import_pin_town()
                    : m.import_pin_none()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

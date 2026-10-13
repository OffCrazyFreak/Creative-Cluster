import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { m } from "@/paraglide/messages";

import type { IAdminUserRow } from "../admin-users-schemas";
import UserActions from "./user-actions";

interface IUsersTableProps {
  users: IAdminUserRow[];
  viewerId: string;
}

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, IAdminUserRow>();

export default function UsersTable({ users, viewerId }: IUsersTableProps) {
  const columns = helper.columns([
    helper.accessor("name", {
      header: () => m.admin_users_col_name(),
      cell: ({ row }) =>
        row.original.id === viewerId
          ? `${row.original.name} (${m.admin_users_self()})`
          : row.original.name,
    }),
    helper.accessor("email", { header: () => m.admin_users_col_email() }),
    helper.accessor("role", {
      header: () => m.admin_users_col_role(),
      cell: ({ row }) =>
        row.original.role === "admin"
          ? m.admin_users_role_admin()
          : m.admin_users_role_member(),
    }),
    helper.accessor("banned", {
      header: () => m.admin_users_col_status(),
      cell: ({ row }) =>
        row.original.banned ? (
          <Badge variant="destructive">{m.admin_users_status_banned()}</Badge>
        ) : (
          <Badge variant="secondary">{m.admin_users_status_active()}</Badge>
        ),
    }),
    helper.display({
      id: "actions",
      header: () => m.admin_users_col_actions(),
      cell: ({ row }) => <UserActions user={row.original} />,
    }),
  ]);
  const table = useTable({ features, columns, data: users });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder ? null : (
                  <table.FlexRender header={header} />
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

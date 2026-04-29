"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import clsx from "clsx";

interface DataTableProps<TData> {
  data: TData[] | null;
  columns: ColumnDef<TData>[];
  loading?: boolean;
  onRowClick?: (row: TData) => void;
}

export default function DataTable<TData>({
  data,
  columns,
  loading = false,
  onRowClick,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const perPage = data?.length || 10;

  return (
    <div className="overflow-x-auto rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-xl">
      <table className="w-full text-left table-auto">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="border-b border-white/30 bg-white/20"
            >
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="py-3 px-4 text-gray-700 font-medium text-xs uppercase tracking-wide"
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {loading || !data
            ? Array.from({ length: perPage }).map((_, idx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder rows have no stable identity
                <tr key={`skeleton-${idx}`} className="animate-pulse">
                  {columns.map((_col, colIdx) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder cells have no stable identity
                    <td key={`skeleton-${idx}-${colIdx}`} className="p-3">
                      <div className="h-5 bg-white/40 rounded w-full" />
                    </td>
                  ))}
                </tr>
              ))
            : table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={clsx(
                    "border-b border-white/20 last:border-0 hover:bg-white/30 transition-colors",
                    onRowClick && "cursor-pointer",
                    { "opacity-70": loading },
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="py-3 px-4 text-gray-800 text-sm"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

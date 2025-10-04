"use client";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
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
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="w-full text-left table-auto">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="py-3 px-4 text-gray-700 font-medium text-sm uppercase tracking-wide"
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
        <tbody className="bg-white">
          {loading || !data
            ? Array.from({ length: perPage }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  {columns.map((col, colIdx) => (
                    <td key={`${colIdx}-${idx}`} className="p-3">
                      <div className="h-5 bg-gray-200 rounded w-full"></div>
                    </td>
                  ))}
                </tr>
              ))
            : table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={clsx(
                    "border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer",
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

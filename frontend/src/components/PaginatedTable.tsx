"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import clsx from "clsx";
import DataTable from "@/components/Table";

interface PaginatedTableProps<TData> {
  data: TData[] | null; // Current page data
  columns: ColumnDef<TData>[]; // Column definitions
  loading?: boolean;
  onRowClick?: (row: TData) => void;
  totalPages?: number; // Total pages
  initialPage?: number; // Optional initial page
  onPageChange?: (page: number) => void; // Optional callback for page changes
}

export default function PaginatedTable<TData>({
  data,
  columns,
  loading = false,
  onRowClick,
  initialPage = 1,
  onPageChange,
}: PaginatedTableProps<TData>) {
  const [page, setPage] = useState(initialPage);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    onPageChange?.(newPage);
  };

  const handlePrev = () => handlePageChange(Math.max(1, page - 1));
  const handleNext = () => handlePageChange(Math.min(page + 1));

  return (
    <div>
      <DataTable
        data={data}
        columns={columns}
        loading={loading}
        onRowClick={onRowClick}
      />

      <div className="flex justify-center items-center gap-2 mt-4">
        <button
          onClick={handlePrev}
          disabled={page === 1}
          className="px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50"
        >
          Prev
        </button>

        <span className="px-3 py-1">
          Page <strong>{page}</strong>
        </span>

        <button
          onClick={handleNext}
          className="px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100"
        >
          Next
        </button>
      </div>
    </div>
  );
}

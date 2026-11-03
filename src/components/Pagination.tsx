import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = 'data',
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, safePage * pageSize);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    const delta = 1; // Number of pages to show around current page
    const range: (number | string)[] = [];

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= safePage - delta && i <= safePage + delta)
      ) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }

    return range;
  };

  return (
    <div
      className={`px-4 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs ${className}`}
    >
      {/* Left side: Info & Page size selector */}
      <div className="flex flex-wrap items-center gap-3 text-slate-600">
        <div>
          Menampilkan{' '}
          <span className="font-bold text-slate-900 font-mono">
            {startItem} - {endItem}
          </span>{' '}
          dari{' '}
          <span className="font-bold text-slate-900 font-mono">
            {totalItems}
          </span>{' '}
          {itemLabel}
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 sm:border-l sm:border-slate-200">
            <span className="text-slate-500 text-[11px]">Tampilkan:</span>
            <select
              value={pageSize}
              onChange={e => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange(1);
              }}
              className="px-2 py-1 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-md text-slate-800 cursor-pointer focus:ring-2 focus:ring-emerald-500 font-mono"
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt} / hal
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Navigation buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1 self-end sm:self-auto">
          {/* First page */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={safePage === 1}
            className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
              safePage === 1
                ? 'text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed'
                : 'text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 bg-white'
            }`}
            title="Halaman Pertama"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>

          {/* Previous page */}
          <button
            type="button"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage === 1}
            className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
              safePage === 1
                ? 'text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed'
                : 'text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 bg-white'
            }`}
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1 mx-1">
            {getPageNumbers().map((page, idx) => {
              if (page === '...') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1.5 py-1 text-slate-400 font-mono"
                  >
                    ...
                  </span>
                );
              }

              const isCurrent = page === safePage;
              return (
                <button
                  key={`page-${page}`}
                  type="button"
                  onClick={() => onPageChange(page as number)}
                  className={`min-w-[28px] h-7 px-2 text-xs font-mono font-bold rounded-md transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 bg-white'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* Next page */}
          <button
            type="button"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage === totalPages}
            className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
              safePage === totalPages
                ? 'text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed'
                : 'text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 bg-white'
            }`}
            title="Halaman Berikutnya"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Last page */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={safePage === totalPages}
            className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
              safePage === totalPages
                ? 'text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed'
                : 'text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 bg-white'
            }`}
            title="Halaman Terakhir"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

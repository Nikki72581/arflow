'use client'

import { useState, useMemo, ReactNode } from 'react'
import { TablePagination } from '@/components/ui/table-pagination'

interface TableWithPaginationProps<T> {
  data: T[]
  renderTable: (paginatedData: T[]) => ReactNode
  defaultPageSize?: number
  pageSizeOptions?: number[]
}

export function TableWithPagination<T>({
  data,
  renderTable,
  defaultPageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
}: TableWithPaginationProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  // Calculate pagination
  const totalRecords = data.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))

  // Reset to page 1 if current page is out of bounds
  const safePage = currentPage > totalPages ? 1 : currentPage
  if (safePage !== currentPage) {
    setCurrentPage(safePage)
  }

  const paginatedData = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return data.slice(startIndex, endIndex)
  }, [data, safePage, pageSize])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-4">
      {renderTable(paginatedData)}

      {totalRecords > 0 && (
        <TablePagination
          currentPage={safePage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  )
}

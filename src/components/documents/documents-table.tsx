"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DocumentType, DocumentStatus } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TablePagination } from "@/components/ui/table-pagination";
import { getDocuments } from "@/app/actions/documents";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Search, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";

interface DocumentsTableProps {
  documentType: DocumentType;
  displayName: string;
  searchParams: { [key: string]: string | string[] | undefined };
}

export function DocumentsTable({
  documentType,
  displayName,
  searchParams,
}: DocumentsTableProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const currentPage = Number(params.get("page")) || 1;
  const pageSize = Number(params.get("pageSize")) || 25;
  const status = params.get("status") as DocumentStatus | undefined;
  const search = params.get("search") || "";
  const refreshKey = params.get("_refresh") || "";

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      try {
        const result = await getDocuments({
          page: currentPage,
          pageSize,
          documentType,
          status,
          search: search || undefined,
        });
        setDocuments(result.documents);
        setTotalPages(result.totalPages);
        setTotalRecords(result.total);
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [currentPage, pageSize, documentType, status, search, refreshKey]);

  const updateSearchParam = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(params.toString());
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Reset to page 1 when changing filters
    if (key !== "page") {
      newParams.delete("page");
    }
    router.push(`/dashboard/documents?${newParams.toString()}`);
  };

  const handlePageChange = (page: number) => {
    updateSearchParam("page", page.toString());
  };

  const handlePageSizeChange = (newPageSize: number) => {
    updateSearchParam("pageSize", newPageSize.toString());
  };

  const handleStatusChange = (value: string) => {
    updateSearchParam("status", value === "all" ? null : value);
  };

  const handleSearch = (value: string) => {
    updateSearchParam("search", value || null);
  };

  const getStatusVariant = (status: DocumentStatus) => {
    switch (status) {
      case "PAID":
        return "success";
      case "PARTIAL":
        return "info";
      case "VOID":
        return "secondary";
      case "OPEN":
      default:
        return "warning";
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              defaultValue={search}
              onChange={(e) => {
                const value = e.target.value;
                const timeoutId = setTimeout(() => handleSearch(value), 300);
                return () => clearTimeout(timeoutId);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={status || "all"}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="VOID">Void</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <div className="rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              No {displayName.toLowerCase()}s found
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-purple-500/10 bg-gradient-to-r from-purple-500/5 to-blue-500/5">
                <TableHead className="font-semibold">Number</TableHead>
                <TableHead className="font-semibold">Customer</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Due Date</TableHead>
                <TableHead className="font-semibold text-right">Amount</TableHead>
                <TableHead className="font-semibold text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow
                  key={doc.id}
                  className="hover:bg-purple-500/5 transition-colors border-b border-purple-500/5"
                >
                  <TableCell>
                    <Link
                      href={`/dashboard/documents/${doc.id}`}
                      className="font-medium text-purple-700 dark:text-purple-400 hover:underline hover:text-purple-900 dark:hover:text-purple-300 transition-colors"
                    >
                      {doc.documentNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/clients/${doc.customer.id}`}
                      className="text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {doc.customer.companyName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getStatusVariant(doc.status)}
                      className="font-medium"
                    >
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(doc.documentDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {doc.dueDate ? formatDate(doc.dueDate) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(doc.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {doc.balanceDue > 0 ? (
                      <span className="text-orange-600 dark:text-orange-400">
                        {formatCurrency(doc.balanceDue)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalRecords > 0 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      )}
    </div>
  );
}

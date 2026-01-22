"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PaymentStatus, PaymentMethod } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TablePagination } from "@/components/ui/table-pagination";
import { getPayments } from "@/app/actions/payments";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Search, CreditCard, Landmark, Receipt, Banknote } from "lucide-react";
import { Card } from "@/components/ui/card";

interface PaymentsTableProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export function PaymentsTable({ searchParams }: PaymentsTableProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const currentPage = Number(params.get("page")) || 1;
  const pageSize = Number(params.get("pageSize")) || 25;
  const status = params.get("status") as PaymentStatus | undefined;
  const paymentMethod = params.get("paymentMethod") as
    | PaymentMethod
    | undefined;
  const search = params.get("search") || "";

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const result = await getPayments({
          page: currentPage,
          pageSize,
          status: status || undefined,
          search: search || undefined,
          paymentMethod: paymentMethod || undefined,
        });
        setPayments(result.payments);
        setTotalPages(result.totalPages);
        setTotalRecords(result.total);
      } catch (error) {
        console.error("Error fetching payments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [currentPage, pageSize, status, search, paymentMethod]);

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
    router.push(`/dashboard/payments?${newParams.toString()}`);
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

  const handlePaymentMethodChange = (value: string) => {
    updateSearchParam("paymentMethod", value === "all" ? null : value);
  };

  const handleSearch = (value: string) => {
    updateSearchParam("search", value || null);
  };

  const getStatusVariant = (status: PaymentStatus) => {
    switch (status) {
      case "APPLIED":
        return "success";
      case "PENDING":
        return "warning";
      case "VOID":
        return "secondary";
      default:
        return "default";
    }
  };

  const getPaymentMethodDisplay = (
    method: PaymentMethod,
    last4?: string | null,
    cardType?: string | null,
  ) => {
    switch (method) {
      case "CREDIT_CARD":
        if (cardType && last4) {
          return `${cardType} •••• ${last4}`;
        }
        return "Credit Card";
      case "CHECK":
        return "Check";
      case "WIRE":
        return "Wire Transfer";
      case "ACH":
        return "ACH";
      case "OTHER":
        return "Other";
      default:
        return method;
    }
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case "CREDIT_CARD":
        return <CreditCard className="h-4 w-4" />;
      case "CHECK":
        return <Receipt className="h-4 w-4" />;
      case "WIRE":
      case "ACH":
        return <Landmark className="h-4 w-4" />;
      case "OTHER":
        return <Banknote className="h-4 w-4" />;
      default:
        return <Banknote className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by payment number, customer, or transaction ID..."
              defaultValue={search}
              onChange={(e) => {
                const value = e.target.value;
                const timeoutId = setTimeout(() => handleSearch(value), 300);
                return () => clearTimeout(timeoutId);
              }}
              className="pl-10"
            />
          </div>
          <Select value={status || "all"} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="APPLIED">Applied</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="VOID">Void</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={paymentMethod || "all"}
            onValueChange={handlePaymentMethodChange}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
              <SelectItem value="CHECK">Check</SelectItem>
              <SelectItem value="ACH">ACH</SelectItem>
              <SelectItem value="WIRE">Wire Transfer</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-green-500/10 bg-gradient-to-r from-green-500/5 to-blue-500/5">
                <TableHead>Payment Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Payment Method
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">
                  Acumatica
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading payments...
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No payments found
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow
                    key={payment.id}
                    className="hover:bg-green-500/5 transition-colors"
                  >
                    <TableCell>
                      <Link
                        href={`/dashboard/payments/${payment.id}`}
                        className="font-medium text-green-600 dark:text-green-400 hover:underline"
                      >
                        {payment.paymentNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/clients/${payment.customerId}`}
                        className="hover:underline"
                      >
                        {payment.customer.companyName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(payment.paymentMethod)}
                        <span className="text-sm">
                          {getPaymentMethodDisplay(
                            payment.paymentMethod,
                            payment.last4Digits,
                            payment.cardType,
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {payment.acumaticaSyncStatus === "synced" && (
                        <Badge variant="success" className="text-xs">
                          Synced
                        </Badge>
                      )}
                      {payment.acumaticaSyncStatus === "pending" && (
                        <Badge variant="warning" className="text-xs">
                          Pending
                        </Badge>
                      )}
                      {payment.acumaticaSyncStatus === "failed" && (
                        <Badge variant="destructive" className="text-xs">
                          Failed
                        </Badge>
                      )}
                      {!payment.acumaticaSyncStatus && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && totalRecords > 0 && (
          <div className="border-t p-4">
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

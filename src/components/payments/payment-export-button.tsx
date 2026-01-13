"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

interface PaymentExportButtonProps {
  payments: any[];
  variant?: "list" | "detail";
}

export function PaymentExportButton({
  payments,
  variant = "list",
}: PaymentExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      // Convert payments to CSV format
      const headers = [
        "Payment Number",
        "Date",
        "Customer",
        "Amount",
        "Payment Method",
        "Status",
        "Reference Number",
        "Transaction ID",
        "Applied Documents",
      ];

      const rows = payments.map((payment) => {
        const appliedDocs = payment.paymentApplications
          ?.map((app: any) => app.arDocument.documentNumber)
          .join("; ") || "";

        return [
          payment.paymentNumber,
          formatDate(payment.paymentDate),
          payment.customer.companyName,
          payment.amount.toFixed(2),
          payment.paymentMethod.replace("_", " "),
          payment.status,
          payment.referenceNumber || "",
          payment.gatewayTransactionId || "",
          appliedDocs,
        ];
      });

      // Escape fields that contain commas or quotes
      const escapeCSVField = (field: string) => {
        if (field.includes(",") || field.includes('"') || field.includes("\n")) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      };

      const csv = [
        headers.map(escapeCSVField).join(","),
        ...rows.map((row) => row.map((field) => escapeCSVField(String(field))).join(",")),
      ].join("\n");

      // Download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `payments_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Exported ${payments.length} payment(s) to CSV.`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error exporting the data.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    toast({
      title: "Coming soon",
      description: "Excel export will be available soon.",
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting || payments.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

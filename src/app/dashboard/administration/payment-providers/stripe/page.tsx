import { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getStripeSettings } from "@/app/actions/stripe";
import { StripeSettingsForm } from "@/components/administration/stripe-settings-form";

export const metadata: Metadata = {
  title: "Stripe Configuration",
  description: "Configure Stripe payment processing",
};

export default async function StripeConfigPage() {
  const settings = await getStripeSettings();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard/administration/payment-providers"
          className="hover:text-foreground transition-colors"
        >
          Payment Providers
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Stripe</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
          Stripe Configuration
        </h1>
        <p className="text-muted-foreground">
          Configure your Stripe payment processing integration
        </p>
      </div>

      {/* Settings Form */}
      <StripeSettingsForm settings={settings} />
    </div>
  );
}

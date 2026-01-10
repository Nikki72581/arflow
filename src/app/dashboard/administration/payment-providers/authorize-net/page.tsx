import { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getAuthorizeNetSettings } from "@/app/actions/authorize-net";
import { PaymentGatewaySettingsForm } from "@/components/administration/payment-gateway-settings-form";

export const metadata: Metadata = {
  title: "Authorize.net Configuration",
  description: "Configure Authorize.net payment processing",
};

export default async function AuthorizeNetConfigPage() {
  const settings = await getAuthorizeNetSettings();

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
        <span className="text-foreground">Authorize.net</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
          Authorize.net Configuration
        </h1>
        <p className="text-muted-foreground">
          Configure your Authorize.net payment gateway integration
        </p>
      </div>

      {/* Settings Form */}
      <PaymentGatewaySettingsForm settings={settings} />
    </div>
  );
}

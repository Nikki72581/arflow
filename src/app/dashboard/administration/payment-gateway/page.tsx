import { redirect } from "next/navigation";

export default function PaymentGatewayPage() {
  redirect("/dashboard/administration/payment-providers");
}

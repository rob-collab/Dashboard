import { redirect } from "next/navigation";

export default function PoliciesPage() {
  redirect("/compliance?tab=policies");
}

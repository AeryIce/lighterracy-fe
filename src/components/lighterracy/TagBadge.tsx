import { Badge } from "@/components/ui/badge";

export default function TagBadge({ label }: { label: string }) {
  return <Badge className="bg-brand text-black hover:bg-brand">{label}</Badge>;
}

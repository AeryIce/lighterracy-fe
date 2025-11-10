import Image from "next/image";
import TagBadge from "./TagBadge";
import Synopsis from "./Synopsis";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  cover: string;
  title: string;
  author: string;
  tags?: string[];
  synopsis?: string;
};
export default function BookCard({ cover, title, author, tags = [], synopsis }: Props) {
  return (
    <Card className="shadow-soft rounded-2xl overflow-hidden">
      <div className="relative w-full h-48">
        <Image src={cover} alt={title} fill className="object-cover" />
      </div>
      <CardContent className="p-4 space-y-2">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{author}</div>
        {tags?.length ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {tags.map((t) => <TagBadge key={t} label={t} />)}
          </div>
        ) : null}
        {synopsis ? <Synopsis text={synopsis} /> : null}
      </CardContent>
    </Card>
  );
}

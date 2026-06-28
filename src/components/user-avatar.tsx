import { useQuery } from "@tanstack/react-query";
import { resolveAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

type Props = {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
};

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-2xl",
  xl: "h-28 w-28 text-3xl",
} as const;

const dotSizes = {
  sm: "h-2 w-2",
  md: "h-3 w-3",
  lg: "h-4 w-4",
  xl: "h-5 w-5",
} as const;

export function UserAvatar({ src, name, size = "md", online, className }: Props) {
  const { data } = useQuery({
    queryKey: ["avatar-url", src],
    queryFn: () => resolveAvatarUrl(src ?? null),
    enabled: !!src,
    staleTime: 1000 * 60 * 30,
  });
  const initial = (name ?? "?").slice(0, 1).toUpperCase();
  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "grid place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-magenta font-display text-primary-foreground ring-1 ring-border",
          sizes[size],
        )}
      >
        {data ? (
          <img src={data} alt="" className="h-full w-full object-cover" />
        ) : (
          <span>{initial}</span>
        )}
      </div>
      {online !== undefined && (
        <span
          aria-label={online ? "Online" : "Offline"}
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-background",
            dotSizes[size],
            online ? "bg-emerald-500" : "bg-muted",
          )}
        />
      )}
    </div>
  );
}
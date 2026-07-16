import { cn } from "@/lib/utils"

export function LogoV2({
  className,
  light = false,
  brandName,
}: {
  className?: string
  light?: boolean
  brandName?: string
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md font-bold text-sm tracking-tight",
          light ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        OS
      </div>
      <div className="leading-tight">
        <p className={cn("text-sm font-semibold", light ? "text-sidebar-foreground" : "text-foreground")}>
          {brandName ?? "MyOS"}
        </p>
        <p className={cn("text-[11px]", light ? "text-sidebar-foreground/60" : "text-muted-foreground")}>
          {brandName ? "Powered by MyOS" : "AI Learning Platform"}
        </p>
      </div>
    </div>
  )
}

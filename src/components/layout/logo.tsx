import Image from "next/image"
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
      <Image
        src="/images/logo.png"
        alt="MyOS"
        width={36}
        height={36}
        className="h-9 w-9 object-contain"
        priority
      />
      <div className="leading-tight">
        <p className={cn("text-sm font-semibold", light ? "text-sidebar-foreground" : "text-foreground")}>
          {brandName ?? "MyOS"}
        </p>
        <p className={cn("text-[11px]", light ? "text-sidebar-foreground/60" : "text-muted-foreground")}>
          {brandName ? "Powered by MyOS" : "Expert AI Platform"}
        </p>
      </div>
    </div>
  )
}

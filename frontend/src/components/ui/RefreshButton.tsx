import { RefreshCw } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RefreshButtonProps extends Omit<ButtonProps, "children"> {
  label: string;
  isPending?: boolean;
}

export function RefreshButton({
  label,
  isPending = false,
  className,
  disabled,
  ...rest
}: RefreshButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled ?? isPending}
      className={cn(className)}
      {...rest}
    >
      <RefreshCw
        className={cn("mr-1.5 h-3.5 w-3.5", isPending && "animate-spin")}
      />
      {label}
    </Button>
  );
}

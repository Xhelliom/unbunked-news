"use client";

import * as React from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SidebarContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggle: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebarContext() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("Sidebar components must be used inside SidebarProvider.");
  }
  return context;
}

type SidebarProviderProps = {
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function SidebarProvider({
  children,
  defaultOpen = true,
}: SidebarProviderProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const value = React.useMemo(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen((previous) => !previous),
    }),
    [open],
  );

  // Le data-attribute permet d'adapter le layout via Tailwind selon l'état.
  return (
    <SidebarContext.Provider value={value}>
      <div data-sidebar-open={open ? "true" : "false"}>{children}</div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({
  className,
  children,
}: React.ComponentProps<"aside">) {
  const { open } = useSidebarContext();
  return (
    <aside
      className={cn(
        "bg-background border-r transition-[width] duration-200 ease-linear",
        open ? "w-72" : "w-16",
        className,
      )}
    >
      <div className="flex h-full flex-col overflow-hidden">{children}</div>
    </aside>
  );
}

export function SidebarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { open, toggle } = useSidebarContext();
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn("shrink-0", className)}
      onClick={toggle}
      {...props}
    >
      {open ? <PanelLeftClose /> : <PanelLeftOpen />}
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  );
}

export function SidebarHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("border-b p-3", className)} {...props} />;
}

export function SidebarContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("flex-1 overflow-y-auto p-2", className)} {...props} />;
}

export function SidebarFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("border-t p-3", className)} {...props} />;
}

export function SidebarMenu({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return <ul className={cn("space-y-1", className)} {...props} />;
}

export function SidebarMenuItem(props: React.ComponentProps<"li">) {
  return <li {...props} />;
}

export function SidebarMenuButton({
  className,
  isActive = false,
  ...props
}: React.ComponentProps<"div"> & { isActive?: boolean }) {
  return (
    <div
      className={cn(
        "hover:bg-accent hover:text-accent-foreground inline-flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarInset({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("min-w-0 flex-1", className)} {...props} />;
}

"use client";

import * as React from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// En dessous de ce seuil (breakpoint `md`), la barre latérale devient un tiroir
// superposé au contenu au lieu d'un panneau occupant la largeur de l'écran.
const MOBILE_BREAKPOINT_PX = 768;

type SidebarContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile: boolean;
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

export function useSidebar(): SidebarContextValue {
  return useSidebarContext();
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
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`,
    );
    const sync = () => {
      setIsMobile(query.matches);
      // Sur mobile le tiroir reste fermé par défaut pour ne pas masquer le
      // contenu ; sur desktop on respecte la préférence `defaultOpen`.
      setOpen(query.matches ? false : defaultOpen);
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [defaultOpen]);

  const value = React.useMemo(
    () => ({
      open,
      setOpen,
      isMobile,
      toggle: () => setOpen((previous) => !previous),
    }),
    [open, isMobile],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function Sidebar({
  className,
  children,
}: React.ComponentProps<"aside">) {
  const { open, isMobile, setOpen } = useSidebarContext();

  if (isMobile) {
    return (
      <>
        {/* Voile cliquable qui ferme le tiroir lorsqu'on tape à côté. */}
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className={cn(
            "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 md:hidden",
            open ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        />
        <aside
          className={cn(
            "bg-background fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r shadow-lg transition-transform duration-200 ease-linear md:hidden",
            open ? "translate-x-0" : "-translate-x-full",
            className,
          )}
        >
          <div className="flex h-full flex-col overflow-hidden">{children}</div>
        </aside>
      </>
    );
  }

  return (
    <aside
      className={cn(
        "bg-background hidden border-r transition-[width] duration-200 ease-linear md:block",
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

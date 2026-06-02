"use client";

import {
  BarChart3,
  Coins,
  FileText,
  LayoutDashboard,
  Send,
  ShieldCheck,
  UserCircle2,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type AdminSidebarProps = {
  title: string;
  labels: {
    dashboard: string;
    submit: string;
    proposals: string;
    analytics: string;
    costs: string;
    members: string;
    account: string;
  };
  account: {
    name: string;
    email: string;
  };
};

type NavItem = {
  href: "/admin" | "/admin/submit" | "/admin/proposals" | "/admin/analytics" | "/admin/costs" | "/admin/members" | "/admin/account";
  label: string;
  icon: ComponentType<{ className?: string }>;
};

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "U";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function AdminSidebar({ title, labels, account }: AdminSidebarProps) {
  const pathname = usePathname();
  const items: NavItem[] = [
    { href: "/admin", label: labels.dashboard, icon: LayoutDashboard },
    { href: "/admin/submit", label: labels.submit, icon: Send },
    { href: "/admin/proposals", label: labels.proposals, icon: FileText },
    { href: "/admin/analytics", label: labels.analytics, icon: BarChart3 },
    { href: "/admin/costs", label: labels.costs, icon: Coins },
    { href: "/admin/members", label: labels.members, icon: Users },
  ];

  const normalizedPath = pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
  const avatarInitials = initialsFromName(account.name);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1">
          <ShieldCheck className="text-primary size-5 shrink-0" />
          <span className="truncate text-sm font-semibold">{title}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              item.href === "/admin"
                ? normalizedPath.endsWith("/admin")
                : normalizedPath.includes(item.href);
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} className="block">
                  <SidebarMenuButton isActive={isActive}>
                    <span className="flex items-center gap-2">
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {/* Carte compacte du compte courant avec accès direct à l'édition. */}
        <Link
          href="/admin/account"
          className="hover:bg-accent block rounded-md p-2 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="bg-primary/15 text-primary flex size-8 items-center justify-center rounded-full text-xs font-semibold">
              {avatarInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{account.name}</p>
              <p className="text-muted-foreground truncate text-xs">
                {account.email}
              </p>
            </div>
            <UserCircle2 className="text-muted-foreground size-4 shrink-0" />
          </div>
          <p className="text-muted-foreground mt-2 text-xs">{labels.account}</p>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}

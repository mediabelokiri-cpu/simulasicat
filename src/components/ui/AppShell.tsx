"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  BookOpen,
  ClipboardList,
  CalendarClock,
  Activity,
  BarChart3,
  AlertTriangle,
  Settings,
  LayoutTemplate,
  Menu,
  X,
  UserCircle,
  History,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { setCurrentUserClient } from "@/lib/auth";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Peserta", href: "/admin/peserta", icon: Users },
  { label: "Kelompok", href: "/admin/kelompok", icon: UsersRound },
  { label: "Bank Soal", href: "/admin/bank-soal", icon: BookOpen },
  { label: "Manajemen Ujian", href: "/admin/ujian", icon: ClipboardList },
  { label: "Jadwal & Sesi", href: "/admin/jadwal-sesi", icon: CalendarClock },
  { label: "Monitoring Realtime", href: "/admin/monitoring", icon: Activity },
  { label: "Hasil & Analitik", href: "/admin/hasil", icon: BarChart3 },
  { label: "Insiden", href: "/admin/insiden", icon: AlertTriangle },
  { label: "Kelola Homepage", href: "/admin/homepage", icon: LayoutTemplate },
  { label: "Pengaturan", href: "/admin/pengaturan", icon: Settings },
];

export const USER_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Daftar Ujian", href: "/ujian", icon: ClipboardList },
  { label: "Riwayat & Hasil", href: "/hasil", icon: History },
  { label: "Profil Saya", href: "/profil", icon: UserCircle },
];

interface AdminSidebarProps {
  pathname: string;
  onNavigate?: () => void;
}

export function AdminSidebar({ pathname, onNavigate }: AdminSidebarProps) {
  function handleLogout() {
    setCurrentUserClient(null);
    onNavigate?.();
  }

  return (
    <aside className="flex h-full w-64 flex-col bg-[#0b49d0] text-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-white/15 px-5">
        <img
          src="/logo2.png"
          alt="Simulasi CAT Prima RIB"
          className="h-7 w-auto object-contain"
        />
      </div>

      <div className="px-4 pt-4 pb-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#ffc63d] px-2.5 py-1 text-xs font-bold text-[#151515]">
          <ShieldCheck className="h-3.5 w-3.5" />
          PANEL ADMINISTRATOR
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Menu Admin">
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex min-h-[44px] items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#ffc63d] text-[#151515] font-bold shadow-xs"
                  : "text-white/90 hover:bg-white/10 hover:text-white"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </span>
              {item.badge !== undefined && (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums",
                    isActive
                      ? "bg-[#151515] text-[#ffc63d]"
                      : "bg-[#ffc63d] text-[#151515]"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Link */}
      <div className="border-t border-white/15 p-3">
        <Link
          href="/login"
          onClick={handleLogout}
          className="flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Keluar Sesi</span>
        </Link>
      </div>
    </aside>
  );
}

interface TopbarProps {
  role: "admin" | "user";
  userName?: string;
  userSubtitle?: string;
  onOpenMobileMenu: () => void;
}

export function Topbar({
  role,
  userName = "Peserta Prima RIB",
  userSubtitle = "Akses Terverifikasi",
  onOpenMobileMenu,
}: TopbarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-[#093db0] bg-[#0b49d0] text-white shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {role === "admin" && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              aria-label="Buka menu navigasi"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white hover:bg-white/20 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          {role === "user" && (
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <img
                src="/logo1.png"
                alt="Logo Prima RIB"
                className="h-9 w-9 rounded-xl object-contain"
              />
              <div>
                <span className="block text-sm sm:text-base font-extrabold tracking-tight text-white">
                  SIMULASI CAT
                </span>
                <span className="block text-[11px] font-semibold text-white/80">
                  PRIMA RIB
                </span>
              </div>
            </Link>
          )}

          {role === "admin" && (
            <div className="flex items-center gap-2 lg:hidden">
              <img
                src="/logo1.png"
                alt="Logo Prima RIB"
                className="h-8 w-8 rounded-lg object-contain"
              />
              <span className="text-sm font-bold text-white">
                Admin Prima RIB
              </span>
            </div>
          )}
        </div>

        {/* Desktop User Navigation Links */}
        {role === "user" && (
          <nav
            className="hidden lg:flex lg:items-center lg:gap-1"
            aria-label="Navigasi Peserta"
          >
            {USER_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-[42px] items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-[#ffc63d] text-[#151515] font-bold shadow-xs"
                      : "text-white/90 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* User Profile Pill */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold text-white leading-tight">
              {userName}
            </p>
            <p className="text-xs text-white/80">{userSubtitle}</p>
          </div>
          <Link
            href={role === "admin" ? "/admin/pengaturan" : "/profil"}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffc63d] text-[#151515] font-extrabold border border-[#e5ad28]"
            title="Profil & Pengaturan"
          >
            {userName.charAt(0).toUpperCase()}
          </Link>
        </div>
      </div>
    </header>
  );
}

interface MobileNavigationProps {
  open: boolean;
  onClose: () => void;
  role: "admin" | "user";
  pathname: string;
}

export function MobileNavigation({
  open,
  onClose,
  role,
  pathname,
}: MobileNavigationProps) {
  // Khusus Portal User di Mobile: menggunakan Bottom Footer Navigation Bar
  if (role === "user") {
    return (
      <nav
        aria-label="Menu utama peserta (mobile footer)"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid max-w-md grid-cols-4 px-2 py-1.5">
          {USER_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition-all",
                  isActive
                    ? "text-[#0b49d0] font-extrabold bg-[#eef4ff]/80"
                    : "text-neutral-500 hover:text-[#151515]"
                )}
              >
                {isActive && (
                  <span
                    className="absolute top-0 h-1 w-8 rounded-full bg-[#ffc63d]"
                    aria-hidden="true"
                  />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform",
                    isActive ? "text-[#0b49d0] scale-105" : "text-neutral-500"
                  )}
                  aria-hidden="true"
                />
                <span className="truncate max-w-full leading-tight">
                  {item.label === "Riwayat & Hasil"
                    ? "Hasil"
                    : item.label === "Daftar Ujian"
                    ? "Ujian"
                    : item.label === "Profil Saya"
                    ? "Profil"
                    : item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  // Untuk Admin di Mobile: tetap menggunakan Drawer Samping (karena memiliki 10 menu operasional)
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Menu navigasi mobile admin"
    >
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-[#0b49d0] text-white shadow-xl">
        <div className="flex h-16 items-center justify-between border-b border-white/15 px-4">
          <img
            src="/logo2.png"
            alt="Simulasi CAT Prima RIB"
            className="h-6 w-auto object-contain"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex min-h-[46px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#ffc63d] text-[#151515] font-bold"
                    : "text-white/90 hover:bg-white/10"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/15 p-3">
          <Link
            href="/login"
            onClick={() => {
              setCurrentUserClient(null);
              onClose();
            }}
            className="flex min-h-[46px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar Sesi</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

interface AppShellProps {
  role: "admin" | "user";
  userName?: string;
  userSubtitle?: string;
  children: React.ReactNode;
}

export function AppShell({
  role,
  userName,
  userSubtitle,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fcfbf7] text-[#151515] flex flex-col lg:flex-row">
      {/* Desktop Admin Sidebar */}
      {role === "admin" && (
        <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-64">
          <AdminSidebar pathname={pathname} />
        </div>
      )}

      {/* Navigasi Mobile: Bottom Footer Bar untuk User, Drawer untuk Admin */}
      <MobileNavigation
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        role={role}
        pathname={pathname}
      />

      {/* Main Content Area */}
      <div
        className={cn(
          "flex flex-1 flex-col min-w-0",
          role === "admin" && "lg:pl-64"
        )}
      >
        <Topbar
          role={role}
          userName={userName}
          userSubtitle={userSubtitle}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
        <main
          className={cn(
            "mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8",
            role === "user" && "pb-24 lg:pb-8"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

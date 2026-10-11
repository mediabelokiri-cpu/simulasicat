"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  BookOpen,
  ClipboardList,
  CalendarClock,
  Activity,
  Radio,
  BarChart3,
  AlertTriangle,
  Settings,
  LayoutTemplate,
  Menu,
  X,
  UserCircle,
  LogOut,
  ShieldCheck,
  Smartphone,
  Home,
  LayoutGrid,
  Search,
  Bell,
  ChevronsLeft,
  ChevronsRight,
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
  { label: "Live Score", href: "/admin/live-score", icon: Radio, badge: "LIVE" },
  { label: "Monitoring Realtime", href: "/admin/monitoring", icon: Activity },
  { label: "Hasil & Analitik", href: "/admin/hasil", icon: BarChart3 },
  { label: "Insiden", href: "/admin/insiden", icon: AlertTriangle },
  { label: "Kelola Homepage", href: "/admin/homepage", icon: LayoutTemplate },
  { label: "Pengaturan", href: "/admin/pengaturan", icon: Settings },
];

export const USER_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Daftar Ujian", href: "/ujian", icon: ClipboardList },
  { label: "Riwayat & Hasil", href: "/hasil", icon: BookOpen },
  { label: "Download App", href: "/download-app", icon: Smartphone, badge: "APP" },
  { label: "Profil Saya", href: "/profil", icon: UserCircle },
];

interface AdminSidebarProps {
  pathname: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

export function AdminSidebar({
  pathname,
  collapsed = false,
  onToggleCollapse,
  onNavigate,
}: AdminSidebarProps) {
  function handleLogout() {
    setCurrentUserClient(null);
    onNavigate?.();
  }

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-[#0b49d0] text-white transition-all duration-200",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header + Collapse Toggle (Sesuai Referensi) */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-white/15",
          collapsed ? "justify-center px-2 gap-1" : "justify-between px-5"
        )}
      >
        <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
          {collapsed ? (
            <img
              src="/logo1.png"
              alt="Simulasi CAT Prima RIB"
              className="h-9 w-9 rounded-xl object-contain shrink-0"
            />
          ) : (
            <img
              src="/logo2.png"
              alt="Simulasi CAT Prima RIB"
              className="h-7 w-auto object-contain"
            />
          )}
        </Link>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "Perlebar menu samping" : "Perkecil menu samping"}
            aria-label={
              collapsed ? "Perlebar menu samping" : "Perkecil menu samping"
            }
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/80 hover:bg-white/15 hover:text-white cursor-pointer shrink-0"
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="px-4 pt-4 pb-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#ffc63d] px-2.5 py-1 text-xs font-bold text-[#151515]">
            <ShieldCheck className="h-3.5 w-3.5" />
            PANEL ADMINISTRATOR
          </span>
        </div>
      )}

      {/* Navigation List */}
      <nav
        className={cn(
          "flex-1 space-y-1.5 overflow-y-auto py-3",
          collapsed ? "px-2.5 flex flex-col items-center" : "px-3"
        )}
        aria-label="Menu Admin"
      >
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          if (collapsed) {
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={item.label}
                aria-label={item.label}
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all",
                  isActive
                    ? "bg-[#ffc63d] text-[#151515] font-bold shadow-sm scale-105"
                    : "text-white/85 hover:bg-white/15 hover:text-white"
                )}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                {item.badge !== undefined && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#ffc63d] ring-2 ring-[#0b49d0]" />
                )}
              </Link>
            );
          }

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
          title="Keluar Sesi"
          className={cn(
            "flex min-h-[44px] items-center rounded-xl text-sm font-medium text-white/90 hover:bg-white/10",
            collapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!collapsed && <span>Keluar Sesi</span>}
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
  const router = useRouter();
  const [quickSearch, setQuickSearch] = useState("");

  const todayFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  function handleQuickSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = quickSearch.trim().toLowerCase();
    if (!q) return;
    if (q.includes("soal") || q.includes("twk") || q.includes("tiu") || q.includes("tkp")) {
      router.push("/admin/bank-soal");
    } else if (q.includes("sesi") || q.includes("jadwal")) {
      router.push("/admin/jadwal-sesi");
    } else if (q.includes("hasil") || q.includes("skor") || q.includes("nilai")) {
      router.push("/admin/hasil");
    } else if (q.includes("monitor") || q.includes("live")) {
      router.push("/admin/monitoring");
    } else if (q.includes("kelompok")) {
      router.push("/admin/kelompok");
    } else {
      router.push("/admin/peserta");
    }
  }

  const mobilePageHeading =
    pathname === "/dashboard"
      ? { greeting: "Selamat datang di,", title: "Prima RIB CAT." }
      : pathname.startsWith("/hasil")
      ? { greeting: null, title: "Hasil Studi & CAT" }
      : pathname.startsWith("/ujian")
      ? { greeting: null, title: "Jadwal & Sesi CAT" }
      : pathname.startsWith("/download-app")
      ? { greeting: null, title: "Download Aplikasi" }
      : pathname.startsWith("/profil")
      ? { greeting: null, title: "Profil Peserta" }
      : { greeting: "Selamat datang di,", title: "Prima RIB CAT." };

  if (role === "admin") {
    return (
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-[#fcfbf7]/95 backdrop-blur-md">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Kiri: Tombol Menu Mobile + Search Bar + Tanggal Hari Ini (#0b49d0) */}
          <div className="flex flex-1 items-center gap-3 sm:gap-5">
            <button
              type="button"
              onClick={onOpenMobileMenu}
              aria-label="Buka menu navigasi"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-[#151515] hover:border-[#0b49d0] lg:hidden shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>

            <form
              onSubmit={handleQuickSearchSubmit}
              className="relative flex-1 max-w-xs sm:max-w-sm"
            >
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Cari peserta, sesi, atau soal..."
                className="w-full rounded-2xl border border-neutral-200/90 bg-white py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-[#151515] placeholder:text-neutral-400 shadow-2xs focus:border-[#0b49d0] focus:outline-none"
              />
            </form>

            <span className="hidden md:inline-flex items-center text-xs sm:text-sm font-bold text-[#0b49d0] whitespace-nowrap">
              Hari ini, {todayFormatted}
            </span>
          </div>

          {/* Kanan: Ikon Pengaturan, Notifikasi/Insiden & Avatar Admin */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <Link
              href="/admin/pengaturan"
              title="Pengaturan Sistem"
              aria-label="Pengaturan Sistem"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200/90 bg-white text-[#151515] shadow-2xs transition-colors hover:border-[#0b49d0] hover:text-[#0b49d0]"
            >
              <Settings className="h-4.5 w-4.5" />
            </Link>

            <Link
              href="/admin/insiden"
              title="Catatan Insiden & Notifikasi"
              aria-label="Catatan Insiden & Notifikasi"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200/90 bg-white text-[#151515] shadow-2xs transition-colors hover:border-[#0b49d0] hover:text-[#0b49d0]"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#0b49d0] ring-2 ring-white" />
            </Link>

            <Link
              href="/admin/pengaturan"
              className="flex items-center gap-2.5 rounded-full border border-neutral-200/90 bg-white py-1 pl-1 pr-3 shadow-2xs transition-colors hover:border-[#0b49d0]"
              title="Profil Administrator"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b49d0] text-xs font-extrabold text-[#ffc63d]">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-extrabold text-[#151515] leading-tight">
                  {userName}
                </p>
                <p className="text-[10px] font-medium text-neutral-500 leading-tight">
                  {userSubtitle}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      {/* Mobile Clean App Header (Khusus Portal User di layar Mobile menggunakan logo3) */}
      {role === "user" && (
        <header className="sticky top-0 z-30 bg-[#f6f7ff]/95 backdrop-blur-md px-5 pt-4 pb-2.5 lg:hidden">
          <div className="mx-auto flex max-w-md items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <img
                src="/logo3.png"
                alt="Logo Prima RIB CAT"
                className="h-9 w-9 object-contain shrink-0"
              />
              <div>
                {mobilePageHeading.greeting && (
                  <p className="text-xs font-medium text-slate-400 leading-snug">
                    {mobilePageHeading.greeting}
                  </p>
                )}
                <h1 className="text-xl font-extrabold tracking-tight text-[#312e81]">
                  {mobilePageHeading.title}
                </h1>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href={
                  pathname.startsWith("/download-app")
                    ? "/dashboard"
                    : "/download-app"
                }
                title="Aplikasi Mobile & Menu Cepat"
                aria-label="Aplikasi Mobile & Menu Cepat"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef0ff] text-[#4338ca] shadow-2xs transition-transform active:scale-95"
              >
                <LayoutGrid className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* Desktop User Topbar */}
      <header className="sticky top-0 z-30 hidden border-b border-[#093db0] bg-[#0b49d0] text-white shadow-xs lg:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
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
          </div>

          {/* Desktop User Navigation Links */}
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
                  {item.badge && (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-extrabold",
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

          {/* User Profile Pill */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-bold text-white leading-tight">
                {userName}
              </p>
              <p className="text-xs text-white/80">{userSubtitle}</p>
            </div>
            <Link
              href="/profil"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffc63d] text-[#151515] font-extrabold border border-[#e5ad28]"
              title="Profil & Pengaturan"
            >
              {userName.charAt(0).toUpperCase()}
            </Link>
          </div>
        </div>
      </header>
    </>
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
  // Khusus Portal User di Mobile: menggunakan Bottom Footer Navigation Bar bergaya Modern App
  if (role === "user") {
    return (
      <nav
        aria-label="Menu utama peserta (mobile footer)"
        className="fixed inset-x-0 bottom-0 z-40 rounded-t-[28px] border-t border-indigo-100/80 bg-white/95 backdrop-blur-md shadow-[0_-10px_30px_rgba(67,56,202,0.08)] lg:hidden pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 px-2 py-2">
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
                  "relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-bold transition-all",
                  isActive
                    ? "text-[#4338ca]"
                    : "text-[#c7d2fe] hover:text-[#6366f1]"
                )}
              >
                {isActive && (
                  <span
                    className="absolute -top-2 h-1 w-6 rounded-full bg-[#4338ca]"
                    aria-hidden="true"
                  />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform",
                    isActive
                      ? "text-[#4338ca] scale-110 stroke-[2.4]"
                      : "text-[#c7d2fe]"
                  )}
                  aria-hidden="true"
                />
                <span className="truncate max-w-full leading-tight">
                  {item.label === "Riwayat & Hasil"
                    ? "Hasil"
                    : item.label === "Daftar Ujian"
                    ? "Ujian"
                    : item.label === "Download App"
                    ? "App"
                    : item.label === "Profil Saya"
                    ? "Profil"
                    : "Beranda"}
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "min-h-screen text-[#151515] flex flex-col lg:flex-row",
        role === "user" ? "bg-[#f6f7ff] lg:bg-[#fcfbf7]" : "bg-[#fcfbf7]"
      )}
    >
      {/* Desktop Admin Sidebar */}
      {role === "admin" && (
        <div
          className={cn(
            "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block transition-all duration-200",
            sidebarCollapsed ? "lg:w-20" : "lg:w-64"
          )}
        >
          <AdminSidebar
            pathname={pathname}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          />
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
          "flex flex-1 flex-col min-w-0 transition-all duration-200",
          role === "admin" && (sidebarCollapsed ? "lg:pl-20" : "lg:pl-64")
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
            "mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8",
            role === "user"
              ? "pt-2 pb-28 lg:py-6 lg:pb-8"
              : "py-6"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

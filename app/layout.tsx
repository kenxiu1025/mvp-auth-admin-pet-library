import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "電子寵物任務系統",
  description: "給孩子使用的電子寵物任務 MVP",
};

type NavLink = {
  href: "/login" | "/admin" | "/parent" | "/tasks" | "/child" | "/pet" | "/shop";
  label: string;
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  const navLinks: NavLink[] = !user
    ? [{ href: "/login", label: "登入" }]
    : user.is_admin
      ? [{ href: "/admin", label: "管理員" }]
      : user.role === "parent"
        ? [
            { href: "/parent", label: "家長控制台" },
            { href: "/tasks", label: "任務" },
          ]
        : [
            { href: "/child", label: "小孩端" },
            { href: "/pet", label: "寵物" },
            { href: "/shop", label: "商店" },
          ];

  return (
    <html lang="zh-Hant">
      <body>
        <div className="shell">
          <header className="topbar">
            <Link href="/" className="brand">
              電子寵物任務系統
            </Link>
            <nav className="nav">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

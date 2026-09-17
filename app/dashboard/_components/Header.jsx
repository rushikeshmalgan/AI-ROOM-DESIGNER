"use client";

import React, { useContext } from 'react';
import Image from 'next/image'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs'
import { UserDetailContext } from '@/app/_context/UserDetailContext'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/create-new', label: 'Create' },
  { href: '/dashboard/generate-image', label: 'Gallery' },
];

function Header() {
  const { userDetail } = useContext(UserDetailContext);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo + wordmark */}
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
          <Image src="/logo.svg" width={24} height={24} alt="" />
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            AI Room Designer
          </span>
        </Link>

        {/* Center nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200',
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right section */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-secondary/60 px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>{userDetail?.credits ?? 0}</span>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  )
}

export default Header

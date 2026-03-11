"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  History,
  Settings,
  ShieldCheck,
  LogOut,
  Wallet,
  Menu,
  X,
  LineChart, // Added
  Briefcase, // Added
  Shield, // Added
  Target // Added
} from "lucide-react";
import { useState, useEffect } from "react"; // Added useEffect

import LogoutButton from "./LogoutButton";
import { createClient } from "@/utils/supabase/client"; // Assuming this path for supabase client

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const supabase = createClient();

  console.log('Sidebar Rendering, current profile state:', profile);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('Sidebar: Fetching profile for user:', user.id);
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();
        
        if (error) {
          console.error('Sidebar: Error fetching profile:', error);
        } else {
          console.log('Sidebar: Fetched Profile Data:', profileData);
          if (profileData) setProfile(profileData);
        }
      } else {
        console.log('Sidebar: No logged-in user found');
      }
    }
    getProfile();
  }, []); // Run once on mount

  const navItems = [
    { name: 'لوحة التحكم', icon: LayoutDashboard, href: '/' },
    { name: 'المهام المتاحة', icon: Target, href: '/tasks' },
    { name: 'سحب الأموال', icon: Wallet, href: '/withdraw' },
    ...(profile?.role === 'admin' ? [{ name: 'لوحة الإدارة', icon: Shield, href: '/admin' }] : []),
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 lg:hidden"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`
        fixed top-0 left-0 z-40 h-screen w-64 
        bg-black/40 backdrop-blur-xl border-r border-zinc-800/50
        transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full px-4 py-6">
          <div className="flex items-center gap-2 px-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
              <TrendingUp className="text-black" size={20} />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400">
              منصة اور العالمية
            </span>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                    ${isActive
                      ? "bg-zinc-800/50 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)] border border-amber-500/20"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/30"
                    }
                  `}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-zinc-800/50 space-y-4">
            <div className="px-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden text-[10px] flex items-center justify-center font-bold text-zinc-500 uppercase">
                {profile?.full_name?.substring(0, 2) || "??"}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-zinc-200">{profile?.full_name || "Guest"}</span>
                <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">{profile?.role || "User"}</span>
              </div>
            </div>

            <LogoutButton />
          </div>
        </div>
      </aside>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}
    </>
  );
}

"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = pathname?.startsWith("/auth");

    return (
        <div className="flex min-h-screen bg-[#050505] text-zinc-100">
            {!isAuthPage && <Sidebar />}
            <main className={`flex-1 ${!isAuthPage ? "lg:pl-64" : ""}`}>
                <div className={`max-w-[1400px] mx-auto p-6 md:p-10 ${isAuthPage ? "flex items-center justify-center min-h-screen" : ""}`}>
                    {children}
                </div>
            </main>
        </div>
    );
}

"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/auth/login");
        router.refresh();
    };

    return (
        <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all"
        >
            <LogOut size={18} />
            <span className="text-sm font-medium">Logout</span>
        </button>
    );
}

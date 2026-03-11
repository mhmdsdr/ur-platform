"use client";

import { useEffect, useState } from "react";
import {
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Download,
    Filter,
    ArrowUpDown
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface Transaction {
    id: number;
    type: "buy" | "sell";
    quantity: number;
    price: number;
    total_amount: number;
    created_at: string;
    assets: {
        name: string;
        symbol: string;
    };
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchTransactions() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from("transactions")
                    .select(`
            *,
            assets (
              name,
              symbol
            )
          `)
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });

                if (data) setTransactions(data as any);
            }
            setIsLoading(false);
        }

        fetchTransactions();
    }, [supabase]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
                    <p className="text-zinc-500">Review all your previous trades and activities.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all text-sm font-medium">
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="glass rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search history..."
                            className="bg-zinc-900/50 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-amber-500/50 transition-all w-full max-w-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-medium">
                            <Filter size={14} />
                            All Assets
                        </button>
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-medium">
                            <ArrowUpDown size={14} />
                            Recent First
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-900/30 text-zinc-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Asset</th>
                                <th className="px-6 py-4 font-semibold">Type</th>
                                <th className="px-6 py-4 font-semibold text-right">Quantity</th>
                                <th className="px-6 py-4 font-semibold text-right">Price</th>
                                <th className="px-6 py-4 font-semibold text-right">Total</th>
                                <th className="px-6 py-4 font-semibold text-right">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-zinc-600">
                                        No transactions found yet.
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-zinc-800/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-400">
                                                    {tx.assets.symbol.substring(0, 1)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">{tx.assets.name}</p>
                                                    <p className="text-xs text-zinc-500 font-mono">{tx.assets.symbol}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${tx.type === "buy" ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                                }`}>
                                                {tx.type === "buy" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                                {tx.type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-sm">
                                            {tx.quantity.toFixed(3)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-sm">
                                            {tx.price.toLocaleString()} د.ع
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-sm text-zinc-200">
                                            {tx.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} د.ع
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs text-zinc-500">
                                            {new Date(tx.created_at).toLocaleDateString()}
                                            <span className="block opacity-50">{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

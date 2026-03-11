"use client";

import { useEffect, useState } from "react";
import {
    TrendingUp,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Briefcase,
    PieChart as PieChartIcon
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface PortfolioItem {
    id: number;
    quantity: number;
    average_price: number;
    assets: {
        name: string;
        symbol: string;
        current_price: number;
    };
}

export default function PortfolioPage() {
    const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
    const [balance, setBalance] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Fetch balance
                const { data: profile } = await supabase.from("profiles").select("balance").eq("id", user.id).single();
                if (profile) setBalance(profile.balance);

                // Fetch portfolio
                const { data: holdings } = await supabase
                    .from("portfolios")
                    .select(`
            *,
            assets (
              name,
              symbol,
              current_price
            )
          `)
                    .eq("user_id", user.id);

                if (holdings) setPortfolio(holdings as any);
            }
            setIsLoading(false);
        }
        fetchData();
    }, [supabase]);

    const totalInvested = portfolio.reduce((acc, item) => acc + (item.quantity * item.average_price), 0);
    const currentValue = portfolio.reduce((acc, item) => acc + (item.quantity * item.assets.current_price), 0);
    const totalPL = currentValue - totalInvested;
    const plPercentage = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in mt-2">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Your Portfolio</h1>
                <p className="text-zinc-500">Manage your holdings and track investment performance.</p>
            </div>

            {/* Portfolio Stats */}
            <div className="grid gap-6 md:grid-cols-3">
                <div className="glass rounded-3xl p-6 bg-gradient-to-br from-zinc-900/40 to-black/40 border-white/[0.02]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Briefcase size={20} />
                        </div>
                        <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Portfolio Value</span>
                    </div>
                    <p className="text-3xl font-black tracking-tight text-white mb-1">
                        {currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} د.ع
                    </p>
                    <div className={`flex items-center gap-1 text-xs font-bold ${totalPL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {totalPL >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {Math.abs(totalPL).toLocaleString()} د.ع ({totalPL >= 0 ? '+' : '-'}{Math.abs(plPercentage).toFixed(2)}%)
                    </div>
                </div>

                <div className="glass rounded-3xl p-6 bg-gradient-to-br from-zinc-900/40 to-black/40 border-white/[0.02]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            <Wallet size={20} />
                        </div>
                        <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Cash Balance</span>
                    </div>
                    <p className="text-3xl font-black tracking-tight text-white mb-2">
                        {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} د.ع
                    </p>
                    <p className="text-xs text-zinc-500">Available for trading</p>
                </div>

                <div className="glass rounded-3xl p-6 bg-gradient-to-br from-zinc-900/40 to-black/40 border-white/[0.02] flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Asset Allocation</span>
                        <PieChartIcon size={16} className="text-zinc-600" />
                    </div>
                    <div className="w-full bg-zinc-800/50 h-2 rounded-full overflow-hidden flex">
                        <div className="bg-amber-500 h-full" style={{ width: '60%' }}></div>
                        <div className="bg-blue-500 h-full" style={{ width: '30%' }}></div>
                        <div className="bg-zinc-700 h-full flex-1"></div>
                    </div>
                    <div className="flex gap-4 mt-4">
                        <div className="flex items-center gap-1.5 ">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                            <span className="text-[10px] font-bold text-zinc-400">Gold</span>
                        </div>
                        <div className="flex items-center gap-1.5 ">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-[10px] font-bold text-zinc-400">Oil</span>
                        </div>
                        <div className="flex items-center gap-1.5 ">
                            <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                            <span className="text-[10px] font-bold text-zinc-400">Cash</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Holdings Table */}
            <div className="glass rounded-3xl overflow-hidden mt-4">
                <div className="p-6 border-b border-zinc-800/50">
                    <h2 className="text-xl font-bold">Your Holdings</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-900/30 text-zinc-500 text-[10px] uppercase tracking-[0.2em]">
                                <th className="px-6 py-4 font-black">Asset</th>
                                <th className="px-6 py-4 font-black text-right">Quantity</th>
                                <th className="px-6 py-4 font-black text-right">Avg Price</th>
                                <th className="px-6 py-4 font-black text-right">Market Price</th>
                                <th className="px-6 py-4 font-black text-right">Market Value</th>
                                <th className="px-6 py-4 font-black text-right">Total P/L</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {portfolio.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-zinc-600">
                                        No active holdings found.
                                    </td>
                                </tr>
                            ) : (
                                portfolio.map((item) => {
                                    const mktVal = item.quantity * item.assets.current_price;
                                    const itemPL = mktVal - (item.quantity * item.average_price);
                                    const itemPLPerc = (itemPL / (item.quantity * item.average_price)) * 100;

                                    return (
                                        <tr key={item.id} className="hover:bg-zinc-800/20 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-amber-500 group-hover:border-amber-500/30 transition-colors">
                                                        {item.assets.symbol.substring(0, 1)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-white">{item.assets.name}</p>
                                                        <p className="text-[10px] text-zinc-500 font-mono tracking-widest">{item.assets.symbol}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right font-mono font-bold text-sm">
                                                {item.quantity.toFixed(3)}
                                            </td>
                                            <td className="px-6 py-5 text-right font-medium text-sm text-zinc-400">
                                                {item.average_price.toLocaleString()} د.ع
                                            </td>
                                            <td className="px-6 py-5 text-right font-medium text-sm text-amber-500/80">
                                                {item.assets.current_price.toLocaleString()} د.ع
                                            </td>
                                            <td className="px-6 py-5 text-right font-black text-sm text-white">
                                                {mktVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} د.ع
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className={`flex flex-col items-end ${itemPL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    <span className="font-bold text-sm">{Math.abs(itemPL).toLocaleString()} د.ع</span>
                                                    <span className="text-[10px] font-bold">{itemPL >= 0 ? '+' : '-'}{Math.abs(itemPLPerc).toFixed(2)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

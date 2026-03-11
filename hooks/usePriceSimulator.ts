"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface AssetPrice {
    id: number;
    symbol: string;
    price: number;
    change24h: number;
    is_manual: boolean;
    manual_price: number | null;
}

export function usePriceSimulator() {
    const [prices, setPrices] = useState<Record<string, AssetPrice>>({});
    const supabase = createClient();

    const fetchBasePrices = useCallback(async () => {
        const { data: assets } = await supabase.from("assets").select("*");
        if (assets) {
            const priceMap: Record<string, AssetPrice> = {};
            assets.forEach(asset => {
                priceMap[asset.symbol] = {
                    id: asset.id,
                    symbol: asset.symbol,
                    price: asset.is_manual && asset.manual_price ? asset.manual_price : asset.current_price,
                    change24h: asset.price_change_24h,
                    is_manual: asset.is_manual,
                    manual_price: asset.manual_price,
                };
            });
            setPrices(priceMap);
        }
    }, [supabase]);

    const updatePrices = useCallback(() => {
        setPrices(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(symbol => {
                const item = next[symbol];
                if (item.is_manual && item.manual_price !== null) {
                    next[symbol] = { ...item, price: item.manual_price };
                    return;
                }

                // Random percentage between 0.01% and 0.05%
                const randPercent = (Math.random() * (0.05 - 0.01) + 0.01) / 100;
                const direction = Math.random() > 0.5 ? 1 : -1;
                const change = item.price * randPercent * direction;

                next[symbol] = {
                    ...item,
                    price: item.price + change,
                    change24h: Number((item.change24h + (direction * 0.01)).toFixed(2))
                };
            });
            return next;
        });
    }, []);

    useEffect(() => {
        fetchBasePrices();
        const interval = setInterval(updatePrices, 5000);
        const syncInterval = setInterval(fetchBasePrices, 30000); // Sync with DB every 30s

        return () => {
            clearInterval(interval);
            clearInterval(syncInterval);
        };
    }, [fetchBasePrices, updatePrices]);

    return { prices, refresh: fetchBasePrices };
}

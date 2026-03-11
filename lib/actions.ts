"use server";

export async function sendTelegramNotification(message: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.warn("Telegram configuration missing. Skipping notification.");
        return { success: false, error: "Configuration missing" };
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: "HTML",
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Telegram API error:", errorData);
            return { success: false, error: errorData.description };
        }

        return { success: true };
    } catch (error) {
        console.error("Failed to send Telegram notification:", error);
        return { success: false, error: "Network error" };
    }
}

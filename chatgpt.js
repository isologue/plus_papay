class ChatGPTService {
    constructor(request, token) {
        this.request = request;
        this.token = token;
        this.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        };
        this.checkoutApiUrl = process.env.CHECKOUT_API_URL || 'https://payurl.ark2.cn/api/checkout';
    }

    /**
     * 简化流程：创建订单 → 返回接口生成的支付链接给浏览器打开
     */
    async getPayPalApprovalUrl(config) {
        try {
            const payUrl = await this._createOrder(config || {});
            if (!payUrl) return null;
            console.log(`✅ 支付链接已生成`);
            return payUrl;
        } catch (e) {
            console.error("[-] 获取支付链接异常:", e.message);
            return null;
        }
    }

    async _createOrder(config = {}) {
        // (静默) 准备创建订单（结果会以 ✅/❌ 输出）
        const response = await this.request.post(this.checkoutApiUrl, {
            headers: this.headers,
            data: {
                token: this.token,
                plan: process.env.CHECKOUT_PLAN || 'plus',
                checkout_ui_mode: process.env.CHECKOUT_UI_MODE || 'hosted',
                ui_language: process.env.CHECKOUT_UI_LANGUAGE || 'en',
                country: config.country || process.env.BILLING_COUNTRY || 'US',
                currency: process.env.CHECKOUT_CURRENCY || 'USD',
                proxy: process.env.CHECKOUT_PROXY || '',
                use_promo: String(process.env.CHECKOUT_USE_PROMO || 'true') !== 'false',
                promo_code: process.env.CHECKOUT_PROMO_CODE || 'STRIPEATLASGPT4BIZ050126',
                workspace_name: process.env.CHECKOUT_WORKSPACE_NAME || 'linux-do',
                seat_quantity: Number(process.env.CHECKOUT_SEAT_QUANTITY || 2)
            },
            timeout: 60000
        });
        if (!response.ok()) {
            const body = await response.text().catch(() => "");
            console.error(`[-] 订单创建失败 (Status: ${response.status()})`);
            console.error(`    响应: ${body}`);
            if (body.includes('not_eligible') || body.includes('permission') || body.includes('Offer not found')) {
                console.error("❌ [提示] 该账号无激活权限，请丢弃！(无激活权限)");
            }
            return null;
        }
        const data = await response.json();
        const sessionId = data.checkout_session_id || (JSON.stringify(data).match(/cs_live_[A-Za-z0-9]+/)?.[0]);
        const payUrl = data.url
            || data.openai_payurl
            || data.chatgpt_checkout_url
            || (sessionId ? `https://pay.openai.com/c/pay/${sessionId}` : '');
        if (!payUrl) {
            console.error(`[-] 订单创建失败：响应中缺少支付链接`);
            console.error(`    响应: ${JSON.stringify(data).slice(0, 1000)}`);
            return null;
        }
        console.log(`✅ 订单创建成功`);
        return payUrl;
    }
}

module.exports = ChatGPTService;

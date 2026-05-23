const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const ChatGPTService = require('./chatgpt');
const fs = require('fs');
const path = require('path');
chromium.use(StealthPlugin());
// 鍚敤 Stealth 鎻掍欢锛堝湪浠讳綍 launch 涔嬪墠璋冪敤锛?

// 闅忔満閫夋嫨涓€涓湡瀹炵殑 Chrome UA


function generateRandomOutlookEmail() {
    // PayPal 璐︽埛鐧诲綍閭锛氫娇鐢?@hotmail.com锛圥ayPal 瀵逛富娴侀偖绠变俊浠诲害鏇撮珮锛?
    // 鑷畾涔夊煙鍚嶏紙濡?chiyiyi.cloud锛夊鏄撹 PayPal 鏍囦负鍙枒锛?
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const length = 10 + Math.floor(Math.random() * 4); // 10-13 瀛楃锛岄伩鍏嶇煭鍓嶇紑閲嶅椋庨櫓
    let prefix = '';
    for (let i = 0; i < length; i += 1) {
        prefix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}@hotmail.com`;
}

/**
 * PayPal Checkout Automation - Refactored & Beautified
 * 
 * Features:
 * - Real-time Slider Monitoring
 * - Robust Overlay Cleaning
 * - Human-like Interaction Simulation
 * - Modular Flow Control
 */

// 鍏ㄩ儴鏁忔劅閰嶇疆璇烽€氳繃鐜鍙橀噺浼犲叆锛涙湰浠撳簱涓嶉檮甯︿换浣曠湡瀹炲瘑閽?璐﹀彿/浠ｇ悊锛?
// 鍙弬鑰?.env.example 瀹屾垚鏈湴閰嶇疆鍚庡啀鍚姩銆?
const CONFIG = {
    chatgptToken: process.env.CHATGPT_TOKEN || "",
    stripeKey: process.env.STRIPE_KEY || "",
    billing: {
        country: process.env.BILLING_COUNTRY || "US",
        address: process.env.BILLING_ADDRESS || "",
        city: process.env.BILLING_CITY || "",
        state: process.env.BILLING_STATE || "",
        zip: process.env.BILLING_ZIP || "",
        name: process.env.BILLING_NAME || "",
        email: process.env.BILLING_EMAIL || generateRandomOutlookEmail(),
        card: process.env.CARD_NUMBER || "",
        expiry: process.env.CARD_EXPIRY || "",
        cvc: process.env.CARD_CVC || "",
        paypalPassword: process.env.PAYPAL_PASSWORD || "",
        smsKey: process.env.SMS_API_KEY || "",
        smsPhone: process.env.BILLING_PHONE || ""
    },
    proxy: process.env.PROXY || ""
};

function buildPlaywrightProxy(proxyValue) {
    if (!proxyValue) return null;

    try {
        const parsed = new URL(proxyValue);
        const server = `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
        const proxy = { server };

        if (parsed.username) {
            proxy.username = decodeURIComponent(parsed.username);
        }
        if (parsed.password) {
            proxy.password = decodeURIComponent(parsed.password);
        }

        return proxy;
    } catch (error) {
        console.warn(`[!] [绯荤粺] 浠ｇ悊 URL 瑙ｆ瀽澶辫触锛屽皢鎸夊師濮嬪€间娇鐢? ${error.message}`);
        return { server: proxyValue };
    }
}

function buildDebugScreenshotPath(prefix) {
    const screenshotDir = path.join(__dirname, 'debug_screenshots', 'activation');
    fs.mkdirSync(screenshotDir, { recursive: true });
    return path.join(screenshotDir, `${prefix}_${Date.now()}.png`);
}

function getAvailableDebugPage(context, preferredPage) {
    if (preferredPage && !preferredPage.isClosed()) {
        return preferredPage;
    }
    if (!context || typeof context.pages !== 'function') {
        return null;
    }
    const alivePages = context.pages().filter((item) => item && !item.isClosed());
    return alivePages.length ? alivePages[alivePages.length - 1] : null;
}

async function captureDebugScreenshot(context, preferredPage, prefix, label = '寮傚父鎴浘') {
    const targetPage = getAvailableDebugPage(context, preferredPage);
    if (!targetPage) {
        console.warn(`No available page for ${label} screenshot.`);
        return null;
    }

    const screenshotPath = buildDebugScreenshotPath(prefix);
    await targetPage.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`馃摳 [绯荤粺] ${label}宸蹭繚瀛? ${screenshotPath}`);
    // (闈欓粯) 鎴浘椤甸潰 URL 涓嶅啀鎵撳嵃锛堜俊鎭啑闀匡級
    return screenshotPath;
}

async function isConnectionClosedPage(page) {
    try {
        const bodyText = String(await page.textContent('body', { timeout: 3000 }).catch(() => '') || '');
        return bodyText.includes('ERR_CONNECTION_CLOSED')
            || bodyText.includes('Unable to access this website')
            || bodyText.includes('Unexpected termination of connection')
            || bodyText.includes('This site can\'t be reached')
            || bodyText.includes('This site cannot be reached');
    } catch (_) {
        return false;
    }
}

async function recoverConnectionClosed(page, fallbackUrl = '') {
    if (!(await isConnectionClosedPage(page))) {
        return false;
    }

    console.warn('[Warn] 妫€娴嬪埌娴忚鍣ㄨ繛鎺ュ叧闂敊璇〉锛屾鍦ㄥ皾璇曡嚜鍔ㄩ噸杞?..');
    for (let attempt = 1; attempt <= 3; attempt++) {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(async () => {
            const nextUrl = fallbackUrl || page.url();
            if (nextUrl) {
                return page.goto(nextUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => { });
            }
        });
        await page.waitForTimeout(3000);
        if (!(await isConnectionClosedPage(page))) {
            console.log(`[Info] Connection-closed page recovered (attempt ${attempt}).`);
            return true;
        }
    }

    return false;
}
/**
 * Main Automation logic
 */
async function run() {
    // 鍒囧埌鏈夊ご妯″紡璋冭瘯锛欻EADFUL=1 node server.js 鎴?HEADFUL=1 node index.js
    const DEBUG_HEADFUL = process.env.HEADFUL === '1';
    // 閫夋嫨鐪熷疄 Google Chrome锛欳HROMIUM_CHANNEL=chrome锛堟満鍣ㄩ渶瀹夎 Google Chrome锛?
    const CHROMIUM_CHANNEL = (process.env.CHROMIUM_CHANNEL || '').trim();

    const launchArgs = [
        '--disable-blink-features=AutomationControlled'
    ];
    if (!DEBUG_HEADFUL) {
        launchArgs.push('--no-sandbox', '--disable-setuid-sandbox');
    }
    const launchOptions = {
        headless: !DEBUG_HEADFUL,
        args: launchArgs
    };
    if (CHROMIUM_CHANNEL) {
        launchOptions.channel = CHROMIUM_CHANNEL; // e.g. 'chrome' / 'msedge'
    }
    if (DEBUG_HEADFUL) {
        console.log("[Step 0] Starting browser environment" + (CHROMIUM_CHANNEL ? `, channel=${CHROMIUM_CHANNEL}` : "") + ".");
    }
    const proxyConfig = buildPlaywrightProxy(CONFIG.proxy);

    if (proxyConfig) {
        launchOptions.proxy = proxyConfig;
        // 浠ｇ悊璇︽儏涓嶅啀鎵撳嵃锛堥伩鍏嶆硠闇插嚟璇?+ 鍑忓皯鍣煶锛?
        const _proxyHost = (() => {
            try { return new URL(CONFIG.proxy).host; } catch (_) { return 'configured'; }
        })();
        console.log(`[Info] Proxy configured.`);
    }

    const browser = await chromium.launch(launchOptions);

    // 鍙栨祻瑙堝櫒鐪熷疄 UA锛岄伩鍏嶄笌 register_openai.js 涓嶄竴鑷?/ 涓?navigator.userAgentData 涓嶄竴鑷?
    const realUserAgent = await (async () => {
        try {
            const tmpCtx = await browser.newContext();
            const tmpPage = await tmpCtx.newPage();
            const ua = await tmpPage.evaluate(() => navigator.userAgent);
            await tmpCtx.close().catch(() => { });
            return ua;
        } catch (_) {
            return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';
        }
    })();

    const viewport = { width: 1920, height: 1080 }; // HAR: screen 1920x1080
    // 瑙ｆ瀽鐪熷疄 UA锛屾瀯閫犱笌涔嬪榻愮殑 sec-ch-ua锛圕lient Hints锛夛紝閬垮厤 UA 涓?brands 涓嶄竴鑷?
    const matched = realUserAgent.match(/Chrome\/(\d+)/);
    const chromeMajor = matched ? Number(matched[1]) : 147;

    const contextOptions = {
        userAgent: realUserAgent,
        viewport,
        locale: 'en-US',
        timezoneId: 'America/New_York',
        // PayPal HAR: 缇庡浗璐︽埛鍦烘櫙锛涘睆骞曞昂瀵?1920x1080
        screen: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        // 鍏滃簳锛氭妸 sec-ch-ua* 涓?UA 寮哄埗瀵归綈锛圥laywright 榛樿浼氭寜 UA 鑷姩绠楋紝浣嗘樉寮忔洿绋筹級
        extraHTTPHeaders: {
            'sec-ch-ua': `"Not)A;Brand";v="8", "Chromium";v="${chromeMajor}", "Google Chrome";v="${chromeMajor}"`,
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
        }
    };

    const context = await browser.newContext(contextOptions);

    // ============= 涓ユ牸鎸囩汗浼锛堣鐩?hCaptcha invisible / PerimeterX 涓昏妫€娴嬬偣锛?============
    await context.addInitScript((injectedChromeMajor) => {
        // ---- 宸ュ叿锛氱敤 defineProperty 鏀?Navigator.prototype 涓婄殑 getter锛堟瘮鏀?navigator 瀹炰緥鏇撮毦琚瘑鐮达級 ----
        const NavProto = Object.getPrototypeOf(navigator);
        const ScrProto = Object.getPrototypeOf(screen);
        const safeDefine = (obj, key, getter) => {
            try {
                Object.defineProperty(obj, key, { get: getter, configurable: true });
            } catch (_) { /* ignore */ }
        };

        // 1) 褰诲簳闅愯棌 webdriver锛堝湪 prototype 灞傚垹 + 鍦?navigator 涓?set undefined锛?
        try { delete Object.getPrototypeOf(navigator).webdriver; } catch (_) { }
        safeDefine(NavProto, 'webdriver', () => undefined);
        try { Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true }); } catch (_) { }

        // 2) navigator.userAgentData 涓?sec-ch-ua / UA 涓€鑷?
        try {
            const uaData = {
                brands: [
                    { brand: 'Not)A;Brand', version: '8' },
                    { brand: 'Chromium', version: String(injectedChromeMajor) },
                    { brand: 'Google Chrome', version: String(injectedChromeMajor) }
                ],
                mobile: false,
                platform: 'Windows',
                getHighEntropyValues: (hints) => Promise.resolve({
                    architecture: 'x86',
                    bitness: '64',
                    brands: uaData.brands,
                    fullVersionList: uaData.brands.map(b => ({ brand: b.brand, version: `${b.version}.0.0.0` })),
                    mobile: false,
                    model: '',
                    platform: 'Windows',
                    platformVersion: '15.0.0',
                    uaFullVersion: `${injectedChromeMajor}.0.0.0`,
                    wow64: false
                }),
                toJSON: () => ({ brands: uaData.brands, mobile: uaData.mobile, platform: uaData.platform })
            };
            safeDefine(NavProto, 'userAgentData', () => uaData);
        } catch (_) { }

        // 3) plugins / mimeTypes 鐢?Proxy + 鐪熷疄 prototype锛圥luginArray / MimeTypeArray锛?
        try {
            const pdfMime = Object.create(MimeType.prototype);
            Object.defineProperties(pdfMime, {
                type: { get: () => 'application/pdf' },
                suffixes: { get: () => 'pdf' },
                description: { get: () => 'Portable Document Format' }
            });
            const pdfPlugin = Object.create(Plugin.prototype);
            Object.defineProperties(pdfPlugin, {
                name: { get: () => 'Chrome PDF Plugin' },
                filename: { get: () => 'internal-pdf-viewer' },
                description: { get: () => 'Portable Document Format' },
                length: { get: () => 1 },
                0: { get: () => pdfMime }
            });
            pdfPlugin.item = () => pdfMime;
            pdfPlugin.namedItem = () => pdfMime;

            const fakePlugins = Object.create(PluginArray.prototype);
            Object.defineProperties(fakePlugins, {
                length: { get: () => 1 },
                0: { get: () => pdfPlugin }
            });
            fakePlugins.item = () => pdfPlugin;
            fakePlugins.namedItem = (n) => n === pdfPlugin.name ? pdfPlugin : null;
            fakePlugins.refresh = () => { };

            const fakeMimeTypes = Object.create(MimeTypeArray.prototype);
            Object.defineProperties(fakeMimeTypes, {
                length: { get: () => 1 },
                0: { get: () => pdfMime }
            });
            fakeMimeTypes.item = () => pdfMime;
            fakeMimeTypes.namedItem = (n) => n === pdfMime.type ? pdfMime : null;

            safeDefine(NavProto, 'plugins', () => fakePlugins);
            safeDefine(NavProto, 'mimeTypes', () => fakeMimeTypes);
        } catch (_) { }

        // 4) 璇█銆佸钩鍙般€佺‖浠?
        safeDefine(NavProto, 'languages', () => ['en-US', 'en']);
        safeDefine(NavProto, 'language', () => 'en-US');
        safeDefine(NavProto, 'platform', () => 'Win32');
        safeDefine(NavProto, 'hardwareConcurrency', () => 8);
        safeDefine(NavProto, 'deviceMemory', () => 8);
        safeDefine(NavProto, 'maxTouchPoints', () => 0);
        safeDefine(NavProto, 'vendor', () => 'Google Inc.');

        // 5) navigator.connection
        try {
            const conn = { effectiveType: '4g', rtt: 100, downlink: 10, saveData: false };
            safeDefine(NavProto, 'connection', () => conn);
        } catch (_) { }

        // 6) window.chrome锛堟帴杩戠湡瀹?Chrome 鐨勬牱瀛愶級
        try {
            const fakeChrome = {
                app: {
                    isInstalled: false,
                    InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
                    RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
                    getDetails: () => null,
                    getIsInstalled: () => false
                },
                runtime: {
                    OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' },
                    OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
                    PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
                    PlatformNaclArch: { ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
                    PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
                    RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' },
                    connect: () => { },
                    sendMessage: () => { }
                },
                csi: () => ({ onloadT: Date.now(), pageT: Date.now() - 1000, startE: Date.now() - 2000, tran: 15 }),
                loadTimes: () => ({
                    requestTime: Date.now() / 1000 - 2,
                    startLoadTime: Date.now() / 1000 - 1.5,
                    commitLoadTime: Date.now() / 1000 - 1,
                    finishDocumentLoadTime: Date.now() / 1000 - 0.5,
                    finishLoadTime: Date.now() / 1000,
                    firstPaintTime: Date.now() / 1000 - 0.3,
                    firstPaintAfterLoadTime: 0,
                    navigationType: 'Other',
                    wasFetchedViaSpdy: true,
                    wasNpnNegotiated: true,
                    npnNegotiatedProtocol: 'h2',
                    wasAlternateProtocolAvailable: false,
                    connectionInfo: 'h2'
                })
            };
            Object.defineProperty(window, 'chrome', { value: fakeChrome, writable: true, configurable: true });
        } catch (_) { }

        // 7) permissions.query 瀹屾暣鍖栵紙notifications / clipboard / geolocation 閮借繑鍥?prompt 涓嶆槸 denied锛?
        try {
            const origQuery = navigator.permissions.query.bind(navigator.permissions);
            navigator.permissions.query = (params) => {
                if (params && params.name === 'notifications') {
                    return Promise.resolve({ state: typeof Notification !== 'undefined' ? Notification.permission : 'default', onchange: null });
                }
                return origQuery(params).catch(() => ({ state: 'prompt', onchange: null }));
            };
        } catch (_) { }

        // 8) screen 涓€鑷存€?
        safeDefine(ScrProto, 'availHeight', () => 1032);
        safeDefine(ScrProto, 'availWidth', () => 1920);
        safeDefine(ScrProto, 'colorDepth', () => 24);
        safeDefine(ScrProto, 'pixelDepth', () => 24);
        safeDefine(ScrProto, 'width', () => 1920);
        safeDefine(ScrProto, 'height', () => 1080);

        // 9) Canvas锛歵oDataURL & getImageData 鍔犲井鍣０
        try {
            const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function (...args) {
                const ctx = this.getContext('2d');
                if (ctx) {
                    try {
                        const w = this.width, h = this.height;
                        if (w > 0 && h > 0) {
                            // 鏀?1 鍍忕礌鐨?alpha 鍗冲彲鏀瑰彉 hash锛屼絾瑙嗚鏃犲奖鍝?
                            const data = ctx.getImageData(0, 0, 1, 1);
                            data.data[3] = Math.max(1, data.data[3] - 1);
                            ctx.putImageData(data, 0, 0);
                        }
                    } catch (_) { }
                }
                return origToDataURL.apply(this, args);
            };
            const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
            CanvasRenderingContext2D.prototype.getImageData = function (...args) {
                const imageData = origGetImageData.apply(this, args);
                try {
                    if (imageData && imageData.data && imageData.data.length > 16) {
                        // 鍦ㄥ墠 4 鍍忕礌鐨?RGBA 涓婂姞 卤1 寰櫔澹?
                        for (let i = 0; i < 16; i += 4) {
                            imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + (Math.random() < 0.5 ? -1 : 1)));
                        }
                    }
                } catch (_) { }
                return imageData;
            };
        } catch (_) { }

        // 10) WebGL锛氫吉瑁?vendor / renderer + 鍏抽敭鍙傛暟鍔犲井鍣０
        try {
            const fakeWebGL = (gl) => {
                const origGetParameter = gl.getParameter.bind(gl);
                gl.getParameter = function (param) {
                    // UNMASKED_VENDOR_WEBGL = 0x9245, UNMASKED_RENDERER_WEBGL = 0x9246
                    if (param === 0x9245) return 'Google Inc. (Intel)';
                    if (param === 0x9246) return 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)';
                    return origGetParameter(param);
                };
            };
            const origGetCtx = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function (type, ...args) {
                const ctx = origGetCtx.call(this, type, ...args);
                if (ctx && (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl')) {
                    try { fakeWebGL(ctx); } catch (_) { }
                }
                return ctx;
            };
        } catch (_) { }

        // 11) AudioContext 鎸囩汗寰櫔澹帮紙hCaptcha 涔熺敤杩欎釜锛?
        try {
            const origCreateAnalyser = (window.OfflineAudioContext || window.webkitOfflineAudioContext || window.AudioContext).prototype.createAnalyser;
            if (origCreateAnalyser) {
                const Proto = (window.OfflineAudioContext || window.webkitOfflineAudioContext || window.AudioContext).prototype;
                Proto.createAnalyser = function () {
                    const analyser = origCreateAnalyser.call(this);
                    const origGetFloat = analyser.getFloatFrequencyData.bind(analyser);
                    analyser.getFloatFrequencyData = function (array) {
                        origGetFloat(array);
                        for (let i = 0; i < array.length; i += 1) {
                            array[i] += (Math.random() - 0.5) * 0.0001;
                        }
                    };
                    return analyser;
                };
            }
        } catch (_) { }

        // 12) iframe 鐨?navigator/window 涔熻濂楃敤鍚屾牱鐨?patch锛坔Captcha 鑷繁璺戝湪 iframe 閲岋級
        try {
            const origCreate = Document.prototype.createElement;
            Document.prototype.createElement = function (tag, ...rest) {
                const el = origCreate.call(this, tag, ...rest);
                if (typeof tag === 'string' && tag.toLowerCase() === 'iframe') {
                    try {
                        Object.defineProperty(el, 'contentWindow', {
                            get() {
                                const w = HTMLIFrameElement.prototype.__lookupGetter__('contentWindow').call(el);
                                try {
                                    if (w && w.navigator) {
                                        try { Object.defineProperty(w.navigator, 'webdriver', { get: () => undefined, configurable: true }); } catch (_) { }
                                    }
                                } catch (_) { }
                                return w;
                            }
                        });
                    } catch (_) { }
                }
                return el;
            };
        } catch (_) { }

        // 13) 鍒犻櫎 ChromeDriver 鐥曡抗锛坈dc_*銆?cdc_*锛?
        try {
            for (const key of Object.keys(window)) {
                if (/^(cdc_|\$cdc_|_phantom|callPhantom|webdriver-|driver-)/.test(key)) {
                    try { delete window[key]; } catch (_) { }
                }
            }
        } catch (_) { }

        // 14) Notification.permission 榛樿 'default'锛坔eadless 涓嬪彲鑳芥槸 'denied'锛?
        try {
            if (typeof Notification !== 'undefined') {
                const origPerm = Object.getOwnPropertyDescriptor(Notification, 'permission');
                if (!origPerm || origPerm.get) {
                    Object.defineProperty(Notification, 'permission', { get: () => 'default', configurable: true });
                }
            }
        } catch (_) { }
    }, chromeMajor);

    let page = null;
    let stopInactivityWatcher = null;

    try {
        // --- Phase 0: Proxy Connectivity Check ---
        if (proxyConfig) {
            // (闈欓粯) 妫€鏌ヤ唬鐞嗚繛閫氭€?
            try {
                const probeResponse = await context.request.get("http://api.ipify.org/?format=text", {
                    timeout: 15000
                });
                if (probeResponse.ok()) {
                    const ip = (await probeResponse.text()).trim();
                    // 淇濈暀杩涘害鏍囪鍏抽敭瀛?"浠ｇ悊杩炴帴鎴愬姛! 浠ｇ悊鍏綉 IP" 浠ヤ究 product_activator/server 璇嗗埆杩涘害锛?
                    // 浣嗗彧闇叉渶鍚庝袱娈碉紝閬垮厤瀹屾暣鍑哄彛 IP 娉勯湶
                    const ipMasked = String(ip).replace(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/, '***.***.$3.$4');
                    console.log(`鉁?[绯荤粺] 浠ｇ悊杩炴帴鎴愬姛! 浠ｇ悊鍏綉 IP: ${ipMasked}`);
                } else {
                    throw new Error(`浠ｇ悊鍝嶅簲寮傚父: HTTP ${probeResponse.status()}`);
                }
            } catch (proxyError) {
                console.log("    [!] 请检查 PROXY 配置是否正确，或账号余额是否充足。");
                throw proxyError;
            }
        }

        // --- Phase 1: API Initialization ---
        const gpt = new ChatGPTService(context.request, CONFIG.chatgptToken, CONFIG.stripeKey);
        const createCheckoutUrl = async () => {
            // (闈欓粯) 鍒涘缓璁㈠崟锛堟垚鍔?澶辫触鐢?chatgpt.js 鍐呮墦鍗帮級
            const url = await gpt.getPayPalApprovalUrl(CONFIG.billing);
            if (url && process.send) {
                process.send({ type: 'checkout_url', url });
            }
            return url;
        };

        let paypalUrl = String(process.env.REUSE_CHECKOUT_URL || '').trim();
        let usingReusedCheckoutUrl = Boolean(paypalUrl);
        if (usingReusedCheckoutUrl) {
            console.log("鈾伙笍 [姝ラ] 澶嶇敤涓婃鐢熸垚鐨?Stripe Hosted Checkout 椤甸潰...");
        } else {
            paypalUrl = await createCheckoutUrl();
        }

        if (!paypalUrl) {
            throw new Error("鏃犳硶鑾峰彇 PayPal 瀹℃壒閾炬帴");
        }

        // --- Phase 2: Automation Setup ---
        page = await context.newPage();
        page.on('close', () => {
            console.warn(`鈿狅笍 [绯荤粺] 褰撳墠椤甸潰宸插叧闂紝鍏抽棴鍓嶆渶鍚?URL: ${page.url()}`);
        });
        await page.route('**/auth/validatecaptcha', async route => {
            // 濡傛灉璇锋眰鏄拡瀵归獙璇侀〉闈㈢殑锛岃繑鍥炰竴涓┖鐧界殑 HTML
            console.log('鎷︽埅鍒颁簡瀹夊叏鎸戞垬椤甸潰锛屾鍦ㄥ睆钄?..');
            await route.fulfill({
                status: 200,
                contentType: 'text/html',
                body: '<html><body></body></html>' // 杩斿洖绌虹櫧鍐呭
            });
        });

        // 宸茬鐢ㄣ€屾棤鍔ㄩ潤鑷姩鎴浘銆嶏紙鐢ㄦ埛瑕佹眰锛夈€傚け璐ユ椂浠嶇敱鍚?catch 鍒嗘敮涓诲姩鎴浘璇婃柇銆?
        stopInactivityWatcher = () => { /* noop */ };
        if (false) {
            const inactivityMs = 30000;
            const maxCapturesPerStall = 3;
            let timer = null;
            let isCapturing = false;
            let captureCount = 0;
            let lastObservedUrl = '';

            const isMeaningfulUrlChange = () => {
                if (!page || page.isClosed()) {
                    return false;
                }
                const currentUrl = page.url();
                if (currentUrl && currentUrl !== lastObservedUrl) {
                    lastObservedUrl = currentUrl;
                    captureCount = 0;
                    return true;
                }
                return false;
            };

            const schedule = () => {
                if (timer) {
                    clearTimeout(timer);
                }
                timer = setTimeout(async () => {
                    if (!page || page.isClosed() || isCapturing) {
                        return;
                    }
                    isCapturing = true;
                    try {
                        await captureDebugScreenshot(context, page, 'inactive', '30绉掓棤鍔ㄩ潤鑷姩鎴浘');
                        captureCount += 1;
                        const stuckUrl = page.url();
                        if (captureCount >= maxCapturesPerStall) {
                            console.error(`鉂?[绯荤粺] 椤甸潰鐤戜技鍗℃锛?{captureCount * 30} 绉掓棤鏈夋晥杩涘睍 (URL: ${stuckUrl})`);
                            await page.close().catch(() => { });
                            return;
                        }
                    } catch (e) {
                        console.warn(`鈿狅笍 [绯荤粺] 鑷姩鎴浘澶辫触: ${e.message}`);
                    } finally {
                        isCapturing = false;
                        if (page && !page.isClosed()) {
                            schedule();
                        }
                    }
                }, inactivityMs);
            };

            const onActivity = () => {
                if (isMeaningfulUrlChange()) {
                    schedule();
                }
            };

            page.on('load', onActivity);
            page.on('domcontentloaded', onActivity);
            page.on('framenavigated', onActivity);
            page.on('close', () => {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
            });

            schedule();

            return () => {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
                page.off('load', onActivity);
                page.off('domcontentloaded', onActivity);
                page.off('framenavigated', onActivity);
            };
        }

        const solveSlider = async () => {
            const BUTTON_SELECTORS = [
                "button:has-text('Confirm')",
                "button:has-text('纭鎮ㄦ槸鐪熶汉')",
                "button:has-text(\"I'm not a robot\")",
                "button:has-text('Verify')",
                "div.ctp-checkbox-container",
                "#challenge-stage",
                "iframe[title*='hCaptcha' i]",
                "iframe[title*='Turnstile' i]",
                "iframe[src*='hcaptcha']",
                "iframe[src*='turnstile']",
                "iframe[src*='recaptcha']"
            ];
            const SLIDER_SELECTORS = [
                "#captcha__frame__bottom .slider",
                "#captcha__frame__bottom .sliderIcon",
                ".sliderContainer .slider",
                ".sliderContainer .sliderIcon",
                ".slider",
                ".sliderIcon",
                "[class*='slider']",
                "[class*='Slider']",
                "[data-testid*='slider']",
                ".geetest_slider_button",
                ".nc_iconfont.btn_slide",
                ".nc_slider",
                "#nc_1_n1z",
                "#challenge-container",
                "[aria-label*='slider' i]",
                "[aria-label*='婊戝潡']",
                "[role='slider']",
                "div:has-text('鎷栧姩婊戝潡')",
                "div:has-text('Drag the slider')",
                "p:has-text('Move the slider all the way to the right')"
            ];
            const SOFT_WAIT_MS = 8000;

            const collectFrames = () => [page, ...page.frames()];

            const tryFindFirstVisible = async (selectors) => {
                const deadline = Date.now() + SOFT_WAIT_MS;
                while (Date.now() < deadline) {
                    for (const frame of collectFrames()) {
                        for (const sel of selectors) {
                            try {
                                const loc = frame.locator(sel).first();
                                if (await loc.isVisible({ timeout: 250 })) {
                                    return { frame, selector: sel, locator: loc };
                                }
                            } catch (_) { }
                        }
                    }
                    await page.waitForTimeout(400);
                }
                return null;
            };

            try {
                // 1) 绠€鍗曠偣鍑诲瀷楠岃瘉锛圱urnstile/hCaptcha 澶嶉€夋銆丆onfirm 鎸夐挳锛?
                const btnHit = await tryFindFirstVisible(BUTTON_SELECTORS);
                if (btnHit) {
                    console.log(`馃З [椋庢帶] 妫€娴嬪埌楠岃瘉鎸夐挳: ${btnHit.selector}`);
                    try {
                        const box = await btnHit.locator.boundingBox();
                        if (box) {
                            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                        } else {
                            await btnHit.locator.click({ timeout: 2000 }).catch(() => { });
                        }
                        await page.waitForTimeout(3000);
                        console.log("✅ [风控] 验证按钮点击完成。");
                        return true;
                    } catch (e) {
                        console.warn(`鈿狅笍 [椋庢帶] 楠岃瘉鎸夐挳鐐瑰嚮澶辫触: ${e.message}`);
                    }
                }

                // 2) 婊戝潡鎷栧姩
                const sliderHit = await tryFindFirstVisible(SLIDER_SELECTORS);
                if (sliderHit) {
                    const { frame, selector, locator: slider } = sliderHit;
                    console.log(`馃З [椋庢帶] 妫€娴嬪埌婊戝潡: ${selector}`);
                    const box = await slider.boundingBox();
                    if (!box) {
                        console.warn(`⚠️ [风控] 滑块命中但拿不到 boundingBox，跳过。`);
                        return false;
                    }

                    const container = frame
                        .locator("#captcha__frame__bottom .sliderContainer, .sliderContainer, [class*='slider-container'], [class*='SliderContainer'], .geetest_slider, .nc_scale")
                        .first();
                    const cBox = (await container.isVisible({ timeout: 200 }).catch(() => false))
                        ? await container.boundingBox().catch(() => null)
                        : null;
                    // PayPal 婊戝潡闇€瑕佹嫋鍒板鍣ㄦ渶鍙崇锛岃窛绂?= 瀹瑰櫒瀹?- 婊戝潡瀹斤紙鍐嶅姞灏戦噺瀵屼綑纭繚璐村彸杈癸級
                    const distance = cBox ? Math.max(0, cBox.width - box.width + 6) : 310;

                    const startX = box.x + box.width / 2;
                    const startY = box.y + box.height / 2;

                    await page.mouse.move(startX, startY);
                    await page.mouse.down();
                    await page.waitForTimeout(400);

                    const steps = 25;
                    for (let i = 1; i <= steps; i += 1) {
                        const t = i / steps;
                        const ease = 1 - Math.pow(1 - t, 3); // EaseOutCubic
                        await page.mouse.move(startX + distance * ease, startY + (Math.random() * 6 - 3));
                        await page.waitForTimeout(Math.random() * 15 + 10);
                    }

                    await page.mouse.move(startX + distance + 5, startY + (Math.random() * 4 - 2));
                    await page.waitForTimeout(800);
                    await page.mouse.up();
                    console.log("✅ [风控] 滑块验证处理成功。");
                    await page.waitForTimeout(2500);
                    await checkCriticalErrors();
                    return true;
                }

                // 3) 娌℃湁鍛戒腑锛氭妸椤甸潰涓婂父瑙佹寫鎴?iframe 鍒楀嚭鏉ヤ究浜庢帓鏌?
                const knownIframeMatches = [];
                for (const frame of collectFrames()) {
                    const url = frame.url() || '';
                    if (/hcaptcha|turnstile|recaptcha|captcha|challenge/i.test(url)) {
                        knownIframeMatches.push(url);
                    }
                }
                if (knownIframeMatches.length) {
                    console.warn(`馃З [椋庢帶] 妫€娴嬪埌鎸戞垬 iframe 浣嗘湭璇嗗埆鍙嫋鍔ㄦ粦鍧? ${knownIframeMatches.join(' | ')}`);
                } else {
                    console.log("⚠️ [风控] 未检测到滑块/验证按钮（PayPal 未下发挑战）。");
                }
            } catch (e) {
                console.warn(`鈿狅笍 [椋庢帶] solveSlider 寮傚父: ${e.message}`);
            }
            return false;
        };

        /**
         * Continuous monitoring for security challenges
         */
        /**
         * Fetches the 6-digit SMS code from the API
         */
        const getSMSCode = async (timeout = 120000) => {
            console.log("馃摠 [鐩戝惉] 姝ｅ湪绛夊緟鐭俊楠岃瘉鐮?..");
            const start = Date.now();
            const apiUrl = `http://a.62-us.com/api/get_sms?key=${CONFIG.billing.smsKey}`;
            let consecutiveNoCode = 0;

            while (Date.now() - start < timeout) {
                try {
                    const response = await context.request.get(apiUrl);
                    const text = await response.text();
                    console.log(`   [鐭俊] 鎺ュ彛杩斿洖: ${text}`);

                    if (text.includes("yes|")) {
                        const match = text.match(/\b(\d{6})\b/);
                        if (match) {
                            console.log(`鉁?[鐭俊] 楠岃瘉鐮佹彁鍙栨垚鍔? ${match[1]}`);
                            return match[1];
                        }
                    }

                    if (text.includes('no|') || text.includes('暂无验证码') || text.includes('no code')) {
                        consecutiveNoCode += 1;
                        // 杩炵画鏃犻獙璇佺爜锛氭彁鍓嶅垽瀹氳鍙蜂笉鍙敤锛岄伩鍏嶉暱鏃堕棿鍗℃娴垂璧勬簮
                        if (consecutiveNoCode >= 12) { // 绾?1 鍒嗛挓
                            throw new Error('短信验证码超时：该手机号无验证码');
                        }
                    } else {
                        consecutiveNoCode = 0;
                    }
                } catch (e) {
                    console.error(`[-] [鐭俊] 鎺ュ彛璇锋眰寮傚父: ${e.message}`);
                    if (String(e.message || '').includes('短信验证码超时')) throw e;
                }
                await page.waitForTimeout(5000); // Poll every 5s
            }
            throw new Error('短信验证码超时：该手机号无验证码');
        };

        const checkCriticalErrors = async () => {
            // 鍦ㄥ紑濮嬫壂鎻忓墠锛屽厛绛夊緟 1.5 绉掞紝缁欓〉闈㈠姩鎬佸脊鍑烘嫤鎴鐣欏嚭缂撳啿鏃堕棿
            await page.waitForTimeout(1500);

            try {
                const currentUrl = page.url();
                if (currentUrl.includes('/checkoutweb/genericError')) {
                    throw new Error('"鐩戞祴鍒拌嚧鍛芥嫤鎴?(Security Block): You have been blocked"');
                }

                const allFrames = [page, ...page.frames()];

                for (const frame of allFrames) {
                    try {
                        // 浼樺寲鐐?锛氫娇鐢?:visible 浼被锛屽彧鎻愬彇鐪熷疄娓叉煋鍦ㄩ〉闈笂銆佺敤鎴疯兘鐪嬭鐨勬枃鏈?
                        // 浼樺寲鐐?锛歵extContent 姣?innerText 鑾峰彇鍔ㄦ€佹枃鏈洿绋冲畾锛屼笖涓嶅彈 CSS 鏍峰紡骞叉壈
                        const visibleText = await frame.locator(':visible').allTextContents().then(texts => texts.join(' ')).catch(() => "");

                        if (!visibleText) continue;

                        // 1. 鑷村懡鎷︽埅鏂囧瓧 (鍏?Frame 鎵弿鍙鏂囨湰)
                        if (visibleText.includes("We couldn鈥檛 load the security challenge") || visibleText.includes("You have been blocked") || visibleText.includes("Return to merchant")) {
                            throw new Error("鐩戞祴鍒拌嚧鍛芥嫤鎴?(Security Block): You have been blocked");
                        }



                        // 2. 鎵嬫満鍙?閾惰鍗¤鎷掓枃瀛?
                        if (visibleText.includes("different phone number")) {
                            throw new Error("手机号码被拒绝或系统拦截");
                        }
                        if (visibleText.includes("Things don't seem to be working") || visibleText.includes("Your account is limited")) {
                            throw new Error("閾惰鍗¤鎷掔粷 (Card declined)");
                        }

                    } catch (e) {
                        // 灏嗗叿浣撶殑鎷︽埅閿欒缁х画鍚戜笂鎶涘嚭
                        if (e.message.includes("Security Block") || e.message.includes("blocked") || e.message.includes("拦截")) throw e;
                    }
                }
            } catch (e) {
                if (e.message.includes("Security Block") || e.message.includes("blocked") || e.message.includes("拦截")) throw e;
            }
        };

        async function mouseBreathing(page, duration) {
            const startTime = Date.now();
            while (Date.now() - startTime < duration) {
                // 鑾峰彇褰撳墠澶ф浣嶇疆锛岃繘琛屾瀬灏忚寖鍥寸殑闅忔満鍋忕Щ锛埪?鍍忕礌锛?
                const jitterX = randomDelay(-5, 5);
                const jitterY = randomDelay(-5, 5);
                // 浣跨敤 move 鐨?steps: 1 淇濊瘉骞虫粦杩囨浮鍒板亸绉讳綅缃?
                await page.mouse.move(page.lastMouseX + jitterX, page.lastMouseY + jitterY, { steps: 5 });
                await page.waitForTimeout(randomDelay(100, 300)); // 棰ゅ姩鐨勯鐜?
            }
        }

        // 鍏ㄥ眬杩炶疮婕父锛堣В鍐抽紶鏍囩灛绉婚棶棰橈級
        async function continuousHumanRoam(page, duration = 3000) {
            // 鑾峰彇褰撳墠榧犳爣鐨勫疄鏃跺潗鏍囦綔涓鸿捣鐐癸紙淇濊瘉杞ㄨ抗杩炶疮锛?
            // 娉ㄦ剰锛歅laywright 鏃犳硶鐩存帴璇诲彇褰撳墠榧犳爣鍧愭爣锛屾垜浠渶瑕佽嚜宸卞湪 page 瀵硅薄涓婄淮鎶や竴涓姸鎬?
            // 濡傛灉浣犳病鏈夌淮鎶わ紝鍙互浣跨敤涓€涓叏灞€鍙橀噺鏉ヨ褰曚笂涓€娆＄Щ鍔ㄧ殑缁堢偣
            const startX = page.lastMouseX || 500;
            const startY = page.lastMouseY || 500;

            // 闅忔満鐢熸垚缁堢偣锛堥伩寮€娴忚鍣ㄦ瀬杈圭紭锛?
            const targetX = randomDelay(100, 1100);
            const targetY = randomDelay(100, 700);

            // 璁板綍鏈缁堢偣锛屼緵涓嬩竴娆¤皟鐢ㄤ娇鐢?
            page.lastMouseX = targetX;
            page.lastMouseY = targetY;

            // 鐢熸垚璐濆灏旀洸绾挎帶鍒剁偣锛堣杞ㄨ抗鍙樻垚骞虫粦鐨勫姬绾匡級
            const cp1x = startX + (targetX - startX) * 0.3 + randomDelay(-200, 200);
            const cp1y = startY + (targetY - startY) * 0.3 + randomDelay(-200, 200);
            const cp2x = startX + (targetX - startX) * 0.7 + randomDelay(-200, 200);
            const cp2y = startY + (targetY - startY) * 0.7 + randomDelay(-200, 200);

            const steps = 50; // 澧炲姞姝ユ暟璁╃Щ鍔ㄦ洿缁嗚吇
            const stepDelay = duration / steps;

            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                // 涓夋璐濆灏旀洸绾垮叕寮?
                const x = Math.pow(1 - t, 3) * startX +
                    3 * Math.pow(1 - t, 2) * t * cp1x +
                    3 * (1 - t) * Math.pow(t, 2) * cp2x +
                    Math.pow(t, 3) * targetX;
                const y = Math.pow(1 - t, 3) * startY +
                    3 * Math.pow(1 - t, 2) * t * cp1y +
                    3 * (1 - t) * Math.pow(t, 2) * cp2y +
                    Math.pow(t, 3) * targetY;

                await page.mouse.move(x, y);
                // 姣忎竴姝ュ姞鍏ュ井灏忕殑鏃堕棿鎶栧姩锛屾ā鎷熶汉鎵嬬殑涓嶅寑閫?
                await page.waitForTimeout(stepDelay + randomDelay(-10, 15));
            }
        }
        // 鎷熶汉鍖栭殢鏈哄欢杩?
        const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

        // 鏍稿績鎷熶汉杈撳叆鍑芥暟锛氬厛鐪嬨€佸啀鐐广€佸伓灏旀墦閿欏瓧銆佸啀鍒犳帀閲嶆墦
        async function humanTypeWithSoul(page, locator, text) {
            // 1. 鐪肩潧鍏堣繃鍘伙紙榧犳爣鎮仠鍦ㄨ緭鍏ユ涓婏紝鍋囪鍦ㄧ湅锛?
            const box = await locator.boundingBox();
            if (box) {
                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
                await page.waitForTimeout(randomDelay(400, 1200)); // 鐪肩纭浣嶇疆
            }

            // 2. 鐐瑰嚮鑾峰彇鐒︾偣
            await locator.click();
            await page.waitForTimeout(randomDelay(200, 500));

            // 3. 妯℃嫙鎵撳瓧锛堝姞鍏ュ伓灏旂殑鎵撻敊瀛楀拰閫€鏍肩籂閿欓€昏緫锛?
            for (let i = 0; i < text.length; i++) {
                // 95% 姒傜巼鎵撳瀛楋紝5% 姒傜巼鎵撻敊鐒跺悗閫€鏍硷紙妯℃嫙鐪熷疄鎵嬭锛?
                if (Math.random() < 0.05 && i > 2) {
                    await page.keyboard.type('x'); // 闅忎究鎵撲釜閿欏瓧
                    await page.waitForTimeout(randomDelay(100, 200));
                    await page.keyboard.press('Backspace'); // 鍒犳帀閿欏瓧
                    await page.waitForTimeout(randomDelay(150, 300)); // 绾犻敊鍚庣殑鍋滈】
                }

                // 姝ｅ父杈撳叆瀛楃
                await page.keyboard.type(text[i]);
                // 鎵撳瓧閫熷害涓嶅潎鍖€锛氬伓灏斿揩锛屽伓灏斿崱椤夸竴涓?
                let typeDelay = randomDelay(80, 200);
                if (Math.random() < 0.1) typeDelay += randomDelay(300, 800); // 鍋跺皵绐佺劧鍗″３鎯充竴涓?
                await page.waitForTimeout(typeDelay);
            }
        }


        // 鏍稿績鎷熶汉鍖栧～绌哄嚱鏁帮紙鍚～鍚庢牎楠岋細涓嶄竴鑷村垯娓呯┖閲嶅～锛岀洿鍒版垚鍔熶负姝級
        // digitsMode=true锛氬崱鍙?鎵嬫満鍙?鏈夋晥鏈?CVC 瀛楁銆?
        //   PayPal 鐨勫崱鍙?/ 鎵嬫満鍙峰瓧娈佃繎鏈熷紑鍚簡 4-4-4-4 鑷姩鏍煎紡鍖栵紙onInput 閲嶆帓甯︾┖鏍硷級锛?
        //   閫愬瓧绗?keyboard.type 浼氳 React 閲嶆帓鍚炲瓧绗︼紝鎵€浠ヨ繖绫诲瓧娈电洿鎺ョ敤 page.fill() 涓€娆℃€у啓鍏ャ€?
        //   PayPal 涓嶄細妫€娴嬪～鍗℃椂闀匡紝榧犳爣 / 鎻愪氦鏃堕暱鐢卞叾浠栦汉鎵嬫ā鎷熻鐩栥€?
        async function humanFillInput(page, locator, text, digitsMode = false, fastMode = false) {
            const digitsOnly = (s) => String(s || '').replace(/\D/g, '');

            // 鈥斺€?digitsMode 鎴?fastMode锛氭ā鎷熴€屽瘑鐮佺鐞嗗櫒绮樿创銆嶏紝鐬椂濉叆
            // 鐪熷疄鐢ㄦ埛鍦ㄥ崱鍙?/ 閭 / 瀵嗙爜 瀛楁涓?90% 鏄矘璐磋€岄潪閫愬瓧鏁诧紝
            // 鎱㈣妭濂忔暡瀛楀弽鑰岃Е鍙?hCaptcha invisible 鐨?閿洏浜嬩欢杩囬暱"椋庢帶鍒ゅ垎銆?
            if (digitsMode || fastMode) {
                let attempt = 0;
                while (attempt < 5) {
                    attempt++;
                    await locator.waitFor({ state: 'visible', timeout: 50000 });
                    const box = await locator.boundingBox().catch(() => null);
                    if (box) {
                        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
                        page.lastMouseX = box.x + box.width / 2;
                        page.lastMouseY = box.y + box.height / 2;
                        await page.waitForTimeout(randomDelay(150, 400));
                    }
                    await locator.click({ clickCount: 3 }).catch(() => { });
                    await page.waitForTimeout(randomDelay(60, 160));
                    try {
                        await locator.fill(text);
                    } catch (_) {
                        await page.keyboard.press('Control+A').catch(() => { });
                        await page.keyboard.press('Delete').catch(() => { });
                        await page.keyboard.type(text, { delay: 20 });
                    }
                    // 瑙﹀彂 React onChange / onBlur锛岀‘淇濇牸寮忓寲鐢熸晥
                    await locator.evaluate((node) => {
                        try {
                            node.dispatchEvent(new Event('input', { bubbles: true }));
                            node.dispatchEvent(new Event('change', { bubbles: true }));
                            node.dispatchEvent(new Event('blur', { bubbles: true }));
                        } catch (_) { }
                    }).catch(() => { });
                    await page.waitForTimeout(randomDelay(150, 350));

                    const actualValue = await locator.inputValue().catch(() => null);
                    const compareOk = digitsMode
                        ? (actualValue !== null && digitsOnly(actualValue) === digitsOnly(text))
                        : (actualValue !== null && actualValue === text);
                    if (compareOk) {
                        return;
                    }
                    console.log(`鈿狅笍 [鏍￠獙] (${digitsMode ? 'digits' : 'fast'}) 绗?{attempt}娆″～鍐欎笉涓€鑷达紝棰勬湡: "${text}"锛屽疄闄? "${actualValue}"锛岄噸濉腑...`);
                }
                console.warn(`⚠️ [校验] (${digitsMode ? 'digits' : 'fast'}) 多次尝试仍不一致，使用最后一次结果继续。`);
                return;
            }

            // 鈥斺€?鏅€氬瓧娈碉紙濮撳悕 / 閭 / 鍦板潃 / 瀵嗙爜锛夛細淇濈暀浜烘墜鑺傚
            let attempt = 0;
            while (true) {
                attempt++;
                await locator.waitFor({ state: 'visible', timeout: 50000 });
                const box = await locator.boundingBox().catch(() => null);
                if (box) {
                    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
                    page.lastMouseX = box.x + box.width / 2;
                    page.lastMouseY = box.y + box.height / 2;
                    await page.waitForTimeout(randomDelay(200, 500));
                }
                await locator.click();
                await page.waitForTimeout(randomDelay(100, 300));
                for (let i = 0; i < text.length; i++) {
                    if (Math.random() < 0.05 && i > 2) {
                        await page.keyboard.type('x');
                        await page.waitForTimeout(randomDelay(100, 200));
                        await page.keyboard.press('Backspace');
                        await page.waitForTimeout(randomDelay(150, 300));
                    }
                    await page.keyboard.type(text[i]);
                    let typeDelay = randomDelay(80, 200);
                    if (Math.random() < 0.1) typeDelay += randomDelay(300, 800);
                    await page.waitForTimeout(typeDelay);
                }
                await page.waitForTimeout(randomDelay(200, 400));

                const actualValue = await locator.inputValue().catch(() => null);
                if (actualValue !== null && actualValue === text) {
                    break;
                }
                if (attempt >= 5) {
                    console.warn(`⚠️ [校验] 普通字段 5 次重填后仍不一致，预期: "${text}"，实际: "${actualValue}"，继续后续流程。`);
                    break;
                }
                console.log(`鈿狅笍 [鏍￠獙] 绗?{attempt}娆″～鍐欎笉涓€鑷达紝棰勬湡: "${text}", 瀹為檯: "${actualValue}"锛屾竻绌洪噸濉?..`);
                await locator.click();
                await page.waitForTimeout(randomDelay(100, 200));
                await page.keyboard.press('Control+A');
                await page.waitForTimeout(randomDelay(80, 150));
                await page.keyboard.press('Delete');
                await page.waitForTimeout(randomDelay(200, 400));
            }
        }

        // --- Phase 3: Checkout Execution ---
        const openCheckoutPage = async () => {
            console.log("馃挸 [姝ラ] 鎵撳紑 Stripe Hosted Checkout 椤甸潰...");
            try {
                await page.goto(paypalUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
                await recoverConnectionClosed(page, paypalUrl);
                return true;
            } catch (error) {
                if (!usingReusedCheckoutUrl) {
                    throw error;
                }
                console.warn(`鈿狅笍 [姝ラ] 澶嶇敤鏀粯閾炬帴鎵撳紑澶辫触锛岄噸鏂扮敓鎴愭敮浠橀摼鎺? ${error.message}`);
                paypalUrl = await createCheckoutUrl();
                usingReusedCheckoutUrl = false;
                if (!paypalUrl) {
                    throw new Error("鏃犳硶鑾峰彇 PayPal 瀹℃壒閾炬帴");
                }
                await page.goto(paypalUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
                await recoverConnectionClosed(page, paypalUrl);
                return true;
            }
        };
        await openCheckoutPage();

        const normalizeAmount = (raw) => {
            return String(raw || '')
                .replace(/\s+/g, '')
                .replace(/,/g, '')
                .toUpperCase();
        };
        const isZeroAmountText = (raw) => {
            const text = normalizeAmount(raw);
            return text === '$0.00'
                || text === 'US$0.00'
                || text === 'USD0.00'
                || text === '0.00'
                || text === '$0'
                || text === 'US$0'
                || text === 'USD0'
                || text === '0';
        };
        const collectAmountTexts = async () => {
            return page.locator('.CurrencyAmount').allTextContents()
                .then((arr) => arr.map(v => String(v || '').trim()).filter(Boolean))
                .catch(() => []);
        };

        // 浠ｇ悊鎱㈡椂 Stripe 浼氬垎娈垫覆鏌擄紝缁欒冻绐楀彛骞跺娆￠噰鏍烽噾棰濆厓绱犮€?
        const amountWaitTimeoutMs = 120000;
        const amountPollIntervalMs = 1500;
        const amountDeadline = Date.now() + amountWaitTimeoutMs;
        let latestAmountTexts = [];
        let hasZeroAmount = false;
        while (Date.now() < amountDeadline) {
            latestAmountTexts = await collectAmountTexts();
            if (latestAmountTexts.length > 0) {
                hasZeroAmount = latestAmountTexts.some(isZeroAmountText);
                if (hasZeroAmount) break;
            }
            await page.waitForTimeout(amountPollIntervalMs);
        }

        if (usingReusedCheckoutUrl && latestAmountTexts.length === 0) {
            console.warn("鈿狅笍 [姝ラ] 澶嶇敤鏀粯閾炬帴鏈繘鍏ユ湁鏁?Checkout 椤甸潰锛岄噸鏂扮敓鎴愭敮浠橀摼鎺?..");
            paypalUrl = await createCheckoutUrl();
            usingReusedCheckoutUrl = false;
            if (!paypalUrl) {
                throw new Error("鏃犳硶鑾峰彇 PayPal 瀹℃壒閾炬帴");
            }
            await page.goto(paypalUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
            await recoverConnectionClosed(page, paypalUrl);

            latestAmountTexts = [];
            hasZeroAmount = false;
            const retryDeadline = Date.now() + amountWaitTimeoutMs;
            while (Date.now() < retryDeadline) {
                latestAmountTexts = await collectAmountTexts();
                if (latestAmountTexts.length > 0) {
                    hasZeroAmount = latestAmountTexts.some(isZeroAmountText);
                    if (hasZeroAmount) break;
                }
                await page.waitForTimeout(amountPollIntervalMs);
            }
        }
        console.log(`馃挵 [姝ラ] 褰撳墠椤甸潰閲戦鍏冪礌: ${latestAmountTexts.join(' | ') || '(绌?'}`);
        if (!hasZeroAmount) {
            const displayAmount = latestAmountTexts[0] || 'unknown';
            throw new Error(`閲戦鏍￠獙澶辫触锛屽綋鍓嶉噾棰濅笉鏄?0 鍏? ${displayAmount}`);
        }
        console.log("✅ [步骤] 金额校验通过，确认是 0 元订单。");
        // Phase 3: 鐩村鏍稿績 - 瑙﹀彂 PayPal 閲嶅畾鍚?
        // (闈欓粯) 鐩存帴瑙﹀彂 PayPal 閲嶅畾鍚?

        const triggerPayPal = async () => {
            const selectors = [
                '.AccordionItemCover.PaymentMethodFormAccordionItem.paypal-accordion-item-cover',
                '[data-testid="paypal-payment-method"]',
                'button:has-text("PayPal")',
                'div[role="radio"]:has-text("PayPal")'
            ];
            for (const sel of selectors) {
                const el = page.locator(sel).first();
                if (await el.isVisible().catch(() => false)) {
                    // (闈欓粯) 鍛戒腑 PayPal 瑙﹀彂鍣ㄩ€夋嫨鍣?
                    await el.click({ force: true });
                    return true;
                }
            }
            return false;
        };

        // 灏濊瘯鐩存帴鐐瑰嚮锛屽鏋滀笉鎴愬姛鍒欏埛鏂颁竴娆″啀鐐?
        if (!await triggerPayPal()) {
            console.log("鈴?[姝ラ] 鏈兘鐩存帴瑙﹀彂锛屾鍦ㄥ埛鏂伴〉闈㈠己鍒跺姞杞芥敮浠樼粍浠?..");
            try {
                await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
                await recoverConnectionClosed(page, paypalUrl);
                if (!await triggerPayPal()) {
                    // 鍏滃簳锛氬皾璇曠洿鎺ュ鎵炬墍鏈夌殑 PayPal 鏂囧瓧骞剁偣鍑?
                    await page.locator('text=PayPal').first().click({ force: true }).catch(() => { });
                    await page.waitForTimeout(1500);
                }
            } catch (_) {
                throw new Error("鏃犳硶鑾峰彇 PayPal 瀹℃壒閾炬帴");
            }
        }

        // (闈欓粯) 宸茶Е鍙?PayPal 娴佺▼
        await page.waitForTimeout(2000);


        // 閫氱敤锛氱瓑寰呭厓绱犲彲瑙侊紝瓒呮椂鍒欏埛鏂颁竴娆″啀绛夛紙閬垮厤 Stripe / PayPal 鍋跺彂绌虹櫧锛?
        // 娉ㄦ剰锛歳eload 浼氭竻绌哄凡濉瓧娈碉紝鍥犳鍙敤鍦ㄣ€岃闃舵鏈€鏃╀竴涓瓧娈点€嶄笂
        const waitVisibleWithReload = async (selector, {
            firstWaitMs = 30000,
            secondWaitMs = 30000,
            reloadGotoUrl = null,
        } = {}) => {
            const loc = page.locator(selector).first();
            try {
                await loc.waitFor({ state: 'visible', timeout: firstWaitMs });
                return true;
            } catch (_) {
                console.log(`馃攧 [姝ラ] 鍏冪礌 ${selector} ${firstWaitMs}ms 鏈覆鏌擄紝鍒锋柊椤甸潰鍚庨噸璇?..`);
                try {
                    if (reloadGotoUrl) {
                        await page.goto(reloadGotoUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
                    } else {
                        await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
                    }
                    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { });
                } catch (e) {
                    console.warn(`鈿狅笍 [姝ラ] 鍒锋柊澶辫触: ${e.message}`);
                }
                await loc.waitFor({ state: 'visible', timeout: secondWaitMs });
                return true;
            }
        };

        // Phase 3C: 濉啓琛ㄥ崟
        async function afterFieldTransition(page, fieldName) {
            if (Math.random() < 0.5) {
                const driftX = page.lastMouseX + randomDelay(-80, 80);
                const driftY = page.lastMouseY + randomDelay(30, 80);
                await page.mouse.move(Math.max(50, Math.min(1200, driftX)), Math.max(50, Math.min(750, driftY)), { steps: 12 });
                page.lastMouseX = driftX; page.lastMouseY = driftY;
            }
            await page.waitForTimeout(randomDelay(600, 2000));
            if (Math.random() < 0.2) {
                await page.mouse.wheel(0, randomDelay(-40, 60));
                await page.waitForTimeout(randomDelay(300, 700));
            }
        }
        const isFillableStripeField = async (loc) => {
            if (!(await loc.isVisible({ timeout: 1000 }).catch(() => false))) {
                return false;
            }
            return loc.evaluate((node) => {
                const className = String(node.className || '');
                const ariaHidden = String(node.getAttribute('aria-hidden') || '').toLowerCase() === 'true';
                const tabIndex = Number(node.getAttribute('tabindex'));
                const style = window.getComputedStyle(node);
                const rect = node.getBoundingClientRect();
                return !ariaHidden
                    && !className.includes('HiddenInput')
                    && !(Number.isFinite(tabIndex) && tabIndex < 0)
                    && style.visibility !== 'hidden'
                    && style.display !== 'none'
                    && rect.width > 4
                    && rect.height > 4;
            }).catch(() => false);
        };
        const expandStripeManualAddressFields = async () => {
            const manualEntryTriggers = [
                page.getByText(/Enter address manually/i),
                page.locator('button:has-text("Enter address manually")').first(),
                page.locator('a:has-text("Enter address manually")').first(),
                page.locator('[role="button"]:has-text("Enter address manually")').first()
            ];

            for (const trigger of manualEntryTriggers) {
                const visible = await trigger.isVisible().catch(() => false);
                if (!visible) continue;
                try {
                    await trigger.click({ timeout: 2000 });
                    await page.waitForTimeout(randomDelay(500, 900));
                    return true;
                } catch (_) {}
            }
            return false;
        };
        let addressAutoFilled = false; // 鍦板潃涓嬫媺閫変腑鍚庤烦杩?zip/city 濉啓
        const fillAddress = async () => {
            console.log("馃摑 [姝ラ] 姝ｅ湪濉啓 Stripe 琛楅亾鍦板潃...");

            // 琛楅亾鍦板潃鏄?Stripe 琛ㄥ崟鐨勬牳蹇冨瓧娈碉細30s 娌″嚭鐜板垯鍒锋柊涓€娆″啀绛?30s
            await waitVisibleWithReload('#billingAddressLine1', {
                firstWaitMs: 30000,
                secondWaitMs: 30000,
                reloadGotoUrl: paypalUrl,
            });

            await humanFillInput(page, page.locator('#billingAddressLine1'), CONFIG.billing.address);

            // 绛夊緟涓€涓嬶紝鐪?Stripe 鍦板潃鑷姩琛ュ叏涓嬫媺鏄惁鍑虹幇
            await page.waitForTimeout(randomDelay(800, 1500));

            // Stripe 鍦板潃琛ュ叏涓嬫媺鐨勫父瑙侀€夋嫨鍣?
            const dropdownSelectors = [
                '.AddressAutocomplete-option',
                '[data-testid="address-autocomplete-option"]',
                '.AddressAutocomplete li',
                '[class*="autocomplete"] li',
                '[class*="suggestion"]',
                '[class*="Suggestion"]',
            ];

            let dropdownFound = false;

            for (const sel of dropdownSelectors) {
                try {
                    const option = page.locator(sel).first();
                    const visible = await option.isVisible().catch(() => false);
                    if (visible) {
                        console.log(`鉁?[鍦板潃] 妫€娴嬪埌鍦板潃琛ュ叏涓嬫媺 (${sel})锛屾鍦ㄩ€夋嫨绗竴椤?..`);
                        await page.keyboard.press('ArrowDown');
                        await page.waitForTimeout(randomDelay(200, 400));
                        await page.keyboard.press('Enter');
                        dropdownFound = true;
                        addressAutoFilled = true; // Stripe 浼氳嚜鍔ㄥ～鍏?zip/city
                        await page.waitForTimeout(randomDelay(400, 800));
                        break;
                    }
                } catch (_) { /* 缁х画灏濊瘯涓嬩竴涓?selector */ }
            }
            await page.waitForTimeout(2000);
            if (!dropdownFound) {
                await expandStripeManualAddressFields();
                // 娌℃湁涓嬫媺妗嗭細鐐逛竴涓嬮〉闈㈤《閮ㄥ畨鍏ㄧ殑绌虹櫧鍖哄煙锛岃鍦板潃妗嗗け鐒?
                // (闈欓粯) 鍦板潃琛ュ叏涓嬫媺鏈嚭鐜?
                // 鐐瑰嚮椤甸潰椤堕儴鍖哄煙锛堣繙绂昏〃鍗曪紝涓嶄細璇Е鍏朵粬杈撳叆妗嗭級
                const safeX = randomDelay(800, 1100);
                const safeY = randomDelay(30, 80);
                await page.mouse.move(safeX, safeY, { steps: 20 });
                page.lastMouseX = safeX; page.lastMouseY = safeY;
                await page.waitForTimeout(randomDelay(100, 300));
                await page.mouse.down();
                await page.waitForTimeout(randomDelay(50, 100));
                await page.mouse.up();
                await page.waitForTimeout(randomDelay(300, 600));
            }

            console.log("✅ [步骤] 街道地址填写完成。");
            await afterFieldTransition(page, 'address');
        };
        const fillName = async () => {
            console.log("馃摑 [姝ラ] 姝ｅ湪濉啓 Stripe 璐﹀崟濮撳悕...");
            const nameInput = page.locator('#billingName').first();
            try {
                await nameInput.waitFor({ state: 'attached', timeout: 1000 });
                if (await nameInput.isVisible()) {
                    await humanFillInput(page, nameInput, CONFIG.billing.name);
                    console.log("✅ [步骤] 姓名填写完成。");
                    await afterFieldTransition(page, 'name');
                }
            } catch (error) { console.log('鈴?濮撳悕杈撳叆妗嗕笉瀛樺湪锛屽凡璺宠繃'); }
        };
        const fillZipAndCity = async () => {
            if (addressAutoFilled) {
                console.log("? [??] ???????????????????");
                return;
            }
            console.log("?? [??] ???? Stripe ?????...");
            await expandStripeManualAddressFields();

            const zipLoc = page.locator('#billingPostalCode, #billingAddressPostalCode, input[name="billingPostalCode"], input[name="billingAddressPostalCode"]').first();
            const cityLoc = page.locator('#billingLocality, #billingAddressCity, input[name="billingLocality"], input[name="billingAddressCity"]').first();
            const zipVisible = await isFillableStripeField(zipLoc);
            const cityVisible = await isFillableStripeField(cityLoc);

            if (!zipVisible && !cityVisible) {
                console.log("? [??] ?? Stripe ??/??????????????????????");
                return;
            }

            if (Math.random() > 0.5) {
                if (zipVisible) {
                    await humanFillInput(page, zipLoc, CONFIG.billing.zip);
                    await afterFieldTransition(page, "zip");
                }
                if (cityVisible) {
                    await humanFillInput(page, cityLoc, CONFIG.billing.city);
                }
            } else {
                if (cityVisible) {
                    await humanFillInput(page, cityLoc, CONFIG.billing.city);
                    await afterFieldTransition(page, "city");
                }
                if (zipVisible) {
                    await humanFillInput(page, zipLoc, CONFIG.billing.zip);
                }
            }
            console.log("✅ [步骤] 邮编与城市填写完成。");
            await afterFieldTransition(page, "zipCity");
        };
        const fillOrders = [
            [fillAddress, fillName, fillZipAndCity],
            [fillName, fillAddress, fillZipAndCity],
            [fillAddress, fillZipAndCity, fillName],
        ];
        const chosenOrder = fillOrders[Math.floor(Math.random() * fillOrders.length)];
        // (闈欓粯) 鎷熶汉濉啓椤哄簭
        for (const fillFn of chosenOrder) {
            await fillFn();
            if (Math.random() < 0.3) {
                // (闈欓粯) 榧犳爣婕父
                await continuousHumanRoam(page, randomDelay(1000, 2000));
            }
        }

        // Phase 3D: 鍕鹃€夊崗璁?
        // (闈欓粯) 妫€鏌ュ凡濉唴瀹?
        await page.waitForTimeout(randomDelay(1000, 2500));
        if (Math.random() < 0.3) {
            await page.mouse.wheel(0, randomDelay(-100, -40));
            await page.waitForTimeout(randomDelay(800, 1500));
            await page.mouse.wheel(0, randomDelay(60, 120));
            await page.waitForTimeout(randomDelay(500, 1000));
        }
        // Stripe 鐜板湪澶氫簡涓€涓?"Save my payment information" 澶嶉€夋锛屽師 .Checkbox-Input 浼氬悓鏃跺尮閰嶄袱涓紝瑙﹀彂 strict mode 杩濊
        let checkbox = page.locator('#termsOfServiceConsentCheckbox').first();
        if (!(await checkbox.isVisible().catch(() => false))) {
            checkbox = page.locator('.Checkbox-Input').last();
            if (!(await checkbox.isVisible().catch(() => false))) {
                checkbox = page.locator('.Checkbox-Input').first();
            }
        }
        const cbBox = await checkbox.boundingBox().catch(() => null);
        if (cbBox) {
            const cbClickX = cbBox.x + randomDelay(3, 15);
            const cbClickY = cbBox.y + randomDelay(3, 15);
            await page.mouse.move(cbClickX, cbClickY, { steps: randomDelay(20, 35) });
            page.lastMouseX = cbClickX; page.lastMouseY = cbClickY;
            await page.waitForTimeout(randomDelay(300, 700));
            await page.mouse.down();
            await page.waitForTimeout(randomDelay(50, 120));
            await page.mouse.up();
            console.log("✅ [步骤] 协议勾选完成。");
        }
        await page.waitForTimeout(randomDelay(600, 1500));

        // Phase 3E: 鎻愪氦鎸夐挳 鈥斺€?鏋佽嚧鎷熶汉鍖栫偣鍑?
        // (闈欓粯) 鎻愪氦鍓嶆极娓?
        await continuousHumanRoam(page, randomDelay(1500, 3000));
        await mouseBreathing(page, randomDelay(500, 1000));
        console.log("🔔 [步骤] 正在准备提交 Stripe Checkout...");

        const button = page.locator('.SubmitButton-IconContainer');
        try {
            await button.waitFor({ state: 'visible', timeout: 10000 });
        } catch (_) {
            console.log('[步骤] 提交按钮未渲染，刷新一次后重试...');
            try {
                await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
                await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => { });
            } catch (e) {
                console.warn(`[步骤] 刷新失败: ${e.message}`);
            }
            await button.waitFor({ state: 'visible', timeout: 30000 });
        }
        const box = await button.boundingBox();

        if (box) {
            const btnCenterX = box.x + box.width / 2;
            const btnCenterY = box.y + box.height / 2;

            // === Step 1: 瑙嗙嚎鍏堢Щ鍒版寜閽笂鏂瑰尯鍩燂紙涓嶆槸绮惧噯鐬勫噯锛屽儚鍦ㄧ湅椤甸潰涓嬫柟锛?
            const glanceX = box.x + randomDelay(-60, box.width + 60);
            const glanceY = box.y - randomDelay(60, 140);
            await page.mouse.move(glanceX, glanceY, { steps: randomDelay(25, 40) });
            page.lastMouseX = glanceX; page.lastMouseY = glanceY;
            await page.waitForTimeout(randomDelay(600, 1400)); // 鍍忓湪"璇?鎸夐挳涓婃柟鐨勬枃瀛?

            // === Step 2: 榧犳爣鎱㈡參婊戝悜鎸夐挳锛堝姬褰㈢Щ鍔紝缁忚繃鎸夐挳宸︿晶锛?
            const midX = box.x - randomDelay(10, 50); // 浠庡乏杈瑰姬绾胯繘鍏?
            const midY = box.y + randomDelay(5, box.height - 5);
            await page.mouse.move(midX, midY, { steps: randomDelay(15, 25) });
            page.lastMouseX = midX; page.lastMouseY = midY;
            await page.waitForTimeout(randomDelay(200, 500));

            // === Step 3: 鏈€缁堝畾浣嶅埌鎸夐挳涓婏紙杞诲井鍋忕涓績锛岀湡浜轰笉浼氱簿鍑嗙偣涓績锛?
            const clickX = btnCenterX + randomDelay(-Math.floor(box.width * 0.3), Math.floor(box.width * 0.3));
            const clickY = btnCenterY + randomDelay(-Math.floor(box.height * 0.3), Math.floor(box.height * 0.3));
            await page.mouse.move(clickX, clickY, { steps: randomDelay(10, 18) });
            page.lastMouseX = clickX; page.lastMouseY = clickY;

            // === Step 4: 鎮仠鍦ㄦ寜閽笂锛屽仠椤匡紙鐘硅鲍鎰燂紝鐪熶汉浼氬仠涓€涓嬪啀鐐癸級
            await page.waitForTimeout(randomDelay(400, 1000));

            // === Step 5: 25% 姒傜巼"鍙嶆倲涓€涓? 鈥斺€?榧犳爣婧滆蛋鍐嶅洖鏉?
            if (Math.random() < 0.25) {
                // (闈欓粯) 鐘硅鲍妯℃嫙
                const wanderX = clickX + randomDelay(-80, 80);
                const wanderY = clickY + randomDelay(20, 80);
                await page.mouse.move(wanderX, wanderY, { steps: 12 });
                await page.waitForTimeout(randomDelay(500, 1200));
                // 鍐嶇Щ鍥炴潵
                await page.mouse.move(
                    btnCenterX + randomDelay(-10, 10),
                    btnCenterY + randomDelay(-5, 5),
                    { steps: 15 }
                );
                await page.waitForTimeout(randomDelay(200, 500));
            }

            // === Stripe ???????? ===
            const validateStripeCompleteness = async (page) => {
                const criticalSelectors = [
                    { selectors: ["#billingName"], name: "??", val: CONFIG.billing.name },
                    { selectors: ["#billingAddressLine1"], name: "????", val: CONFIG.billing.address },
                    { selectors: ["#billingLocality", "#billingAddressCity", "input[name=\"billingLocality\"]", "input[name=\"billingAddressCity\"]"], name: "??", val: CONFIG.billing.city },
                    { selectors: ["#billingAdministrativeArea", "#billingAddressState", "input[name=\"billingAdministrativeArea\"]", "input[name=\"billingAddressState\"]", "select[name=\"billingAdministrativeArea\"]", "select[name=\"billingAddressState\"]"], name: "?/?", val: CONFIG.billing.state },
                    { selectors: ["#billingPostalCode", "input[name=\"billingPostalCode\"]"], name: "??", val: CONFIG.billing.zip }
                ];
                await expandStripeManualAddressFields();
                let refilledCount = 0;
                for (const item of criticalSelectors) {
                    let el = null;
                    for (const selector of item.selectors) {
                        const candidate = page.locator(selector).first();
                        if (await isFillableStripeField(candidate)) {
                            el = candidate;
                            break;
                        }
                    }
                    if (!el) continue;
                    const val = await el.inputValue().catch(() => "");
                    if (!val || val.trim().length < 1) {
                        console.warn("[!] [????] Stripe " + item.name + " ???????...");
                        const tagName = await el.evaluate((node) => String(node.tagName || "").toLowerCase()).catch(() => "");
                        if (tagName === "select") {
                            await el.selectOption({ label: item.val }).catch(async () => {
                                await el.selectOption(item.val).catch(() => {});
                            });
                        } else {
                            await humanFillInput(page, el, item.val);
                        }
                        await page.waitForTimeout(300);
                        refilledCount += 1;
                    }
                }
                if (refilledCount === 0) {
                    console.log("? [??] Stripe ???????");
                }
            };
            await validateStripeCompleteness(page);
            // ??????????????????????????????????
            await page.mouse.move(
                clickX + randomDelay(-3, 3),
                clickY + randomDelay(-3, 3),
                { steps: 3 }
            );
        }
        await mouseBreathing(page, randomDelay(6000, 8000));
        // Phase 4: PayPal 璐︽埛鍒涘缓
        // 鍏堢瓑椤甸潰鍔犺浇锛屽埛鏂颁竴娆＄‘淇?PayPal 椤甸潰骞插噣锛屽啀妫€鏌ユ粦鍧?
        console.log("鈴?[姝ラ] 绛夊緟璺宠浆鍒?PayPal 椤甸潰...");
        await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => { });
        await solveSlider(); // PayPal 椤甸潰鐨勬粦鍧楁鏌?
        await checkCriticalErrors();
        console.log("鈴?[姝ラ] 姝ｅ湪绛夊緟 PayPal 鍒涘缓璐︽埛鎸夐挳鍑虹幇...");
        // PayPal 鍋跺彂鍙覆鏌撻潤鎬佹杩庨〉锛?PayPal is the safer, easier way to pay" + 璐墿琚嬬浘鐗屽浘锛夛紝
        // 姝ゆ椂鎸夐挳姘歌繙涓嶅嚭鐜般€傚鍒锋柊鍑犳缁?PayPal 閲嶆柊鎷夎处鎴疯〃鍗曠殑鏈轰細銆?
        const tryWaitCreateBtn = async (timeoutMs = 25000) => {
            try {
                await page.getByRole('button', { name: 'Create an Account' }).waitFor({ state: 'visible', timeout: timeoutMs });
                return true;
            } catch (_) { return false; }
        };
        let createBtnReady = await tryWaitCreateBtn(25000);
        let refreshAttempts = 0;
        while (!createBtnReady && refreshAttempts < 2) {
            refreshAttempts += 1;
            console.log(`🔄 [步骤] 未检测到 Create an Account，正在刷新 PayPal 页面...（第 ${refreshAttempts}/2 次）`);
            try {
                await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
                await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => { });
            } catch (e) {
                console.warn(`鈿狅笍 [姝ラ] 鍒锋柊澶辫触: ${e.message}`);
            }
            await solveSlider().catch(() => { });
            createBtnReady = await tryWaitCreateBtn(25000);
        }
        if (!createBtnReady) {
            const currentUrl = page.url();
            if (currentUrl.includes('paypal.com/agreements/approve')) {
                throw new Error(`PayPal 瀹℃壒椤靛崱浣忥細闀挎椂闂村仠鐣欏湪 agreements/approve锛屾湭鍑虹幇 Create an Account (URL: ${currentUrl})`);
            }
            throw new Error(`PayPal 未检测到创建账户表单（已刷新 ${refreshAttempts} 次仍只见欢迎页，URL=${currentUrl}）`);
        }


        // 馃 鐪嬪埌鎸夐挳鍚庝笉鎬ョ潃鐐癸紝鍏堝仠椤夸竴涓嬶紙鍍忕湡浜轰竴鏍峰厛纭椤甸潰鍐呭锛?
        await page.waitForTimeout(randomDelay(1500, 3000));
        const createBtn = page.getByRole('button', { name: 'Create an Account' });
        await createBtn.click();

        // 绛夐偖绠辫緭鍏ユ鍑虹幇
        console.log("馃摑 [姝ラ] 姝ｅ湪濉啓 PayPal 鐧诲綍閭锛坒ast锛?..");
        await page.waitForTimeout(randomDelay(1000, 2000));
        // PayPal 瀛楁缁熶竴浣跨敤 fastMode锛氭嫙銆屽瘑鐮佺鐞嗗櫒绮樿创銆嶏紝閬垮厤 hCaptcha 璇嗗埆涓烘満鍣ㄤ汉
        await humanFillInput(page, page.locator('#login_email'), CONFIG.billing.email, false, true);
        await page.waitForTimeout(randomDelay(500, 1200));

        const continueBtn = page.getByRole('button', { name: 'Continue to Payment' });
        await continueBtn.waitFor({ state: 'visible' });
        await page.waitForTimeout(randomDelay(800, 1500));
        await continueBtn.click({ force: true });
            console.log("✅ [步骤] 已提交邮箱，进入支付信息填写页。");

        // 馃 绛夐〉闈㈡覆鏌撳畬鎴愬啀寮€濮嬪～琛紝鍍忕湡浜虹湅鍒版柊椤甸潰鍚庡厛鎵竴鐪?
        await page.waitForTimeout(randomDelay(2000, 3500));

        // PayPal 鍦ㄣ€屽崱鍙枫€嶄箣鍓嶅彲鑳戒笅鍙戞粦鍧楁寫鎴橈紙#captcha__frame__bottom > .sliderContainer > .slider锛?
        // 绛?#cardNumber 涔嬪墠鍏堝皾璇曡В涓€娆★紱濡傛灉杩樼湅涓嶅埌锛屽垯缁х画杞婊戝潡鐩村埌瑙ｅ紑鎴栬秴鏃?
        console.log("鈴?[姝ラ] 绛夊緟鏀粯琛ㄥ崟娓叉煋锛堝鏈夋粦鍧楀皢鑷姩澶勭悊锛?..");
        const cardLocator = page.locator('#cardNumber');
        const cardWaitDeadline = Date.now() + 90_000;
        let cardReady = false;
        while (Date.now() < cardWaitDeadline) {
            try {
                if (await cardLocator.isVisible({ timeout: 800 })) { cardReady = true; break; }
            } catch (_) { }
            const solved = await solveSlider();
            if (solved) {
                // 瑙ｅ畬婊戝潡鍚庣粰 PayPal 涓€鐐规椂闂撮噸娓叉煋
                await page.waitForTimeout(randomDelay(1500, 2500));
                continue;
            }
            await page.waitForTimeout(800);
        }
        if (!cardReady) {
            // 鍏滃簳锛氬啀灏濊瘯涓€娆℃樉寮?waitFor锛岃鍘熷鎶ラ敊涔熻兘琚埗杩涚▼鎹曟崏
            await cardLocator.waitFor({ state: 'visible', timeout: 5000 });
        }

        console.log("馃摑 [姝ラ] 姝ｅ湪蹇€熷～鍐欒处鍗曚俊鎭紙PayPal 椋庢帶鍋忓ソ銆岀矘璐淬€嶈妭濂忥級...");
        await page.mouse.move(randomDelay(300, 700), randomDelay(200, 400), { steps: 15 });
        await page.waitForTimeout(randomDelay(400, 800));

        const billing = CONFIG.billing;
        const [first, last] = billing.name.split(' ');

        // PayPal 鍏ㄩ儴瀛楁閮借蛋 fast / digits 妯″紡锛堢灛鏃?fill锛夛紝浠垮瘑鐮佺鐞嗗櫒鑷姩濉厖鑺傚
        // 瀛楁闂村仠 200~500ms锛堣繙灏忎簬浜烘墜 800-1500ms锛夛紝鏇存帴杩?鑷姩濉厖 + 鐣ュ仠椤?鐨勭湡浜轰綋楠?
        const paypalFieldOrder = Math.random() > 0.5 ? 'card_first' : 'name_first';

        const fillExpiryAndCvc = async () => {
            // 鏈夋晥鏈?+ CVC 鐭暟瀛椾覆锛氱洿鎺ラ敭鐩?type锛圥ayPal 杩欎袱涓?input 澶氬甫 onInput 寮烘牸寮忓寲锛宲age.fill() 鍋跺彂琚埅鏂級
            await page.keyboard.press('Tab');
            await page.waitForTimeout(randomDelay(120, 280));
            await page.keyboard.type(billing.expiry, { delay: randomDelay(20, 50) });
            await page.waitForTimeout(randomDelay(150, 350));
            await page.keyboard.press('Tab');
            await page.waitForTimeout(randomDelay(120, 250));
            await page.keyboard.type(billing.cvc, { delay: randomDelay(20, 50) });
            await page.waitForTimeout(randomDelay(200, 500));
        };

        if (paypalFieldOrder === 'card_first') {
            await humanFillInput(page, page.locator('#cardNumber'), billing.card, true);
            await page.waitForTimeout(randomDelay(200, 500));
            await fillExpiryAndCvc();
            await humanFillInput(page, page.locator('#firstName'), first || '', false, true);
            await page.waitForTimeout(randomDelay(180, 400));
            await humanFillInput(page, page.locator('#lastName'), last || '', false, true);
        } else {
            await humanFillInput(page, page.locator('#firstName'), first || '', false, true);
            await page.waitForTimeout(randomDelay(180, 400));
            await humanFillInput(page, page.locator('#lastName'), last || '', false, true);
            await page.waitForTimeout(randomDelay(200, 500));
            await humanFillInput(page, page.locator('#cardNumber'), billing.card, true);
            await page.waitForTimeout(randomDelay(200, 500));
            await fillExpiryAndCvc();
        }
        await page.waitForTimeout(randomDelay(300, 700));

        // Email + Phone
        const emailField = page.locator('#email');
        if (await emailField.isVisible().catch(() => false)) {
            await humanFillInput(page, emailField, billing.email, false, true);
            await page.waitForTimeout(randomDelay(180, 400));
        }
        const phoneField = page.locator('#phone');
        if (await phoneField.isVisible().catch(() => false)) {
            await humanFillInput(page, phoneField, billing.smsPhone, true);
            await page.waitForTimeout(randomDelay(180, 400));
        }
            console.log("✅ [步骤] 银行卡与身份信息填写完成。");

        // 鍦板潃锛堝甫涓嬫媺澶勭悊锛夆€斺€?鍦板潃涔熻蛋 fastMode锛涗笅鎷夋槸鍩轰簬 input 浜嬩欢瑙﹀彂鐨勶紝蹇€?fill 涓€鏍疯兘寮?
        console.log("鉁嶏笍 [姝ラ] 姝ｅ湪杈撳叆鍦板潃骞跺鐞嗚仈鎯?..");
        const billingLine1 = page.locator('#billingLine1');
        if (await billingLine1.isVisible().catch(() => false)) {
            await humanFillInput(page, billingLine1, billing.address, false, true);
            await page.waitForTimeout(randomDelay(700, 1300));
            const addrOption = page.locator('[class*="suggestion"],[class*="autocomplete"] li,.AddressAutocomplete-option').first();
            if (await addrOption.isVisible().catch(() => false)) {
                await page.keyboard.press('ArrowDown');
                await page.waitForTimeout(randomDelay(150, 300));
                await page.keyboard.press('Enter');
                console.log("✅ [步骤] 地址联想已选择，PayPal 将自动填充 City/State/ZIP。");
            } else {
                await page.keyboard.press('Tab');
            }
            await page.waitForTimeout(randomDelay(300, 700));
        }

        // 鏄惧紡绛夊緟 PayPal 鎶?City/State/ZIP 杩欎笁涓瓧娈垫覆鏌撳嚭鏉ワ紙鏈€澶?8 绉掞級
        // PayPal 鐨?AddressAutocompleteContainer 鏄?React 寮傛鍔犺浇锛屼笉绛夊氨 isVisible 浼氬亣鎬ц繑鍥?false
        try {
            await page.locator('#billingPostalCode, #billingCity, #billingState').first().waitFor({ state: 'visible', timeout: 8000 });
        } catch (_) {
            console.warn('⚠️ [步骤] PayPal City/State/ZIP 三件套 8s 内未渲染，将按现有 DOM 做兜底尝试');
        }

        // 鍏滃簳濉?City / State / ZIP 鈥斺€?PayPal 娌¤嚜鍔ㄨˉ鍏ㄦ垨瀛楁淇濈暀涓虹┖鏃舵墜鍔ㄥ～
        const pickFirstVisible = async (selectors, perTryMs = 5000) => {
            for (const sel of selectors) {
                const loc = page.locator(sel).first();
                if (await loc.isVisible({ timeout: perTryMs }).catch(() => false)) return loc;
            }
            return null;
        };

        const fillUntilSet = async (loc, value, label) => {
            if (!loc) {
                console.warn(`⚠️ [步骤] PayPal ${label} 没找到可见输入框，跳过。`);
                return;
            }
            for (let attempt = 1; attempt <= 3; attempt += 1) {
                const cur = await loc.inputValue().catch(() => '');
                if (cur && cur.trim() === String(value).trim()) {
                    console.log(`鈴?[姝ラ] PayPal ${label} 宸蹭负鐩爣鍊? ${cur.trim()}`);
                    return;
                }
                if (cur && cur.trim() && cur.trim() !== String(value).trim()) {
                    console.log(`馃摑 [姝ラ] PayPal ${label} 褰撳墠鍊?${cur.trim()}锛岃鐩栦负鐩爣鍊?${value}锛堢${attempt}娆★級`);
                } else {
                    console.log(`馃摑 [姝ラ] PayPal 鍏滃簳濉?${label}: ${value}锛堢${attempt}娆★級`);
                }
                try {
                    await loc.click({ clickCount: 3 }).catch(() => { });
                    await loc.fill('').catch(() => { });
                    await loc.fill(String(value));
                    await loc.evaluate((node) => {
                        try {
                            node.dispatchEvent(new Event('input', { bubbles: true }));
                            node.dispatchEvent(new Event('change', { bubbles: true }));
                            node.dispatchEvent(new Event('blur', { bubbles: true }));
                        } catch (_) { }
                    }).catch(() => { });
                } catch (e) {
                    console.warn(`鈿狅笍 [姝ラ] PayPal ${label} fill 澶辫触: ${e.message}`);
                }
                await page.waitForTimeout(randomDelay(250, 500));
            }
            const finalVal = await loc.inputValue().catch(() => '');
            if (!finalVal || finalVal.trim() !== String(value).trim()) {
                console.warn(`鈿狅笍 [姝ラ] PayPal ${label} 閲嶈瘯 3 娆″悗鍊间粛涓嶆纭細瀹為檯="${finalVal}" 鏈熸湜="${value}"`);
            }
        };

        // City
        const cityLoc = await pickFirstVisible(['#billingCity', '#city', 'input[name="city"]', 'input[name="billingCity"]']);
        await fillUntilSet(cityLoc, billing.city, '鍩庡競');

        // State 鈥斺€?涓€鑸槸 <select>
        const stateLoc = await pickFirstVisible(['#billingState', '#state', 'select[name="state"]', 'select[name="billingState"]']);
        if (stateLoc) {
            for (let attempt = 1; attempt <= 3; attempt += 1) {
                const cur = await stateLoc.inputValue().catch(() => '');
                if (cur && cur.trim() === String(billing.state).trim()) {
                    console.log(`鈴?[姝ラ] PayPal State 宸蹭负鐩爣鍊? ${cur}`);
                    break;
                }
                console.log(`馃摑 [姝ラ] PayPal ${attempt === 1 && !cur ? '鍏滃簳' : '閲嶈瘯'}閫?State: ${billing.state}`);
                try {
                    await stateLoc.selectOption({ value: billing.state }).catch(async () => {
                        await stateLoc.selectOption({ label: billing.state }).catch(() => { });
                    });
                    await stateLoc.evaluate((node) => {
                        try {
                            node.dispatchEvent(new Event('change', { bubbles: true }));
                            node.dispatchEvent(new Event('blur', { bubbles: true }));
                        } catch (_) { }
                    }).catch(() => { });
                } catch (e) {
                    console.warn(`鈿狅笍 [姝ラ] PayPal State 閫夋嫨澶辫触: ${e.message}`);
                }
                await page.waitForTimeout(randomDelay(250, 500));
            }
        } else {
            console.warn('⚠️ [步骤] PayPal State 没找到可见 select，跳过');
        }

        // ZIP code
        const zipLoc = await pickFirstVisible(['#billingPostalCode', '#postalCode', '#zipCode', 'input[name="postalCode"]', 'input[name="zip"]', 'input[name="billingPostalCode"]']);
        await fillUntilSet(zipLoc, billing.zip, 'ZIP');

        await page.waitForTimeout(randomDelay(300, 700));

        // 瀵嗙爜
        console.log("馃攼 [姝ラ] 姝ｅ湪蹇€熷～鍐?PayPal 璐︽埛瀵嗙爜...");
        await humanFillInput(page, page.locator('#password'), billing.paypalPassword, false, true);
        await page.waitForTimeout(randomDelay(400, 1000));

        // --- 鎻愪氦鍓嶆晥楠屾満鍒?---
        const validateForm = async (page, fields) => {
            console.log("馃攳 [鏁堥獙] 姝ｅ湪杩涜鎻愪氦鍓嶆暟鎹畬鏁存€ф牎楠?..");
            for (const field of fields) {
                const locator = typeof field.selector === 'string' ? page.locator(field.selector) : field.selector;
                if (await locator.isVisible().catch(() => false)) {
                    const actualValue = await locator.inputValue().catch(() => "");
                    const cleanActual = Boolean(field.digitsMode)
                        ? actualValue.replace(/\D/g, '')
                        : actualValue.replace(/[\s\-\/]/g, '').toLowerCase();
                    const cleanExpected = Boolean(field.digitsMode)
                        ? String(field.expectedValue || '').replace(/\D/g, '')
                        : String(field.expectedValue || '').replace(/[\s\-\/]/g, '').toLowerCase();
                    console.log(cleanActual, cleanExpected);

                    if (cleanActual !== cleanExpected && field.expectedValue !== "") {
                        console.warn(`[!] [鏁堥獙澶辫触] ${field.name} 鏁版嵁涓嶄竴鑷? 棰勬湡: ${field.expectedValue}, 瀹為檯: ${actualValue}銆傛鍦ㄤ慨姝?..`);
                        await humanFillInput(page, locator, field.expectedValue, Boolean(field.digitsMode));
                        await page.waitForTimeout(500);
                    } else {
                        console.log(`鉁?[鏁堥獙閫氳繃] ${field.name}`);
                    }
                }
            }
        };

        const checkFields = [
            { selector: '#cardNumber', expectedValue: billing.card, name: "閾惰鍗″彿", digitsMode: true },
            { selector: '#expiryDate', expectedValue: billing.expiry, name: "有效期", digitsMode: true },
            { selector: '#cvv', expectedValue: billing.cvc, name: "安全码", digitsMode: true },
            { selector: '#phone', expectedValue: billing.smsPhone, name: "手机号", digitsMode: true },
        ];

        await validateForm(page, checkFields);

        // 鎻愪氦鍓嶆渶鍚庢壂涓€鐪硷紙婊氬姩鏌ョ湅涓€涓嬶級
        if (Math.random() < 0.4) {
            await page.mouse.wheel(0, randomDelay(-80, 80));
            await page.waitForTimeout(randomDelay(500, 1000));
        }

        const agreeAccountBtn = page.getByRole('button', { name: 'Agree & Create Account' });
        await agreeAccountBtn.waitFor({ state: 'visible', timeout: 10000 });
        await page.waitForTimeout(randomDelay(1000, 2000));
        await agreeAccountBtn.click({ force: true });
        console.log("✅ [步骤] 创建账户协议已提交。");



        // Phase 5: 鐭俊楠岃瘉
        console.log("鈴?[姝ラ] 姝ｅ湪妫€鏌ユ槸鍚﹁Е鍙戠煭淇￠獙璇?..");
        await page.waitForTimeout(5000);
        await checkCriticalErrors();
        const isSmsPage = await page.locator("input#otc_code, input[name='otc_code'], #password").first().isVisible();
        if (isSmsPage) {
            console.log("📨 [步骤] 已进入短信验证码页面。");
            const code = await getSMSCode();
            if (!code) {
                throw new Error('手机短信验证异常：长时间未收到验证码');
            }
            console.log("✅ [步骤] 正在输入短信验证码...");
            await page.keyboard.type(code, { delay: 100 });
            console.log("✅ [步骤] 短信验证码已输入。");
        } else {
            console.log("ℹ️ [步骤] 当前未触发短信验证，继续后续流程。");
        }
        await page.waitForLoadState('networkidle');
        await checkCriticalErrors();

        // Phase 6: 鏈€缁堢‘璁?
        const finalSubmitBtn = page.locator("button:has-text('Agree and Continue'), button:has-text('Agree & Continue')").first();
        console.log("鈴?[姝ラ] 姝ｅ湪绛夊緟鏈€缁堢‘璁ゆ寜閽?..");
        await page.waitForTimeout(5000);
        await page.waitForLoadState('networkidle');
        await solveSlider(); // PayPal 椤甸潰鐨勬粦鍧楁鏌?
        await checkCriticalErrors();
        try {
            await finalSubmitBtn.waitFor({ state: 'visible', timeout: 90000 });
        } catch (_) {
            throw new Error('鎵嬫満鍙风煭淇￠獙璇佸紓甯革細PayPal鏈€缁堢‘璁よ秴鏃讹紙鐭俊鏈畬鎴愭垨椤甸潰鏈氨缁級');
        }
        // (闈欓粯) 鏈€缁堢‘璁ゆ寜閽凡鎵惧埌
        await finalSubmitBtn.click({ force: true });
        console.log("鈴?[缁撹处] 宸叉彁浜わ紝鐩戞祴鏀粯缁撴灉...");

        // 鏀粯鎴愬姛 / 澶辫触鐨勫閲嶅垽瀹?
        // 1) URL 璺冲埌 chatgpt.com锛堟渶缁堢洰鏍囷級鈫?鎴愬姛
        // 2) Stripe 鏍囧噯鍥炶皟 redirect_status=succeeded 鈫?鎴愬姛
        // 3) Stripe 鏍囧噯鍥炶皟 redirect_status=failed / canceled 鈫?绔嬪嵆澶辫触锛屼笉娴垂 50s
        // 4) PayPal hostedchallenge / verifycard 鈫?绔嬪嵆澶辫触锛屽憡鐭ラ鎺ч┏鍥?
        const TIMEOUT = 60000;
        const checkPaymentResult = async () => {
            const currentUrl = String(page.url() || '');
            if (currentUrl.includes('chatgpt.com')) {
                return { ok: true, reason: 'redirected_to_chatgpt', url: currentUrl };
            }
            const params = (() => {
                try { return new URL(currentUrl).searchParams; } catch (_) { return null; }
            })();
            const redirectStatus = params ? params.get('redirect_status') : null;
            if (redirectStatus === 'succeeded') {
                return { ok: true, reason: 'stripe_redirect_succeeded', url: currentUrl };
            }
            if (redirectStatus === 'failed' || redirectStatus === 'canceled') {
                return { ok: false, reason: `stripe_redirect_${redirectStatus}`, url: currentUrl };
            }
            if (currentUrl.includes('paypal.com/checkoutweb/genericError')
                || currentUrl.includes('paypal.com/myaccount/transfer/homepage')
                || currentUrl.includes('paypal.com/restricted')) {
                return { ok: false, reason: 'paypal_blocked', url: currentUrl };
            }
            return null;
        };

        const paymentResult = await new Promise((resolve) => {
            const start = Date.now();
            const tick = async () => {
                if (page.isClosed()) {
                    return resolve({ ok: false, reason: 'page_closed', url: 'about:blank' });
                }
                const r = await checkPaymentResult().catch(() => null);
                if (r) return resolve(r);
                if (Date.now() - start >= TIMEOUT) {
                    return resolve({ ok: false, reason: 'timeout', url: page.url() || '' });
                }
                setTimeout(tick, 500);
            };
            tick();
        });

        if (paymentResult.ok) {
            console.log(`    [+] 鏈€缁堟牎楠岋細鏀粯鎴愬姛! (${paymentResult.reason})`);
            console.log("PAYMENT_SUCCESS");
        } else if (paymentResult.reason === 'stripe_redirect_failed' || paymentResult.reason === 'stripe_redirect_canceled') {
            // 澶辫触鏄庣‘锛歅ayPal/Stripe 宸茬粡鍥炴墽澶辫触锛岀洿鎺ユ姏閿欒鐖惰繘绋嬫崲鍙烽噸璇?
            throw new Error(`鏀粯澶辫触 (${paymentResult.reason})锛歅ayPal/Stripe 绔┏鍥烇紝URL=${paymentResult.url}`);
        } else if (paymentResult.reason === 'paypal_blocked') {
            throw new Error(`鏀粯澶辫触 (paypal_blocked)锛歅ayPal 椋庢帶鎷︽埅锛孶RL=${paymentResult.url}`);
        } else {
            console.log(`    [!] 鏈€缁堟牎楠岋細${paymentResult.reason} URL=${paymentResult.url}`);
            console.log('    [!] 支付结果检测失败，未命中成功标记。');
        }
    } catch (e) {
        console.error("鉂?[杩愯鏃堕敊璇痌:", e.message);
        try {
            await captureDebugScreenshot(context, page, 'error');
        } catch (err) {
            console.error(`鈿狅笍 [绯荤粺] 寮傚父鎴浘淇濆瓨澶辫触: ${err.message}`);
        }
        process.exit(1);
    } finally {
        if (stopInactivityWatcher) stopInactivityWatcher();
        console.log("馃憢 [绯荤粺] 娴佺▼缁撴潫锛屾鍦ㄥ叧闂祻瑙堝櫒...");
        await browser.close().catch(() => { });
    }
}

run();

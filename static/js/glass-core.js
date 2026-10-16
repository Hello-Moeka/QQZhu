/**
 * QQZhu Glass UI — 分级检测与通用工具
 * Tier 0: 不透明 fallback
 * Tier 1: 真玻璃 chrome（navbar / player）
 */
(function () {
    const root = document.documentElement;
    const body = document.body;

    function detectTier() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return '0';
        }
        if (!window.CSS || !CSS.supports('backdrop-filter', 'blur(1px)')) {
            if (!window.CSS || !CSS.supports('-webkit-backdrop-filter', 'blur(1px)')) {
                return '0';
            }
        }
        return '1';
    }

    root.dataset.glassTier = detectTier();

    const songCount = parseInt(body.dataset.songCount || '0', 10);
    if (songCount >= 40) {
        body.classList.add('glass-heavy-list');
    }

    window.GlassUI = {
        showToast(message) {
            const toast = document.getElementById('glass-toast');
            const msgEl = document.getElementById('glass-toast-msg');
            if (!toast || !msgEl) return;
            msgEl.textContent = message;
            toast.classList.add('show');
            clearTimeout(window.GlassUI._toastTimer);
            window.GlassUI._toastTimer = setTimeout(() => {
                toast.classList.remove('show');
            }, 2600);
        },
    };
})();

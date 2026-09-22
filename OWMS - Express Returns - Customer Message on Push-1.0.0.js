// ==UserScript==
// @name         OWMS - Express Returns - Customer Message on Push
// @namespace    theiconic.oms
// @version      1.0.0
// @description  Tap a truncated customer comment box on Express Returns to view the full text in a light popup. Only activates when a matching element exists.
// @author       Andy
// @match        https://oms-live-au.zalora.net/return/express-return*
// @match        https://oms-live-au.zalora.net/view/v1/return/express-return*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // --- guard against double injection (re-inject, SPA re-run) ---
    if (window.__returnsCommentPopupLoaded) return;
    window.__returnsCommentPopupLoaded = true;

    const CONFIG = {
        // Elements that become tappable. Add more selectors here as you find them.
        selectors: [
            'div.h-10.overflow-y-scroll',
            'div.overflow-y-scroll.border-gray-300'
        ],
        title: 'Customer Message',
        tapMaxMs: 500,              // longer than this = a hold, ignored
        moveTolerancePx: 12,        // finger drift above this = scroll, ignored
        disableInnerScroll: false,  // FALSE = keep the box scrollable
        ignoreIfScrolled: true,     // scrollTop changed during touch = scroll, not a tap
        suppressLongPress: true,    // block native selection / context menu on targets
        showAffordance: true,       // dashed outline so operators know it is tappable
        deactivateWhenGone: true,   // stand down if every match disappears
        keepPopupOnDeactivate: true,// do not rip the popup away on a grid refresh
        debounceMs: 200,            // settle time before re-checking after DOM churn
        dedupeMs: 500,              // window in which a click after touchend is ignored
        dismissGuardMs: 350         // ignore outside-taps this soon after opening
    };

    const SELECTOR        = CONFIG.selectors.join(', ');
    const ACTIVE_SELECTOR = CONFIG.selectors.map(s => `${s}:active`).join(', ');

    // Render the popup in the top document so it is not clipped by the iframe
    let doc = document;
    try {
        if (window.top !== window.self && window.top.document) doc = window.top.document;
    } catch (e) { /* cross-origin fallback: stay local */ }

    let active   = false;
    let styleEl  = null;
    let timer    = null;
    let popup    = null;   // cached DOM, built once
    let lastOpen = 0;

    const targetExists = () => document.querySelector(SELECTOR) !== null;

    // ---------- popup (built once, reused) ----------
    function buildPopup() {
        const backdrop = doc.createElement('div');
        backdrop.id = 'oms-text-popup';
        Object.assign(backdrop.style, {
            position: 'fixed', inset: '0', zIndex: '2147483647',
            background: 'rgba(0,0,0,0.35)', display: 'none',
            alignItems: 'center', justifyContent: 'center',
            padding: '24px', boxSizing: 'border-box',
            touchAction: 'manipulation', overscrollBehavior: 'contain'
        });

        const frame = doc.createElement('div');
        frame.setAttribute('role', 'dialog');
        frame.setAttribute('aria-modal', 'true');
        frame.setAttribute('aria-label', CONFIG.title);
        Object.assign(frame.style, {
            background: '#fff', borderRadius: '10px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            width: 'min(560px, 92vw)', maxHeight: '80vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, Arial, sans-serif'
        });

        const header = doc.createElement('div');
        Object.assign(header.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 8px 12px 18px', borderBottom: '1px solid #e5e7eb',
            background: '#f9fafb', flexShrink: '0'
        });

        const heading = doc.createElement('span');
        heading.textContent = CONFIG.title;
        Object.assign(heading.style, {
            fontSize: '15px', fontWeight: '600', color: '#374151'
        });

        const closeBtn = doc.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '\u00D7';           // ×
        closeBtn.setAttribute('aria-label', 'Close');
        Object.assign(closeBtn.style, {
            width: '44px', height: '44px', lineHeight: '1',
            fontSize: '28px', color: '#6b7280',
            border: 'none', background: 'transparent',
            cursor: 'pointer', borderRadius: '6px',
            touchAction: 'manipulation', flexShrink: '0'
        });
        closeBtn.addEventListener('touchend', e => {
            e.preventDefault();
            e.stopPropagation();
            hidePopup();
        }, { passive: false });
        closeBtn.addEventListener('click', e => {
            e.stopPropagation();
            hidePopup();
        });

        header.append(heading, closeBtn);

        const body = doc.createElement('div');
        Object.assign(body.style, {
            padding: '18px', fontSize: '20px', lineHeight: '1.5',
            color: '#111827', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            overflowY: 'auto', WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain', userSelect: 'text'
        });

        frame.append(header, body);
        backdrop.appendChild(frame);

        // tap outside the frame to dismiss (touch + mouse)
        backdrop.addEventListener('touchend', e => {
            if (e.target !== backdrop) return;                        // tapped inside frame
            if (Date.now() - lastOpen < CONFIG.dismissGuardMs) return; // same touch that opened it
            e.preventDefault();
            hidePopup();
        }, { passive: false });

        backdrop.addEventListener('click', e => {
            if (e.target !== backdrop) return;
            if (Date.now() - lastOpen < CONFIG.dismissGuardMs) return;
            hidePopup();
        });

        return { backdrop, body };
    }

    function showPopup(text) {
        if (!popup) popup = buildPopup();
        if (!popup.backdrop.isConnected) doc.body.appendChild(popup.backdrop);

        popup.body.textContent = text;
        popup.body.scrollTop = 0;
        popup.backdrop.style.display = 'flex';
        lastOpen = Date.now();
    }

    function hidePopup() {
        if (popup) popup.backdrop.style.display = 'none';
    }

    const isOpen = () => !!popup && popup.backdrop.style.display !== 'none';

    // ---------- text extraction ----------
    function extractText(el) {
        const attr  = (el.getAttribute('title') || '').trim();
        const inner = (el.innerText || el.textContent || '').trim();
        return attr.length > inner.length ? attr : inner;   // whichever is fuller
    }

    function openFrom(el) {
        if (isOpen()) return;
        const text = extractText(el);
        if (text) showPopup(text);
    }

    // ---------- touch path (primary) ----------
    let startX = 0, startY = 0, startTime = 0, startScroll = 0;
    let moved = false, touchTarget = null;

    function onTouchStart(e) {
        if (e.touches.length > 1) { touchTarget = null; return; }   // ignore multi-touch
        const t = e.changedTouches[0];
        const el = e.target.closest?.(SELECTOR) || null;

        startX = t.clientX;
        startY = t.clientY;
        startTime = Date.now();
        startScroll = el ? el.scrollTop : 0;
        moved = false;
        touchTarget = el;
    }

    function onTouchMove(e) {
        if (!touchTarget || moved) return;
        const t = e.changedTouches[0];
        if (Math.abs(t.clientX - startX) > CONFIG.moveTolerancePx ||
            Math.abs(t.clientY - startY) > CONFIG.moveTolerancePx) moved = true;
    }

    function onTouchEnd(e) {
        const el = touchTarget;
        touchTarget = null;
        if (!el) return;

        if (moved) return;                                       // finger travelled = scroll
        if (Date.now() - startTime > CONFIG.tapMaxMs) return;    // was a hold

        // the box scrolled during the touch, however slightly = scroll, not a tap
        if (CONFIG.ignoreIfScrolled && el.scrollTop !== startScroll) return;

        e.preventDefault();      // suppress the synthetic click that follows
        e.stopPropagation();
        lastOpen = Date.now();
        openFrom(el);
    }

    function onTouchCancel() {
        touchTarget = null;
        moved = false;
    }

    // ---------- long-press suppression ----------
    function onContextMenu(e) {
        if (CONFIG.suppressLongPress && e.target.closest?.(SELECTOR)) e.preventDefault();
    }

    // ---------- click path (mouse, stylus, fallback) ----------
    function onClick(e) {
        const el = e.target.closest?.(SELECTOR);
        if (!el) return;
        if (Date.now() - lastOpen < CONFIG.dedupeMs) return;   // touch already handled it

        e.preventDefault();
        e.stopPropagation();
        openFrom(el);
    }

    function onKeyDown(e) {
        if (e.key === 'Escape') hidePopup();
    }

    // ---------- activate / deactivate ----------
    function activate() {
        if (active) return;
        active = true;

        document.addEventListener('touchstart',  onTouchStart,  { capture: true, passive: true });
        document.addEventListener('touchmove',   onTouchMove,   { capture: true, passive: true });
        document.addEventListener('touchend',    onTouchEnd,    { capture: true, passive: false });
        document.addEventListener('touchcancel', onTouchCancel, { capture: true, passive: true });
        document.addEventListener('contextmenu', onContextMenu, { capture: true, passive: false });
        document.addEventListener('click',       onClick,       true);
        document.addEventListener('keydown',     onKeyDown,     true);
        if (doc !== document) doc.addEventListener('keydown', onKeyDown, true);

        styleEl = document.createElement('style');
        styleEl.id = 'oms-tap-expand-style';
        styleEl.textContent = `
            ${SELECTOR} {
                cursor: pointer;
                touch-action: manipulation;
                -webkit-tap-highlight-color: rgba(59,130,246,0.15);
                ${CONFIG.disableInnerScroll
                    ? 'overflow: hidden !important;'
                    : `overflow-y: auto !important;
                       -webkit-overflow-scrolling: touch;
                       overscroll-behavior: contain;`}
                ${CONFIG.suppressLongPress ? `
                    -webkit-touch-callout: none;
                    -webkit-user-select: none;
                    user-select: none;
                ` : ''}
                ${CONFIG.showAffordance
                    ? 'outline: 1px dashed rgba(59,130,246,0.55); outline-offset: 1px;'
                    : ''}
            }
            ${ACTIVE_SELECTOR} {
                background: rgba(59,130,246,0.10);
            }
        `;
        (document.head || document.documentElement).appendChild(styleEl);

        console.log('[Returns Comments Popup] ACTIVATED — target element found');
    }

    function deactivate() {
        if (!active) return;
        active = false;

        document.removeEventListener('touchstart',  onTouchStart,  true);
        document.removeEventListener('touchmove',   onTouchMove,   true);
        document.removeEventListener('touchend',    onTouchEnd,    true);
        document.removeEventListener('touchcancel', onTouchCancel, true);
        document.removeEventListener('contextmenu', onContextMenu, true);
        document.removeEventListener('click',       onClick,       true);
        document.removeEventListener('keydown',     onKeyDown,     true);
        if (doc !== document) doc.removeEventListener('keydown', onKeyDown, true);

        styleEl?.remove();
        styleEl = null;
        touchTarget = null;

        if (!CONFIG.keepPopupOnDeactivate) hidePopup();

        console.log('[Returns Comments Popup] deactivated — no target element on page');
    }

    function evaluate() {
        if (targetExists()) activate();
        else if (CONFIG.deactivateWhenGone) deactivate();
    }

    // ---------- watcher ----------
    const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(evaluate, CONFIG.debounceMs);
    });

    function start() {
        evaluate();   // handle elements already present at load
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']   // catch Tailwind class swaps
        });
    }

    window.addEventListener('pagehide', () => {
        observer.disconnect();
        clearTimeout(timer);
        deactivate();
    }, { once: true });

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });

    console.log('[Returns Comments Popup] loaded (dormant) in',
        window.top === window.self ? 'top' : 'iframe');
})();
// ==UserScript==
// @name         Zalora WMS - Express Checkout Auto Split & Proceed
// @namespace    https://zalora.net/
// @version      9.2
// @description  Scans CMD_SPLIT -> clicks "Split Package" -> waits for modal -> clicks "Proceed"
// @match        ://oms-staging-au.zalora.net/
// @match        https://oms-live-au.zalora.net/view/v1/warehouse/express-checkout*
// @match        https://oms-live-au.zalora.net/express-checkout/*
// @allFrames    true
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // Barcode trigger string
    const TRIGGER = 'CMD_SPLIT';
    const INPUT_ID = 'ec-scan-pack-input';
    let keyBuffer = '';

    // 1. Direct hook on the scan input box
    function attachDirectInputInterceptor() {
        const input = document.getElementById(INPUT_ID);
        if (!input || input.dataset.tmHooked) return;
        input.dataset.tmHooked = 'true';

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const val = input.value.trim();
                if (val.toUpperCase().includes(TRIGGER.toUpperCase()) || keyBuffer.toUpperCase().includes(TRIGGER.toUpperCase())) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    wipeInput(input);
                    keyBuffer = '';
                    handleSplitWorkflow();
                }
            }
        }, true);

        input.addEventListener('input', (e) => {
            const val = input.value.trim();
            if (val.toUpperCase().includes(TRIGGER.toUpperCase())) {
                e.preventDefault();
                e.stopImmediatePropagation();
                wipeInput(input);
                keyBuffer = '';
                handleSplitWorkflow();
            }
        }, true);
    }

    const observer = new MutationObserver(attachDirectInputInterceptor);
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    attachDirectInputInterceptor();

    // 2. Global backup keyboard listener
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const active = document.activeElement;
            const val = (active && active.value) ? active.value.trim() : '';
            if (val.toUpperCase().includes(TRIGGER.toUpperCase()) || keyBuffer.toUpperCase().includes(TRIGGER.toUpperCase())) {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (active) wipeInput(active);
                keyBuffer = '';
                handleSplitWorkflow();
            }
            keyBuffer = '';
            return;
        }

        if (e.key.length === 1) {
            keyBuffer += e.key;
            if (keyBuffer.length > 25) keyBuffer = keyBuffer.slice(-25);

            if (keyBuffer.toUpperCase().includes(TRIGGER.toUpperCase())) {
                const active = document.activeElement;
                if (active) wipeInput(active);
                keyBuffer = '';
                handleSplitWorkflow();
            }
        }
    }, true);

    function wipeInput(el) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeSetter) {
            nativeSetter.call(el, '');
        } else {
            el.value = '';
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 3. Step 1: Click "Split Package"
    function handleSplitWorkflow() {
        const candidates = Array.from(document.querySelectorAll('span, button, a, div[role="button"]'));
        const target = candidates.find(el => {
            const text = (el.innerText || el.textContent || '').trim().toLowerCase();
            const rect = el.getBoundingClientRect();
            return text.includes('split package') && rect.width > 0 && rect.height > 0;
        });

        if (!target) {
            console.warn('[Tampermonkey] "Split Package" button not found.');
            return;
        }

        const btn = target.closest('button') || target;

        // Visual flash (green outline)
        const prevOutline = btn.style.outline;
        btn.style.outline = '3px solid #22c55e';
        setTimeout(() => { btn.style.outline = prevOutline; }, 400);

        btn.focus();
        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        btn.click();
        console.log('[Tampermonkey] "Split Package" clicked.');

        // Step 2: Poll for modal animation and click "Proceed"
        waitForAndClickProceed(0);
    }

    // 4. Step 2: Poll for "Proceed" button (checks every 100ms for up to 3 seconds)
    function waitForAndClickProceed(retryCount) {
        const MAX_RETRIES = 30; // 30 retries * 100ms = 3.0 seconds
        const RETRY_INTERVAL_MS = 100;

        const candidates = Array.from(document.querySelectorAll('span, button, a, div[role="button"]'));
        const proceedTarget = candidates.find(el => {
            const text = (el.innerText || el.textContent || '').trim().toLowerCase();
            const rect = el.getBoundingClientRect();
            return text === 'proceed' && rect.width > 0 && rect.height > 0;
        });

        if (proceedTarget) {
            const btn = proceedTarget.closest('button') || proceedTarget;

            // Visual flash (cyan outline)
            const prevOutline = btn.style.outline;
            btn.style.outline = '3px solid #06b6d4';
            setTimeout(() => { btn.style.outline = prevOutline; }, 400);

            btn.focus();
            btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            btn.click();
            console.log('[Tampermonkey] "Proceed" button clicked successfully.');
            return;
        }

        if (retryCount < MAX_RETRIES) {
            setTimeout(() => waitForAndClickProceed(retryCount + 1), RETRY_INTERVAL_MS);
        } else {
            console.warn('[Tampermonkey] Timed out waiting for "Proceed" button to appear.');
        }
    }
})();

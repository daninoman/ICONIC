// ==UserScript==
// @name         OWMS - Express Returns - EAN Scanning
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Scanning of EAN Barcodes to select items on the Express Returns Page
// @author       Dani Noman
// @match        *://*/*
// @updateURL    https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Express%20Returns%20-%20EAN%20Scanning-1.0.user.js
// @downloadURL  https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Express%20Returns%20-%20EAN%20Scanning-1.0.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // =====================
    // 🔧 CONFIGURATION
    // =====================
    const DEBUG = false;
    const INPUT_ID = 'scan_uid_input';
    const EAN_REGEX = /^\d{7,14}$/;

    let buffer = '';
    let lastInputTime = Date.now();
    const selectedSKUMap = new Map();

    const log = (...args) => DEBUG && console.log(...args);

    function setNativeValue(element, value) {
        const prototype = Object.getPrototypeOf(element);
        const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        valueSetter?.call(element, value);
    }

    function triggerReactInputEvent(element) {
        element.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function clearInputField() {
        const inputIds = ['input_uid', 'scan_uid_input'];
        inputIds.forEach(inputId => {
            const el = document.getElementById(inputId);
            if (el) {
                setNativeValue(el, '');
                triggerReactInputEvent(el);
            }
        });
    }

    function handleEAN(scanned) {
        log(`📦 EAN detected: ${scanned}`);
        clearInputField();
        findSKUAndCheckCheckbox(scanned);
    }

    function handleUID(scanned) {
        const el = document.getElementById(INPUT_ID);
        if (!el) {
            //console.warn('⚠️ UID field not found when handling UID:', scanned);
            return;
        }

        log(`📦 UID scanned: ${scanned}`);
        el.readOnly = false;
        setNativeValue(el, scanned);
        triggerReactInputEvent(el);
        el.focus();
        findSKUAndCheckCheckbox(scanned);
    }

    function handleInvalidScan(scanned) {
        console.warn(`🔒 Invalid scanned: ${scanned}`);
        const activeElement = document.activeElement;
        const isValidField = ['scan_uid_input', 'input_uid'].includes(activeElement.id);
        if (!isValidField) return;
        clearInputField();
        showErrorBanner('📛 Barcode Not Found');
    }

    // ✅ Main logic with fallback + status checking
    function findSKUAndCheckCheckbox(sku) {
        const isEAN = EAN_REGEX.test(sku);
        let { containers, hadIneligibleMatch } = findMatchingContainers(sku);

        // Fallback for 14-digit EAN
        if (containers.length === 0 && isEAN && sku.length === 14) {
            const trimmedSKU = sku.slice(0, 13);
            console.log(`🔄 No exact match for ${sku}, trying fallback SKU ${trimmedSKU}`);
            const result = findMatchingContainers(trimmedSKU);
            containers = result.containers;
            hadIneligibleMatch = hadIneligibleMatch || result.hadIneligibleMatch;
            if (containers.length === 0) {
                if (hadIneligibleMatch) {
                    showInfoBanner('ℹ️ SKU found, but item is in a delivered status');
                } else {
                    showErrorBanner('📛 Barcode Not Found');
                }
                return;
            }
            sku = trimmedSKU;
        } else if (containers.length === 0) {
            if (hadIneligibleMatch) {
                showInfoBanner('ℹ️ SKU found, but item is in a delivered status');
            } else if (isEAN) {
                showErrorBanner('📛 Barcode Not Found');
            }
            return;
        }

        const selectedCount = selectedSKUMap.get(sku) || 0;

        if (selectedCount >= containers.length) return;

        const nextContainer = containers[selectedCount];
        const nextCheckbox = nextContainer.querySelector('input[type="checkbox"]');

        if (nextCheckbox) {
            checkCheckbox(nextCheckbox);
            selectedSKUMap.set(sku, selectedCount + 1);
            console.log(`✅ SKU "${sku}" instance ${selectedCount + 1} selected.`);
        }
    }

    // ✅ Updated to return both containers and ineligible match flag
    function findMatchingContainers(sku) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        const containers = [];
        let hadIneligibleMatch = false;

        while ((node = walker.nextNode())) {
            const text = node.textContent.trim();
            if (text === sku || text.includes(sku)) {
                const container = findCheckboxContainer(node);
                if (container && !containers.includes(container)) {
                    const checkbox = container.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        const isBeingReturned = [...container.querySelectorAll('td')]
                            .some(td => td.textContent.trim().toLowerCase() === 'being_returned');

                        if (!isBeingReturned) {
                            hadIneligibleMatch = true;
                            continue;
                        }

                        containers.push(container);
                    }
                }
            }
        }

        return { containers, hadIneligibleMatch };
    }

    function findCheckboxContainer(node) {
        let current = node.parentElement;
        for (let i = 0; i < 6 && current; i++, current = current.parentElement) {
            if (current.querySelector('input[type="checkbox"]')) return current;
        }
        return null;
    }

    function checkCheckbox(cb) {
        if (!cb.checked) cb.click();
        cb.checked = true;
        cb.dispatchEvent(new Event('input', { bubbles: true }));
        cb.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function showErrorBanner(message) {
        let banner = document.getElementById('tm-scan-error-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'tm-scan-error-banner';
            banner.style = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 9999;
                background-color: #ff4d4f;
                color: white;
                padding: 12px;
                font-size: 16px;
                text-align: center;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            `;
            banner.textContent = message;
            document.body.appendChild(banner);
        } else {
            banner.textContent = message;
            banner.style.display = 'block';
        }

        setTimeout(() => banner.style.display = 'none', 3000);
    }

    function showInfoBanner(message) {
        let banner = document.getElementById('tm-scan-info-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'tm-scan-info-banner';
            banner.style = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 9999;
                background-color: #007bff;
                color: white;
                padding: 12px;
                font-size: 16px;
                text-align: center;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            `;
            banner.textContent = message;
            document.body.appendChild(banner);
        } else {
            banner.textContent = message;
            banner.style.display = 'block';
        }

        setTimeout(() => banner.style.display = 'none', 3000);
    }

    // ✅ Scanner handler
    document.addEventListener('keydown', (e) => {
        const activeId = document.activeElement?.id;
        const allowedFields = ['input_uid', 'scan_uid_input'];

        if (!allowedFields.includes(activeId)) return;

        const now = Date.now();
        if (now - lastInputTime > 100) buffer = '';
        lastInputTime = now;

        if (e.key && e.key.length === 1) {
            buffer += e.key;
            log(`Key: "${e.key}" Buffer: "${buffer}"`);
        } else if (e.key === 'Enter') {
            const scanned = buffer.trim();
            buffer = '';

            if (scanned.startsWith('*')) return;

            if (EAN_REGEX.test(scanned)) {
                e.preventDefault();
                e.stopPropagation();
                handleEAN(scanned);
            } else if (scanned.includes(';') && /[A-Za-z]/.test(scanned)) {
                handleUID(scanned);
            } else {
                e.preventDefault();
                handleInvalidScan(scanned);
            }
        }
    }, true);

    // ✅ Watch for dynamic UID input field
    const observer = new MutationObserver(() => {
        const el = document.getElementById(INPUT_ID);
        if (el && !el.dataset._scannerEnhanced) {
            log(`🆕 Found input field: #${INPUT_ID}`);
            el.dataset._scannerEnhanced = "true";
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

function updateScanUI() {
    // Update <h2> headings that say "Scan UID"
    const headings = document.querySelectorAll('h2');
    headings.forEach(h => {
        if (h.textContent.trim() === 'Scan UID') {
            h.textContent = 'Scan UID/Barcode';
        }
    });

    // Update placeholder on <input id="input_uid">
    const input = document.getElementById('input_uid');
    if (input && input.placeholder.trim() === 'Scan UID') {
        input.placeholder = 'Scan UID/Barcode';
    }
}

// Run once on initial page load
updateScanUI();

// Observe DOM for changes (for dynamic content)
const uiObserver = new MutationObserver(updateScanUI);
uiObserver.observe(document.body, { childList: true, subtree: true });

})();

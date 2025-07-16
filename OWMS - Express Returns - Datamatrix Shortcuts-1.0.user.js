// ==UserScript==
// @name         OWMS - Express Returns - Datamatrix Shortcuts
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Handle barcode commands, block input in scan fields, blur, focus, scroll, and trigger actions (*update, *print, *validate, etc.)
// @author       Dani Noman
// @match        *://*/*
// @updateURL    https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Express%20Returns%20-%20Datamatrix%20Shortcuts-1.0.user.js
// @downloadURL  https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Express%20Returns%20-%20Datamatrix%20Shortcuts-1.0.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const COMMANDS = {
        '*update': handleUpdateAllCommand,
        '*validate': handleValidateCommand,
        '*print': handlePrintCommand,
        '*location': handleLocationCommand
    };

    const SCAN_INPUT_ID = 'scan_uid_input';

    let buffer = '';
    let lastKeyTime = Date.now();
    let resetTimeout;

    function isCommandMatchInProgress(buf) {
        const lowerBuffer = buf.toLowerCase();
        return Object.keys(COMMANDS).some(cmd => cmd.startsWith(lowerBuffer));
    }

    document.addEventListener('keydown', function (e) {
        const currentTime = Date.now();
        const activeEl = document.activeElement;
        const isScanField = activeEl && activeEl.id === SCAN_INPUT_ID;
        const isUIDField = activeEl && activeEl.id === 'input_uid';

        if (currentTime - lastKeyTime > 100) buffer = '';
        lastKeyTime = currentTime;

        if (resetTimeout) clearTimeout(resetTimeout);
        resetTimeout = setTimeout(() => buffer = '', 500);

        if (typeof e.key === 'string' && e.key.length === 1) {
            buffer += e.key;

            if ((isScanField || isUIDField) && isCommandMatchInProgress(buffer)) {
                e.preventDefault();
            }

            const lowerBuffer = buffer.toLowerCase();
            if (COMMANDS[lowerBuffer]) {
                buffer = '';
                if (isScanField || isUIDField) {
                    activeEl.blur();
                    console.log(`Blurred ${activeEl.id} on ${lowerBuffer}`);
                }
                COMMANDS[lowerBuffer]();
                return;
            }
        }

        if (e.key === 'Enter') {
            const command = buffer.trim().toLowerCase();
            buffer = '';
            if (COMMANDS[command]) {
                if (isScanField || isUIDField) {
                    activeEl.blur();
                    console.log(`Blurred ${activeEl.id} on ${command}`);
                }
                COMMANDS[command]();
            }
        }
    }, true);

    // === Command Handlers ===

    function handleUpdateAllCommand() {
        const buttons = document.querySelectorAll('span.flex.items-stretch.transition-all.duration-200.rounded-md.px-4.py-2.text-sm');
        for (const button of buttons) {
            if (button.textContent.trim() === 'Update All') {
                console.log('Clicking Update All button...');
                button.click();
                showToast('Update All triggered');
                break;
            }
        }
    }

    function handleValidateCommand() {
        const uidInput = document.getElementById('input_uid');
        if (uidInput && document.activeElement === uidInput) {
            uidInput.blur();
            console.log('Blurred input_uid on *validate');
        }

        const moreElement = document.querySelector('p.flex.flex-1.items-center.justify-center');
        if (moreElement) {
            makeFocusable(moreElement);
            moreElement.focus();
            moreElement.style.outline = '0px solid blue';

            setTimeout(() => {
                const skuInput = document.querySelector('input[id^="validate_supplier_sku_input_"]');
                if (skuInput) {
                    const rect = skuInput.getBoundingClientRect();
                    const fixedFooter = document.querySelector('div.fixed.bottom-\\[50px\\]');
                    let offset = 10;

                    if (fixedFooter) {
                        offset += fixedFooter.offsetHeight;
                    }

                    offset += 600; // Extra padding for visibility of top content

                    const absoluteTop = rect.top + window.pageYOffset - offset;
                    window.scrollTo(0, absoluteTop);

                    makeFocusable(skuInput);
                    skuInput.focus();
                    skuInput.style.outline = '0px solid red';
                }
            }, 150);
        }
    }

    function handleLocationCommand() {
        const locationItem = document.getElementById('input_location_item');
        const closeButton = findCloseButton();

        if (locationItem) {
            makeFocusable(locationItem);
            if (closeButton) {
                closeButton.click();
                setTimeout(() => {
                    locationItem.focus();
                    locationItem.style.outline = '0px solid green';
                }, 150);
            } else {
                locationItem.focus();
                locationItem.style.outline = '0px solid green';
                showToast('Close button already closed.');
            }
        }
    }

    function handlePrintCommand() {
        const closeButton = findCloseButton();
        if (closeButton) {
            if (closeButton.closest('.closed')) {
                clickPrintUID();
            } else {
                closeButton.click();
                setTimeout(() => clickPrintUID(), 150);
            }
        } else {
            clickPrintUID();
        }
    }

    function clickPrintUID() {
        const printIcon = document.querySelector('img[alt="Print UID"]');
        if (printIcon) {
            console.log('Clicking Print UID image...');
            printIcon.click();
        } else {
            console.log('Print UID image not found.');
        }

        setTimeout(() => {
            const locationInput = document.getElementById('input_location_item');
            if (locationInput) {
                locationInput.focus();
            }
        }, 150);
    }

    // === Utilities ===

    function showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#333',
            color: '#fff',
            padding: '10px 15px',
            borderRadius: '5px',
            zIndex: 10000,
            fontFamily: 'sans-serif',
            fontSize: '14px'
        });
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 0); // Instant for live, increase for debug
    }

    function findCloseButton() {
        return document.querySelector('img[alt="Close"]');
    }

    function makeFocusable(el) {
        if (el && !el.hasAttribute('tabindex')) {
            el.setAttribute('tabindex', '-1');
        }
    }

    // === Notes Click-to-Focus ===

    function observeForNoteInput() {
        const observer = new MutationObserver(() => {
            const input = document.getElementById('noteInput1'); // Modify as needed
            if (input) {
                input.focus();
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function attachClickListener(el) {
        if (!el.dataset.tmClickAttached) {
            el.addEventListener('click', () => {
                observeForNoteInput();
            });
            el.dataset.tmClickAttached = "true";
        }
    }

    function scanAndAttachListeners() {
        const icons = document.querySelectorAll('img[alt="Notes Indicator"]');
        icons.forEach(attachClickListener);

        const noteDivs = document.querySelectorAll('div.grow.self-start.text-gray-900');
        noteDivs.forEach(div => {
            if (div.textContent.trim() === 'Notes') {
                attachClickListener(div);
            }
        });
    }

    let lastFocusedInputUID = null;

    function observeForInputUID() {
        const observer = new MutationObserver(() => {
            const input = document.getElementById('input_uid');
            if (input && input !== lastFocusedInputUID) {
                input.focus();
                lastFocusedInputUID = input;
                console.log('Focused input_uid when available');

                input.style.outline = '0px solid orange';
                setTimeout(() => input.style.outline = '', 0);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    document.addEventListener('click', function (e) {
        const el = e.target;
        if (
            (el.tagName === 'IMG' && el.getAttribute('alt') === 'Print UID') ||
            (el.tagName === 'P' && el.textContent.trim() === 'Print UID')
        ) {
            setTimeout(() => {
                const input = document.getElementById('input_location_item');
                if (input) {
                    input.focus();
                }
            }, 150);
        }
    }, true);

    window.addEventListener('load', () => {
        scanAndAttachListeners();
        observeForInputUID();
        const observer = new MutationObserver(scanAndAttachListeners);
        observer.observe(document.body, { childList: true, subtree: true });
    });

})();

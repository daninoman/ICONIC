// ==UserScript==
// @name         OWMS Receiving Shortcuts - SSCC Tool Applicable
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Hides the SSCC input from the focus thief during shortcut scans
// @author       Layla Phillips
// @match        https://oms-live-au.zalora.net/inbound/inbound-by-barcode*
// @grant        GM_download
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Inbound%20by%20Barcode%20-%20Shortcuts%20-%20SSCC-1.0.user.js
// @downloadURL  https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Inbound%20by%20Barcode%20-%20Shortcuts%20-%20SSCC-1.0.user.js
// ==/UserScript==

(function() {
    'use strict';

    let inputBuffer = '';
    let isShortcutMode = false;
    let drItemIdValue = null;

    console.log('%c Shortcut Script Loaded - Ready for * scan ', 'background: #222; color: #bada55; font-size: 16px');

    function toggleThief(disable) {
        const thiefTarget = document.getElementById('ssccInput') || document.getElementById('ssccInput_HIDDEN');
        if (thiefTarget) {
            if (disable) {
                thiefTarget.id = 'ssccInput_HIDDEN';
                console.log('Shortcuts: Focus Thief BLOCKED');
            } else {
                thiefTarget.id = 'ssccInput';
                console.log('Shortcuts: Focus Thief RESTORED');
            }
        }
    }

    function executeShortcut(cmd) {
        const cleanCmd = cmd.toLowerCase().trim();
        console.log('Shortcuts: Executing -> ' + cleanCmd);

        let targetSelector = '';
        if (cleanCmd.includes('purchaseorder')) targetSelector = '[id*="trackingNrPo"]';
        if (cleanCmd.includes('location')) targetSelector = '[id*="scanLocation"]';

        if (targetSelector) {
            const targetField = document.querySelector(targetSelector);
            if (targetField) {
                targetField.scrollIntoView({ block: "center" });
                targetField.focus();
                targetField.select();
                setTimeout(() => toggleThief(false), 5000);
                return;
            }
        }
        
        if (cleanCmd.includes('redownload')) {
            toggleThief(false);
        } else {
            toggleThief(false);
        }
    }

    window.addEventListener('keydown', function(e) {
        if (e.key === '*') {
            isShortcutMode = true;
            inputBuffer = '';
            toggleThief(true);
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
        }

        if (isShortcutMode) {
            e.preventDefault();
            e.stopImmediatePropagation();

            if (e.key === 'Enter') {
                isShortcutMode = false;
                executeShortcut(inputBuffer);
                inputBuffer = '';
            } else if (e.key.length === 1) {
                inputBuffer += e.key;
            }
        }
    }, true);

    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        this.addEventListener('load', function() {
            if (method.toUpperCase() === 'POST') {
                try {
                    const res = JSON.parse(this.responseText);
                    if (res && res.drItemId) drItemIdValue = res.drItemId;
                } catch (e) {}
            }
        });
        originalOpen.apply(this, arguments);
    };
})();

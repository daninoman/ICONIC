// ==UserScript==
// @name         OWMS Express Checkout Script - Production
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Fills ALL packaging fields and clicks ship (Production)
// @author       Edward Luu & Dani Noman
// @match        https://oms-live-au.zalora.net/express-checkout/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Express%20Checkout%20-%20Shortcuts-1.6.user.js
// @downloadURL  https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Express%20Checkout%20-%20Shortcuts-1.6.user.js
// ==/UserScript==

(function() {
    'use strict';

    let inputBuffer = '';
    let isLogging = false;

    function processInput(input) {
        console.log('Processing input:', input);

        // --- 1. PACK SHORTCUT ---
        if (input === 'pack') {
            var packItemButton = document.getElementById('pack_items_btn');
            if (packItemButton) {
                packItemButton.scrollIntoView();
                packItemButton.click();
                var uidField = document.getElementById('scan-uid-to-check');
                if (uidField) {
                    setTimeout(() => { uidField.focus(); }, 200);
                }
            }
        }

        // --- 2. THE ULTIMATE SHIP (Handles Multiple Parcels) ---
        else if (input === 'ship' || input === 'packaging') {

            // Identify ALL packaging fields currently on the screen
            let allPackagingFields = document.querySelectorAll('[id*="packaging"]');

            if (allPackagingFields.length > 0) {
                console.log(`Found ${allPackagingFields.length} parcel(s). Filling...`);

                allPackagingFields.forEach((field, index) => {
                    field.scrollIntoView();
                    field.focus();
                    field.value = 'IRB-46x36x1';

                    // Trigger events so the system registers the data
                    field.dispatchEvent(new Event('input', { bubbles: true }));
                    field.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log(`Filled parcel field #${index + 1} with IRB-46x36x1`);
                });

                // Wait 600ms to allow the live site to validate input then click Ship
                setTimeout(() => {
                    var shipBtn = document.querySelector('[id*="btnUpdatePackage"]');
                    if (shipBtn) {
                        shipBtn.scrollIntoView();
                        shipBtn.click();
                        console.log('Ship button clicked!');
                    }
                }, 600);

            } else {
                // Failsafe if no packaging fields are found
                var backupShipBtn = document.querySelector('[id*="btnUpdatePackage"]');
                if (backupShipBtn) backupShipBtn.click();
            }
        }
    }

    // Keyboard Listener
    document.addEventListener('keydown', function(event) {
        if (isLogging) {
            if (event.key === 'Enter') {
                processInput(inputBuffer.trim().toLowerCase());
                inputBuffer = '';
                isLogging = false;
            } else {
                inputBuffer += event.key;
            }
        } else {
            inputBuffer += event.key;
            if (inputBuffer.endsWith('*')) {
                document.activeElement.blur();
                document.body.click();
                isLogging = true;
                inputBuffer = '';
            }
        }
    });
})();
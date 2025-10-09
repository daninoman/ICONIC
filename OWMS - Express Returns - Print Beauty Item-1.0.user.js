// ==UserScript==
// @name         OWMS - Express Returns - Print Beauty Item
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Prints "BEAUTY ITEM" on the Express Returns Page
// @match        *://*/*
// @author       Dani Noman
// @grant        none
// @updateURL    https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Express%20Returns%20-%20Print%20Beauty%20Item-1.0.user.js
// @downloadURL  https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Express%20Returns%20-%20Print%20Beauty%20Item-1.0.user.js
// ==/UserScript==

(function() {
    'use strict';

    const partialClass = 'pl-4';
    const buttonId = 'print-beauty-item-btn';
    let printBtn = null;

    function createPrintButton() {
        // Remove previous button if it exists
        const existingBtn = document.querySelector(`#${buttonId}`);
        if (existingBtn) existingBtn.remove();

        // Create the print button
        printBtn = document.createElement('button');
        printBtn.id = buttonId;
        printBtn.textContent = '💄 Print Beauty Item';
        printBtn.style.position = 'fixed';
        printBtn.style.bottom = '60px';
        printBtn.style.left = '20px';
        printBtn.style.padding = '10px';
        printBtn.style.zIndex = 10000;
        printBtn.style.backgroundColor = 'black';
        printBtn.style.color = 'white';
        printBtn.style.border = 'none';
        printBtn.style.borderRadius = '5px';
        printBtn.style.cursor = 'pointer';

        document.body.appendChild(printBtn);

        printBtn.addEventListener('click', () => {
            // Remove focus immediately so Enter key doesn’t trigger the button again
            printBtn.blur();

            const printWindow = window.open('', '', 'width=600,height=400');
            printWindow.document.write('<html><head><title>Print</title></head><body>');
            printWindow.document.write(`
                <div style="display:flex;justify-content:center;align-items:center;height:100%;">
                    <p style="font-size:54px;font-weight:bold;text-align:center;line-height:1.0;margin-left:-10px;">
                        BEAUTY<br>ITEM
                    </p>
                </div>
            `);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        });
    }

    function checkForTargetElement() {
        const el = document.querySelector(`p[class*="${partialClass}"]`);
        if (el && !document.querySelector(`#${buttonId}`)) {
            createPrintButton();
        } else if (!el && document.querySelector(`#${buttonId}`)) {
            // Remove button if element is gone
            document.querySelector(`#${buttonId}`).remove();
        }
    }

    // Initial check
    checkForTargetElement();

    // Observe the page for changes
    const observer = new MutationObserver(() => {
        checkForTargetElement();
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();

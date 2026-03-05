// ==UserScript==
// @name         OWMS - Express Returns - Print Can't Find
// @namespace    http://tampermonkey.net/
// @version      1.1.3
// @description  Prints "CAN'T FIND" and a QR code of the User Email (reverted to original style)
// @match        *://*/*
// @author       Edward Luu
// @grant        none
// @updateURL    https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Express%20Returns%20-%20Print%20Can't%20Find.user.js
// @downloadURL  https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Express%20Returns%20-%20Print%20Can't%20Find.user.js
// ==/UserScript==

(function() {
    'use strict';

    const partialClass = 'pl-4';
    const buttonId = 'print-cant-find-btn';
    let printBtn = null;

    function findUserEmail() {
        const emailRegex = /[\w.+\-]+@theiconic\.com\.au/i;
        let match = document.body.innerText.match(emailRegex);
        if (match) return match[0];

        try {
            if (window.top && window.top.document) {
                const topText = window.top.document.body.innerText;
                const topMatch = topText.match(emailRegex);
                if (topMatch) return topMatch[0];
            }
        } catch (e) {}

        return 'Unknown_User';
    }

    function createPrintButton() {
        if (document.querySelector(`#${buttonId}`)) return;

        printBtn = document.createElement('button');
        printBtn.id = buttonId;
        printBtn.textContent = '🔍 Can\'t Find';
        printBtn.style.position = 'fixed';
        printBtn.style.bottom = '110px'; 
        printBtn.style.left = '20px';
        printBtn.style.padding = '10px';
        printBtn.style.zIndex = 10000;
        printBtn.style.backgroundColor = '#d32f2f'; 
        printBtn.style.color = 'white';
        printBtn.style.border = 'none';
        printBtn.style.borderRadius = '5px';
        printBtn.style.cursor = 'pointer';
        printBtn.style.fontWeight = 'bold';

        document.body.appendChild(printBtn);

        printBtn.addEventListener('click', () => {
            printBtn.blur();

            const userEmail = findUserEmail();
            const encodedEmail = encodeURIComponent(userEmail);
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedEmail}`;

            const printWindow = window.open('', '', 'width=600,height=400');
            printWindow.document.write('<html><head><title>Print</title></head><body>');
            
            // Reverting to the original flexbox style used in the Beauty script
            printWindow.document.write(`
                <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; text-align:center;">
                    <p style="font-size:42px; font-weight:bold; line-height:1.0; margin: 0 0 20px 0; white-space: nowrap;">
                        CAN'T FIND
                    </p>
                    <img src="${qrUrl}" width="150" height="150" />
                </div>
            `);

            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();

            // Wait for QR code to load
            const img = printWindow.document.querySelector('img');
            img.onload = function() {
                printWindow.print();
                printWindow.close();
            };
            
            // Fallback if image load fails
            setTimeout(() => {
                if (!printWindow.closed) {
                    printWindow.print();
                    printWindow.close();
                }
            }, 1000);
        });
    }

    function checkForTargetElement() {
        const el = document.querySelector(`p[class*="${partialClass}"]`);
        if (el) {
            createPrintButton();
        } else if (printBtn) {
            printBtn.remove();
            printBtn = null;
        }
    }

    checkForTargetElement();
    const observer = new MutationObserver(checkForTargetElement);
    observer.observe(document.body, { childList: true, subtree: true });

})();

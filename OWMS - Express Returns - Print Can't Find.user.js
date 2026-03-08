// ==UserScript==
// @name         OWMS - Express Returns - Print Can't Find
// @namespace    http://tampermonkey.net/
// @version      1.1.4
// @description  Compact Print "CAN'T FIND" and QR code for floor printers (Fixed Scaling)
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
            // QR size reduced from 150 to 80 for 40% scaling effect
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodedEmail}`;

            const printWindow = window.open('', '', 'width=300,height=300');
            printWindow.document.write('<html><head><title>Print</title></head><body>');
            
            // Removed 100vh height and reduced font sizes significantly
            printWindow.document.write(`
                <div style="text-align:center; padding: 10px; width: 200px; margin: 0 auto;">
                    <p style="font-size:22px; font-weight:bold; line-height:1.0; margin: 0 0 10px 0; white-space: nowrap; font-family: sans-serif;">
                        CAN'T FIND
                    </p>
                    <img src="${qrUrl}" width="80" height="80" style="display: block; margin: 0 auto;" />
                </div>
            `);

            printWindow.document.close();
            printWindow.focus();

            const img = printWindow.document.querySelector('img');
            img.onload = function() {
                printWindow.print();
                printWindow.close();
            };
            
            setTimeout(() => {
                if (printWindow && !printWindow.closed) {
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

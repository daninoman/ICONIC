// ==UserScript==
// @name         OWMS - Express Returns - Print Can't Find
// @namespace    http://tampermonkey.net/
// @version      1.1.2
// @description  Prints "CAN'T FIND" and a QR code of the User Email for floor printers
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

    /**
     * Reaches into the parent/top window to find the email address.
     * Handles complex formats like checker.fc+254@theiconic.com.au
     */
    function findUserEmail() {
        const emailRegex = /[\w.+\-]+@theiconic\.com\.au/i;

        // 1. Check current frame
        let match = document.body.innerText.match(emailRegex);
        if (match) return match[0];

        // 2. Check Top window (where the email is located in the sub-navigation bar)
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
        printBtn.style.bottom = '110px'; // Positioned above the Beauty button (60px)
        printBtn.style.left = '20px';
        printBtn.style.padding = '10px';
        printBtn.style.zIndex = 10000;
        printBtn.style.backgroundColor = '#d32f2f'; // Iconic Red
        printBtn.style.color = 'white';
        printBtn.style.border = 'none';
        printBtn.style.borderRadius = '5px';
        printBtn.style.cursor = 'pointer';
        printBtn.style.fontWeight = 'bold';
        printBtn.style.boxShadow = '0px 2px 10px rgba(0,0,0,0.4)';

        document.body.appendChild(printBtn);

        printBtn.addEventListener('click', () => {
            printBtn.blur();

            const userEmail = findUserEmail();
            const encodedEmail = encodeURIComponent(userEmail);
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedEmail}`;

            const printWindow = window.open('', '', 'width=450,height=450');

            printWindow.document.write(`
                <html>
                <head>
                    <title>Print Label</title>
                    <style>
                        @page { margin: 0; }
                        body {
                            margin: 0; padding: 0;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            font-family: sans-serif;
                            text-align: center;
                        }
                        .text-header {
                            font-size: 48px;
                            font-weight: bold;
                            white-space: nowrap;
                            margin-bottom: 15px;
                            line-height: 1.0;
                        }
                        img {
                            display: block;
                        }
                    </style>
                </head>
                <body>
                    <div class="text-header">CAN'T FIND</div>
                    <img src="${qrUrl}" width="150" height="150" />

                    <script>
                        // Print only after the QR image has loaded
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.close();
                            }, 350);
                        };
                    </script>
                </body>
                </html>
            `);

            printWindow.document.close();
        });
    }

    function checkForTargetElement() {
        // Keeps button visible only when the return item details are present
        const el = document.querySelector(`p[class*="${partialClass}"]`);
        if (el) {
            createPrintButton();
        } else if (printBtn) {
            printBtn.remove();
            printBtn = null;
        }
    }

    // Initial check
    checkForTargetElement();

    // Observe page for scanned items
    const observer = new MutationObserver(checkForTargetElement);
    observer.observe(document.body, { childList: true, subtree: true });

})();
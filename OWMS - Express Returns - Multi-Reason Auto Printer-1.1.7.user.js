// ==UserScript==
// @name         OWMS - Express Returns - Multi-Reason Auto Printer
// @namespace    http://tampermonkey.net/
// @version      1.1.7
// @description  Grey-ish Thermal Output: Softer contrast for better thermal printing. Layout: Reason on top, Icon left, QR right.
// @author       Edward Luu
// @match        *://*/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Express%20Returns%20-%20Multi-Reason%20Auto%20Printer-1.1.7.user.js
// @downloadURL  https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Express%20Returns%20-%20Multi-Reason%20Auto%20Printer-1.1.7.user.js
// ==/UserScript==

(function() {
    'use strict';

    const triggerText = "Scan Order Number or UID";
    const partialClass = "pl-4";
    const btnIdCantFind = 'print-cant-find-btn';
    const btnIdBeauty = 'print-beauty-item-btn';

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

    function printLabel(icon, reasonText) {
        const userEmail = findUserEmail();
        const encodedEmail = encodeURIComponent(userEmail);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=55x55&data=${encodedEmail}`;

        const printWindow = window.open('', '', 'width=400,height=300');
        printWindow.document.write(`
            <html>
            <head>
                <style>
                    @page { margin: 0; }
                    body {
                        margin: 0; padding: 0;
                        display: flex; flex-direction: column;
                        justify-content: center; align-items: center;
                        height: 100vh; font-family: sans-serif;
                        text-align: center;
                        color: #555; /* Dark Grey Text */
                    }
                    .wrapper {
                        display: flex; flex-direction: column;
                        align-items: center; width: 95%;
                        margin-top: -10px;
                    }
                    .header {
                        font-size: 22px;
                        font-weight: 900;
                        margin-bottom: 8px;
                        width: 100%;
                        text-transform: uppercase;
                        line-height: 1.0;
                    }
                    .row {
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        justify-content: center;
                        gap: 20px;
                        width: 100%;
                    }
                    .icon {
                        font-size: 50px;
                        filter: grayscale(1); /* Remove emoji colors */
                        opacity: 0.7; /* Grey-ish appearance */
                        -webkit-filter: grayscale(1);
                    }
                    img {
                        display: block;
                        opacity: 0.8; /* Softer QR code blocks */
                    }
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="header">${reasonText}</div>
                    <div class="row">
                        <span class="icon">${icon}</span>
                        <img src="${qrUrl}" width="55" height="55" />
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() { window.print(); window.close(); }, 350);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    function analyzeNoteAndPrint(note) {
        const text = note.toUpperCase();
        if (text.includes("WAREHOUSE: RETURN REASON FAULTY")) printLabel("🧵", "FAULTY WAREHOUSE");
        else if (text.includes("MARKETPLACE: RETURN REASON FAULTY")) printLabel("📦", "FAULTY MP");
        else if (text.includes("SKU ISSUE")) printLabel("🏷️", "SKU ISSUE");
        else if (text.includes("RI: FURTHER INVESTIGATION")) printLabel("❓", "FURTHERS");
        else if (text.includes("ADMIN: REJECTED RETURN (-$50)")) printLabel("🚫", "REJECTED -$50");
        else if (text.includes("RI: REJECTED RETURN")) printLabel("✖️", "REJECTED +$50");
        else if (text.includes("BEAUTY")) printLabel("🧴", "BEAUTY ITEM");
    }

    function createCantFindButton() {
        if (document.getElementById(btnIdCantFind)) return;
        const btn = document.createElement('button');
        btn.id = btnIdCantFind;
        btn.textContent = '🔍 Can\'t Find';
        btn.style = "position:fixed; bottom:110px; left:20px; padding:10px; z-index:10000; background:#d32f2f; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold; box-shadow:0px 2px 10px rgba(0,0,0,0.4);";
        btn.onclick = () => { btn.blur(); printLabel("🔍", "CAN'T FIND"); };
        document.body.appendChild(btn);
    }

    function createBeautyButton() {
        if (document.getElementById(btnIdBeauty)) return;
        const btn = document.createElement('button');
        btn.id = btnIdBeauty;
        btn.textContent = '🧴 Beauty Item';
        btn.style = "position:fixed; bottom:60px; left:20px; padding:10px; z-index:10000; background:black; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold; box-shadow:0px 2px 10px rgba(0,0,0,0.4);";
        btn.onclick = () => { btn.blur(); printLabel("🧴", "BEAUTY ITEM"); };
        document.body.appendChild(btn);
    }

    document.addEventListener('click', function(e) {
        const target = e.target;
        if (target.tagName === 'IMG' && target.alt === 'Send message') {
            const noteInput = document.getElementById('noteInput');
            if (noteInput && noteInput.value) analyzeNoteAndPrint(noteInput.value);
        }
    }, true);

    function monitorPage() {
        const isItemPage = document.querySelector(`p[class*="${partialClass}"]`);
        const isScanPage = document.body.innerText.includes(triggerText);
        if (isItemPage || isScanPage) createCantFindButton();
        else { const b = document.getElementById(btnIdCantFind); if (b) b.remove(); }
        if (isItemPage) createBeautyButton();
        else { const b = document.getElementById(btnIdBeauty); if (b) b.remove(); }
    }

    setInterval(monitorPage, 1000);
})();

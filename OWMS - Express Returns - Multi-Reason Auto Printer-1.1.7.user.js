// ==UserScript==
// @name         OWMS - Express Returns - Multi-Reason Auto Printer
// @namespace    http://tampermonkey.net/
// @version      1.2.4
// @description  Full-Screen Print Dialog: Maximized window for best visibility. Auto-closes after printing.
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
        const dmUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodedEmail}&code=DataMatrix&dpi=96`;

        // FULL SCREEN LOGIC: Detect available monitor width and height
        const w = window.screen.availWidth;
        const h = window.screen.availHeight;

        const printWindow = window.open('', '_blank', `width=${w},height=${h},top=0,left=0,scrollbars=yes,status=no,menubar=no,toolbar=no`);
        
        printWindow.document.write(`
            <html>
            <head>
                <title>Print Label - Full Screen Mode</title>
                <style>
                    @page { margin: 0; }
                    body { 
                        margin: 0; padding: 0; 
                        display: flex; flex-direction: column; 
                        justify-content: center; align-items: center; 
                        height: 100vh; font-family: sans-serif; 
                        text-align: center; color: #555;
                    }
                    /* Content stays centered and sized for thermal labels */
                    .wrapper { display: flex; flex-direction: column; align-items: center; width: 300px; }
                    .header { font-size: 24px; font-weight: 900; margin-bottom: 10px; text-transform: uppercase; line-height: 1.0; }
                    .row { display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 25px; width: 100%; }
                    .icon { font-size: 60px; filter: grayscale(1); opacity: 0.7; }
                    .dm-img { display: block; filter: contrast(200%) brightness(1); image-rendering: pixelated; }
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="header">${reasonText}</div>
                    <div class="row">
                        <span class="icon">${icon}</span>
                        <img class="dm-img" src="${dmUrl}" width="70" height="70" />
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        // Small delay to allow the full-screen window to focus
                        setTimeout(function() {
                            window.print();
                        }, 400);
                    };
                    // Auto-close when printing is done or cancelled
                    window.onafterprint = function() {
                        window.close();
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        
        // Remove focus from main window to assist the "Enter" key workflow
        if (document.activeElement) document.activeElement.blur();
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
        btn.onclick = (e) => { e.preventDefault(); printLabel("🔍", "CAN'T FIND"); };
        document.body.appendChild(btn);
    }

    function createBeautyButton() {
        if (document.getElementById(btnIdBeauty)) return;
        const btn = document.createElement('button');
        btn.id = btnIdBeauty;
        btn.textContent = '🧴 Beauty Item';
        btn.style = "position:fixed; bottom:60px; left:20px; padding:10px; z-index:10000; background:black; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold; box-shadow:0px 2px 10px rgba(0,0,0,0.4);";
        btn.onclick = (e) => { e.preventDefault(); printLabel("🧴", "BEAUTY ITEM"); };
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

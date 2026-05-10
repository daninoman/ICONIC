// ==UserScript==
// @name         OWMS - Express Returns - Multi-Reason Auto Printer
// @namespace    http://tampermonkey.net/
// @version      1.2.9
// @description  Updated $40 Threshold. Forced Sub-options for SKU and RI Rejected. Full-Screen Print.
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
        try { if (window.top && window.top.document) { return window.top.document.body.innerText.match(emailRegex)[0]; } } catch (e) {}
        return 'Unknown_User';
    }

    function printLabel(icon, reasonText) {
        const userEmail = findUserEmail();
        const encodedEmail = encodeURIComponent(userEmail);
        const dmUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodedEmail}&code=DataMatrix&dpi=96`;

        const w = window.screen.availWidth;
        const h = window.screen.availHeight;
        const printWindow = window.open('', '_blank', `width=${w},height=${h},top=0,left=0`);

        printWindow.document.write(`
            <html>
            <head>
                <style>
                    @page { margin: 0; }
                    body { margin: 0; padding: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; text-align: center; color: #555; }
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
                    <div class="row"><span class="icon">${icon}</span><img class="dm-img" src="${dmUrl}" width="70" height="70" /></div>
                </div>
                <script>
                    window.onload = function() { setTimeout(function() { window.print(); }, 400); };
                    window.onafterprint = function() { window.close(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        if (document.activeElement) document.activeElement.blur();
    }

    function analyzeNoteAndPrint(note) {
        const text = note.toUpperCase();

        if (text.includes("WAREHOUSE: RETURN REASON FAULTY")) printLabel("🧵", "FAULTY WAREHOUSE");
        else if (text.includes("MARKETPLACE: RETURN REASON FAULTY")) printLabel("📦", "FAULTY MP");
        else if (text.includes("RI: FURTHER INVESTIGATION")) printLabel("❓", "FURTHERS");
        else if (text.includes("BEAUTY")) printLabel("🧴", "BEAUTY ITEM");

        // Updated $40 Threshold logic
        else if (text.includes("ADMIN: REJECTED RETURN (-$40)")) printLabel("🚫", "REJECTED -$40");
        else if (text.includes("RI: REJECTED RETURN")) printLabel("✖️", "REJECTED +$40");

        // SKU Logic
        else if (text.includes("SKU ISSUE") && text.includes("MARKETPLACE")) printLabel("🏷️", "SKU ISSUE MP");
        else if (text.includes("SKU ISSUE") && text.includes("WAREHOUSE")) printLabel("🏷️", "SKU ISSUE WH");
    }

    function isNoteValid(noteVal) {
        const text = noteVal.toUpperCase();

        // 1. SKU Issue Gatekeeper
        if (text.includes("SKU ISSUE") && !text.includes("MARKETPLACE") && !text.includes("WAREHOUSE")) {
            alert("🛑 SKU ISSUE ERROR\n\nYou must specify if it is:\n- SKU ISSUE MARKETPLACE\n- SKU ISSUE WAREHOUSE");
            return false;
        }

        // 2. Rejected Return Gatekeeper
        if (text.includes("RI: REJECTED RETURN")) {
            const triggerPhrase = "RI: REJECTED RETURN";
            const index = text.indexOf(triggerPhrase);
            const detail = text.substring(index + triggerPhrase.length).trim();
            if (detail.length === 0) {
                alert("🛑 REJECTION DETAIL REQUIRED\n\nPlease add a reason after the text (e.g. Makeup stain, No tag) before sending.");
                return false;
            }
        }
        return true;
    }

    document.addEventListener('click', function(e) {
        const target = e.target;
        if (target.tagName === 'IMG' && target.alt === 'Send message') {
            const noteInput = document.getElementById('noteInput');
            if (noteInput && noteInput.value) {
                if (!isNoteValid(noteInput.value)) {
                    e.stopImmediatePropagation(); e.preventDefault();
                    return false;
                }
                analyzeNoteAndPrint(noteInput.value);
            }
        }
    }, true);

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target.id === 'noteInput') {
            const noteVal = e.target.value;
            if (noteVal) {
                if (!isNoteValid(noteVal)) {
                    e.stopImmediatePropagation(); e.preventDefault();
                    return false;
                }
                analyzeNoteAndPrint(noteVal);
            }
        }
    }, true);

    function createManualButton(id, text, bottom, color, label) {
        if (document.getElementById(id)) return;
        const btn = document.createElement('button');
        btn.id = id; btn.textContent = text;
        btn.style = `position:fixed; bottom:${bottom}; left:20px; padding:10px; z-index:10000; background:${color}; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold; box-shadow:0px 2px 10px rgba(0,0,0,0.4);`;
        btn.onclick = (e) => { e.preventDefault(); printLabel(text.includes('Find') ? "🔍" : "🧴", label); };
        document.body.appendChild(btn);
    }

    function monitorPage() {
        const isItemPage = document.querySelector(`p[class*="${partialClass}"]`);
        const isScanPage = document.body.innerText.includes(triggerText);
        if (isItemPage || isScanPage) createManualButton(btnIdCantFind, '🔍 Can\'t Find', '110px', '#d32f2f', "CAN'T FIND");
        else { const b = document.getElementById(btnIdCantFind); if (b) b.remove(); }
        if (isItemPage) createManualButton(btnIdBeauty, '🧴 Beauty Item', '60px', 'black', "BEAUTY ITEM");
        else { const b = document.getElementById(btnIdBeauty); if (b) b.remove(); }
    }

    setInterval(monitorPage, 1000);
})();

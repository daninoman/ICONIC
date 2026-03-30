// ==UserScript==
// @name         OWMS - Express Returns - Multi-Reason Auto Printer
// @namespace    http://tampermonkey.net/
// @version      1.1.9
// @description  Data Matrix Update: Grey text for stability, Sharp Black Data Matrix for industrial scanning.
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
        
        // Using TEC-IT API for professional Data Matrix generation
        // data: the email, code: DataMatrix, dpi: 96 for sharp rendering
        const dmUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodedEmail}&code=DataMatrix&dpi=96`;

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
                        color: #555; /* Grey text stays for anti-smudge */
                    }
                    .row { 
                        display: flex; 
                        flex-direction: row; 
                        align-items: center; 
                        justify-content: center; 
                        gap: 25px; 
                        width: 100%;
                    }
                    .icon { 
                        font-size: 50px; 
                        filter: grayscale(1); 
                        opacity: 0.7;
                        -webkit-filter: grayscale(1);
                    }
                    .dm-img {
                        display: block;
                        /* Data Matrix MUST be high contrast */
                        filter: contrast(200%) brightness(1);
                        /* Industrial sharpening for thermal heads */
                        image-rendering: pixelated; 
                        image-rendering: crisp-edges;
                    }
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="header">${reasonText}</div>
                    <div class="row">
                        <span class="icon">${icon}</span>
                        <img class="dm-img" src="${dmUrl}" width="60" height="60" />
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() { window.print(); window.close(); }, 400);
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

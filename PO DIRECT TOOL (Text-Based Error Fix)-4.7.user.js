// ==UserScript==
// @name         PO DIRECT TOOL (Text-Based Error Fix)
// @namespace    http://tampermonkey.net/
// @version      4.7
// @description  Detects "No records found" text to clear ghost data. 76x36mm labels.
// @author       Assistant
// @match        https://oms-live-au.zalora.net/inbound/inbound-by-barcode*
// @match        https://script.google.com/a/macros/theiconic.com.au/s/AKfycby7rNzPXxlIkewaVqTrf3vBG3JWRWZ6Bb6qDAxsSrYWG6_s2-iidU_Af8Ei1PmnStmvTQ/exec*
// @match        https://*.googleusercontent.com/*
// @grant        window.close
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const targetUrl = "https://script.google.com/a/macros/theiconic.com.au/s/AKfycby7rNzPXxlIkewaVqTrf3vBG3JWRWZ6Bb6qDAxsSrYWG6_s2-iidU_Af8Ei1PmnStmvTQ/exec";

    const applyBtnStyle = (btn, color) => {
        Object.assign(btn.style, {
            backgroundColor: color, color: '#ffffff', padding: '10px 18px',
            borderRadius: '5px', border: '2px solid #ffffff', fontWeight: 'bold',
            fontSize: '13px', cursor: 'pointer', fontFamily: 'Arial, sans-serif',
            boxShadow: '0 4px 8px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
            width: '180px', textAlign: 'center'
        });
    };

    // --- 1. ZALORA WMS PAGE ---
    if (window.location.href.includes("zalora.net")) {
        setInterval(() => {
            if (document.getElementById('tm-wms-main-btn')) return;
            const btn = document.createElement('div');
            btn.id = 'tm-wms-main-btn';
            btn.innerHTML = '📦 PO DIRECT TOOL';
            applyBtnStyle(btn, '#000000');
            Object.assign(btn.style, { position: 'fixed', bottom: '30px', left: '30px', zIndex: '2147483647', width: 'auto' });
            btn.onclick = () => window.open(targetUrl, '_blank');
            if (document.body) document.body.appendChild(btn);
        }, 1000);
    }

    // --- 2. GOOGLE APPS SCRIPT PAGE ---
    if (window.location.href.includes("google")) {
        const createUI = () => {
            if (document.getElementById('tm-gas-container')) return;
            if (!document.body) return;

            const container = document.createElement('div');
            container.id = 'tm-gas-container';
            Object.assign(container.style, {
                position: 'fixed', bottom: '20px', left: '20px', zIndex: '2147483647',
                display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start'
            });

            const heading = document.createElement('div');
            heading.innerHTML = 'QA REASONS';
            Object.assign(heading.style, {
                color: '#000000', fontWeight: '900', fontSize: '16px', fontFamily: 'Arial, sans-serif',
                width: '180px', textAlign: 'center', textDecoration: 'underline', marginBottom: '2px'
            });
            container.appendChild(heading);

            const manualPoInput = document.createElement('input');
            manualPoInput.id = 'tm-manual-po-field';
            manualPoInput.type = 'text';
            manualPoInput.placeholder = 'Manual PO (Optional)';
            Object.assign(manualPoInput.style, {
                width: '180px', padding: '8px', borderRadius: '5px',
                border: '2px solid #000', fontSize: '12px', fontWeight: 'bold',
                boxSizing: 'border-box', textAlign: 'center', marginBottom: '5px'
            });
            manualPoInput.onclick = (e) => e.stopPropagation();
            container.appendChild(manualPoInput);

            ["Extras", "NWIO", "Faulty", "Attribute Mismatch"].forEach(text => {
                const rBtn = document.createElement('div');
                rBtn.innerHTML = text;
                applyBtnStyle(rBtn, '#d32f2f');
                rBtn.onclick = (e) => { e.stopPropagation(); generateLabels(text); };
                container.appendChild(rBtn);
            });

            document.body.appendChild(container);
        };

        const generateLabels = (reason) => {
            let brand = "_________________";
            let po = "_________________";
            let sn = "SN/________________";

            // CHECK FOR ERROR TEXT (prevents printing "ghost" data)
            const bodyText = document.body.innerText;
            const isErrorVisible = bodyText.includes("No records found");

            const poValues = document.querySelectorAll('.po-col-value');
            const manualField = document.getElementById('tm-manual-po-field');
            const manualValue = manualField ? manualField.value.trim() : "";

            // Only use scraped data if "No records found" is NOT on the screen
            if (poValues.length > 0 && !isErrorVisible) {
                const rawPOData = poValues[0].innerText.trim();
                if (rawPOData.includes('-')) {
                    const parts = rawPOData.split('-');
                    sn = parts[0]; po = parts[1];
                } else { po = rawPOData; }
                if (poValues[1]) brand = poValues[1].innerText.trim();
            }
            else if (manualValue !== "") {
                if (manualValue.includes('-')) {
                    const parts = manualValue.split('-');
                    sn = parts[0]; po = parts[1];
                } else {
                    po = manualValue;
                }
            }

            const today = new Date().toLocaleDateString('en-AU');
            const printWin = window.open('', '_blank');
            printWin.document.write(`
                <html>
                <head>
                    <style>
                        @page { size: 76mm 36mm; margin: 0; }
                        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
                        .label {
                            width: 76mm; height: 36mm; padding: 1.5mm 3mm;
                            box-sizing: border-box; page-break-after: always; overflow: hidden;
                        }
                        .info-line { font-size: 9pt; margin-bottom: 1pt; white-space: nowrap; }
                        .write-line { font-size: 10pt; margin-top: 5pt; }
                        .header {
                            font-size: 13pt; font-weight: bold; border-bottom: 1pt solid black;
                            margin-bottom: 3pt; text-align: center;
                        }
                        .qa-line { font-size: 10pt; margin-bottom: 3pt; }
                        b { font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="label">
                        <div class="info-line"><b>PO Number:</b> ${po}</div>
                        <div class="info-line"><b>SN:</b> ${sn}</div>
                        <div class="write-line"><b>Staff:</b> ____________________</div>
                        <div class="write-line"><b>Qty:</b> ______________________</div>
                    </div>
                    <div class="label">
                        <div class="header">QA Purchase Order</div>
                        <div class="qa-line"><b>Date:</b> ${today}</div>
                        <div class="qa-line"><b>QA Reason:</b> ${reason}</div>
                        <div class="qa-line"><b>Brand:</b> ${brand}</div>
                    </div>
                    <script>
                        window.onload = function() {
                            setTimeout(() => { window.print(); window.close(); }, 500);
                        };
                    </script>
                </body>
                </html>
            `);
            printWin.document.close();
            if (manualField) manualField.value = "";
        };

        setInterval(() => {
            const scanInput = document.getElementById('ssccInput');
            const manualField = document.getElementById('tm-manual-po-field');
            if (scanInput) {
                if (document.activeElement === manualField) return;
                if (document.activeElement !== scanInput) scanInput.focus();
                createUI();
            }
        }, 500);
    }
})();
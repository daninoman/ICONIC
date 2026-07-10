// ==UserScript==
// @name         OWMS - Express Returns - Locations On Screen
// @namespace    http://tampermonkey.net/
// @version      1.0.4
// @description  Show datamatrix codes when focusing input_location_item and auto-close when field turns green (valid input)
// @author       Dani Noman
// @match        *://*/*
// @downloadURL  https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Express%20Returns%20-%20Locations%20On%20Screen-1.0.user.js
// @updateURL    https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Express%20Returns%20-%20Locations%20On%20Screen-1.0.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function getDayCode() {
        const days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
        return days[new Date().getDay()];
    }

    // Scans the entire HTML of the page for the unique Base64 snippets
    function determineMode() {
        const pageSource = document.body.innerHTML;

        const whSnippet = "iVBORw0KGgoAAAANSUhEUgAAAQAA"; // Warehouse Override (Priority)
        const mpSnippet = "iVBORw0KGgoAAAANSUhEUgAAASoA"; // Marketplace Flag

        // Check for Warehouse first - if it's anywhere on the page, force Warehouse mode
        if (pageSource.includes(whSnippet)) {
            return "WAREHOUSE";
        }

        // If no Warehouse flag, check for Marketplace
        if (pageSource.includes(mpSnippet)) {
            return "MARKETPLACE";
        }

        // Fallback to Warehouse if neither is found
        return "WAREHOUSE";
    }

    function createPopup(code1, code2, bulkCode, whBulkCode, input, showBulk) {
        let old = document.getElementById('barcode-popup');
        if (old) old.remove();

        let popup = document.createElement('div');
        popup.id = 'barcode-popup';
        popup.style.position = 'fixed';
        popup.style.top = '0';
        popup.style.left = '0';
        popup.style.width = '100vw';
        popup.style.height = '100vh';
        popup.style.background = 'rgba(0,0,0,0.7)';
        popup.style.zIndex = '99999';

        let canvas1, canvas2, canvas3, canvas4;

        if (showBulk) {
            // === MARKETPLACE LAYOUT (Yellow - Side by Side) ===
            let boxL = createBarcodeBox(bulkCode, true);
            boxL.style.top = '50%';
            boxL.style.left = '60px';
            boxL.style.transform = 'translateY(-50%)';
            canvas1 = boxL.querySelector('canvas');
            popup.appendChild(boxL);

            let boxR = createBarcodeBox(code2, true);
            boxR.style.top = '50%';
            boxR.style.right = '60px';
            boxR.style.transform = 'translateY(-50%)';
            canvas2 = boxR.querySelector('canvas');
            popup.appendChild(boxR);
        } else {
            // === WAREHOUSE ZIG-ZAG LAYOUT (White) ===

            // 1. Far Bottom Left Corner (SHOES)
            let box1 = createBarcodeBox(code2);
            box1.style.bottom = '30px';
            box1.style.left = '30px';
            canvas1 = box1.querySelector('canvas');
            popup.appendChild(box1);

            // 2. Top Left Offset (BULK - 1/4 right)
            let box2 = createBarcodeBox(whBulkCode);
            box2.style.top = '30px';
            box2.style.left = '25%';
            box2.style.transform = 'translateX(-50%)';
            canvas2 = box2.querySelector('canvas');
            popup.appendChild(box2);

            // 3. Bottom Right Offset (ASRS - 1/4 left)
            let box3 = createBarcodeBox(code1);
            box3.style.bottom = '30px';
            box3.style.right = '25%';
            box3.style.transform = 'translateX(50%)';
            canvas3 = box3.querySelector('canvas');
            popup.appendChild(box3);

            // 4. Far Top Right Corner (MISLABEL)
            let box4 = createBarcodeBox('RTNmislabel');
            box4.style.top = '30px';
            box4.style.right = '30px';
            canvas4 = box4.querySelector('canvas');
            popup.appendChild(box4);
        }

        document.body.appendChild(popup);

        function createBarcodeBox(text, isYellow = false) {
            let container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.background = isYellow ? '#FFEB3B' : 'white';
            container.style.padding = '15px';
            container.style.border = '4px solid black';
            container.style.boxShadow = '0 0 25px rgba(0,0,0,0.8)';
            container.style.textAlign = 'center';

            let canvas = document.createElement('canvas');
            canvas.style.display = 'block';
            canvas.style.margin = '0 auto';

            let label = document.createElement('div');
            label.innerText = text;
            label.style.marginTop = '8px';
            label.style.fontWeight = '900';
            label.style.fontSize = '20px';

            container.appendChild(canvas);
            container.appendChild(label);
            return container;
        }

        popup.addEventListener('click', () => popup.remove());

        const observer = new MutationObserver(() => {
            if (input.classList.contains('border-green-500') || input.classList.contains('dark:border-green-400')) {
                popup.remove();
                observer.disconnect();
            }
        });
        observer.observe(input, { attributes: true, attributeFilter: ['class'] });

        function renderAll() {
            if (showBulk) {
                renderBarcode(canvas1, bulkCode);
                renderBarcode(canvas2, code2);
            } else {
                renderBarcode(canvas1, code2);        // WHSHOES
                renderBarcode(canvas2, whBulkCode);   // WHBULKY
                renderBarcode(canvas3, code1);        // ASRSRTN
                renderBarcode(canvas4, 'RTNmislabel');
            }
        }

        if (!window.BWIPJS_LOADED) {
            let script = document.createElement('script');
            script.src = 'https://unpkg.com/bwip-js/dist/bwip-js-min.js';
            script.onload = function() {
                window.BWIPJS_LOADED = true;
                renderAll();
            };
            document.head.appendChild(script);
        } else {
            renderAll();
        }
    }

    function renderBarcode(canvas, text) {
        try {
            bwipjs.toCanvas(canvas, {
                bcid: 'datamatrix',
                text: text,
                scale: 4,
                includetext: false,
            });
        } catch (e) {
            console.error(e);
        }
    }

    window.addEventListener('focusin', function(e) {
        if (e.target.id === 'input_location_item') {
            const selectedRow = e.target.closest('.bg-row_selected');
            if (!selectedRow) return;

            // Small delay to ensure the DOM is updated if the app is dynamic
            setTimeout(() => {
                let day = getDayCode();
                let mode = determineMode();

                let code1 = `ASRSRTN-${day}`;
                let code2;
                let bulkCode = `MPRBULKAP-${day}`;
                let whBulkCode = `WHBULKY-${day}`;
                let showBulk;

                if (mode === "WAREHOUSE") {
                    showBulk = false;
                    code2 = `WHSHOES-${day}`;
                } else {
                    showBulk = true;
                    code2 = `MPRSHOES-${day}`;
                }

                createPopup(code1, code2, bulkCode, whBulkCode, e.target, showBulk);
            }, 50);
        }
    });
})();

// ==UserScript==
// @name         OWMS - Express Returns - Locations On Screen
// @namespace    http://tampermonkey.net/
// @version      1.0.1
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

    function createPopup(code1, code2, bulkCode, input, showLeft, showBulk) {
        let old = document.getElementById('barcode-popup');
        if (old) old.remove();

        let popup = document.createElement('div');
        popup.id = 'barcode-popup';
        popup.style.position = 'fixed';
        popup.style.top = '0';
        popup.style.left = '0';
        popup.style.width = '100%';
        popup.style.height = '100%';
        popup.style.background = 'rgba(0,0,0,0.5)';
        popup.style.display = 'flex';
        popup.style.justifyContent = 'space-between';
        popup.style.alignItems = 'center';
        popup.style.padding = '40px';
        popup.style.zIndex = '99999';

        let canvas1, label1;

        if (showLeft) {
            let leftContainer = document.createElement('div');
            leftContainer.style.background = 'white';
            leftContainer.style.padding = '20px';
            leftContainer.style.border = '2px solid black';
            leftContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
            leftContainer.style.textAlign = 'center';

            canvas1 = document.createElement('canvas');
            canvas1.style.display = 'block';
            canvas1.style.margin = '0 auto';

            label1 = document.createElement('div');
            label1.innerText = code1;
            label1.style.marginTop = '10px';
            label1.style.fontWeight = 'bold';
            label1.style.fontSize = '16px';
            label1.style.textAlign = 'center';

            leftContainer.appendChild(canvas1);
            leftContainer.appendChild(label1);
            popup.appendChild(leftContainer);
        }

        // ===== Standalone BULK (center) =====
        let bulkContainer, canvasBulk, labelBulk;
        if (showBulk) {
            bulkContainer = document.createElement('div');
            bulkContainer.style.background = 'white';
            bulkContainer.style.padding = '20px';
            bulkContainer.style.border = '2px solid black';
            applyYellowTheme(bulkContainer);
            bulkContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
            bulkContainer.style.textAlign = 'center';

            canvasBulk = document.createElement('canvas');
            canvasBulk.style.display = 'block';
            canvasBulk.style.margin = '0 auto';

            labelBulk = document.createElement('div');
            labelBulk.innerText = bulkCode;
            labelBulk.style.marginTop = '10px';
            labelBulk.style.fontWeight = 'bold';
            labelBulk.style.fontSize = '16px';
            labelBulk.style.textAlign = 'center';

            bulkContainer.appendChild(canvasBulk);
            bulkContainer.appendChild(labelBulk);
            popup.appendChild(bulkContainer);
        }

// ===== RTNmislabel (normal middle) =====
let canvasMid;
if (!showBulk) {
    let middleContainer = document.createElement('div');
    middleContainer.style.background = 'white';
    middleContainer.style.padding = '20px';
    middleContainer.style.border = '2px solid black';
    middleContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    middleContainer.style.textAlign = 'center';

    canvasMid = document.createElement('canvas');
    canvasMid.style.display = 'block';
    canvasMid.style.margin = '0 auto';

    let labelMid = document.createElement('div');
    labelMid.innerText = 'RTNmislabel';
    labelMid.style.marginTop = '10px';
    labelMid.style.fontWeight = 'bold';
    labelMid.style.fontSize = '16px';
    labelMid.style.textAlign = 'center';

    middleContainer.appendChild(canvasMid);
    middleContainer.appendChild(labelMid);
    popup.appendChild(middleContainer);
}

        // ===== Right (WHSHOES / MPRSHOES) =====
let rightContainer = document.createElement('div');
rightContainer.style.background = 'white';
rightContainer.style.padding = '20px';
rightContainer.style.border = '2px solid black';
if (showBulk) applyYellowTheme(rightContainer);
        rightContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        rightContainer.style.textAlign = 'center';

        let canvas2 = document.createElement('canvas');
        canvas2.style.display = 'block';
        canvas2.style.margin = '0 auto';

        let label2 = document.createElement('div');
        label2.innerText = code2;
        label2.style.marginTop = '10px';
        label2.style.fontWeight = 'bold';
        label2.style.fontSize = '16px';
        label2.style.textAlign = 'center';

        rightContainer.appendChild(canvas2);
        rightContainer.appendChild(label2);
        popup.appendChild(rightContainer);

        document.body.appendChild(popup);

        popup.addEventListener('click', () => popup.remove());

        const observer = new MutationObserver(() => {
            if (input.classList.contains('border-green-500') || input.classList.contains('dark:border-green-400')) {
                popup.remove();
                observer.disconnect();
            }
        });
        observer.observe(input, { attributes: true, attributeFilter: ['class'] });

        function renderAll() {
            if (showLeft) renderBarcode(canvas1, code1);
            if (showBulk) renderBarcode(canvasBulk, bulkCode);
            if (!showBulk) renderBarcode(canvasMid, 'RTNmislabel');
            renderBarcode(canvas2, code2);
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
                scale: 3,
                includetext: false,
            });
        } catch (e) {
            console.error(e);
        }
    }

    function applyYellowTheme(container) {
    container.style.background = '#FFEB3B';
    container.style.borderColor = '#000';
}
window.addEventListener('focusin', function(e) {
    if (e.target.id === 'input_location_item') {

        // only show when row is selected
        const selectedRow = e.target.closest('.bg-row_selected');
        if (!selectedRow) return;

        let day = getDayCode();

            const targetImage = document.querySelector('img[src^="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASoA"]');

            let code1 = `ASRSRTN-${day}`;
            let code2;
            let bulkCode = `MPRBULKAP-${day}`;
            let showLeft = true;
            let showBulk = false;

            if (targetImage) {
                code2 = `MPRSHOES-${day}`;
                showLeft = false;
                showBulk = true;
            } else {
                code2 = `WHSHOES-${day}`;
            }

            createPopup(code1, code2, bulkCode, e.target, showLeft, showBulk);
        }
    });
})();

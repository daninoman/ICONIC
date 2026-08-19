// ==UserScript==
// @name         OWMS - Express Returns - Locations On Screen
// @namespace    http://tampermonkey.net/
// @version      1.0.8
// @description  Passive Barcode Display - Does not interfere with Auto-Focus scripts
// @author       Dani Noman / [Your Team]
// @match        *://*/*
// @require      https://unpkg.com/bwip-js/dist/bwip-js-min.js
// @downloadURL  https://github.com/daninoman/ICONIC/raw/refs/heads/main/OWMS%20-%20Express%20Returns%20-%20Locations%20On%20Screen-1.0.user.js
// @updateURL    https://github.com/daninoman/ICONIC/raw/refs/heads/main/OWMS%20-%20Express%20Returns%20-%20Locations%20On%20Screen-1.0.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function getDayCode() {
        const days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
        return days[new Date().getDay()];
    }

    function determineMode() {
        const pageSource = document.body.innerHTML;
        const whSnippet = "iVBORw0KGgoAAAANSUhEUgAAAQAA";
        const adviceSnippet = "EACAYAAABccqhmAAAQeElEQVR4nO3d";
        const mpSnippet = "iVBORw0KGgoAAAANSUhEUgAAASoA";

        if (pageSource.includes(whSnippet) || pageSource.includes(adviceSnippet)) return "WAREHOUSE";
        if (pageSource.includes(mpSnippet)) return "MARKETPLACE";
        return "WAREHOUSE";
    }

    function renderBarcodeSafely(canvas, text, retryCount = 0) {
        const scanner = window.bwipjs || (typeof bwipjs !== 'undefined' ? bwipjs : null);
        if (!scanner) {
            if (retryCount < 10) setTimeout(() => renderBarcodeSafely(canvas, text, retryCount + 1), 200);
            return;
        }
        try {
            scanner.toCanvas(canvas, { bcid: 'datamatrix', text: text, scale: 4, includetext: false });
        } catch (e) { console.error("Barcode Error:", e); }
    }

    function createPopup(inputElement, mode) {
        // Prevent duplicate popups if one is already open
        if (document.getElementById('barcode-popup')) return;

        const day = getDayCode();
        const isMarketplace = (mode === "MARKETPLACE");

        let popup = document.createElement('div');
        popup.id = 'barcode-popup';
        // CRITICAL CHANGE: pointer-events:none allows the scanner/mouse to "click through" to the field below
        popup.style = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); z-index:999999; pointer-events:none; display:flex; justify-content:center; align-items:center;";

        let content = document.createElement('div');
        content.style = "position:relative; width:100%; height:100%;";
        popup.appendChild(content);

        function addBox(text, style, bg = "white") {
            let box = document.createElement('div');
            // pointer-events:auto here allows you to click the barcode if you actually need to, but the background remains transparent to clicks
            box.style = style + `position:absolute; background:${bg}; padding:12px; border:3px solid black; box-shadow:0 0 15px rgba(0,0,0,0.5); text-align:center; pointer-events:auto;`;

            let canvas = document.createElement('canvas');
            canvas.style = "display:block; margin: 0 auto;";
            let label = document.createElement('div');
            label.innerText = text;
            label.style = "margin-top:5px; font-weight:900; font-size:16px; font-family:sans-serif; color:black;";

            box.appendChild(canvas);
            box.appendChild(label);
            content.appendChild(box);

            renderBarcodeSafely(canvas, text);
        }

        if (isMarketplace) {
            addBox(`MPRBULKAP-${day}`, "top:50%; left:10%; transform:translateY(-50%);", "#FFEB3B");
            addBox(`MPRSHOES-${day}`, "top:50%; right:10%; transform:translateY(-50%);", "#FFEB3B");
        } else {
            addBox(`WHSHOES-${day}`, "bottom:30px; left:30px;");
            addBox(`WHBULKY-${day}`, "top:30px; left:20%; transform:translateX(-50%);");
            addBox(`ASRSRTN-${day}`, "bottom:30px; right:20%; transform:translateX(50%);");
            addBox(`RTNmislabel`, "top:30px; right:30px;");
        }

        document.body.appendChild(popup);

        // Auto-close logic
        const observer = new MutationObserver(() => {
            if (inputElement.classList.contains('border-green-500') || inputElement.classList.contains('dark:border-green-400')) {
                popup.remove();
                observer.disconnect();
            }
        });
        observer.observe(inputElement, { attributes: true, attributeFilter: ['class'] });
    }

    // Passive listener
    window.addEventListener('focusin', function(e) {
        if (e.target.id === 'input_location_item') {
            const selectedRow = e.target.closest('.bg-row_selected');
            if (!selectedRow) return;

            // Use requestAnimationFrame to ensure we don't block the browser's focus chain
            window.requestAnimationFrame(() => {
                const mode = determineMode();
                createPopup(e.target, mode);
            });
        }
    });

    // Cleanup popup if user leaves the field without scanning
    window.addEventListener('focusout', function(e) {
        if (e.target.id === 'input_location_item') {
            setTimeout(() => {
                const popup = document.getElementById('barcode-popup');
                if (popup && document.activeElement.id !== 'input_location_item') {
                    popup.remove();
                }
            }, 100);
        }
    });
})();

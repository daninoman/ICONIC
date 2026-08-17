// ==UserScript==
// @name         OWMS - Express Returns - Locations On Screen
// @namespace    http://tampermonkey.net/
// @version      1.0.6
// @description  Automated Barcode Popups for Warehouse Returns
// @author       Dani Noman / [Your Team]
// @match        *://*/*
// @require      https://unpkg.com/bwip-js/dist/bwip-js-min.js
// @downloadURL  PASTE_YOUR_RAW_GITHUB_URL_HERE
// @updateURL    PASTE_YOUR_RAW_GITHUB_URL_HERE
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. Utility: Get current day abbreviation
    function getDayCode() {
        const days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
        return days[new Date().getDay()];
    }

    // 2. Detection: Look for image snippets to determine return type
    function determineMode() {
        const pageSource = document.body.innerHTML;

        const whSnippet = "iVBORw0KGgoAAAANSUhEUgAAAQAA"; // Standard WH icon
        const adviceSnippet = "EACAYAAABccqhmAAAQeElEQVR4nO3d"; // New DRIF flag
        const mpSnippet = "iVBORw0KGgoAAAANSUhEUgAAASoA"; // Marketplace icon

        // Priority 1: Check for Warehouse or Return Advice
        if (pageSource.includes(whSnippet) || pageSource.includes(adviceSnippet)) {
            return "WAREHOUSE";
        }

        // Priority 2: Check for Marketplace
        if (pageSource.includes(mpSnippet)) {
            return "MARKETPLACE";
        }

        // Default to Warehouse
        return "WAREHOUSE";
    }

    // 3. UI: Create the popup on screen
    function createPopup(inputElement, mode) {
        let old = document.getElementById('barcode-popup');
        if (old) old.remove();

        const day = getDayCode();
        const isMarketplace = (mode === "MARKETPLACE");

        // Container overlay
        let popup = document.createElement('div');
        popup.id = 'barcode-popup';
        popup.style = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.7); z-index:999999; display:flex; justify-content:center; align-items:center;";

        // Content Area
        let content = document.createElement('div');
        content.style = "position:relative; width:100%; height:100%; pointer-events:none;";
        popup.appendChild(content);

        // Helper to create individual barcode boxes
        function addBox(text, style, bg = "white") {
            let box = document.createElement('div');
            box.style = style + `position:absolute; background:${bg}; padding:15px; border:4px solid black; box-shadow:0 0 25px rgba(0,0,0,0.8); text-align:center; pointer-events:auto;`;
            
            let canvas = document.createElement('canvas');
            let label = document.createElement('div');
            label.innerText = text;
            label.style = "margin-top:8px; font-weight:900; font-size:20px; font-family:sans-serif;";

            box.appendChild(canvas);
            box.appendChild(label);
            content.appendChild(box);

            // Generate Barcode using BWIP-JS (now reliable via @require)
            try {
                bwipjs.toCanvas(canvas, {
                    bcid: 'datamatrix',
                    text: text,
                    scale: 4,
                    includetext: false,
                });
            } catch (e) { console.error("Barcode Error:", e); }
        }

        if (isMarketplace) {
            // MARKETPLACE LAYOUT (Side-by-Side, Yellow)
            addBox(`MPRBULKAP-${day}`, "top:50%; left:15%; transform:translateY(-50%);", "#FFEB3B");
            addBox(`MPRSHOES-${day}`, "top:50%; right:15%; transform:translateY(-50%);", "#FFEB3B");
        } else {
            // WAREHOUSE LAYOUT (4 Corners, White)
            addBox(`WHSHOES-${day}`, "bottom:40px; left:40px;");
            addBox(`WHBULKY-${day}`, "top:40px; left:25%; transform:translateX(-50%);");
            addBox(`ASRSRTN-${day}`, "bottom:40px; right:25%; transform:translateX(50%);");
            addBox(`RTNmislabel`, "top:40px; right:40px;");
        }

        document.body.appendChild(popup);

        // Auto-close on scan (if field turns green)
        const observer = new MutationObserver(() => {
            if (inputElement.classList.contains('border-green-500') || inputElement.classList.contains('dark:border-green-400')) {
                popup.remove();
                observer.disconnect();
            }
        });
        observer.observe(inputElement, { attributes: true, attributeFilter: ['class'] });

        // Manual close on click overlay
        popup.addEventListener('click', (e) => { if(e.target === popup) popup.remove(); });
    }

    // 4. Listener: Watch for the location field to be selected
    window.addEventListener('focusin', function(e) {
        if (e.target.id === 'input_location_item') {
            // Ensure we are in a selected row
            const selectedRow = e.target.closest('.bg-row_selected');
            if (!selectedRow) return;

            // Small delay to allow page state to settle
            setTimeout(() => {
                const mode = determineMode();
                createPopup(e.target, mode);
            }, 100);
        }
    });
})();

// ==UserScript==
// @name         OWMS - Receiving - PO Direct Tool
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Opens a new tab with a specific link if scanned barcode code data contains "*opentab".
// @author       Dani Noman & Edward Luu
// @match        https://oms-live-au.zalora.net/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Receiving%20-%20PO%20Direct%20Tool-2.1.user.js
// @downloadURL  https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Receiving%20-%20PO%20Direct%20Tool-2.1.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Wait for input (assuming the Bluetooth scanner sends the data directly to the document)
    let qrDataBuffer = '';

    // Function to handle incoming data and open new tab if condition is met
    function handleScanInput(event) {
        // Append the key pressed to the buffer
        qrDataBuffer += event.key;

        // Check if we encounter a line break or other delimiter that signals the end of a scan
        if (event.key === 'Enter') {
            if (qrDataBuffer.includes('*opentab')) {
                // Open the specific URL in a new tab if the data contains "*opentab"
                window.open('https://script.google.com/a/macros/theiconic.com.au/s/AKfycbxKPsvzc0J6XJPVm0S1STG55W1uKSYsRimei8av-P4gFFFYO84Y0AXamPR6uC6sBic/exec');
            }
            // Reset buffer after handling the input
            qrDataBuffer = '';
        }
    }

    // Add event listener for the keypress event (which is how the scanner sends data)
    document.addEventListener('keypress', handleScanInput);
})();

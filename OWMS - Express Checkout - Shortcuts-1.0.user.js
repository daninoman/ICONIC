// ==UserScript==
// @name         OWMS Express Checkout Script - Production
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Click buttons on key press
// @author       Ashur Chamoun
// @match        https://oms-live-au.zalora.net/express-checkout/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let inputBuffer = '';
    let isLogging = false;
    let packagingIndex = 0;
    let packagingFields = [];

    function processInput(input) {
        console.log('Processing input:', input); // Debugging message
        if (input === 'pack') {
            var packItemButton = document.getElementById('pack_items_btn');
            if (packItemButton) {
                packItemButton.scrollIntoView();
                packItemButton.click();
                console.log('Clicked button1'); // Debugging message
                var uidField = document.getElementById('scan-uid-to-check');
                if (uidField) {
                    console.log('UID textbox found'); // Debugging message
                    uidField.scrollIntoView();
                    console.log('Scrolled to UID textbox'); // Debugging message
                    setTimeout(() => { // Adding a small delay to ensure visibility
                        uidField.focus(); // Set focus to the text box
                        console.log('Focused on UID textbox'); // Debugging message
                    }, 200);
                } else {
                    console.log('UID textbox not found'); // Debugging message
                }
            }
        } else if (input === 'packaging') {
            if (packagingFields.length === 0) {
                packagingFields = Array.from(document.querySelectorAll('[id*="packaging"]'));
                console.log('Packaging fields initialized:', packagingFields); // Debugging message
            }

            if (packagingFields.length > 0) {
                if (packagingIndex >= packagingFields.length) {
                    packagingIndex = 0; // Reset the index if it exceeds the number of fields
                }

                let field = packagingFields[packagingIndex];
                field.scrollIntoView();
                console.log(`Scrolled to packaging textbox ${packagingIndex + 1}`); // Debugging message
                field.focus();
                console.log(`Focused on packaging textbox ${packagingIndex + 1}`); // Debugging message
                packagingIndex++;
                console.log(`Updated packaging index to ${packagingIndex}`); // Debugging message
            } else {
                console.log('Packaging textboxes not found'); // Debugging message
            }
        } else if (input === 'ship') {
            var element3 = document.querySelector('[id*="btnUpdatePackage"]');
            if (element3) {
                element3.scrollIntoView();
                element3.click();
                console.log('Clicked Ship button'); // Debugging message
            } else {
                console.log('Ship button not found'); // Debugging message
            }
        } else {
            console.log('No matching input found'); // Debugging message
        }
    }

    document.addEventListener('keydown', function(event) {
        if (isLogging) {
            if (event.key === 'Enter') {
                processInput(inputBuffer.trim());
                inputBuffer = ''; // Clear the buffer after processing
                isLogging = false; // Stop logging after processing
            } else {
                inputBuffer += event.key;
                console.log('Current input buffer:', inputBuffer); // Debugging message
            }
        } else {
            inputBuffer += event.key;
            if (inputBuffer.endsWith('*')) {
                // Click off any current text box to prevent command input
                document.activeElement.blur(); // Blur the currently focused element
                document.body.click(); // Click the body to ensure no input is focused
                isLogging = true;
                inputBuffer = ''; // Clear the buffer after detecting the start sequence
                console.log('Start sequence detected, logging input...'); // Debugging message
            }
        }
    });
})();
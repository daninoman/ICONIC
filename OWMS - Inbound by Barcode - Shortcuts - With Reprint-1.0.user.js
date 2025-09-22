// ==UserScript==
// @name         OWMS Inbound by Barcode Script - Production
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Click buttons on key press
// @author       Ashur Chamoun
// @match        https://oms-live-au.zalora.net/inbound/inbound-by-barcode*
// @grant        GM_download
// ==/UserScript==

(function() {
    'use strict';

    let inputBuffer = '';
    let isLogging = false;
    let packagingIndex = 0;
    let packagingFields = [];
    const checkForField = 'drItemId'; // The field to check in the response
    let drItemIdValue; // Variable to store the value of drItemId
    const downloadBaseUrl = 'https://oms-live-au.zalora.net/inbound/inbound-by-barcode/export-csv-barcodes-by-dr-item/id/'; // Replace with your specific download URL



    function processInput(input) {
        console.log('Processing input:', input); // Debugging message
        if (input === 'purchaseorder') {
            var element1 = document.querySelector('[id*="trackingNrPo"]');
            if (element1) {
                console.log('PO textbox found'); // Debugging message
                element1.scrollIntoView();
                element1.focus();
                element1.select();
                console.log('PO texbox focused'); // Debugging message
                } else {
                    console.log('PO textbox not found'); // Debugging message
                }
            } else if (input === 'location') {
                var element2 = document.querySelector('[id*="scanLocation"]');
            if (element2) {
                console.log('Location textbox found'); // Debugging message
                element2.scrollIntoView();
                element2.focus();
                element2.select();
                console.log('Location texbox focused'); // Debugging message
                } else {
                    console.log('Location textbox not found'); // Debugging message
                }
            }else if (input === 'redownload') {
                console.log('Starting redownload'); // Debugging message
                // Trigger the download
                const downloadUrl = `${downloadBaseUrl}${drItemIdValue}`;
                const filename = `Redownloaded_UID_CSV_${drItemIdValue}.csv`; // Customize the filename as needed
                console.log('URL created'); // Debugging message
                triggerDownload(downloadUrl, filename, drItemIdValue);
            } else {
                console.log('No matching input found'); // Debugging message
        }
    }
    // Function to handle API response
    function handleResponse(data) {
        try {
            const jsonResponse = JSON.parse(data);
            if (jsonResponse && checkForField in jsonResponse) {
                drItemIdValue = jsonResponse[checkForField];
                console.log('Captured specific POST response:');
                console.log(data);
                console.log('Parsed JSON response:', jsonResponse);
                console.log(`Value of ${checkForField}:`, drItemIdValue);
            }
        } catch (e) {
            console.log('Response is not JSON:', e);
        }
    }
    // Function to trigger the download using GM_download
    function triggerDownload(url, filename, itemID) {
        console.log('Attempting download');
        if (itemID !== null){
            console.log(`Triggering download for URL: ${url} with filename: ${filename}`);
            GM_download({
                url: url,
                name: filename, // Specify the name of the downloaded file
                onerror: function(err) {
                    console.error('Download failed:', err);
                }
            });
            console.log('Download complete');
            drItemIdValue = null;
        } else{
            console.log('Label already re-downloaded once')
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
    // Intercept XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        this.addEventListener('load', function() {
            if (method.toUpperCase() === 'POST') {
                handleResponse(this.responseText);
            }
        });
        originalOpen.apply(this, arguments);
    };
})();
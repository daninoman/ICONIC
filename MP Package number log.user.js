// ==UserScript==
// @name         MP Package 
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Detects package numbers and logs them + packer email to Google Sheets
// @match        https://oms-live-au.zalora.net/bulk-express-checkout*
// @grant        GM_xmlhttpRequest
// @connect      script.google.com
// @connect      script.googleusercontent.com
// ==/UserScript==

(function() {
    'use strict';

    // ================= CONFIGURATION =================
    // 1. Paste your Google Apps Script Web App URL here:
    const GOOGLE_SCRIPT_URL = "https://script.google.com/a/macros/theiconic.com.au/s/AKfycbyj3J7OroZhC-OYNJfG4HN138Viyw7hrOkseiKGox1UI4y-uyIYsMmKjSWPVmP0UDkUow/exec";

    // 2. Specify the target tab name in your Google Sheet:
    const TARGET_SHEET_TAB = "MPS1";
    // =================================================

    // Tracks package numbers logged during this session to prevent duplicate calls
    const loggedPackages = new Set();

    // 1. Helper to extract User Email from top banner
    function getUserEmail() {
        // Look for the "User Email: email@domain.com" text
        const emailMatch = document.body.innerText.match(/User\s*Email:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        return emailMatch ? emailMatch[1].trim() : "Unknown Email";
    }

    // 2. Send data to Google Apps Script
    function logToGoogleSheet(packageNumber, userEmail) {
        console.log(`[Logger] Sending Package: ${packageNumber} | User: ${userEmail}`);

        GM_xmlhttpRequest({
            method: "POST",
            url: GOOGLE_SCRIPT_URL,
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            data: JSON.stringify({
                packageNumber: packageNumber,
                userEmail: userEmail,
                sheetName: TARGET_SHEET_TAB
            }),
            onload: function(response) {
                console.log("[Logger] Success:", response.responseText);
                showNotification(`Logged: ${packageNumber}`);
            },
            onerror: function(err) {
                console.error("[Logger] Failed to log:", err);
            }
        });
    }

    // 3. Scan DOM for package numbers matching: RS + digits + "-" + digits
    // Example: RS26469842074-69530
    const PACKAGE_REGEX = /\b(RS\d+-\d+)\b/g;

    function checkForPackageNumbers() {
        const pageText = document.body.innerText;
        const matches = pageText.match(PACKAGE_REGEX);

        if (matches) {
            matches.forEach(pkg => {
                if (!loggedPackages.has(pkg)) {
                    loggedPackages.add(pkg);
                    const email = getUserEmail();
                    logToGoogleSheet(pkg, email);
                }
            });
        }
    }

    // 4. Subtle UI notification on screen
    function showNotification(message) {
        let toast = document.getElementById("pkg-logger-toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "pkg-logger-toast";
            toast.style.position = "fixed";
            toast.style.bottom = "20px";
            toast.style.right = "20px";
            toast.style.backgroundColor = "#28a745";
            toast.style.color = "#fff";
            toast.style.padding = "10px 18px";
            toast.style.borderRadius = "6px";
            toast.style.fontSize = "14px";
            toast.style.fontWeight = "bold";
            toast.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
            toast.style.zIndex = "999999";
            toast.style.transition = "opacity 0.3s ease";
            document.body.appendChild(toast);
        }
        toast.innerText = `✅ ${message}`;
        toast.style.opacity = "1";
        setTimeout(() => {
            toast.style.opacity = "0";
        }, 3000);
    }

    // 5. Observe DOM for updates (catches dynamically loaded content/step changes)
    const observer = new MutationObserver(() => {
        checkForPackageNumbers();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });

    // Initial check on load
    checkForPackageNumbers();
})();

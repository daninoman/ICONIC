// ==UserScript==
// @name         MP Package Number Logger
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Logs package numbers and packer email to Google Sheets
// @author       Surbhi Saini
// @match        https://oms-live-au.zalora.net/bulk-express-checkout*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @updateURL    
// @downloadURL 
// @connect      script.google.com
// @connect      script.googleusercontent.com
// ==/UserScript==

(function () {
  "use strict";

  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/a/macros/theiconic.com.au/s/AKfycbyj3J7OroZhC-OYNJfG4HN138Viyw7hrOkseiKGox1UI4y-uyIYsMmKjSWPVmP0UDkUow/exec";

  // Change this for each computer: MPS1, MPS2, ... MPS8
  const TARGET_SHEET_TAB = "MPS1";

  const PACKAGE_REGEX = /\bRS\d+-\d+\b/g;
  const loggedPackages = new Set();
  const pendingPackages = new Set();

  function getUserEmail() {
    const pageText = document.body ? document.body.innerText : "";
    const match = pageText.match(
      /User\s*Email:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
    );

    return match ? match[1].trim() : "";
  }

  function showNotification(message, isError) {
    let toast = document.getElementById("pkg-logger-toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "pkg-logger-toast";
      Object.assign(toast.style, {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        padding: "10px 18px",
        borderRadius: "6px",
        color: "#fff",
        fontSize: "14px",
        fontWeight: "bold",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        zIndex: "999999",
        transition: "opacity 0.3s ease"
      });
      document.body.appendChild(toast);
    }

    toast.style.backgroundColor = isError ? "#c62828" : "#218838";
    toast.innerText = message;
    toast.style.opacity = "1";

    clearTimeout(toast.hideTimer);
    toast.hideTimer = setTimeout(() => {
      toast.style.opacity = "0";
    }, 4000);
  }

  function logToGoogleSheet(packageNumber, userEmail) {
    console.log(
      `[Logger] Sending package: ${packageNumber}; email: ${userEmail || "(not found)"}; tab: ${TARGET_SHEET_TAB}`
    );

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

      onload: function (response) {
        console.log("[Logger] HTTP status:", response.status);
        console.log("[Logger] Response:", response.responseText);

        try {
          const result = JSON.parse(response.responseText);

          if (
            response.status >= 200 &&
            response.status < 300 &&
            result.status === "success"
          ) {
            loggedPackages.add(packageNumber);
            console.log(
              `[Logger] Saved ${packageNumber} to tab ${result.tab}.`
            );
            showNotification(`Logged: ${packageNumber}`, false);
          } else {
            console.error(
              "[Logger] Apps Script returned an error:",
              result.error || result
            );
            showNotification(`Could not log: ${packageNumber}`, true);
          }
        } catch (error) {
          console.error(
            "[Logger] Could not read the response as JSON:",
            response.responseText,
            error
          );
          showNotification("Could not read the logger response", true);
        }

        pendingPackages.delete(packageNumber);
      },

      onerror: function (error) {
        console.error("[Logger] Request failed:", error);
        pendingPackages.delete(packageNumber);
        showNotification(`Request failed: ${packageNumber}`, true);
      },

      ontimeout: function () {
        console.error("[Logger] Request timed out.");
        pendingPackages.delete(packageNumber);
        showNotification("Logger request timed out", true);
      },

      timeout: 30000
    });
  }

  function checkForPackageNumbers() {
    if (!document.body) return;

    const pageText = document.body.innerText || "";
    const matches = pageText.match(PACKAGE_REGEX);

    if (!matches) return;

    const userEmail = getUserEmail();

    for (const packageNumber of matches) {
      if (
        !loggedPackages.has(packageNumber) &&
        !pendingPackages.has(packageNumber)
      ) {
        pendingPackages.add(packageNumber);
        logToGoogleSheet(packageNumber, userEmail);
      }
    }
  }

  let scanTimer;

  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(checkForPackageNumbers, 300);
  }

  const observer = new MutationObserver(scheduleScan);

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  checkForPackageNumbers();
})();

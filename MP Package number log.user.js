// ==/UserScript==
// ==UserScript==
// @name         MP Package Number Logger
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Logs package numbers and the visible OWMS user email to Google Sheets
// @author       Surbhi Saini
// @match        https://oms-live-au.zalora.net/bulk-express-checkout*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @updateURL    	https://github.com/daninoman/ICONIC/raw/refs/heads/main/MP%20Package%20number%20log.user.js
// @downloadURL    	https://github.com/daninoman/ICONIC/raw/refs/heads/main/MP%20Package%20number%20log.user.js
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

  function getPackerEmail() {
    const pageText = document.body ? document.body.innerText : "";

    // Reads the email shown after "User Email:" on the OWMS page.
    const match = pageText.match(
      /User\s*Email:\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i
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

  function logToGoogleSheet(packageNumber, packerEmail) {
    console.log(
      `[Logger] Sending package: ${packageNumber}; packer: ${packerEmail}; tab: ${TARGET_SHEET_TAB}`
    );

    GM_xmlhttpRequest({
      method: "POST",
      url: GOOGLE_SCRIPT_URL,
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      data: JSON.stringify({
        packageNumber: packageNumber,
        userEmail: packerEmail,
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
              `[Logger] Saved ${packageNumber} with packer ${result.packer} to tab ${result.tab}.`
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

    const packerEmail = getPackerEmail();

    // Wait until OWMS displays the user's email rather than writing a blank value.
    // A later page update will trigger another scan.
    if (!packerEmail) {
      console.warn("[Logger] OWMS user email not found yet. Will check again.");
      return;
    }

    for (const packageNumber of matches) {
      if (
        !loggedPackages.has(packageNumber) &&
        !pendingPackages.has(packageNumber)
      ) {
        pendingPackages.add(packageNumber);
        logToGoogleSheet(packageNumber, packerEmail);
      }
    }
  }

  let scanTimer;

  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(checkForPackageNumbers, 300);
  }

  if (document.body) {
    const observer = new MutationObserver(scheduleScan);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  checkForPackageNumbers();
})();

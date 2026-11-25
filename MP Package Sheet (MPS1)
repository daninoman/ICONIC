// ==UserScript==
// @name         MP Package Number Logger
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Logs entry date, package number, and OWMS user email to Google Sheets
// @author       Surbhi Saini
// @match        https://oms-live-au.zalora.net/bulk-express-checkout*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @connect      script.google.com
// @connect      script.googleusercontent.com
// ==/UserScript==

(function () {
  "use strict";

  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/a/macros/theiconic.com.au/s/AKfycbzrFgy80euEKEOyJvPPYcLR5aWGeFwxpaTTS7PFurMXEEAZNQOuk0ztyRyJGh0_o2AG/exec";

  // This computer writes to the existing MPS1 tab.
  const TARGET_SHEET_TAB = "MPS1";

  const loggedPackages = new Set();
  const pendingPackages = new Set();

  function normalizeHeader(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function getPackerEmail() {
    const pageText = document.body ? document.body.innerText : "";
    const match = pageText.match(
      /User\s*Email:\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i
    );

    return match ? match[1].trim() : "";
  }

  function findPackageNumbers() {
    const tables = Array.from(document.querySelectorAll("table"));

    for (const table of tables) {
      const rows = Array.from(table.rows);

      for (let headerRowIndex = 0; headerRowIndex < rows.length; headerRowIndex++) {
        const headerCells = Array.from(rows[headerRowIndex].cells);
        const headers = headerCells.map(cell =>
          normalizeHeader(cell.innerText)
        );

        const packageColumnIndex = headers.findIndex(header =>
          header.includes("package number")
        );

        if (packageColumnIndex === -1) {
          continue;
        }

        const packageNumbers = [];

        for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex++) {
          const cells = Array.from(rows[rowIndex].cells);
          const packageNumber = cells[packageColumnIndex]
            ? cells[packageColumnIndex].innerText.trim()
            : "";

          if (packageNumber) {
            packageNumbers.push(packageNumber);
          }
        }

        return packageNumbers;
      }
    }

    return [];
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

  function sendPackageToGoogleSheet(packageNumber, packerEmail) {
    console.log("[Logger] Sending to MPS1:", {
      packageNumber: packageNumber,
      packerEmail: packerEmail
    });

    GM_xmlhttpRequest({
      method: "POST",
      url: GOOGLE_SCRIPT_URL,
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      data: JSON.stringify({
        sheetName: TARGET_SHEET_TAB,
        packageNumber: packageNumber,
        userEmail: packerEmail
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
            console.log(`[Logger] Logged ${packageNumber} to ${result.tab}.`);
            showNotification(`Logged: ${packageNumber}`, false);
          } else {
            console.error("[Logger] Apps Script error:", result.error || result);
            showNotification(`Could not log: ${packageNumber}`, true);
          }
        } catch (error) {
          console.error(
            "[Logger] Could not read the response:",
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

    const packageNumbers = findPackageNumbers();
    if (packageNumbers.length === 0) return;

    const packerEmail = getPackerEmail();

    if (!packerEmail) {
      console.warn("[Logger] Could not find the User Email at the top of the page.");
      return;
    }

    for (const packageNumber of packageNumbers) {
      if (
        loggedPackages.has(packageNumber) ||
        pendingPackages.has(packageNumber)
      ) {
        continue;
      }

      pendingPackages.add(packageNumber);
      sendPackageToGoogleSheet(packageNumber, packerEmail);
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

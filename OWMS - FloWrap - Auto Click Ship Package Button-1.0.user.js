// ==UserScript==
// @name         Auto Click Ship Package Button
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Auto-click the "Update and ship package" button once it appears and is enabled
// @author       Dani Noman
// @match        https://oms-live-au.zalora.net/express-checkout/dynamic*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function tryClick() {
        const btn = document.querySelector('#shipPackage');

        if (btn && !btn.disabled && btn.offsetParent !== null) {
            console.log("✅ Ship Package button found and enabled, clicking...");
            btn.click();
            observer.disconnect();
            clearInterval(clickInterval); // stop retrying
        }
    }

    // Watch for the button to appear in DOM
    const observer = new MutationObserver(tryClick);
    observer.observe(document.body, { childList: true, subtree: true });

    // Also run periodically in case observer misses it or it loads too fast
    const clickInterval = setInterval(tryClick, 300);

    // Run once on page load too
    tryClick();
})();


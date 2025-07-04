// ==UserScript==
// @name         Custom Dropdown with Colored Return Reasons And Input
// @namespace    http://tampermonkey.net/
// @version      1.7.1
// @description  Scrolls the nearest scrollable container to hide the dropdown and show only options. Fills note input and simulates Enter.
// @match        *://*/*
// @grant        none
// @updateURL   https://raw.githubusercontent.com/daninoman/ICONIC/main/Custom%20Dropdown%20with%20Colored%20Return%20Reasons%20And%20Input-1.7%20(1).user.js
// @downloadURL https://raw.githubusercontent.com/daninoman/ICONIC/main/Custom%20Dropdown%20with%20Colored%20Return%20Reasons%20And%20Input-1.7%20(1).user.js
// ==/UserScript==

(function () {
    'use strict';

    // Helper: Find nearest scrollable parent
    function getScrollableParent(element) {
        let parent = element.parentElement;
        while (parent) {
            const style = getComputedStyle(parent);
            const overflowY = style.overflowY;
            const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight;
            if (isScrollable) return parent;
            parent = parent.parentElement;
        }
        return window; // fallback to window
    }

    const observer = new MutationObserver(() => {
        const targetDiv = document.querySelector(
            'div.flex.max-w-full.flex-col.px-5.pt-4.text-center.text-base.leading-6.text-gray-600'
        );

        if (targetDiv && !document.getElementById('custom-dropdown-wrapper')) {
            // Inject styles
            const style = document.createElement('style');
            style.textContent = `
                #custom-dropdown-wrapper {
                    position: relative;
                    width: 500px;
                    margin: 10px auto;
                    font-family: sans-serif;
                }

                .custom-dropdown {
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    padding: 8px 10px;
                    background: white;
                    cursor: pointer;
                    font-size: 14px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    font-weight: bold;
                }

                .custom-dropdown-options {
                    display: none;
                    position: absolute;
                    top: 100%;
                    margin-top: 4px;
                    width: 100%;
                    border: 1px solid #ccc;
                    border-top: none;
                    background: white;
                    z-index: 999;
                    max-height: 200px;
                    overflow-y: auto;
                }

                .custom-dropdown-option {
                    padding: 8px 10px;
                    cursor: pointer;
                    font-size: 14px;
                    white-space: normal;
                    font-weight: bold;
                }

                .custom-dropdown-option:hover {
                    background: #f0f0f0;
                }

                .green-option { color: green; }
                .blue-option { color: blue; }
                .orange-option { color: red; }
                .yellow-option { color: goldenrod; }
                .red-option { color: red; }
                .pink-option { color: deeppink; }
                .black-option { color: black; }
            `;
            document.head.appendChild(style);

            // Create wrapper
            const wrapper = document.createElement('div');
            wrapper.id = 'custom-dropdown-wrapper';

            // Create visible dropdown
            const dropdown = document.createElement('div');
            dropdown.className = 'custom-dropdown';
            dropdown.textContent = 'Select an option';

            // Create options container
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'custom-dropdown-options';

            // Helper to add options
            const createOption = (text, colorClass) => {
                const opt = document.createElement('div');
                opt.className = `custom-dropdown-option ${colorClass}`;
                opt.textContent = text;
                opt.addEventListener('click', () => {
                    dropdown.textContent = text;
                    optionsContainer.style.display = 'none';

                    const noteInput = document.getElementById('noteInput');
                    if (noteInput) {
                        noteInput.value = text;

                        // Trigger input event
                        const inputEvent = new Event('input', { bubbles: true });
                        noteInput.dispatchEvent(inputEvent);

                        // Simulate Enter key
                        const enterEvent = new KeyboardEvent('keydown', {
                            bubbles: true,
                            cancelable: true,
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13
                        });
                        noteInput.dispatchEvent(enterEvent);
                    }
                });
                return opt;
            };

            const options = [
                ['CANNOT FIND ITEM/ORDER IN OWMS', 'green-option'],
                ['SKU ON ITEM DOES NOT MATCH SKU IN OWMS', 'blue-option'],
                ['WAREHOUSE: RETURN REASON FAULTY', 'orange-option'],
                ['MARKETPLACE: RETURN REASON FAULTY', 'yellow-option'],
                ['NWIO INCORRECT ITEM, NOT INITIATED FOR RETURN', 'red-option'],
                ['CS: REJECTED RETURN: FAILED QC PAST RETURN DATE', 'pink-option'],
                ['BEAUTY ITEM', 'black-option'],
            ];

            options.forEach(([text, color]) => {
                const option = createOption(text, color);
                optionsContainer.appendChild(option);
            });

            // Toggle dropdown and scroll the scrollable parent
            dropdown.addEventListener('click', () => {
                const isVisible = optionsContainer.style.display === 'block';
                optionsContainer.style.display = isVisible ? 'none' : 'block';

                if (!isVisible) {
                    requestAnimationFrame(() => {
                        const rect = wrapper.getBoundingClientRect();
                        const scrollable = getScrollableParent(wrapper);

                        if (scrollable === window) {
                            const scrollY = window.scrollY || document.documentElement.scrollTop;
                            const scrollAmount = rect.top + scrollY + rect.height + 10;
                            window.scrollTo({ top: scrollAmount, behavior: 'auto' });
                        } else {
                            const offsetTop = wrapper.offsetTop;
                            scrollable.scrollTop = offsetTop + wrapper.offsetHeight + 10;
                        }
                    });
                }
            });

            // Close dropdown on outside click
            document.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) {
                    optionsContainer.style.display = 'none';
                }
            });

            // Assemble and attach
            wrapper.appendChild(dropdown);
            wrapper.appendChild(optionsContainer);
            targetDiv.insertBefore(wrapper, targetDiv.firstChild);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();

// ==UserScript==
// @name         OWMS - Express Returns - Custom Notes Dropdown Menu
// @namespace    http://tampermonkey.net/
// @version      1.1.4
// @author       Dani Noman
// @description  Creates a custom dropdown menu within the Notes section on the Express Returns Page
// @match        *://*/*
// @updateURL    https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Express%20Returns%20-%20Custom%20Notes%20Dropdown%20Menu-1.0.user.js
// @downloadURL  https://raw.githubusercontent.com/daninoman/ICONIC/main/OWMS%20-%20Express%20Returns%20-%20Custom%20Notes%20Dropdown%20Menu-1.0.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function getScrollableParent(element) {
        let parent = element.parentElement;
        while (parent) {
            const style = getComputedStyle(parent);
            const overflowY = style.overflowY;
            const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') &&
                                 parent.scrollHeight > parent.clientHeight;
            if (isScrollable) return parent;
            parent = parent.parentElement;
        }
        return window;
    }

    function setInputValueProperly(input, value) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
        )?.set;
        if (nativeSetter) {
            nativeSetter.call(input, value);
        } else {
            input.value = value;
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function injectDropdown(targetDiv) {
        if (!targetDiv || targetDiv.querySelector('#custom-dropdown-wrapper')) return;

        // insert styles
        const style = document.createElement('style');
        style.textContent = `
            #custom-dropdown-wrapper {
                position: relative;
                width: 500px;
                margin: 10px auto;
                font-family: sans-serif;
            }
            .custom-dropdown, .secondary-dropdown {
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
                margin-top: 5px;
            }
            .custom-dropdown-options, .secondary-dropdown-options {
                display: none;
                position: absolute;
                top: 100%;
                margin-top: 4px;
                width: 100%;
                border: 1px solid #ccc;
                border-top: none;
                background: white;
                max-height: 200px;
                overflow-y: auto;
                z-index: 9999;
            }
            .custom-dropdown-option, .secondary-dropdown-option {
                padding: 8px 10px;
                cursor: pointer;
                font-size: 14px;
                white-space: normal;
                font-weight: bold;
                color: black;
            }
            .custom-dropdown-option:hover,
            .secondary-dropdown-option:hover {
                background: #f0f0f0;
            }
            .green-option { color: green; }
            .blue-option {
                color: aqua;
                background-color: black;
                padding: 2px 4px;
                border-radius: 3px;
                display: inline-block;
            }
            .orange-option { color: darkorange; }
            .yellow-option {
                color: yellow;
                background-color: black;
                padding: 2px 4px;
                border-radius: 3px;
                display: inline-block;
            }
            .red-option { color: red; }
            .pink-option { color: deeppink; }
            .black-option { color: black; }
        `;
        document.head.appendChild(style);

        const wrapper = document.createElement('div');
        wrapper.id = 'custom-dropdown-wrapper';

        const dropdown = document.createElement('div');
        dropdown.className = 'custom-dropdown';
        dropdown.textContent = 'Select an option';

        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-dropdown-options';

        const secondaryWrapper = document.createElement('div');
        secondaryWrapper.id = 'secondary-dropdown-wrapper';
        secondaryWrapper.style.display = 'none';

        const secondaryDropdown = document.createElement('div');
        secondaryDropdown.className = 'secondary-dropdown';
        secondaryDropdown.textContent = 'Select a sub-option';

        const secondaryOptionsContainer = document.createElement('div');
        secondaryOptionsContainer.className = 'secondary-dropdown-options';

        const subOptionsMap = {
            'RI: FURTHER INVESTIGATION': [
                'Item is in a shipped status',
                'Item is in a delierved status',
                'Customer sent back incorrect item',
            ],
            'RI: REJECTED RETURN': [
                'Makeup stain',
                'No tag',
                'Perfume smell',
                'Odour',
                'Pet hair',
                'Heavily crinkled',
                'Crease marks',
                'Worn/dirty',
                'Hygiene seal',
                'Ripped',
                'Broken',
                'Damaged/missing branded packaging',
                'Crooked frame',
                'Washed/wet',
                'Late return',
            ],
            'SKU ISSUE': [
                'Marketplace',
                'Warehouse',
            ]
        };

        function updateSecondaryOptions(mainOption) {
            secondaryOptionsContainer.innerHTML = '';
            const subOptions = subOptionsMap[mainOption] || [];
            subOptions.forEach(subOption => {
                const sub = document.createElement('div');
                sub.className = 'secondary-dropdown-option';
                sub.textContent = subOption;
                sub.addEventListener('click', () => {
                    secondaryDropdown.textContent = subOption;
                    secondaryOptionsContainer.style.display = 'none';
                    const noteInput = document.getElementById('noteInput');
                    if (noteInput) {
                        setInputValueProperly(
                            noteInput,
                            `${dropdown.textContent} - ${subOption}`
                        );
                    }
                });
                secondaryOptionsContainer.appendChild(sub);
            });
        }

        secondaryDropdown.addEventListener('click', () => {
            const isVisible = secondaryOptionsContainer.style.display === 'block';
            secondaryOptionsContainer.style.display = isVisible ? 'none' : 'block';
            if (optionsContainer.style.display === 'block') {
                optionsContainer.style.display = 'none';
            }
            if (!isVisible && dropdown.textContent === 'CS: REJECTED RETURN') {
                requestAnimationFrame(() => {
                    const rect = secondaryWrapper.getBoundingClientRect();
                    const scrollable = getScrollableParent(secondaryWrapper);
                    if (scrollable === window) {
                        const scrollY = window.scrollY || document.documentElement.scrollTop;
                        window.scrollTo({
                            top: rect.top + scrollY + rect.height + 10,
                            behavior: 'auto'
                        });
                    } else {
                        scrollable.scrollTop =
                            secondaryWrapper.offsetTop +
                            secondaryWrapper.offsetHeight +
                            10;
                    }
                });
            }
        });

        secondaryWrapper.appendChild(secondaryDropdown);
        secondaryWrapper.appendChild(secondaryOptionsContainer);

        function createOption(text, colorClass) {
            const opt = document.createElement('div');
            opt.className = `custom-dropdown-option ${colorClass}`;
            opt.textContent = text;
            opt.addEventListener('click', () => {
                dropdown.textContent = text;
                optionsContainer.style.display = 'none';
                const noteInput = document.getElementById('noteInput');
                if (noteInput) setInputValueProperly(noteInput, text);
                if (subOptionsMap[text]) {
                    secondaryWrapper.style.display = 'block';
                    secondaryDropdown.textContent = 'Select a sub-option';
                    updateSecondaryOptions(text);
                } else {
                    secondaryWrapper.style.display = 'none';
                    secondaryOptionsContainer.style.display = 'none';
                }
            });
            return opt;
        }

        const options = [
            ['CANNOT FIND ITEM/ORDER IN OWMS', 'green-option'],
            ['SKU ISSUE', 'blue-option'],
            ['WAREHOUSE: RETURN REASON FAULTY', 'orange-option'],
            ['MARKETPLACE: RETURN REASON FAULTY', 'yellow-option'],
            ['RI: FURTHER INVESTIGATION', 'red-option'],
            ['RI: REJECTED RETURN', 'pink-option'],
            ['ADMIN: REJECTED RETURN (-$50)', 'black-option'],
        ];

        options.forEach(([text, color]) => {
            optionsContainer.appendChild(createOption(text, color));
        });

        dropdown.addEventListener('click', () => {
            const isVisible = optionsContainer.style.display === 'block';
            optionsContainer.style.display = isVisible ? 'none' : 'block';
            if (secondaryOptionsContainer.style.display === 'block') {
                secondaryOptionsContainer.style.display = 'none';
            }
            if (!isVisible) {
                requestAnimationFrame(() => {
                    const rect = wrapper.getBoundingClientRect();
                    const scrollable = getScrollableParent(wrapper);
                    if (scrollable === window) {
                        const scrollY = window.scrollY || document.documentElement.scrollTop;
                        window.scrollTo({
                            top: rect.top + scrollY + rect.height + 10,
                            behavior: 'auto'
                        });
                    } else {
                        scrollable.scrollTop =
                            wrapper.offsetTop +
                            wrapper.offsetHeight +
                            10;
                    }
                });
            }
        });

        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                optionsContainer.style.display = 'none';
                secondaryOptionsContainer.style.display = 'none';
            }
        });

        wrapper.appendChild(dropdown);
        wrapper.appendChild(optionsContainer);
        wrapper.appendChild(secondaryWrapper);
        targetDiv.insertBefore(wrapper, targetDiv.firstChild);
    }

    const observer = new MutationObserver(() => {
        // original container
        const orig = document.querySelector(
            'div.flex.max-w-full.flex-col.px-5.pt-4.text-center.text-base.leading-6.text-gray-600'
        );
        if (orig) injectDropdown(orig);

        // Item Notes modal/container
        const itemNotes = document.querySelector(
            'div.flex.w-\\[690px\\].flex-col.justify-center.rounded-lg.bg-white.px-8.py-6.shadow-sm'
        );
        if (itemNotes) injectDropdown(itemNotes);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Force send icon to stay blue and override hover behavior
const forceBlueSendButtonIcon = () => {
    const blueSrc = '/_next/static/media/send-message-blue.49bc7206.svg';
    const sendButtons = document.querySelectorAll('img[alt="Send message"]');

    sendButtons.forEach((btn) => {
        if (btn.src !== location.origin + blueSrc) {
            btn.src = blueSrc;
        }

        // Lock the style so it doesn't change on hover
        btn.style.setProperty('content', `url(${blueSrc})`, 'important');
        btn.style.setProperty('color', 'transparent', 'important');
    });
};

// Observe for dynamic elements
const iconObserver = new MutationObserver(forceBlueSendButtonIcon);
iconObserver.observe(document.body, { childList: true, subtree: true });

// Run on load
forceBlueSendButtonIcon();

// Optional: Add CSS rule to block hover icon switch
const css = document.createElement('style');
css.textContent = `
    img[alt="Send message"] {
        content: url('/_next/static/media/send-message-blue.49bc7206.svg') !important;
    }
    img[alt="Send message"]:hover {
        content: url('/_next/static/media/send-message-blue.49bc7206.svg') !important;
    }
`;
document.head.appendChild(css);
})();

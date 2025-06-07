/**
 * SubX - A modern, web-based subtitle editor.
 * @author GeekNeuron
 * @version 1.2.0 (Core Editing Features)
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const themeSwitcher = document.getElementById('theme-switcher');
    const langSwitcher = document.getElementById('lang-switcher');
    const body = document.body;
    const html = document.documentElement;
    const subtitleBody = document.getElementById('subtitle-lines-body');

    // Toolbar Buttons
    const btnNewLine = document.getElementById('btn-new-line');
    const btnDeleteLines = document.getElementById('btn-delete-lines');
    const btnMergeLines = document.getElementById('btn-merge-lines');
    const selectAllCheckbox = document.getElementById('select-all-checkbox');

    // --- Translations Dictionary ---
    const translations = {
        en: {
            appTitle: "SubX | Subtitle Editor",
            themeSwitcherTitle: "Click to toggle theme",
            newLine: "New",
            deleteLines: "Delete",
            mergeLines: "Merge",
            colNumber: "#",
            colStart: "Start Time",
            colEnd: "End Time",
            colDuration: "Duration",
            colText: "Text",
            deleteConfirm: (count) => `Are you sure you want to delete ${count} line(s)?`
        },
        fa: {
            appTitle: "SubX | ویرایشگر زیرنویس",
            themeSwitcherTitle: "برای تغییر تم کلیک کنید",
            newLine: "جدید",
            deleteLines: "حذف",
            mergeLines: "ادغام",
            colNumber: "#",
            colStart: "زمان شروع",
            colEnd: "زمان پایان",
            colDuration: "مدت زمان",
            colText: "متن",
            deleteConfirm: (count) => `آیا از حذف ${count} خط اطمینان دارید؟`
        }
    };

    // --- Application State ---
    let subtitleData = [
        { id: 1, startTime: '00:00:01,234', endTime: '00:00:03,456', text: 'This is the first subtitle line.' },
        { id: 2, startTime: '00:00:04,000', endTime: '00:00:06,789', text: 'And this is the second one.\nIt can have multiple lines.' }
    ];
    let currentTheme = localStorage.getItem('theme') || 'light-theme';
    let currentLang = localStorage.getItem('language') || 'en';

    // --- Core Functions ---

    /**
     * Renders the entire subtitle data into the HTML table.
     */
    const render = () => {
        subtitleBody.innerHTML = ''; // Clear existing table
        subtitleData.forEach(line => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', line.id);
            
            // Auto-adjust textarea height
            const textRowCount = (line.text.match(/\n/g) || []).length + 1;

            row.innerHTML = `
                <td class="col-select"><input type="checkbox" class="line-checkbox"></td>
                <td class="col-number">${line.id}</td>
                <td class="col-start"><input type="text" class="time-input" value="${line.startTime}"></td>
                <td class="col-end"><input type="text" class="time-input" value="${line.endTime}"></td>
                <td class="col-duration">00:00:00,000</td>
                <td class="col-text"><textarea class="text-input" rows="${textRowCount}">${line.text}</textarea></td>
            `;
            subtitleBody.appendChild(row);
        });
        updateToolbarButtons();
        selectAllCheckbox.checked = false;
    };

    /**
     * Re-numbers all subtitle IDs after add/delete operations.
     */
    const renumberIds = () => {
        subtitleData.forEach((line, index) => {
            line.id = index + 1;
        });
    };

    /**
     * Gets an array of selected line IDs.
     * @returns {number[]} Array of selected subtitle IDs.
     */
    const getSelectedLineIds = () => {
        const selectedIds = [];
        document.querySelectorAll('.line-checkbox:checked').forEach(checkbox => {
            const row = checkbox.closest('tr');
            if (row) {
                selectedIds.push(parseInt(row.getAttribute('data-id')));
            }
        });
        return selectedIds;
    };
    
    /**
     * Enables or disables toolbar buttons based on selection.
     */
    const updateToolbarButtons = () => {
        const selectedIds = getSelectedLineIds();
        btnDeleteLines.disabled = selectedIds.length === 0;
        btnMergeLines.disabled = selectedIds.length < 2;
    };


    // --- Event Handlers ---

    const handleNewLine = () => {
        const newId = subtitleData.length > 0 ? Math.max(...subtitleData.map(l => l.id)) + 1 : 1;
        subtitleData.push({
            id: newId,
            startTime: '00:00:00,000',
            endTime: '00:00:00,000',
            text: ''
        });
        renumberIds();
        render();
    };

    const handleDeleteLines = () => {
        const idsToDelete = getSelectedLineIds();
        const confirmMessage = translations[currentLang].deleteConfirm(idsToDelete.length);
        if (idsToDelete.length === 0 || !confirm(confirmMessage)) {
            return;
        }
        subtitleData = subtitleData.filter(line => !idsToDelete.includes(line.id));
        renumberIds();
        render();
    };

    const handleMergeLines = () => {
        const idsToMerge = getSelectedLineIds().sort((a, b) => a - b);
        if (idsToMerge.length < 2) return;

        const linesToMerge = subtitleData.filter(line => idsToMerge.includes(line.id));
        
        const mergedText = linesToMerge.map(line => line.text).join(' ');
        const startTime = linesToMerge[0].startTime;
        const endTime = linesToMerge[linesToMerge.length - 1].endTime;
        
        const firstLineIndex = subtitleData.findIndex(line => line.id === idsToMerge[0]);
        
        // Remove old lines
        subtitleData = subtitleData.filter(line => !idsToMerge.includes(line.id));
        
        // Create and insert the new merged line at the correct position
        const mergedLine = { id: 0, startTime, endTime, text: mergedText }; // Temp ID
        subtitleData.splice(firstLineIndex, 0, mergedLine);

        renumberIds();
        render();
    };

    const handleTableInput = (event) => {
        if (!event.target.closest) return;
        const row = event.target.closest('tr');
        if (!row) return;

        const lineId = parseInt(row.getAttribute('data-id'));
        const line = subtitleData.find(l => l.id === lineId);
        if (!line) return;

        if (event.target.classList.contains('time-input')) {
            const isStartTime = event.target.parentElement.classList.contains('col-start');
            if (isStartTime) {
                line.startTime = event.target.value;
            } else {
                line.endTime = event.target.value;
            }
        }

        if (event.target.classList.contains('text-input')) {
            line.text = event.target.value;
            // Adjust textarea height dynamically
            const textarea = event.target;
            textarea.rows = (textarea.value.match(/\n/g) || []).length + 1;
        }
    };


    // --- Initialization and Global Event Listeners ---
    
    // Theme and Language (existing functions)
    const applyTheme = (theme) => { body.className = theme; localStorage.setItem('theme', theme); };
    const toggleTheme = () => { currentTheme = (body.classList.contains('light-theme')) ? 'dark-theme' : 'light-theme'; applyTheme(currentTheme); };
    const applyLanguage = (lang) => {
        html.lang = lang;
        html.dir = (lang === 'fa') ? 'rtl' : 'ltr';
        document.querySelectorAll('[data-key]').forEach(el => {
            const key = el.dataset.key;
            const translation = translations[lang][key];
            if (translation) {
                // For elements with children (like buttons with icons), update only the text node
                const textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
                if (textNode) {
                    textNode.textContent = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });
        if (themeSwitcher) themeSwitcher.title = translations[lang].themeSwitcherTitle || '';
        localStorage.setItem('language', lang);
    };
    const toggleLanguage = () => { currentLang = (html.lang === 'en') ? 'fa' : 'en'; applyLanguage(currentLang); };
    
    const initialize = () => {
        applyTheme(currentTheme);
        applyLanguage(currentLang);
        render(); // Initial render of the subtitle data
        console.log("SubX Core Editor Initialized! 🚀");
    };

    // Bind events
    themeSwitcher.addEventListener('click', toggleTheme);
    langSwitcher.addEventListener('click', toggleLanguage);
    btnNewLine.addEventListener('click', handleNewLine);
    btnDeleteLines.addEventListener('click', handleDeleteLines);
    btnMergeLines.addEventListener('click', handleMergeLines);

    // Event delegation for dynamic content
    subtitleBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('line-checkbox')) {
            updateToolbarButtons();
        }
    });
    subtitleBody.addEventListener('input', handleTableInput);
    
    selectAllCheckbox.addEventListener('change', (e) => {
        document.querySelectorAll('.line-checkbox').forEach(checkbox => checkbox.checked = e.target.checked);
        updateToolbarButtons();
    });

    // Start the application
    initialize();
});

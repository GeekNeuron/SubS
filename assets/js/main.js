/**
 * SubX - A modern, web-based subtitle editor.
 * @author GeekNeuron
 * @version 1.5.0 (UI and Core Logic Refactored)
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const appTitle = document.getElementById('app-title');
    const body = document.body;
    const html = document.documentElement;
    const subtitleBody = document.getElementById('subtitle-lines-body');

    // Toolbar Buttons
    const btnNewLine = document.getElementById('btn-new-line');
    const btnDeleteLines = document.getElementById('btn-delete-lines');
    const btnMergeLines = document.getElementById('btn-merge-lines');
    const btnToggleFind = document.getElementById('btn-toggle-find');
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const btnImport = document.getElementById('btn-import');
    const btnExport = document.getElementById('btn-export');
    const fileInput = document.getElementById('file-input');
    
    // Find & Replace Elements
    const findReplacePanel = document.getElementById('find-replace-panel');
    const findInput = document.getElementById('find-input');
    const replaceInput = document.getElementById('replace-input');
    const btnFindNext = document.getElementById('btn-find-next');
    const btnReplace = document.getElementById('btn-replace');
    const btnReplaceAll = document.getElementById('btn-replace-all');
    const btnCloseFindReplace = document.getElementById('btn-close-find-replace');
    const checkCaseSensitive = document.getElementById('check-case-sensitive');
    
    // --- Translations Dictionary ---
    const translations = {
        en: {
            appTitle: "SubX | Subtitle Editor",
            themeSwitcherTitle: "Click to toggle theme | Double-click to change language",
            newLine: "New",
            deleteLines: "Delete",
            mergeLines: "Merge",
            findReplace: "Find & Replace",
            importFile: "Import",
            exportFile: "Export",
            colNumber: "#",
            colStart: "Start Time",
            colEnd: "End Time",
            colDuration: "Duration",
            colText: "Text",
            deleteConfirm: (count) => `Are you sure you want to delete ${count} line(s)?`,
            findPlaceholder: "Find...",
            replacePlaceholder: "Replace with...",
            findNext: "Find Next",
            replace: "Replace",
            replaceAll: "Replace All",
            caseSensitive: "Case sensitive",
            replacedCount: (count) => `Replaced ${count} occurrence(s).`,
            notFound: "Text not found."
        },
        fa: {
            appTitle: "SubX | ویرایشگر زیرنویس",
            themeSwitcherTitle: "برای تغییر تم کلیک کنید | برای تغییر زبان دو بار کلیک کنید",
            newLine: "جدید",
            deleteLines: "حذف",
            mergeLines: "ادغام",
            findReplace: "جستجو و جایگزینی",
            importFile: "ایمپورت",
            exportFile: "خروجی",
            colNumber: "#",
            colStart: "زمان شروع",
            colEnd: "زمان پایان",
            colDuration: "مدت زمان",
            colText: "متن",
            deleteConfirm: (count) => `آیا از حذف ${count} خط اطمینان دارید؟`,
            findPlaceholder: "جستجو...",
            replacePlaceholder: "جایگزینی با...",
            findNext: "بعدی",
            replace: "جایگزینی",
            replaceAll: "جایگزینی همه",
            caseSensitive: "حساس به حروف",
            replacedCount: (count) => `${count} مورد جایگزین شد.`,
            notFound: "متن مورد نظر یافت نشد."
        }
    };

    // --- Application State ---
    let subtitleData = [];
    let currentTheme = localStorage.getItem('theme') || 'light-theme';
    let currentLang = localStorage.getItem('language') || 'en';
    let findState = {
        lastFoundLineId: -1,
        currentHighlightElement: null
    };

    // --- Core Functions ---

    // Function to parse SRT content from text
    const parseSrt = (srtContent) => {
        const blocks = srtContent.trim().replace(/\r/g, '').split('\n\n');
        const parsedData = blocks.map(block => {
            const parts = block.split('\n');
            if (parts.length >= 2) { // Allow blocks with only timestamp and text
                const id = parseInt(parts[0], 10);
                const timeMatch = parts[1].match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
                if (timeMatch) {
                    const startTime = timeMatch[1].replace('.', ',');
                    const endTime = timeMatch[2].replace('.', ',');
                    const text = parts.slice(2).join('\n');
                    return { id, startTime, endTime, text };
                }
            }
            return null;
        }).filter(line => line && !isNaN(line.id));
        return parsedData;
    };

    // Function to handle the file selection and reading process
    const handleFileLoad = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            subtitleData = parseSrt(content);
            renumberIds(); // Ensure IDs are sequential after import
            render();
            alert(`Successfully imported ${file.name}`);
        };
        reader.onerror = () => {
            alert('Error reading file!');
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    // Function to generate a string in SRT format from the current data
    const generateSrtContent = () => {
        return subtitleData.map(line => {
            return `${line.id}\n${line.startTime} --> ${line.endTime}\n${line.text}`;
        }).join('\n\n');
    };

    // Function to trigger the download of the generated SRT file
    const handleExport = () => {
        if (subtitleData.length === 0) {
            alert('Nothing to export!');
            return;
        }
        const srtContent = generateSrtContent();
        const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'subx_export.srt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // --- Find & Replace Logic ---
    const resetFindState = () => {
        findState.lastFoundLineId = -1;
        if (findState.currentHighlightElement) {
            findState.currentHighlightElement.classList.remove('highlight');
        }
        findState.currentHighlightElement = null;
    };

    const handleFindNext = () => {
        const query = findInput.value;
        if (!query) return;

        const isCaseSensitive = checkCaseSensitive.checked;
        
        let startIndex = subtitleData.findIndex(line => line.id === findState.lastFoundLineId);
        startIndex = (startIndex === -1) ? 0 : startIndex + 1;

        for (let i = 0; i < subtitleData.length; i++) {
            const lineIndex = (startIndex + i) % subtitleData.length;
            const line = subtitleData[lineIndex];
            const textToSearch = isCaseSensitive ? line.text : line.text.toLowerCase();
            const queryToSearch = isCaseSensitive ? query : query.toLowerCase();

            if (textToSearch.includes(queryToSearch)) {
                findState.lastFoundLineId = line.id;
                const rowElement = subtitleBody.querySelector(`tr[data-id="${line.id}"]`);
                if (rowElement) {
                    if (findState.currentHighlightElement) {
                        findState.currentHighlightElement.classList.remove('highlight');
                    }
                    const textArea = rowElement.querySelector('.text-input');
                    textArea.classList.add('highlight');
                    textArea.focus();
                    textArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    findState.currentHighlightElement = textArea;
                }
                return;
            }
        }

        alert(translations[currentLang].notFound);
        resetFindState();
    };
    
    const handleReplace = () => {
        if (!findState.currentHighlightElement || findState.lastFoundLineId === -1) {
            handleFindNext();
            return;
        }

        const line = subtitleData.find(l => l.id === findState.lastFoundLineId);
        if (line) {
            const query = findInput.value;
            const replacement = replaceInput.value;
            const isCaseSensitive = checkCaseSensitive.checked;
            const regex = new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), isCaseSensitive ? '' : 'i');
            
            line.text = line.text.replace(regex, replacement);
            
            const rowElement = subtitleBody.querySelector(`tr[data-id="${line.id}"]`);
            if (rowElement) {
                const textArea = rowElement.querySelector('.text-input');
                textArea.value = line.text;
            }
        }
        handleFindNext();
    };

    const handleReplaceAll = () => {
        const query = findInput.value;
        const replacement = replaceInput.value;
        if (!query) return;
        
        const isCaseSensitive = checkCaseSensitive.checked;
        const flags = isCaseSensitive ? 'g' : 'gi';
        const regex = new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), flags);
        
        let replacementCount = 0;
        subtitleData.forEach(line => {
            const matchCount = (line.text.match(regex) || []).length;
            if (matchCount > 0) {
                line.text = line.text.replace(regex, replacement);
                replacementCount += matchCount;
            }
        });

        if (replacementCount > 0) {
            alert(translations[currentLang].replacedCount(replacementCount));
            render();
        } else {
            alert(translations[currentLang].notFound);
        }
        resetFindState();
    };
    
    // --- Grid and UI Functions ---
    const render = () => {
        subtitleBody.innerHTML = '';
        subtitleData.forEach(line => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', line.id);
            const textRowCount = (line.text.match(/\n/g) || []).length + 1;
            row.innerHTML = `<td class="col-select"><input type="checkbox" class="line-checkbox"></td><td class="col-number">${line.id}</td><td class="col-start"><input type="text" class="time-input" value="${line.startTime}"></td><td class="col-end"><input type="text" class="time-input" value="${line.endTime}"></td><td class="col-duration">00:00:00,000</td><td class="col-text"><textarea class="text-input" rows="${textRowCount}">${line.text}</textarea></td>`;
            subtitleBody.appendChild(row);
        });
        updateToolbarButtons();
        selectAllCheckbox.checked = false;
        resetFindState();
    };

    const renumberIds = () => { subtitleData.forEach((line, index) => { line.id = index + 1; }); };
    const getSelectedLineIds = () => { return Array.from(document.querySelectorAll('.line-checkbox:checked')).map(cb => parseInt(cb.closest('tr').dataset.id)); };
    const updateToolbarButtons = () => { const ids = getSelectedLineIds(); btnDeleteLines.disabled = ids.length === 0; btnMergeLines.disabled = ids.length < 2; };
    const handleNewLine = () => { const newId = subtitleData.length > 0 ? Math.max(...subtitleData.map(l => l.id)) + 1 : 1; subtitleData.push({ id: newId, startTime: '00:00:00,000', endTime: '00:00:00,000', text: '' }); render(); };
    const handleDeleteLines = () => { const ids = getSelectedLineIds(); if (ids.length === 0 || !confirm(translations[currentLang].deleteConfirm(ids.length))) return; subtitleData = subtitleData.filter(l => !ids.includes(l.id)); renumberIds(); render(); };
    const handleMergeLines = () => { const ids = getSelectedLineIds().sort((a,b)=>a-b); if(ids.length < 2) return; const lines = ids.map(id => subtitleData.find(l => l.id === id)); const text = lines.map(l => l.text).join(' '); const start = lines[0].startTime; const end = lines[lines.length-1].endTime; const firstId = ids[0]; subtitleData = subtitleData.filter(l => !ids.includes(l.id)); subtitleData.push({id: firstId, startTime:start, endTime:end, text}); subtitleData.sort((a,b) => a.id - b.id); renumberIds(); render(); };
    const handleTableInput = (e) => { const row = e.target.closest('tr'); if(!row) return; const id = parseInt(row.dataset.id); const line = subtitleData.find(l => l.id === id); if(!line) return; if(e.target.classList.contains('time-input')){ if(e.target.parentElement.classList.contains('col-start')) line.startTime = e.target.value; else line.endTime = e.target.value; } if(e.target.classList.contains('text-input')){ line.text = e.target.value; e.target.rows = (e.target.value.match(/\n/g) || []).length + 1; }};
    const applyTheme = (theme) => { body.className = theme; localStorage.setItem('theme', theme); };
    const toggleTheme = () => { currentTheme = (body.classList.contains('light-theme')) ? 'dark-theme' : 'light-theme'; applyTheme(currentTheme); };
    const applyLanguage = (lang) => { html.lang = lang; html.dir = (lang === 'fa') ? 'rtl' : 'ltr'; document.querySelectorAll('[data-key]').forEach(el => { const key = el.dataset.key; const translation = translations[lang][key]; if(typeof translation === 'string') el.textContent = translation; }); document.querySelectorAll('[data-key-placeholder]').forEach(el => { const key = el.dataset.keyPlaceholder; const translation = translations[lang][key]; if(translation) el.placeholder = translation; }); if (appTitle) appTitle.title = translations[lang].themeSwitcherTitle || ''; localStorage.setItem('language', lang); };
    const toggleLanguage = () => { currentLang = (html.lang === 'en') ? 'fa' : 'en'; applyLanguage(currentLang); };

    // --- Initialization and Event Listeners ---
    const initialize = () => {
        applyTheme(currentTheme);
        applyLanguage(currentLang);
        render();
        console.log("SubX Initialized! 🚀");
    };

    // Bind events
    let clickTimer = null;
    appTitle.addEventListener('click', () => {
        clickTimer = setTimeout(() => {
            toggleTheme();
        }, 200);
    });
    appTitle.addEventListener('dblclick', () => {
        clearTimeout(clickTimer);
        toggleLanguage();
    });

    btnNewLine.addEventListener('click', handleNewLine);
    btnDeleteLines.addEventListener('click', handleDeleteLines);
    btnMergeLines.addEventListener('click', handleMergeLines);
    selectAllCheckbox.addEventListener('change', (e) => { document.querySelectorAll('.line-checkbox').forEach(cb => cb.checked = e.target.checked); updateToolbarButtons(); });
    subtitleBody.addEventListener('change', (e) => { if (e.target.classList.contains('line-checkbox')) updateToolbarButtons(); });
    subtitleBody.addEventListener('input', handleTableInput);
    
    // File I/O
    btnImport.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileLoad);
    btnExport.addEventListener('click', handleExport);

    // Find & Replace events
    btnToggleFind.addEventListener('click', () => findReplacePanel.classList.toggle('hidden'));
    btnCloseFindReplace.addEventListener('click', () => findReplacePanel.classList.add('hidden'));
    btnFindNext.addEventListener('click', handleFindNext);
    btnReplace.addEventListener('click', handleReplace);
    btnReplaceAll.addEventListener('click', handleReplaceAll);
    findInput.addEventListener('input', resetFindState);

    // Start the application
    initialize();
});

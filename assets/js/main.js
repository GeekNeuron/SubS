/**
 * SubX - A modern, web-based subtitle editor.
 * @author GeekNeuron
 * @version 1.1.0 (Bilingual Update)
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const themeSwitcher = document.getElementById('theme-switcher');
    const langSwitcher = document.getElementById('lang-switcher');
    const body = document.body;
    const html = document.documentElement;

    // --- Translations Dictionary ---
    const translations = {
        en: {
            appTitle: "SubX | Subtitle Editor",
            welcomeMessage: "Welcome to the SubX subtitle editor project!",
            subtitleMessage: "This is a professional start for a galactic project.",
            themeSwitcherTitle: "Click to toggle theme"
        },
        fa: {
            appTitle: "SubX | ویرایشگر زیرنویس",
            welcomeMessage: "به پروژه ویرایشگر زیرنویس SubX خوش آمدید!",
            subtitleMessage: "این یک شروع حرفه‌ای برای یک پروژه کهکشانی است.",
            themeSwitcherTitle: "برای تغییر تم کلیک کنید"
        }
    };

    // --- State Management ---
    let currentTheme = localStorage.getItem('theme') || 'light-theme';
    let currentLang = localStorage.getItem('language') || 'en';

    // --- Functions ---

    /**
     * Applies the selected theme to the body.
     * @param {string} theme - The theme to apply ('light-theme' or 'dark-theme').
     */
    const applyTheme = (theme) => {
        body.className = theme;
        localStorage.setItem('theme', theme);
    };

    /**
     * Toggles between light and dark themes.
     */
    const toggleTheme = () => {
        currentTheme = (body.classList.contains('light-theme')) ? 'dark-theme' : 'light-theme';
        applyTheme(currentTheme);
    };

    /**
     * Applies the selected language to the UI.
     * @param {string} lang - The language to apply ('en' or 'fa').
     */
    const applyLanguage = (lang) => {
        html.lang = lang;
        html.dir = (lang === 'fa') ? 'rtl' : 'ltr';

        document.querySelectorAll('[data-key]').forEach(element => {
            const key = element.getAttribute('data-key');
            if (translations[lang][key]) {
                element.textContent = translations[lang][key];
            }
        });
        
        // Update title attribute for theme switcher separately
        themeSwitcher.title = translations[lang].themeSwitcherTitle;

        localStorage.setItem('language', lang);
    };

    /**
     * Toggles between English and Persian.
     */
    const toggleLanguage = () => {
        currentLang = (html.lang === 'en') ? 'fa' : 'en';
        applyLanguage(currentLang);
    };


    // --- Event Listeners ---
    if (themeSwitcher) {
        themeSwitcher.addEventListener('click', toggleTheme);
    }
    if (langSwitcher) {
        langSwitcher.addEventListener('click', toggleLanguage);
    }


    // --- Initialization ---
    const initialize = () => {
        applyTheme(currentTheme);
        applyLanguage(currentLang);
        console.log(`SubX Initialized! 🚀 | Theme: ${currentTheme} | Language: ${currentLang}`);
        // Core function: Ensure all outputs are UTF-8 encoded SRT files.
        // This will be handled in the file export logic.
    };
    
    initialize();
});

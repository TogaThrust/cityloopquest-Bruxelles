// Sélecteur de langue pour CityLoop Quest Mons

class LanguageSelector {
    constructor() {
        this.availableLanguages = {
            'fr': 'Français',
            'en': 'English',
            'nl': 'Nederlands',
            'de': 'Deutsch',
            'it': 'Italiano',
            'es': 'Español',
            'cn': 'Chinese',
            'ar': 'Arabic',
            'pl': 'Polish',
            'jp': 'Japanese'

        };
        this.selector = null;
        this.selectElement = null;
        this._isUpdating = false; // Protection contre la boucle infinie
        // this._startSyncInterval(); // Supprimé pour éviter le clignotement
    }

    // Créer le sélecteur de langue
    createSelector(container = null) {
        // NE PAS CRÉER LE SÉLECTEUR SUR LA PAGE PARCOURS
        if (window.location.pathname.includes('parcours.html')) {
            return null;
        }
        
        // SUPPRESSION RADICALE DE TOUS LES SÉLECTEURS EXISTANTS
        const oldSelectors = document.querySelectorAll('#language-selector, .language-selector, select[data-language], .flag-selector, select[name*="language"], select[id*="language"]');
        oldSelectors.forEach((oldSelector) => {
            oldSelector.remove();
        });
        
        // Réinitialiser this.selector pour forcer la création
        this.selector = null;
        
        if (this.selector) {
            return this.selector; // Un seul sélecteur !
        }
        const selector = document.createElement('div');
        selector.id = 'language-selector';
        selector.style.cssText = `
            position: fixed !important;
            top: 10px !important;
            right: 10px !important;
            z-index: 99999 !important;
            background: rgba(255, 0, 0, 0.9) !important;
            border: 3px solid #000000 !important;
            border-radius: 8px !important;
            padding: 8px !important;
            font-family: Arial, sans-serif !important;
            font-size: 14px !important;
            display: block !important;
            visibility: visible !important;
        `;
        
        // Texte de debug supprimé - le sélecteur fonctionne correctement

        // Créer un sélecteur personnalisé avec drapeaux
        const customSelect = document.createElement('div');
        customSelect.style.cssText = `
            position: relative;
            cursor: pointer;
            min-width: 36px;
        `;

        const selectedDisplay = document.createElement('div');
        selectedDisplay.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 6px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background: white;
            min-width: 24px;
            min-height: 18px;
            position: relative;
            cursor: pointer;
        `;
        
        // Ajouter une petite flèche pour indiquer que c'est cliquable
        const arrow = document.createElement('div');
        arrow.style.cssText = `
            position: absolute;
            right: 2px;
            top: 50%;
            transform: translateY(-50%);
            width: 0;
            height: 0;
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            border-top: 4px solid #666;
            margin-left: 4px;
        `;
        selectedDisplay.appendChild(arrow);
        this.selectedDisplay = selectedDisplay;

        const dropdown = document.createElement('div');
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            margin-top: 2px;
            display: none;
            z-index: 1001;
            max-height: 200px;
            overflow-y: auto;
        `;
        this.dropdown = dropdown;

        // Créer les options avec drapeaux
        // Création des options de langue
        Object.entries(this.availableLanguages).forEach(([code, name]) => {
            // Création option
            const option = document.createElement('div');
            option.style.cssText = `
                display: flex !important;
                align-items: center;
                justify-content: center;
                padding: 8px;
                cursor: pointer;
                min-width: 36px;
                min-height: 18px;
                visibility: visible !important;
                opacity: 1 !important;
            `;
            option.dataset.value = code;

            // Créer le drapeau SVG
            const flag = document.createElement('div');
            flag.style.cssText = `
                width: 16px;
                height: 12px;
                background-size: cover;
                background-position: center;
                border: 1px solid #ccc;
            `;

            if (code === 'fr') {
                flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Flag_of_France.svg/320px-Flag_of_France.svg.png')`;
            } else if (code === 'en') {
                flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Flag_of_the_United_Kingdom_%283-5%29.svg/320px-Flag_of_the_United_Kingdom_%283-5%29.svg.png')`;
            } else if (code === 'nl') {
                flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Flag_of_the_Netherlands.svg/320px-Flag_of_the_Netherlands.svg.png')`;
            } else if (code === 'de') {
                flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Flag_of_Germany.svg/320px-Flag_of_Germany.svg.png')`;
            } else if (code === 'it') {
                flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Flag_of_Italy.svg/320px-Flag_of_Italy.svg.png')`;
            } else if (code === 'es') {
                flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Flag_of_Spain.svg/320px-Flag_of_Spain.svg.png')`;
            } else if (code === 'cn') {
                flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Flag_of_the_People%27s_Republic_of_China.svg/320px-Flag_of_the_People%27s_Republic_of_China.svg.png')`;
            } else if (code === 'ar') {
                flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Flag_of_Saudi_Arabia.svg/320px-Flag_of_Saudi_Arabia.svg.png')`;
            } else if (code === 'pl') {
                flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Flag_of_Poland.svg/320px-Flag_of_Poland.svg.png')`;
            } else if (code === 'jp') {
                flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Flag_of_Japan.svg/320px-Flag_of_Japan.svg.png')`;
            }





            option.appendChild(flag);

            option.addEventListener('click', (e) => {
                e.stopPropagation(); // Empêcher la propagation vers le parent
                const newLanguage = code;
                // Changement de langue demandé
                
                // Sauvegarder dans localStorage
                localStorage.setItem('selectedLanguage', newLanguage);
                
                // Mettre à jour l'affichage immédiatement
                this._updateDisplay();
                this._hideDropdown();
                
                // Essayer d'utiliser le translationManager s'il est disponible
                if (window.translationManager) {
                    window.translationManager.setLanguage(newLanguage);
                } else {
                }
                
                // Déclencher un événement personnalisé pour notifier le changement de langue
                document.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: newLanguage } }));
                
                // Langue changée
            });

            dropdown.appendChild(option);
        });
        // Options créées

        // Gestionnaire pour ouvrir/fermer le dropdown
        customSelect.addEventListener('click', (e) => {
            // Clic détecté sur le sélecteur
            this._toggleDropdown();
        });

        // Fermer le dropdown en cliquant ailleurs
        document.addEventListener('click', (e) => {
            if (!customSelect.contains(e.target)) {
                this._hideDropdown();
            }
        });

        customSelect.appendChild(selectedDisplay);
        customSelect.appendChild(dropdown);
        selector.appendChild(customSelect);

        // Initialiser l'affichage
        this._updateDisplay();

        // Ajouter au conteneur spécifié ou au body par défaut
        const targetContainer = container || document.body;
        targetContainer.appendChild(selector);
        this.selector = selector;
        return selector;
    }

    _updateDisplay() {
        // Protection contre les appels multiples rapides (boucle infinie)
        if (this._isUpdating) {
            return;
        }
        this._isUpdating = true;
        
        if (!this.selectedDisplay) {
            this._isUpdating = false;
            return;
        }
        
        // Récupérer la langue courante avec priorité au localStorage
        let currentLang = localStorage.getItem('selectedLanguage');
        
        // Si pas de langue dans localStorage, essayer le translationManager
        if (!currentLang && window.translationManager) {
            currentLang = window.translationManager.getCurrentLanguage();
        }
        
        // Si toujours pas de langue, utiliser le français par défaut
        if (!currentLang) {
            currentLang = 'fr';
            localStorage.setItem('selectedLanguage', 'fr');
        }
        
        const languageName = this.availableLanguages[currentLang];
        
        
        // Vider l'affichage mais garder la flèche
        const arrow = this.selectedDisplay.querySelector('div[style*="border-left"]');
        // Ne pas vider complètement, juste remplacer le drapeau
        const existingFlag = this.selectedDisplay.querySelector('div[style*="background-image"]');
        if (existingFlag) {
            existingFlag.remove();
        }
        
        // Créer le drapeau
        const flag = document.createElement('div');
        flag.style.cssText = `
            width: 16px;
            height: 12px;
            background-size: cover;
            background-position: center;
            border: 1px solid #ccc;
        `;

        if (currentLang === 'fr') {
            flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Flag_of_France.svg/320px-Flag_of_France.svg.png')`;
        } else if (currentLang === 'en') {
            flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Flag_of_the_United_Kingdom_%283-5%29.svg/320px-Flag_of_the_United_Kingdom_%283-5%29.svg.png')`;
        } else if (currentLang === 'nl') {
            flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Flag_of_the_Netherlands.svg/320px-Flag_of_the_Netherlands.svg.png')`;
        } else if (currentLang === 'de') {
        flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Flag_of_Germany.svg/320px-Flag_of_Germany.svg.png')`;
        } else if (currentLang === 'it') {
        flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Flag_of_Italy.svg/320px-Flag_of_Italy.svg.png')`;
        } else if (currentLang === 'es') {
            flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Flag_of_Spain.svg/320px-Flag_of_Spain.svg.png')`;
        } else if (currentLang === 'cn') {
            flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Flag_of_the_People%27s_Republic_of_China.svg/320px-Flag_of_the_People%27s_Republic_of_China.svg.png')`;
        } else if (currentLang === 'ar') {
            flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Flag_of_Saudi_Arabia.svg/320px-Flag_of_Saudi_Arabia.svg.png')`;
        } else if (currentLang === 'pl') {
            flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Flag_of_Poland.svg/320px-Flag_of_Poland.svg.png')`;
        } else if (currentLang === 'jp') {
            flag.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Flag_of_Japan.svg/320px-Flag_of_Japan.svg.png')`;
        }
        


        this.selectedDisplay.appendChild(flag);
        
        // Réinitialiser le flag après un court délai pour permettre la prochaine mise à jour
        setTimeout(() => {
            this._isUpdating = false;
        }, 100);
    }

    _toggleDropdown() {
        if (this.dropdown.style.display === 'block') {
            this._hideDropdown();
        } else {
            this._showDropdown();
        }
    }

    _showDropdown() {
        if (this.dropdown) {
            this.dropdown.style.display = 'block';
            // Debug : lister toutes les options
            Array.from(this.dropdown.children).forEach((option, index) => {
            });
        }
    }

    _hideDropdown() {
        if (this.dropdown) {
            this.dropdown.style.display = 'none';
        }
    }

    _startSyncInterval() {
        // Supprimé pour éviter le clignotement du drapeau
        // setInterval(() => {
        //     this._updateDisplay();
        // }, 500);
    }

    // Mettre à jour dynamiquement la valeur sélectionnée sans recréer tout le sélecteur
    updateSelectorValue() {
        this._updateDisplay();
    }

    // Forcer la mise à jour du sélecteur et notifier le changement
    forceUpdateSelector() {
        this._updateDisplay();
    }
}

// Créer une instance globale
window.languageSelector = new LanguageSelector();

// Synchroniser le sélecteur à chaque changement de langue (TEMPORAIREMENT DÉSACTIVÉ)
if (window.translationManager) {
    const originalSetLanguage = window.translationManager.setLanguage.bind(window.translationManager);
    window.translationManager.setLanguage = function(lang) {
        originalSetLanguage(lang);
        // TEMPORAIREMENT DÉSACTIVÉ pour éviter la boucle infinie
        // if (window.languageSelector) {
        //     window.languageSelector.updateSelectorValue();
        // }
    };
}


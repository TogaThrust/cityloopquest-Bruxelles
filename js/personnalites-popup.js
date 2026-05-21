// Script partagé pour gérer les popups de personnalités
// Charge les données depuis translations/personnalites.json et affiche un popup

let personnalitesData = null;

async function loadPersonnalitesData() {
  if (personnalitesData) return personnalitesData;
  
  try {
    const response = await fetch('translations/personnalites.json');
    personnalitesData = await response.json();
    return personnalitesData;
  } catch (error) {
    console.error('Erreur lors du chargement des données de personnalités:', error);
    return null;
  }
}

// Fonction pour mettre à jour le contenu du popup selon la langue
function updatePopupContent(popupId, personName, data) {
  const overlay = document.getElementById(popupId);
  if (!overlay) return;
  
  // Utiliser translationManager pour obtenir la langue actuelle
  const lang = window.translationManager?.getCurrentLanguage() || 
               localStorage.getItem('selectedLanguage') || 
               'fr';
  const personData = data[lang]?.[personName] || data['fr']?.[personName];
  
  if (!personData) return;
  
  // Mettre à jour le nom
  const nameElem = overlay.querySelector('h2');
  if (nameElem) nameElem.textContent = personData.name;
  
  // Mettre à jour la description
  const descElem = overlay.querySelector('.personnalite-description');
  if (descElem) descElem.innerHTML = personData.description || '';
  
  // Mettre à jour le bouton retour
  const closeBtn = overlay.querySelector('.personnalite-close-btn');
  if (closeBtn) closeBtn.textContent = window.translationManager?.translate('back') || '⬅️ Retour';
}

function showPersonnalitePopup(personName) {
  const popupId = `popup-personnalite-${personName.replace(/\s+/g, '-')}`;
  if (document.getElementById(popupId)) return;

  loadPersonnalitesData().then(data => {
    if (!data) {
      console.error('Données de personnalités non disponibles');
      return;
    }

    // Utiliser translationManager pour obtenir la langue actuelle
    const lang = window.translationManager?.getCurrentLanguage() || 
                 localStorage.getItem('selectedLanguage') || 
                 'fr';
    const personData = data[lang]?.[personName] || data['fr']?.[personName];
    
    if (!personData) {
      console.error(`Personnalité non trouvée: ${personName}`);
      alert(`Les informations sur ${personName} ne sont pas encore disponibles.`);
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = popupId;
    overlay.setAttribute('data-person-name', personName);
    Object.assign(overlay.style, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
      background: '#fffbe6',
      border: '4px solid #b8860b',
      borderRadius: '18px',
      boxShadow: '0 0 24px #0008',
      padding: '24px',
      maxWidth: '90vw',
      width: '500px',
      maxHeight: '90vh',
      overflowY: 'auto',
      textAlign: 'left',
      position: 'relative'
    });

    // Bouton fermer
    const closeBtn = document.createElement('button');
    closeBtn.className = 'personnalite-close-btn';
    closeBtn.textContent = window.translationManager?.translate('back') || '⬅️ Retour';
    Object.assign(closeBtn.style, {
      background: '#c8102e',
      color: '#fff',
      fontWeight: 'bold',
      border: 'none',
      borderRadius: '8px',
      padding: '10px 18px',
      fontSize: '1em',
      cursor: 'pointer',
      marginBottom: '18px'
    });
    closeBtn.onclick = () => document.body.removeChild(overlay);
    box.appendChild(closeBtn);

    // Image
    if (personData.image) {
      const img = document.createElement('img');
      img.src = personData.image;
      img.alt = personData.name;
      Object.assign(img.style, {
        width: '100%',
        maxWidth: '300px',
        height: 'auto',
        borderRadius: '12px',
        marginBottom: '18px',
        display: 'block',
        margin: '0 auto 18px auto'
      });
      img.onerror = function() {
        this.style.display = 'none';
      };
      box.appendChild(img);
    }

    // Nom
    const nameElem = document.createElement('h2');
    nameElem.textContent = personData.name;
    Object.assign(nameElem.style, {
      fontSize: '1.5em',
      fontWeight: 'bold',
      color: '#b30000',
      marginBottom: '12px',
      textAlign: 'center'
    });
    box.appendChild(nameElem);

    // Description
    const descElem = document.createElement('div');
    descElem.className = 'personnalite-description';
    descElem.innerHTML = personData.description || '';
    Object.assign(descElem.style, {
      fontSize: '1em',
      lineHeight: '1.6',
      color: '#333',
      textAlign: 'justify'
    });
    box.appendChild(descElem);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    
    // Écouter les changements de langue
    const languageChangeHandler = (event) => {
      loadPersonnalitesData().then(updatedData => {
        if (updatedData) {
          updatePopupContent(popupId, personName, updatedData);
        }
      });
    };
    
    document.addEventListener('languageChanged', languageChangeHandler);
    
    // Nettoyer l'écouteur quand le popup est fermé
    const originalClose = closeBtn.onclick;
    closeBtn.onclick = () => {
      document.removeEventListener('languageChanged', languageChangeHandler);
      document.body.removeChild(overlay);
    };
  });
}


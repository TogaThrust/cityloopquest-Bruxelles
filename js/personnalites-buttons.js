// Cache pour les données de personnalités
let personnalitesDataCache = null;

// Charger les données de personnalités une seule fois
async function loadPersonnalitesData() {
  if (personnalitesDataCache) {
    return personnalitesDataCache;
  }
  
  try {
    const response = await fetch('translations/personnalites.json');
    personnalitesDataCache = await response.json();
    return personnalitesDataCache;
  } catch (error) {
    console.error('Erreur lors du chargement des données de personnalités:', error);
    return null;
  }
}

// Helper pour générer les boutons de personnalités
// Cette fonction utilise les données du JSON pour obtenir le chemin d'image correct
function createPersonnaliteButton(personName, personData) {
  const button = document.createElement('button');
  button.className = 'personnalite-btn';
  button.setAttribute('data-person-name', personName);
  
  button.style.cssText = 'display:flex; align-items:center; gap:10px; padding:14px 24px; text-align:left; width:100%; min-width:0; border:none; border-radius:10px; background-color:#3366cc; color:white; cursor:pointer; transition:background-color 0.3s ease, transform 0.2s ease; box-shadow:0 4px 6px rgba(0,0,0,0.1); font-size:1.3rem;';
  button.onmouseover = function() { this.style.backgroundColor = '#254a99'; this.style.transform = 'scale(1.05)'; };
  button.onmouseout = function() { this.style.backgroundColor = '#3366cc'; this.style.transform = 'scale(1)'; };
  
  // Utiliser le chemin d'image du JSON si disponible, sinon normaliser
  let imagePath = '';
  if (personData && personData.image) {
    imagePath = personData.image;
    console.log(`📸 Chemin d'image pour ${personName}: ${imagePath}`);
  } else {
    // Normalisation de secours
    let imageName = personName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
      .replace(/\s+/g, '_')
      .replace(/[^\w_]/g, '') // Enlever les caractères non alphanumériques sauf _
      .replace(/'/g, '')
      .replace(/\./g, '');
    imagePath = `images/personnalites/${imageName}.jpg`;
  }
  
  const img = document.createElement('img');
  img.src = imagePath;
  img.alt = personName;
  img.style.cssText = 'width:60px; height:60px; object-fit:cover; border-radius:8px; flex-shrink:0;';
  img.onerror = function() { 
    // Si l'image n'existe pas, afficher une icône placeholder
    console.warn(`⚠️ Image non trouvée pour ${personName}: ${imagePath}`);
    this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7wn5CgPC90ZXh0Pjwvc3ZnPg==';
  };
  img.onload = function() {
    // Image chargée avec succès
    console.log(`✅ Image chargée pour ${personName}: ${imagePath}`);
  };
  
  const span = document.createElement('span');
  span.textContent = personName;
  span.style.cssText = 'flex:1; text-align:left; color:white; min-width:0; word-wrap:break-word; overflow-wrap:break-word; white-space:normal; line-height:1.3;';
  
  button.appendChild(img);
  button.appendChild(span);
  
  button.addEventListener('click', () => {
    if (typeof showPersonnalitePopup === 'function') {
      showPersonnalitePopup(personName);
    }
  });
  
  return button;
}

async function addPersonnaliteButtons(container, personNames) {
  // Charger les données une seule fois
  const data = await loadPersonnalitesData();
  // Utiliser translationManager pour obtenir la langue actuelle
  const lang = window.translationManager?.getCurrentLanguage() || 
               localStorage.getItem('selectedLanguage') || 
               'fr';
  
  // Créer tous les boutons
  for (const name of personNames) {
    const personData = data?.[lang]?.[name] || data?.['fr']?.[name];
    const btn = createPersonnaliteButton(name, personData);
    container.appendChild(btn);
  }
}


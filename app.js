let nextButton, prevButton, homeButton, cultureButton, audioBtn, doudouBtn, pauseBtn, stopBtn, restartBtn;
let activeQuizContainer = null;
let splashAlreadyHidden = false;
let distanceStack = [];  // Stack des distances
let isReturning = false; // Pour savoir si c'est un retour (Previous)
let hasGuidanceStarted = false; // Pour éviter les répétitions du guidage
let mapInitialized = false;
let initializationInProgress = false;
let isUpdating = false;
let score = 0;
let quizEnabled = false;
let map;
let markers = [];
let directionsService;
let directionsRenderer;
let currentIndex = 0;
let completedQuizQuestions = (() => {
    const saved = localStorage.getItem("mons_completedQuizQuestions");
    // Si on n'a pas de circuit sélectionné, c'est un nouveau parcours, donc on réinitialise
    const selectedCircuit = localStorage.getItem('selectedCircuit');
    if (!selectedCircuit) {
        return {};
    }
    return saved ? JSON.parse(saved) : {};
})();

// === Config API (via api-base.js) ===
const API_BASE =
  (window.APP_CONFIG && window.APP_CONFIG.API_BASE) ||
  localStorage.getItem('api_base') ||
  window.location.origin.replace(':5173', ':8080');


// === Helpers stockage ===
function getToken() {
  return localStorage.getItem('jwt') || '';
}
function setToken(t) {
  localStorage.setItem('jwt', t);
}
function clearToken() {
  localStorage.removeItem('jwt');
}

// === Gestion deviceId (1 par appareil) ===
function getOrCreateDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) || ('DEV-' + Math.random().toString(36).slice(2));
    localStorage.setItem('deviceId', id);
  }
  return id;
}

// === Appel d'activation ===
async function activateLicense(code) {
  const deviceId = getOrCreateDeviceId();
  const res = await fetchApi('/api/auth/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: String(code).trim(), deviceId })
  });

  if (!res.ok) {
    // On remonte le message d'erreur JSON du serveur
    let err = 'activation_failed';
    try { const j = await res.json(); err = j.error || err; } catch {}
    throw new Error(err);
  }

  const data = await res.json();
  // data.token = JWT ; data.entitlements = { plan, city_slug, features, valid_until }
  setToken(data.token);
  // Optionnel: stocker aussi les droits si tu veux y accéder vite côté front
  localStorage.setItem('entitlements', JSON.stringify(data.entitlements));
  return data;
}

// === Test rapide du token (appelle une route protégée) ===
async function probeToken() {
  const token = getToken();
  if (!token) return null;
  const res = await fetchApi('/api/content/plain', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) return null;
  return res.json();
}

// === Brancher le formulaire ===
async function attachActivationForm() {
  const form = document.getElementById('activation-form');
  const input = document.getElementById('code-input');
  const msg = document.getElementById('activation-msg');
  if (!form || !input) return; // le bloc n'est pas sur cette page

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = 'Activation en cours...';
    try {
      const code = input.value;
      const res = await activateLicense(code);
      msg.style.color = 'green';
      msg.textContent = 'Activation réussie ✅';
      // Ici, tu peux rediriger ou charger le contenu chiffré
      // location.href = 'main.html';
    } catch (err) {
      msg.style.color = 'crimson';
      msg.textContent = 'Erreur: ' + err.message;
    }
  });
}

// === Au chargement de la page ===
window.addEventListener('DOMContentLoaded', async () => {
  // Si un token existe déjà, on peut cacher le bloc d'activation (optionnel)
  const probe = await probeToken();
  if (probe) {
    const section = document.getElementById('activation');
    if (section) section.style.display = 'none';
    // Tu peux charger directement le contenu chiffré ici si tu veux
  }
  await attachActivationForm();
});


// Fonction pour calculer le nombre total de questions posées (complétées)
function getTotalQuestionsAsked() {
    let total = 0;
    for (const pointName in completedQuizQuestions) {
        if (completedQuizQuestions[pointName]) {
            total += 3; // Chaque point a 3 questions
        }
    }
    return total;
}

// Variable pour tracker si un quiz est en cours
let currentQuizInProgress = false;

// Fonction pour calculer le score maximum basé sur le nombre de questions posées
function getMaxScoreBasedOnQuestions() {
    let totalQuestions = getTotalQuestionsAsked();
    
    // Si un quiz est en cours, ajouter 3 questions au total
    if (currentQuizInProgress) {
        totalQuestions += 3;
    }
    
    // Si aucune question n'a été posée encore et aucun quiz en cours, retourner 0
    return totalQuestions * 10;
}

let currentAudio = null;
let currentDescriptionText = ""; // Variable pour mémoriser le texte de la description
let isDoudouSongPlaying = false; // Pour savoir si c'est la chanson du Doudou
let steps = [];
let currentStepIndex = 0;
let watchId = null;
let gpsHeading = null; // Heading basé sur le mouvement GPS (plus fiable que le magnétomètre sur Android)
let smoothedAndroidHeading = null; // Heading lissé pour Android (éviter les sauts)
let magnetometerOffset = null; // Offset calibré entre magnétomètre et GPS (pour fusion hybride)
let lastGPSCalibrationTime = 0; // Timestamp de la dernière calibration GPS

// ANDROID : État hybride avec hystérésis
let androidMode = 'STATIONARY'; // 'MOVING' ou 'STATIONARY'
let movingVotes = 0;
let stillVotes = 0;
let bearingTarget = 0; // Cap cible
let bearingSmoothed = 0; // Cap lissé pour affichage
let lastMapUpdateTime = 0; // Timestamp dernière update carte
let headingWindow = []; // Fenêtre glissante pour médiane
let totalDistance = 0; // distance totale parcourue (en mètres)
let currentPointDistance = ''; // distance au point actuel (texte formaté)
let currentPointDuration = ''; // durée au point actuel (texte formaté)
let userPositionMarker = null; // Marqueur pour la position de l'utilisateur
let routeMarkers = []; // Pour stocker les marqueurs de départ/arrivée
let lastRouteCalculationPos = null; // Dernière position utilisée pour le calcul de route
let lastRouteCalculationTime = 0; // Timestamp du dernier calcul de route
let distanceAlreadyAddedForCurrentPoint = false; // Flag pour éviter d'ajouter la distance plusieurs fois

// Flag pour éviter le double calcul/affichage en mode musée
let museumRouteAlreadyCalculated = false;
// Flag pour éviter le double guidage vocal musée
let museumGuidanceStarted = false;
let firstInstructionGiven = false;

let mapLoadInitiated = false;
let geoPermissionRequested = false; // Pour éviter les redemandes d'autorisation
let orientationPermissionRequested = false; // Pour éviter les redemandes d'autorisation d'orientation

// Synchroniser la variable de session avec le localStorage
if (localStorage.getItem('geoPermissionGranted') === 'true') {
    geoPermissionRequested = true;
}

// --- Détection et redirection PWA ---
// Vérifier si l'app est installée et forcer le point d'entrée sur index.html
function checkPWAEntryPoint() {
    // DÉSACTIVÉ - Cette fonction causait des redirections en boucle
    // La logique de redirection PWA est maintenant gérée dans index.html
    return false;
}

// Exécuter la vérification immédiatement
const pwaRedirected = checkPWAEntryPoint();

// Splashscreen : gestion du titre différé
window.splashTitleShown = false;
window.splashTitleMinTime = 6000; // 3s avant + 3s avec le titre

function showSplashTitle() {
  // Vérifier si on est sur index.html (page avec splashscreen)
  const isOnIndexPage = window.location.pathname.endsWith('index.html') || 
                       window.location.pathname.endsWith('/') || 
                       window.location.pathname === '';
  
  if (!isOnIndexPage) {
    return;
  }
  
  const splashTitle = document.getElementById('splash-title');
  if (splashTitle) {
    splashTitle.style.display = '';
    window.splashTitleShown = true;
    window.splashTitleShownAt = Date.now();
  } else {
  }
}

// --- Initialisation à la fin du chargement du DOM ---
document.addEventListener('DOMContentLoaded', () => {
    // Si une redirection PWA a eu lieu, ne pas initialiser l'app
    if (pwaRedirected) {
        return;
    }
    
    // Vérifier si on est sur index.html (page avec splashscreen)
    const isOnIndexPage = window.location.pathname.endsWith('index.html') || 
                         window.location.pathname.endsWith('/') || 
                         window.location.pathname === '';
    
    // NE PAS initialiser l'app sur index.html car elle a son propre splashscreen
    if (isOnIndexPage) {
        return;
    }
    
    // Réinitialiser les flags de session au démarrage de l'application
    mapLoadInitiated = false;
    geoPermissionRequested = false;
    orientationPermissionRequested = false;
    
    // Initialiser l'application avec le chargement des descriptions multilingues
    initApp();

});



let startPoint = { name: "Grand-place", lat: 50.4546, lng: 3.9524, audio: "audio/grandplace.mp3" };


const storedCircuit = localStorage.getItem('selectedCircuit');
const storedCircuitStart = localStorage.getItem('selectedCircuitStart');
const storedResolvedCircuit = localStorage.getItem('selectedCircuitResolved');

const currentPath = (window.location && window.location.pathname ? window.location.pathname : '').toLowerCase();
const isMainPage = currentPath.endsWith('/main.html') || currentPath.endsWith('main.html');

let shouldForceCircuitSelection = false;

if (isMainPage) {
  const hasUserCircuitSelection = Boolean(
    storedCircuit &&
    storedCircuitStart &&
    storedResolvedCircuit &&
    typeof circuits !== 'undefined' &&
    circuits[storedResolvedCircuit]
  );

  if (!hasUserCircuitSelection) {
    shouldForceCircuitSelection = true;
    const langForRedirect = localStorage.getItem('selectedLanguage') || localStorage.getItem('lang') || '';
    const targetUrl = langForRedirect
      ? `parcours.html?lang=${encodeURIComponent(langForRedirect)}`
      : 'parcours.html';

    window.location.replace(targetUrl);
  }
}

const selectedCircuit = storedCircuit || 'grand';
const selectedCircuitStart = storedCircuitStart || 'grand_place';
const resolvedCircuitFromStorage = storedResolvedCircuit;

function resolveActiveCircuitKey(baseCircuit, startPoint, storedVariant) {
  if (startPoint === 'gare') {
    const variantKey = `${baseCircuit}_gare`;
    if (circuits[variantKey]) {
      return variantKey;
    }
  }

  if (storedVariant && circuits[storedVariant]) {
    return storedVariant;
  }

  if (circuits[baseCircuit]) {
    return baseCircuit;
  }

  const availableKeys = Object.keys(circuits || {});
  if (availableKeys.length > 0) {
    return availableKeys.includes('grand') ? 'grand' : availableKeys[0];
  }

  throw new Error('Aucun circuit disponible pour initialiser le parcours.');
}

const activeCircuitKey = resolveActiveCircuitKey(selectedCircuit, selectedCircuitStart, resolvedCircuitFromStorage);

if (!shouldForceCircuitSelection && activeCircuitKey && circuits[activeCircuitKey]) {
  localStorage.setItem('selectedCircuitResolved', activeCircuitKey);
}

const filteredLocations = circuits[activeCircuitKey].map(i => locations[i - 1]);

if (filteredLocations.length > 0) {
  startPoint = filteredLocations[0];
}

function normalizeFileName(name) {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // retire les accents
        .replace(/[^\w\s-]/g, "")        // retire les caractères spéciaux
        .replace(/\s+/g, "_")            // remplace les espaces par _
        .toLowerCase();
}

function stopAllAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }

    // Vider le texte mémorisé
    currentDescriptionText = "";
    isDoudouSongPlaying = false; // Réinitialiser le flag

    const imageElement = document.getElementById("point-image");
    const textContainer = document.getElementById("media-display");

    if (imageElement && textContainer) {
        imageElement.style.display = "block";
        textContainer.style.display = "none";
        textContainer.innerText = "";
    }

    if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
}

// --- Gestionnaire de descriptions multilingues ---
let descriptionsData = null;

// Fonction pour charger les descriptions multilingues
async function loadDescriptions() {
    try {
        const response = await fetch('translations/descriptions.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        descriptionsData = await response.json();
    } catch (error) {
        console.error('❌ Erreur lors du chargement des descriptions:', error);
        descriptionsData = null;
    }
}

// Fonction pour obtenir la description selon la langue
function getDescription(locationName, language = null) {
    if (!descriptionsData) {
        console.warn('⚠️ Descriptions non chargées, utilisation du fichier texte');
        return null; // Retourner null pour utiliser l'ancien système
    }
    
    const lang = language || (window.translationManager ? window.translationManager.getCurrentLanguage() : 'fr');
    const description = descriptionsData[lang]?.[locationName];
    
    if (description) {
        return description;
    } else {
        console.warn(`⚠️ Aucune description trouvée pour ${locationName} en ${lang}`);
        return null;
    }
}

// Fonction pour obtenir le chemin audio selon la langue
function getAudioPath(baseAudioPath, language = null) {
    const lang = language || (window.translationManager ? window.translationManager.getCurrentLanguage() : 'fr');
    
    // L'air du doudou ne change pas selon la langue (élément folklorique)
    if (baseAudioPath === "Chansons/air_doudou.mp3") {
        return "Chansons/air_doudou_fr.mp3";
    }
    
    // Extraire le nom du fichier sans extension
    const pathParts = baseAudioPath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const nameWithoutExt = fileName.replace('.mp3', '');
    
    // Construire le nouveau chemin avec le suffixe de langue
    const newFileName = `${nameWithoutExt}_${lang}.mp3`;
    const newPath = pathParts.slice(0, -1).join('/') + '/' + newFileName;
    
    return newPath;
}

// --- Modification de la fonction playExclusiveAudio pour supporter le multilingue ---
function playExclusiveAudio(src, textFile = null, imageElement = null, originalImageSrc = null) {
    const textContainer = document.getElementById("media-display");

    // Si un audio est déjà en cours, on l'arrête et on réaffiche la photo
    if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        currentAudio.currentTime = 0;

        // Ne pas modifier l'affichage si c'est l'air du doudou
        if (src !== "Chansons/air_doudou.mp3") {
            if (imageElement && originalImageSrc) {
                imageElement.src = originalImageSrc;
                imageElement.style.display = "block";
            }
            if (textContainer) {
                textContainer.style.display = "none";
                textContainer.innerText = "";
            }
        }
    }

    // Obtenir le chemin audio selon la langue
    const audioPath = getAudioPath(src);
    currentAudio = new Audio(audioPath);
    
    // Gestion d'erreur si le fichier audio n'existe pas
    currentAudio.addEventListener('error', (e) => {
        console.warn(`⚠️ Fichier audio ${audioPath} non trouvé, utilisation du fichier original`);
        currentAudio = new Audio(src); // Utiliser le fichier original
        currentAudio.play();
    });
    
    currentAudio.play();

    // Mettre à jour le bouton play/pause
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
        pauseBtn.textContent = "⏸️";
    }

    // Ajouter les événements pour gérer la fin de l'audio
    currentAudio.addEventListener('ended', () => {
        currentAudio = null;
        if (textContainer) {
            textContainer.scrollTop = 0;
        }
        // Mettre à jour le bouton play/pause
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.textContent = "▶️";
        }
        // Ne pas modifier l'affichage si c'était l'air du doudou
        if (src !== "Chansons/air_doudou.mp3") {
            const imageElement = document.getElementById("point-image");
            if (imageElement && textContainer) {
                imageElement.style.display = "block";
                textContainer.style.display = "none";
            }
        }
        
        // Enchaîner avec le fichier "continue" si ce n'est pas le dernier point et si ce n'est pas l'air du doudou
        if (src !== "Chansons/air_doudou.mp3" && currentIndex < filteredLocations.length - 1) {
            // Obtenir la langue actuelle
            const currentLang = window.translationManager ? window.translationManager.getCurrentLanguage() : 'fr';
            const continueAudioPath = `audio/continue_${currentLang}.mp3`;
            
            
            // Créer et jouer l'audio "continue"
            const continueAudio = new Audio(continueAudioPath);
            continueAudio.addEventListener('error', (e) => {
                console.warn(`⚠️ Fichier continue ${continueAudioPath} non trouvé`);
            });
            continueAudio.play();
        }
    });

    // Ne pas modifier l'affichage si c'est l'air du doudou
    if (textFile && imageElement && textContainer && src !== "Chansons/air_doudou.mp3") {
        // Essayer d'abord de charger la description depuis le JSON multilingue
        const currentLocation = filteredLocations[currentIndex];
        if (currentLocation) {
            const description = getDescription(currentLocation.name);
            if (description) {
                // Utiliser la description du JSON
                currentDescriptionText = description;
                textContainer.innerText = description;
                imageElement.style.display = "none";
                textContainer.style.display = "block";
                return;
            }
        }
        
        // Fallback : utiliser l'ancien système avec les fichiers .txt
        fetch(textFile)
            .then(response => response.text())
            .then(text => {
                currentDescriptionText = text;
                textContainer.innerText = text;
                imageElement.style.display = "none";
                textContainer.style.display = "block";
            })
            .catch(err => console.error("Erreur de chargement texte :", err));
    }
}

// Modifier hideSplashScreen pour attendre 6s si besoin
function hideSplashScreen() {
    // Vérifier si on est sur index.html (page avec splashscreen)
    const isOnIndexPage = window.location.pathname.endsWith('index.html') || 
                         window.location.pathname.endsWith('/') || 
                         window.location.pathname === '';
    
    if (!isOnIndexPage) {
        return;
    }
    
    const splash = document.getElementById('splash-screen');
    if (!splash) {
        return;
    }
    
    splash.style.transition = 'opacity 0.5s ease';
    splash.style.opacity = '0';
    setTimeout(() => {
        splash.style.display = 'none';
    }, 500);
}

function loadGoogleMaps(callback) {
    // Si la carte est déjà chargée, on exécute le callback et on sort
    if (window.google && window.google.maps) {
        if(callback) callback();
        return;
    }

    // Si le chargement a déjà été lancé, on ne fait rien pour éviter les doublons
    if(mapLoadInitiated) return;
    mapLoadInitiated = true;
    
    // Le reste de la fonction de chargement...
    const handleMapError = () => {
        console.error("Erreur de chargement de Google Maps.");
        // Cacher le splash screen même en cas d'erreur (seulement si on est sur index.html)
        hideSplashScreen();
        const mapDiv = document.getElementById('map');
        if (mapDiv) {
            mapDiv.innerHTML = `<div style="padding: 20px; text-align: center; color: #666;"><h3>Carte non disponible</h3><p>Vérifiez votre connexion.</p></div>`;
        }
        updateDisplayFallback();
    };

    const mapLoadTimeout = setTimeout(handleMapError, 8000);

    window.initMap = function () {
        clearTimeout(mapLoadTimeout);
        if (callback) {
            callback();
        }
    };

    fetch('Clé API.txt')
        .then(response => response.text())
        .then(apiKeyText => {
            const match = apiKeyText.match(/AIza[A-Za-z0-9_-]+/);
            if (!match) throw new Error('Clé API invalide');
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${match[0]}&callback=initMap&libraries=geometry,places`;
            script.async = true;
            script.onerror = handleMapError;
            document.head.appendChild(script);
        })
        .catch(handleMapError);
}

function startMap() {
    // Vérifier si la carte est déjà initialisée et si on revient sur la page
    const wasInitialized = localStorage.getItem('mapInitialized') === 'true';
    
    if (initializationInProgress) {
        return;
    }
    
    if (mapInitialized && wasInitialized) {
        // Cacher le splash screen car la carte est déjà prête
        hideSplashScreen();
        // Restaurer l'état sans réinitialiser la carte
        if (!window.mainLogicInitialized) {
            initializeMainLogic();
            window.mainLogicInitialized = true;
        }
        return;
    }
    
    initializationInProgress = true;

    loadGoogleMaps(() => {
        // Le callback est simple : on initialise la carte et on met à jour l'affichage.
        // PAS d'appel récursif ici.
        
        const mapOptions = {
            zoom: 16,
            center: { lat: 50.4543, lng: 3.9526 },
            mapTypeId: 'roadmap', // Vue classique avec routes
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            rotateControl: true, // Activer le contrôle de rotation
            // Options pour le guidage par rotation
            heading: 0, // Rotation initiale de la carte
            tilt: 0, // Vue de dessus (0 = 2D, 45 = 3D)
            // Options pour le centrage automatique
            gestureHandling: 'cooperative', // Permet le centrage automatique
            // Désactiver le zoom automatique pour éviter les conflits
            zoomControl: true,
            // Options pour améliorer les performances
            disableDefaultUI: false,
            // Marquer que l'utilisateur n'a pas encore déplacé la carte manuellement
            userHasPanned: false
        };
        
        map = new google.maps.Map(document.getElementById('map'), mapOptions);
        
        // Initialiser les services de directions
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true,
            preserveViewport: true, // Ne pas recentrer automatiquement la carte à chaque mise à jour de route
            polylineOptions: {
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 6
            }
        });
        
        // Écouter les événements de déplacement manuel de la carte
        map.addListener('dragstart', () => {
            map.set('userHasPanned', true);
        });
        
        map.addListener('dragend', () => {
            // Réactiver le centrage automatique après un délai
            setTimeout(() => {
                map.set('userHasPanned', false);
            }, 5000);
        });
        
        mapInitialized = true;
        localStorage.setItem('mapInitialized', 'true');
        initializationInProgress = false;
        
        // Cacher le splash screen maintenant que la carte est prête
        hideSplashScreen();
        
        // Initialiser la logique principale après l'initialisation de la carte
        if (!window.mainLogicInitialized) {
            initializeMainLogic();
            window.mainLogicInitialized = true;
        }
    });
}

// Fonction pour réinitialiser les permissions de géolocalisation
function resetGeoPermissions() {
    localStorage.removeItem('geoPermissionGranted');
    localStorage.removeItem('appLaunchedBefore');
    localStorage.removeItem('orientationPermissionGranted');
    localStorage.removeItem('compassGuidanceActive');
    geoPermissionRequested = false;
    orientationPermissionRequested = false;
    mapLoadInitiated = false;
}

// Fonction pour vérifier si la géolocalisation est autorisée
function isGeoLocationGranted() {
    return localStorage.getItem('geoPermissionGranted') === 'true';
}

// (Suppression de la fonction startGuidance et de tout le guidage vocal)

function updateLocation() {

    // Gestion des flèches de guidage
    if (typeof initGuideArrows === 'function') {
        initGuideArrows();
    }

    // Mettre à jour l'image seulement en mode PARCOURS. En mode musée, l'image est déjà définie.
    if (localStorage.getItem('museumMode') !== 'true') {
        const imageElement = document.getElementById("point-image");
        if (imageElement) {
            const current = filteredLocations[currentIndex];
            if (current) {
                const imageFileName = normalizeFileName(current.name);
                const imagePath = `images/${imageFileName}.jpg`;
                imageElement.src = imagePath;
                imageElement.alt = current.name;
            }
        }
    }

    // Vérifier si on a déjà une position utilisateur
    let initialRouteCalculated = false;
    if (userPositionMarker) {
        const lastKnownPos = userPositionMarker.getPosition();
        if (lastKnownPos) {
            const pos = { lat: lastKnownPos.lat(), lng: lastKnownPos.lng() };
            calculateRouteFromPosition(pos, "Votre position");
            initialRouteCalculated = true;
        }
    }

    // Si c'est le premier lancement et qu'on n'a pas de route initiale, afficher un message d'attente
    if (!initialRouteCalculated) {
        const display = document.getElementById("location-name");
        if (display) {
            const calculating = window.translationManager ? window.translationManager.translate('calculating') : 'Calcul en cours...';
            display.textContent = calculating;
        }
    }

    // Suivre la position GPS en continu pour obtenir le heading basé sur le mouvement (comme Google Maps)
    if (navigator.geolocation) {
        // Arrêter un éventuel watchPosition précédent
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
        }
        
        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // ANDROID : Gestion hybride avec hystérésis de vitesse
                const isAndroidGPS = /android/i.test(navigator.userAgent);
                const speed = position.coords.speed;
                const heading = position.coords.heading;
                
                if (isAndroidGPS) {
                    // Hystérésis : seuils TRÈS bas pour réactivité maximale
                    if (speed !== null && speed !== undefined) {
                        if (speed > 0.5) {  // ~2 km/h = marche lente
                            movingVotes++; 
                            stillVotes = 0; 
                        } else if (speed < 0.2) {  // ~0.7 km/h = quasi-immobile
                            stillVotes++; 
                            movingVotes = 0; 
                        }
                        
                        // Activation IMMÉDIATE (1 seul vote suffit)
                        if (movingVotes >= 1) { 
                            androidMode = 'MOVING';
                        }
                        if (stillVotes >= 1) { 
                            androidMode = 'STATIONARY';
                        }
                    }
                    
                    // En mode MOVING, utiliser le GPS heading
                    if (androidMode === 'MOVING' && heading !== null && heading !== undefined && !isNaN(heading)) {
                        bearingTarget = norm360(heading);
                        gpsHeading = heading;
                    }
                } else {
                    // iOS ou autre : comportement classique
                    if (heading !== null && heading !== undefined && !isNaN(heading)) {
                        gpsHeading = heading;
                    }
                }
                
                updateUserMarker(pos);
                
                // Si c'était le premier lancement et qu'on n'avait pas de route initiale, calculer maintenant
                if (!initialRouteCalculated) {
                    calculateRouteFromPosition(pos, "Votre position");
                } else {
                    // Sinon, recalculer seulement si la position a changé significativement (> 20 mètres)
                    // ou si plus de 10 secondes se sont écoulées depuis le dernier calcul
                    const now = Date.now();
                    const shouldRecalculate = 
                        !lastRouteCalculationPos ||
                        calculateDistanceBetweenPositions(lastRouteCalculationPos, pos) > 20 || // Plus de 20 mètres
                        (now - lastRouteCalculationTime) > 10000; // Plus de 10 secondes
                    
                    if (shouldRecalculate) {
                        lastRouteCalculationPos = { lat: pos.lat, lng: pos.lng };
                        lastRouteCalculationTime = now;
                        calculateRouteFromPosition(pos, "Votre position");
                    }
                }
                
                // La demande de boussole est maintenant gérée immédiatement dans initializeMainLogic
            },
            (error) => {
                console.error("❌ Erreur watchPosition :", error);
                // Si le calcul rapide initial a échoué (ex: 1er point), utiliser le point de départ
                if (!initialRouteCalculated) {
                    const display = document.getElementById("location-name");
                    if (display) {
                        display.textContent = "Géolocalisation impossible. Affichage depuis le point de départ.";
                    }
                    calculateRouteFromPosition(startPoint, "Point de départ");
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0 // Ne pas utiliser de cache, on veut des valeurs fraîches pour le heading
            }
        );
    }
}

function updateUserMarker(pos) {
    if (userPositionMarker) {
        userPositionMarker.setPosition(pos);
        
        // Restaurer la rotation de la flèche si la boussole est active
        if (isCompassActive) {
            const icon = userPositionMarker.getIcon();
            if (icon) {
                icon.rotation = currentArrowRotation;
                userPositionMarker.setIcon(icon);
            }
        }
        
        // Centrer la carte sur l'utilisateur si l'utilisateur n'a pas déplacé la carte manuellement
        // Limiter le centrage pour éviter le rafraîchissement constant (maximum une fois toutes les 3 secondes)
        if (map && !map.get('userHasPanned')) {
            const now = Date.now();
            if (!lastMapUpdateTime || (now - lastMapUpdateTime) > 3000) { // Maximum toutes les 3 secondes
                map.setCenter(pos);
                lastMapUpdateTime = now;
            }
        }
    } else {
        userPositionMarker = new google.maps.Marker({
            position: pos,
            map: map,
            icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 7,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: 'white',
                rotation: 0 // Flèche toujours vers le haut
            },
            title: 'Votre position'
        });
        
        // Centrer la carte sur l'utilisateur lors de la création du marqueur (une seule fois)
        if (map) {
            map.setCenter(pos);
            lastMapUpdateTime = Date.now();
        }
    }
}

function calculateRouteFromPosition(pos, fromName = "Votre position") {
    let destination;
    if (localStorage.getItem('museumMode') === 'true') {
        try {
            const museum = JSON.parse(localStorage.getItem("museumData"));
            if (museum && museum.lat && museum.lng) {
                destination = museum;
            }
        } catch (e) {
            console.error("Erreur lors du calcul de l'itinéraire vers le musée:", e);
            return;
        }
    } else {
        destination = filteredLocations[currentIndex];
    }

    if (destination) {
        calculateRoute(pos, destination, fromName, destination.name);
    }
}

// Fonction utilitaire pour calculer la distance entre deux positions (en mètres)
function calculateDistanceBetweenPositions(pos1, pos2) {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = pos1.lat * Math.PI / 180;
    const φ2 = pos2.lat * Math.PI / 180;
    const Δφ = (pos2.lat - pos1.lat) * Math.PI / 180;
    const Δλ = (pos2.lng - pos1.lng) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
}

function calculateRoute(from, to, fromName, toName) {
    // Éviter les calculs simultanés
    if (isUpdating) {
        return;
    }
    
    isUpdating = true;

    // Effacer les anciens marqueurs de route
    routeMarkers.forEach(marker => marker.setMap(null));
    routeMarkers = [];

    // Supprimer le rendu du trajet précédent
    if (directionsRenderer) {
        directionsRenderer.setDirections({routes: []});
    }

    const request = {
        origin: from,
        destination: to,
        travelMode: 'WALKING'
    };

    directionsService.route(request, (result, status) => {
        if (status == 'OK') {
            directionsRenderer.setDirections(result);

            // Créer uniquement le marqueur d'arrivée
            const leg = result.routes[0].legs[0];
            const destinationMarker = new google.maps.Marker({
                position: leg.end_location,
                map: map,
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                },
                title: toName
            });
            routeMarkers.push(destinationMarker);

            // Mise à jour de l'affichage du texte
            const duration = leg.duration.text;
            const distance = leg.distance.text;
            const distanceValue = leg.distance.value;

            // Vérifier si les valeurs semblent correctes (pas les valeurs par défaut de Google Maps)
            const isDistanceReasonable = distanceValue > 10; // Plus de 10 mètres
            const isDurationReasonable = leg.duration.value > 10; // Plus de 10 secondes
            // Sauvegarder les valeurs de distance et durée dans des variables globales
            currentPointDistance = distance;
            currentPointDuration = duration;
            
            // Ajout de la logique de mise à jour du texte
            const isMuseumMode = localStorage.getItem("museumMode") === "true";
            if (!isMuseumMode) {
                // Ne pas ajouter la distance si elle a déjà été ajoutée pour ce point
                // La distance ne doit être ajoutée qu'une seule fois quand on arrive à un nouveau point
                if (currentIndex > 0 && !isReturning && !distanceAlreadyAddedForCurrentPoint) {
                    totalDistance += distanceValue;
                    distanceStack.push(distanceValue);
                    distanceAlreadyAddedForCurrentPoint = true;
                }
                isReturning = false;
                const totalKm = (totalDistance / 1000).toFixed(2);
                const display = document.getElementById('location-name');
                if (display) {
                    const isMuseumMode = localStorage.getItem("museumMode") === "true";
                    const selectedMuseum = localStorage.getItem("selectedMuseum");
                    
                    if (isMuseumMode && selectedMuseum) {
                        const museumTarget = window.translationManager ? window.translationManager.translate('museum_target') : '🎯 Musée :';
                        const estimatedTime = window.translationManager ? window.translationManager.translate('estimated_time') : 'Temps estimé :';
                        const distanceLabel = window.translationManager ? window.translationManager.translate('distance') : 'Distance :';
                        display.textContent = `${museumTarget} ${toName} – ${estimatedTime} ${formatDuration(duration)} – ${distanceLabel} ${distance}`;
                    } else {
                        const nextPoint = window.translationManager ? window.translationManager.translate('next_point') : 'Prochain point :';
                        const estimatedTime = window.translationManager ? window.translationManager.translate('estimated_time') : 'Temps estimé :';
                        const distanceLabel = window.translationManager ? window.translationManager.translate('distance') : 'Distance :';
                        const totalDistanceLabel = window.translationManager ? window.translationManager.translate('total_distance') : 'Distance totale :';
                        const scoreText = window.translationManager ? window.translationManager.translate('score') : 'Score :';
                        // Calculer le score maximum basé sur le nombre de questions posées
                        const maxScore = getMaxScoreBasedOnQuestions();
                        display.textContent = `${nextPoint} ${toName} – ${estimatedTime} ${formatDuration(duration)} – ${distanceLabel} ${distance} – ${totalDistanceLabel} ${totalKm} km – ${scoreText} ${score}/${maxScore}`;
                    }
                    display.style.opacity = "0.99";
                    void display.offsetHeight;
                    display.style.opacity = "1";
                }
            } else {
                const display = document.getElementById("location-name");
                if (display) {
                    display.textContent = `🎯 Musée : ${toName} – Temps estimé : ${formatDuration(duration)} – Distance : ${distance}`;
                }
            }
        } else {
            console.error("Erreur de calcul d'itinéraire : " + status);
        }
        isUpdating = false;
    });
}

function updateDisplayFallback() {
    const display = document.getElementById('location-name');
    if (!display) return;
    
    const geolocationImpossible = window.translationManager ? window.translationManager.translate('geolocation_impossible') : 'Géolocalisation impossible. Affichage depuis le point de départ.';
    display.textContent = geolocationImpossible;
}

function advanceToNextPoint() {
    // Réinitialiser le flag pour permettre l'ajout de la distance au nouveau point
    distanceAlreadyAddedForCurrentPoint = false;
    
    // Si on est à l'avant-dernier point et qu'on va vers le dernier point, afficher le popup
    if (currentIndex === filteredLocations.length - 2) {
        // Enregistrer le point actuel comme visité
        const visitedPoints = JSON.parse(localStorage.getItem('mons_visitedPoints') || '[]');
        if (!visitedPoints.includes(currentIndex)) {
            visitedPoints.push(currentIndex);
            localStorage.setItem('mons_visitedPoints', JSON.stringify(visitedPoints));
        }
        
        // Afficher le popup de fin de parcours
        showEndOfTourPopup();
        
        // Afficher le bouton selfie
        const selfieBtn = document.getElementById('selfie-btn');
        if (selfieBtn) {
            selfieBtn.style.display = 'block';
        }
        
        // Avancer normalement vers le dernier point
        currentIndex++;
        steps = [];
        currentStepIndex = 0;
        localStorage.setItem("mons_currentIndex", currentIndex);
        localStorage.setItem("mons_score", score);
        updateLocation();
        return; 
    }
    
    // Si on est au dernier point, ne rien faire (l'utilisateur peut utiliser le bouton selfie)
    if (currentIndex >= filteredLocations.length - 1) {
        return; 
    }
    
    
    if (currentIndex < filteredLocations.length - 1) {
        
        // Enregistrer le point actuel comme visité
        const visitedPoints = JSON.parse(localStorage.getItem('mons_visitedPoints') || '[]');
        if (!visitedPoints.includes(currentIndex)) {
            visitedPoints.push(currentIndex);
            localStorage.setItem('mons_visitedPoints', JSON.stringify(visitedPoints));
        }
        
        currentIndex++;
        steps = [];
        currentStepIndex = 0;
        // Sauvegarde systématique de l'état
        localStorage.setItem("mons_currentIndex", currentIndex);
        localStorage.setItem("mons_score", score);
        updateLocation();
    } else {
        alert("Vous avez atteint la fin du parcours !");
    }
}

// --- showHomeConfirmPopup ---
function showHomeConfirmPopup(onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 9999;

    const box = document.createElement('div');
    box.style.background = '#fffbe6';
    box.style.border = '4px solid #b8860b';
    box.style.borderRadius = '18px';
    box.style.boxShadow = '0 0 24px #0008';
    box.style.padding = '32px 24px 24px 24px';
    box.style.maxWidth = '400px';
    box.style.textAlign = 'center';
    box.style.position = 'relative';

    const icon = document.createElement('div');
    icon.textContent = '⚔️🐉';
    icon.style.fontSize = '2em';
    icon.style.marginBottom = '16px';
    box.appendChild(icon);

    const title = document.createElement('div');
    const warningText = window.translationManager ? window.translationManager.translate('warning') : 'Avertissement !';
    title.textContent = warningText;
    title.style.fontWeight = 'bold';
    title.style.fontSize = '1.2em';
    title.style.marginBottom = '18px';
    box.appendChild(title);

    const msg = document.createElement('div');
    const resetWarningText = window.translationManager ? window.translationManager.translate('reset_warning') : "Cette action va vous ramener au choix du circuit et l'application va être <b>réinitialisée</b> !!!<br>Êtes-vous sûr ?";
    msg.innerHTML = resetWarningText;
    msg.style.marginBottom = '24px';
    box.appendChild(msg);

    const btns = document.createElement('div');
    btns.style.display = 'flex';
    btns.style.justifyContent = 'center';
    btns.style.gap = '18px';

    const btnYes = document.createElement('button');
    const yesResetText = window.translationManager ? window.translationManager.translate('yes_reset') : 'Oui, réinitialiser';
    btnYes.textContent = yesResetText;
    btnYes.style.background = '#2ecc40';
    btnYes.style.color = '#fff';
    btnYes.style.fontWeight = 'bold';
    btnYes.style.border = 'none';
    btnYes.style.borderRadius = '8px';
    btnYes.style.padding = '10px 18px';
    btnYes.style.fontSize = '1em';
    btnYes.style.cursor = 'pointer';
    btnYes.addEventListener('click', () => {
        document.body.removeChild(overlay);
        onConfirm();
    });

    const btnNo = document.createElement('button');
    const noCancelText = window.translationManager ? window.translationManager.translate('no_cancel') : 'Non, annuler';
    btnNo.textContent = noCancelText;
    btnNo.style.background = '#e74c3c';
    btnNo.style.color = '#fff';
    btnNo.style.fontWeight = 'bold';
    btnNo.style.border = 'none';
    btnNo.style.borderRadius = '8px';
    btnNo.style.padding = '10px 18px';
    btnNo.style.fontSize = '1em';
    btnNo.style.cursor = 'pointer';
    btnNo.addEventListener('click', () => {
        document.body.removeChild(overlay);
        onCancel();
    });

    btns.appendChild(btnYes);
    btns.appendChild(btnNo);
    box.appendChild(btns);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

// === Fonction pour vérifier si l'app est installée (PWA) ===
function isAppInstalled() {
    const standaloneMatch = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = window.navigator && window.navigator.standalone === true;
    const pwaInstalledFlag = localStorage.getItem('pwa-installed') === 'true';
    return standaloneMatch || iosStandalone || pwaInstalledFlag;
}

// === Fonction pour normaliser le code d'activation ===
function normalizeShortCode(input) {
    const raw = String(input).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!raw) return '';
    const nine = raw.slice(0, 9);
    return (nine.match(/.{1,3}/g) || [nine]).join('-');
}

// === Fonction pour vérifier la validité du code d'activation via l'API ===
async function validateActivationCode(code) {
    try {
        const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) ||
                        localStorage.getItem('api_base') ||
                        window.location.origin.replace(':5173', ':8080');
        
        const normalizedCode = normalizeShortCode(code);
        if (!normalizedCode) {
            return { valid: false, error: 'invalid_format' };
        }

        const response = await fetch(`${API_BASE}/api/auth/activate-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ code: normalizedCode }),
            signal: AbortSignal.timeout(10000) // 10 secondes max
        });

        const text = await response.text();
        let data = null;
        try {
            data = text ? JSON.parse(text) : null;
        } catch (e) {
            return { valid: false, error: 'parse_error' };
        }

        if (!response.ok || !data || !data.token) {
            const errorMsg = (data && (data.error || data.message)) || 'activation_failed';
            return { valid: false, error: errorMsg };
        }

        // Le code est valide, on peut mettre à jour le token
        localStorage.setItem('clq_token', data.token);
        localStorage.setItem('jwt', data.token);
        localStorage.setItem('clq_has_access', '1');
        localStorage.setItem('clq_short_code', normalizedCode);

        // Déterminer la version
        let plan = 'lite';
        if (data.plan) {
            plan = String(data.plan).toLowerCase();
        } else if (data.entitlements && data.entitlements.plan) {
            plan = String(data.entitlements.plan).toLowerCase();
        }
        const userVersion = plan === 'lite' ? 'LITE' : 'FULL';
        localStorage.setItem('user_version', userVersion);

        return { valid: true, token: data.token };
    } catch (error) {
        console.error('Erreur lors de la validation du code:', error);
        return { valid: false, error: 'network_error' };
    }
}

// === Fonction pour afficher le popup de code invalide ===
function showInvalidCodePopup() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '10001';

    const popup = document.createElement('div');
    popup.style.cssText = `
        background: rgba(255, 255, 255, 0.95);
        border-radius: 16px;
        padding: 24px 28px;
        max-width: min(420px, calc(100vw - 40px));
        width: 90%;
        text-align: center;
        box-shadow: 0 18px 45px rgba(20,54,92,0.35);
        border: 2px solid #14365c;
    `;

    const title = document.createElement('div');
    title.className = 'popup-title';
    title.style.cssText = 'font-size: 1.45rem; font-weight: 700; margin-bottom: 18px; color: #14365c;';
    
    const titleText = window.translationManager && window.translationManager.isLoaded
        ? window.translationManager.translate('invalid_code_title') || 'Code d\'activation invalide'
        : 'Code d\'activation invalide';
    title.textContent = titleText;
    popup.appendChild(title);

    const message = document.createElement('p');
    message.style.cssText = 'margin: 0 0 20px; color: #666; font-size: 14px; line-height: 1.5;';
    const messageText = window.translationManager && window.translationManager.isLoaded
        ? window.translationManager.translate('invalid_code_message') || 'Votre code d\'activation n\'est plus valide. Veuillez vous rendre sur la page d\'activation pour entrer un nouveau code.'
        : 'Votre code d\'activation n\'est plus valide. Veuillez vous rendre sur la page d\'activation pour entrer un nouveau code.';
    message.textContent = messageText;
    popup.appendChild(message);

    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 12px; justify-content: center; margin-top: 15px; flex-wrap: wrap;';

    const btnOk = document.createElement('button');
    btnOk.style.cssText = `
        background: #14365c;
        color: #fff;
        border: none;
        border-radius: 12px;
        font-weight: 600;
        box-shadow: 0 8px 18px rgba(20,54,92,0.25);
        padding: 14px 32px;
        font-size: 16px;
        cursor: pointer;
        flex: 1 1 120px;
    `;
    const btnText = window.translationManager && window.translationManager.isLoaded
        ? window.translationManager.translate('ok') || 'OK'
        : 'OK';
    btnOk.textContent = btnText;
    btnOk.addEventListener('click', () => {
        const currentLang = localStorage.getItem('selectedLanguage') || 'fr';
        window.location.href = `choose-access.html?lang=${encodeURIComponent(currentLang)}`;
    });

    actions.appendChild(btnOk);
    popup.appendChild(actions);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}

// === Fonction pour vérifier la validité d'un token ===
async function validateToken(token) {
    try {
        const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) ||
                        localStorage.getItem('api_base') ||
                        window.location.origin.replace(':5173', ':8080');
        
        const response = await fetch(`${API_BASE}/api/auth/whoami`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'ngrok-skip-browser-warning': 'true'
            },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            return { valid: false, error: 'token_invalid' };
        }

        const data = await response.json();
        return { valid: true, data: data };
    } catch (error) {
        console.error('Erreur lors de la validation du token:', error);
        return { valid: false, error: 'network_error' };
    }
}

// === Fonction principale pour gérer la réinitialisation avec vérification du code ===
async function handleResetWithCodeCheck() {
    // Sauvegarder la langue avant de nettoyer
    const savedLanguage = localStorage.getItem('selectedLanguage') || 'fr';
    const savedOrientationPerm = localStorage.getItem('orientationPermissionGranted');
    
    // Vérifier si l'app est installée
    const installed = isAppInstalled();
    
    if (installed) {
        // Vérifier si un code d'activation ou un token existe
        const shortCode = localStorage.getItem('clq_short_code');
        const token = localStorage.getItem('clq_token') || localStorage.getItem('jwt');
        
        if (shortCode || token) {
            // Nettoyer le localStorage sauf le code et la langue
            const keysToKeep = ['clq_short_code', 'clq_token', 'jwt', 'clq_has_access', 'user_version', 'selectedLanguage', 'pwa-installed'];
            const savedValues = {};
            keysToKeep.forEach(key => {
                const value = localStorage.getItem(key);
                if (value) savedValues[key] = value;
            });
            
            localStorage.clear();
            
            // Restaurer les valeurs importantes
            Object.keys(savedValues).forEach(key => {
                localStorage.setItem(key, savedValues[key]);
            });
            
            if (savedOrientationPerm) {
                localStorage.setItem('orientationPermissionGranted', savedOrientationPerm);
            }
            
            // Essayer d'abord de valider le token s'il existe
            let isValid = false;
            if (token) {
                const tokenValidation = await validateToken(token);
                if (tokenValidation.valid) {
                    isValid = true;
                }
            }
            
            // Si le token n'est pas valide, essayer de valider/réactiver avec le code
            if (!isValid && shortCode) {
                const codeValidation = await validateActivationCode(shortCode);
                if (codeValidation.valid) {
                    isValid = true;
                }
            }
            
            if (isValid) {
                // Code/token valide, rediriger vers parcours.html avec la langue
                const langParam = savedLanguage ? `?lang=${encodeURIComponent(savedLanguage)}` : '';
                window.location.href = `parcours.html${langParam}`;
                return;
            } else {
                // Code/token invalide, nettoyer complètement et afficher le popup
                localStorage.clear();
                if (savedOrientationPerm) {
                    localStorage.setItem('orientationPermissionGranted', savedOrientationPerm);
                }
                localStorage.setItem('selectedLanguage', savedLanguage);
                showInvalidCodePopup();
                return;
            }
        }
    }
    
    // Si pas installée ou pas de code, comportement normal : nettoyer et rediriger vers language-selection
    localStorage.clear();
    if (savedOrientationPerm) {
        localStorage.setItem('orientationPermissionGranted', savedOrientationPerm);
    }
    window.location.href = "language-selection.html";
}

// === Ajout : fonction showQuizPrompt ===
function showQuizPrompt(callback) {
  if (localStorage.getItem("mons_quizEnabled") !== null) {
    callback(localStorage.getItem("mons_quizEnabled") === "true");
    return;
  }
  const overlay = document.createElement('div');
  overlay.id = 'quiz-prompt-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(0,0,0,0.7)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = 9999;

  const box = document.createElement('div');
  box.style.background = '#fffbe6';
  box.style.border = '4px solid #b8860b';
  box.style.borderRadius = '18px';
  box.style.boxShadow = '0 0 24px #0008';
  box.style.padding = '32px 24px 24px 24px';
  box.style.maxWidth = '400px';
  box.style.textAlign = 'center';
  box.style.position = 'relative';

  const title = document.createElement('div');
  // Utiliser la traduction pour le titre
  const quizPromptText = window.translationManager ? window.translationManager.translate('quiz_prompt') : 'Voulez-vous activer le quiz tout au long du parcours ?';
  title.textContent = quizPromptText;
  title.style.fontWeight = 'bold';
  title.style.fontSize = '1.2em';
  title.style.marginBottom = '18px';
  box.appendChild(title);

  const btns = document.createElement('div');
  btns.style.display = 'flex';
  btns.style.justifyContent = 'center';
  btns.style.gap = '18px';

  const btnYes = document.createElement('button');
  // Utiliser la traduction pour le bouton Oui
  const yesText = window.translationManager ? window.translationManager.translate('yes') : 'Oui';
  const quizOnText = window.translationManager ? window.translationManager.translate('quiz_on') : 'quiz ON';
  btnYes.textContent = `${yesText}, ${quizOnText}`;
  btnYes.style.background = '#2ecc40';
  btnYes.style.color = '#fff';
  btnYes.style.fontWeight = 'bold';
  btnYes.style.border = 'none';
  btnYes.style.borderRadius = '8px';
  btnYes.style.padding = '10px 18px';
  btnYes.style.fontSize = '1em';
  btnYes.style.cursor = 'pointer';
  btnYes.addEventListener('click', () => {
    localStorage.setItem("mons_quizEnabled", "true");
    document.body.removeChild(overlay);
    callback(true);
  });

  const btnNo = document.createElement('button');
  // Utiliser la traduction pour le bouton Non
  const noText = window.translationManager ? window.translationManager.translate('no') : 'Non';
  const withoutQuizText = window.translationManager ? window.translationManager.translate('without_quiz') : 'sans quiz';
  btnNo.textContent = `${noText}, ${withoutQuizText}`;
  btnNo.style.background = '#e74c3c';
  btnNo.style.color = '#fff';
  btnNo.style.fontWeight = 'bold';
  btnNo.style.border = 'none';
  btnNo.style.borderRadius = '8px';
  btnNo.style.padding = '10px 18px';
  btnNo.style.fontSize = '1em';
  btnNo.style.cursor = 'pointer';
  btnNo.addEventListener('click', () => {
    localStorage.setItem("mons_quizEnabled", "false");
    document.body.removeChild(overlay);
    callback(false);
  });

  btns.appendChild(btnYes);
  btns.appendChild(btnNo);
  box.appendChild(btns);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// === Ajout : gestion du quiz par point ===
function showQuizForCurrentPoint(callback) {
  // Vérifier si le quiz est activé
  if (!quizEnabled) {
    callback();
    return;
  }

  const currentLocation = currentIndex === 0 ? startPoint : filteredLocations[currentIndex];
  const pointName = currentLocation.name;
  
  
  // Log de la langue sélectionnée dans le localStorage
  
  
  // S'assurer que le gestionnaire de traductions est prêt
  if (!window.translationManager) {
    setTimeout(() => showQuizForCurrentPoint(callback), 100);
    return;
  }
  
  // Utiliser le fichier de traductions du quiz
  const currentLang = window.translationManager.getCurrentLanguage();
  const quizTranslations = window.quizTranslations || {};
  const langData = quizTranslations[currentLang] || quizTranslations['fr'] || {};
  let questions = langData[pointName];
  
  // Fallback vers l'ancien système si les traductions ne sont pas disponibles
  if (!questions || questions.length === 0) {
    questions = window.quizData ? window.quizData[pointName] : null;
  }
  
  
  if (!questions || questions.length === 0) {
    callback();
    return;
  }
  if (completedQuizQuestions[pointName]) {
    callback();
    return;
  }
  
  
  // Marquer qu'un quiz est en cours
  currentQuizInProgress = true;
  
  // Mettre à jour l'affichage pour refléter le nouveau maxScore
  updateCurrentDisplay();
  
  // Désactiver tous les boutons sauf quiz
  const btns = [nextButton, prevButton, homeButton, cultureButton, audioBtn, doudouBtn, pauseBtn, stopBtn, restartBtn];
  btns.forEach(btn => { if (btn) btn.disabled = true; });
  let questionIndex = 0;
  let localScore = 0;
  function showQuestion() {
    const q = questions[questionIndex];
    showUniversalPopup({
      title: `Question ${questionIndex + 1} / 3`,
      message: q.question,
      buttons: q.options.map((opt, idx) => ({
        label: opt,
        color: '#b30000',
        onClick: () => {
          const isGood = idx === q.answer;
          if (isGood) localScore += 10;
          
          // Jouer le son de feedback
          let feedbackAudio;
          if (isGood) {
            feedbackAudio = new Audio('audio/correct.mp3');
          } else {
            feedbackAudio = new Audio('audio/incorrect.mp3');
          }
          feedbackAudio.play();

          // Afficher l'icône de feedback centrée avec fond transparent (comme avant)
          const feedbackImg = document.createElement('img');
          feedbackImg.src = `images/${isGood ? 'correct' : 'incorrect'}.png`;
          feedbackImg.alt = isGood ? 'Bonne réponse' : 'Mauvaise réponse';
          feedbackImg.style.position = 'fixed';
          feedbackImg.style.top = '50%';
          feedbackImg.style.left = '50%';
          feedbackImg.style.transform = 'translate(-50%, -50%)';
          feedbackImg.style.width = '120px';
          feedbackImg.style.height = '120px';
          feedbackImg.style.zIndex = '10000';
          document.body.appendChild(feedbackImg);
          
          // Si mauvaise réponse, afficher la bonne réponse dans un conteneur stylisé
          if (!isGood) {
            const correctAnswerContainer = document.createElement('div');
            correctAnswerContainer.style.position = 'fixed';
            correctAnswerContainer.style.top = 'calc(50% + 80px)'; // Positionner sous l'icône
            correctAnswerContainer.style.left = '50%';
            correctAnswerContainer.style.transform = 'translate(-50%, -50%)';
            correctAnswerContainer.style.zIndex = '10000';
            correctAnswerContainer.style.textAlign = 'center';
            correctAnswerContainer.style.background = 'rgba(0, 0, 0, 0.8)';
            correctAnswerContainer.style.borderRadius = '15px';
            correctAnswerContainer.style.padding = '15px';
            correctAnswerContainer.style.color = 'white';
            correctAnswerContainer.style.fontFamily = 'MedievalSharp, Arial, serif';
            correctAnswerContainer.style.fontSize = '16px';
            correctAnswerContainer.style.minWidth = '280px';
            correctAnswerContainer.style.fontWeight = 'bold';
            correctAnswerContainer.style.color = '#FFD700'; // Couleur dorée
            const correctAnswerText = window.translationManager ? window.translationManager.translate('correct_answer') : 'Bonne réponse :';
            correctAnswerContainer.innerHTML = `${correctAnswerText} <br>${q.options[q.answer]}`;
            document.body.appendChild(correctAnswerContainer);
            
            // Supprimer les deux éléments après 3 secondes
            setTimeout(() => {
              document.body.removeChild(feedbackImg);
              document.body.removeChild(correctAnswerContainer);
              questionIndex++;
              // Mettre à jour l'affichage après chaque question
              updateCurrentDisplay();
              if (questionIndex < 3) {
                showQuestion();
              } else {
                // Fin du quiz pour ce point
                score += localScore;
                completedQuizQuestions[pointName] = true;
                currentQuizInProgress = false; // Quiz terminé
                localStorage.setItem('mons_score', score);
                localStorage.setItem('mons_completedQuizQuestions', JSON.stringify(completedQuizQuestions));
                // Mettre à jour l'affichage pour refléter le nouveau score
                updateCurrentDisplay();
                // Réactiver les boutons
                btns.forEach(btn => { if (btn) btn.disabled = false; });
                callback();
              }
            }, 3000);
          } else {
            // Si bonne réponse, supprimer seulement l'icône après 1 seconde
            setTimeout(() => {
              document.body.removeChild(feedbackImg);
              questionIndex++;
              // Mettre à jour l'affichage après chaque question
              updateCurrentDisplay();
              if (questionIndex < 3) {
                showQuestion();
              } else {
                // Fin du quiz pour ce point
                score += localScore;
                completedQuizQuestions[pointName] = true;
                currentQuizInProgress = false; // Quiz terminé
                localStorage.setItem('mons_score', score);
                localStorage.setItem('mons_completedQuizQuestions', JSON.stringify(completedQuizQuestions));
                // Mettre à jour l'affichage pour refléter le nouveau score
                updateCurrentDisplay();
                // Réactiver les boutons
                btns.forEach(btn => { if (btn) btn.disabled = false; });
                callback();
              }
            }, 1000);
          }
        }
      })),
      icon1: '⚔️',
      icon2: '🐉',
    });
  }
  showQuestion();
}

async function initApp() {
    
    // Récupérer la langue choisie dans le localStorage AVANT d'initialiser le gestionnaire
    const lang = localStorage.getItem('selectedLanguage');
    // Ne pas forcer une langue par défaut si aucune n'est sélectionnée
    
    // Charger les descriptions multilingues
    await loadDescriptions();
    
    // Charger les traductions du quiz
    await loadQuizTranslations();
    
    // Initialiser le gestionnaire de traductions et attendre qu'il soit prêt
    if (window.translationManager && typeof window.translationManager.init === 'function') {
        await window.translationManager.init();
        window.translationManager.setLanguage(lang);
        window.translationManager.applyTranslations();
        
        // Mettre à jour le splash screen dans la bonne langue (seulement sur index.html)
        const isOnIndexPage = window.location.pathname.endsWith('index.html') || 
                             window.location.pathname.endsWith('/') || 
                             window.location.pathname === '';
        if (isOnIndexPage) {
            const splashText = document.getElementById('splash-text');
            if (splashText) {
              const translation = window.translationManager.translate('splash_waiting');
              if (translation !== 'splash_waiting') {
                splashText.innerHTML = translation;
              }
            }
        }
    }
    
    // Lancer le chargement de la carte (le splash screen sera caché une fois la carte prête)
    startMap();
}

function initializeMainLogic() {
    // Cette fonction contient la logique qui doit s'exécuter après le chargement de la carte
    // (ou son échec)
    
    // Restaurer l'état de l'application depuis le localStorage
    const savedCurrentIndex = localStorage.getItem("mons_currentIndex");
    const savedScore = localStorage.getItem("mons_score");
    const savedQuizEnabled = localStorage.getItem("mons_quizEnabled");
    const savedCompletedQuizQuestions = localStorage.getItem("mons_completedQuizQuestions");
    
    if (savedCurrentIndex !== null) {
        currentIndex = parseInt(savedCurrentIndex);
    }
    
    if (savedScore !== null) {
        score = parseInt(savedScore);
    }
    
    if (savedQuizEnabled !== null) {
        quizEnabled = savedQuizEnabled === 'true';
    }
    
    // Restaurer les questions de quiz déjà traitées
    if (savedCompletedQuizQuestions !== null && Object.keys(completedQuizQuestions).length === 0) {
        try {
            completedQuizQuestions = JSON.parse(savedCompletedQuizQuestions);
        } catch (error) {
            console.error("❌ Erreur lors de la restauration des questions de quiz:", error);
            completedQuizQuestions = {};
        }
    } else {
    }
    
    const forceTarget = localStorage.getItem("mons_forceTarget");

    if (forceTarget) {
        try {
            const museum = JSON.parse(forceTarget);

            if (!museum.name || !museum.lat || !museum.lng) {
                console.error("❌ Données du musée incomplètes:", museum);
            } else {
                localStorage.setItem("museumMode", "true");
                localStorage.setItem("selectedMuseum", museum.name);
                localStorage.setItem("museumData", JSON.stringify(museum));
                
                // Afficher l'image du musée sélectionné
                const imageElement = document.getElementById("point-image");
                if (imageElement && museum.image) {
                    imageElement.src = museum.image;
                    imageElement.alt = museum.name;
                } else {
                    console.warn("⚠️ Image du musée non trouvée ou élément image non trouvé");
                }
                
                // Désactiver les boutons du footer (sauf Home)
                disableFooterButtons();
            }
        } catch (e) {
            console.error("Erreur lors du traitement du mode musée:", e);
        }
    } else {
        
        // Restaurer l'état du bouton selfie
        const selfieBtn = document.getElementById('selfie-btn');
        if (selfieBtn) {
            const tourCompleted = localStorage.getItem('tourCompleted') === 'true';
            if (tourCompleted) {
                selfieBtn.style.display = 'block';
            } else {
                selfieBtn.style.display = 'none';
            }
        }
        
        // Restaurer les points visités
        const visitedPoints = JSON.parse(localStorage.getItem('mons_visitedPoints') || '[]');
        
        // S'assurer que le point actuel est marqué comme visité
        if (!visitedPoints.includes(currentIndex)) {
            visitedPoints.push(currentIndex);
            localStorage.setItem('mons_visitedPoints', JSON.stringify(visitedPoints));
        }
    }
    
    // Mise à jour de l'affichage initial
    
    // Détecter si on vient de language-selection.html
    const referrer = document.referrer;
    const isComingFromLanguageSelection = referrer.includes('language-selection.html') || 
                                        referrer.includes('language-selection') ||
                                        sessionStorage.getItem('comingFromLanguageSelection') === 'true';
    
    // Marquer dans sessionStorage pour la détection
    if (isComingFromLanguageSelection) {
        sessionStorage.setItem('comingFromLanguageSelection', 'true');
    }
    
    // Vérifier si les permissions de géolocalisation ont déjà été accordées
    const geoPermissionGranted = localStorage.getItem('geoPermissionGranted') === 'true';
    const isFirstLaunch = !localStorage.getItem('appLaunchedBefore');
    
    // Marquer que l'app a été lancée au moins une fois
    if (!isFirstLaunch) {
        localStorage.setItem('appLaunchedBefore', 'true');
    }
    
    // Forcer la demande d'autorisation si on vient de language-selection.html
    const shouldForcePermissionRequest = isComingFromLanguageSelection || isFirstLaunch;
    
    if (geoPermissionGranted && !shouldForcePermissionRequest) {
        updateLocation();
    } else {
        
        // Forcer la réinitialisation des flags
        geoPermissionRequested = false;
        orientationPermissionRequested = false;
        
        // Nettoyer les permissions stockées pour forcer la demande
        if (isComingFromLanguageSelection) {
            localStorage.removeItem('geoPermissionGranted');
            localStorage.removeItem('orientationPermissionGranted');
            localStorage.removeItem('compassGuidanceActive');
        } else {
            // Même si on ne vient pas de language-selection, nettoyer les permissions d'orientation
            // pour forcer la demande de boussole à chaque ouverture
            localStorage.removeItem('orientationPermissionGranted');
            localStorage.removeItem('compassGuidanceActive');
        }
        
        // Demander les permissions de géolocalisation
        getUserPosition(
            (position) => {
                // Ajouter un petit délai pour s'assurer que la position est bien traitée
                setTimeout(() => {
                    updateLocation();
                }, 500);
            },
            (error) => {
                // Afficher un message d'erreur ou utiliser le point de départ
                const display = document.getElementById("location-name");
                if (display) {
                        display.textContent = 'Géolocalisation impossible. Affichage depuis le point de départ.';
                }
                calculateRouteFromPosition(startPoint, "Point de départ");
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }
    
    // Forcer la demande de boussole immédiatement
    const compassGuidanceActive = localStorage.getItem('compassGuidanceActive') === 'true';
    if (!compassGuidanceActive) {
        setTimeout(() => {
            showCompassHelpPopup();
        }, 2000); // Délai de 2 secondes pour laisser le temps à la page de se charger
    } else {
    }
    
    // Vérifier l'orientation au démarrage
    checkOrientationAndShowPopup();
    
    // Écouter les changements d'orientation
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            checkOrientationAndShowPopup();
        }, 100); // Petit délai pour laisser le temps à l'orientation de se stabiliser
    });
    
    // Écouter les changements de taille d'écran (fallback)
    window.addEventListener('resize', () => {
        setTimeout(() => {
            checkOrientationAndShowPopup();
        }, 100);
    });
}

// Fonction pour désactiver les boutons du footer en mode musée
function disableFooterButtons() {
    
    const buttonsToDisable = [
        nextButton, prevButton, audioBtn, pauseBtn, stopBtn, restartBtn
    ];
    
    buttonsToDisable.forEach(button => {
        if (button) {
            button.disabled = true;
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
        }
    });
    
    // Cacher complètement les contrôles audio en mode musée
    const audioControls = document.getElementById('audio-controls-fixed');
    if (audioControls) {
        audioControls.style.display = 'none';
    }
    
    // Cacher le bouton selfie en mode musée
    const selfieBtn = document.getElementById('selfie-btn');
    if (selfieBtn) {
        selfieBtn.style.display = 'none';
    }
    
    // Le bouton Home reste actif mais redirige vers parcours.html
    const homeButton = document.getElementById('home-btn');
    if (homeButton) {
        homeButton.onclick = () => {
            const isMuseumMode = localStorage.getItem("museumMode") === "true";
            
            if (isMuseumMode) {
                // En mode musée, rediriger vers la sélection de langue
                showHomeConfirmPopup(() => {
                    stopAllAudio();
                    const orientationPerm = localStorage.getItem('orientationPermissionGranted');
                    localStorage.clear();
                    if (orientationPerm) localStorage.setItem('orientationPermissionGranted', orientationPerm);
                    window.location.href = "language-selection.html";
                });
            } else {
                // En mode parcours normal, rediriger vers la sélection de langue
                showHomeConfirmPopup(() => {
                    stopAllAudio();
                    localStorage.clear();
                    window.location.href = "language-selection.html";
                });
            }
        };
    } else {
        console.warn("⚠️ Bouton Home non trouvé");
    }
    
}

// Variables globales pour la rotation de la flèche
let currentArrowRotation = 0;
let isCompassActive = false;

// Fonction pour détecter l'orientation de l'appareil
function getDeviceOrientation() {
    // Détecter Android
    const isAndroid = /android/i.test(navigator.userAgent);
    
    // Méthode 1: screen.orientation (moderne)
    if (screen.orientation && screen.orientation.angle !== undefined) {
        const angle = screen.orientation.angle;
        if (isAndroid) {
        }
        return angle;
    }
    
    // Méthode 2: window.orientation (ancienne, mais largement supportée sur mobile)
    if (window.orientation !== undefined) {
        const angle = window.orientation;
        if (isAndroid) {
        }
        return angle;
    }
    
    // Méthode 3: Media query (fallback)
    if (window.matchMedia) {
        if (window.matchMedia("(orientation: landscape)").matches) {
            if (isAndroid) {
            }
            return 90; // Landscape
        } else {
            if (isAndroid) {
            }
            return 0; // Portrait
        }
    }
    
    if (isAndroid) {
    }
    return 0; // Par défaut
}

// Fonction pour vérifier l'orientation et afficher le popup si nécessaire
function checkOrientationAndShowPopup() {
    // Détecter Android et iOS
    const isAndroid = /android/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    let isPortrait = false;
    
    if (isIOS) {
        // Sur iOS moderne (iOS 13+), utiliser UNIQUEMENT les media queries
        // window.orientation est déprécié depuis iOS 13
        if (window.matchMedia) {
            isPortrait = !window.matchMedia("(orientation: landscape)").matches;
        } else {
            // Fallback ultra-rare
            isPortrait = window.innerHeight > window.innerWidth;
        }
    } else if (isAndroid) {
        // Sur Android, afficher le popup pour toute orientation sauf paysage droite (90°)
        if (window.orientation !== undefined) {
            // 0° = portrait, 90° = paysage droite, 180° = portrait inversé, -90°/270° = paysage gauche
            isPortrait = (window.orientation !== 90);
        } else {
            // Fallback sur media query
            isPortrait = !window.matchMedia("(orientation: landscape)").matches;
        }
    } else {
        // Autre plateforme : utiliser media query
        isPortrait = !window.matchMedia("(orientation: landscape)").matches;
    }
    
    if (isPortrait) {
        showLandscapeRequiredPopup();
    } else {
        // Cacher le popup s'il existe
        const existingPopup = document.getElementById('landscape-required-popup');
        if (existingPopup) {
            document.body.removeChild(existingPopup);
        }
    }
}

// Fonction pour afficher le popup de mode paysage obligatoire
function showLandscapeRequiredPopup() {
    // Vérifier si le popup existe déjà
    if (document.getElementById('landscape-required-popup')) {
        return;
    }
    
    
    const overlay = document.createElement('div');
    overlay.id = 'landscape-required-popup';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.fontFamily = 'Arial, sans-serif';
    
    const popup = document.createElement('div');
    popup.style.backgroundColor = '#fff';
    popup.style.borderRadius = '20px';
    popup.style.padding = '40px';
    popup.style.textAlign = 'center';
    popup.style.maxWidth = '90%';
    popup.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
    
    const icon = document.createElement('div');
    icon.innerHTML = '<img src="images/partager_ios.png" alt="Rotation" style="height:3em;width:auto;"><span style="font-size:3em;">↻</span>';
    icon.style.fontSize = '4em';
    icon.style.marginBottom = '20px';
    popup.appendChild(icon);
    
    const title = document.createElement('h2');
    title.textContent = 'Mode Paysage Requis';
    title.style.color = '#d32f2f';
    title.style.marginBottom = '20px';
    title.style.fontSize = '1.8em';
    popup.appendChild(title);
    
    const message = document.createElement('p');
    message.textContent = 'Veuillez tourner votre appareil en mode paysage pour utiliser cette application.';
    message.style.fontSize = '1.2em';
    message.style.color = '#333';
    message.style.marginBottom = '30px';
    message.style.lineHeight = '1.5';
    popup.appendChild(message);
    
    const instruction = document.createElement('div');
    instruction.innerHTML = '🔄 <strong>Tournez votre appareil horizontalement</strong>';
    instruction.style.fontSize = '1.1em';
    instruction.style.color = '#666';
    instruction.style.marginBottom = '30px';
    popup.appendChild(instruction);
    
    // Pas de bouton - le popup reste affiché tant que l'appareil est en mode portrait
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}

// Fonction pour corriger la rotation selon l'orientation de l'appareil
function correctRotationForDeviceOrientation(baseRotation) {
    const deviceOrientation = getDeviceOrientation();
    
    // Détecter le sens de basculement pour Android
    // 0° = portrait normal
    // 90° = basculé vers la gauche (côté long gauche vers le bas)
    // 270° = basculé vers la droite (côté long droit vers le bas)
    
    // Sur Android, quand on tourne vers la droite (270°), 
    // la carte doit tourner vers la gauche pour compenser
    if (deviceOrientation === 270) {
        // Basculement vers la droite : corriger de -90° (rotation vers la gauche)
        return baseRotation - 90;
    } else if (deviceOrientation === 90) {
        // Basculement vers la gauche : corriger de +90° (rotation vers la droite)
        return baseRotation + 90;
    }
    
    return baseRotation;
}

function handleOrientation(event) {
    
    // Éviter la récursion infinie
    if (window.isHandlingOrientation) {
        return;
    }
    window.isHandlingOrientation = true;
    
    // Détecter Android et iOS
    const isAndroid = /android/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // ANDROID : Approche robuste - utiliser DIRECTEMENT le GPS heading
    // La boussole (magnétomètre) est peu fiable sur Android (capteurs inégaux, bruit, permissions)
    // Solution : utiliser le cap GPS (direction du mouvement) qui est beaucoup plus stable
    // Note: le GPS heading n'est disponible que quand l'appareil se déplace (vitesse > ~1.5 m/s)
    
    // Debug ACTIVÉ pour Android uniquement
    const isAndroidDebug = /android/i.test(navigator.userAgent);
    if (isAndroidDebug && !document.getElementById('debug-orientation')) {
        const debugDiv = document.createElement('div');
        debugDiv.id = 'debug-orientation';
        debugDiv.style.cssText = `
            position: fixed;
            top: 100px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #0f0;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-width: 300px;
        `;
        document.body.appendChild(debugDiv);
    }
    
    // Calculer le cap selon la plateforme
    let heading;
    
    if (isIOS && event.webkitCompassHeading !== undefined) {
        // iOS — utiliser webkitCompassHeading (cap magnétique - fiable sur iOS)
        // CORRECTION : l'offset dépend de l'orientation de l'écran !
        // Mesures orientation 90° (paysage droit) :
        //   boussole 90° → brut 358° → besoin +92°
        //   boussole 180° → brut 89.6° → besoin +90.4°
        //   Moyenne : +91°
        const deviceOrientation = window.orientation || 0;
        let offset = 0;
        
        if (deviceOrientation === 90) {
            // Paysage droit (home button à droite)
            // Mesures finales : erreur moyenne -3.3° → offset final = 91 + 4 = 95°
            offset = 95;
        } else if (deviceOrientation === -90 || deviceOrientation === 270) {
            // Paysage gauche (home button à gauche)
            offset = 95; // À ajuster si différent
        } else {
            // Portrait ou autre
            offset = 95; // À ajuster si différent
        }
        
        heading = ((event.webkitCompassHeading + offset) % 360);
    } else if (isAndroid) {
        // ANDROID : Approche simplifiée - utiliser TOUJOURS la boussole en temps réel
        const rawAlpha = event.alpha !== null ? event.alpha : 0;
        const ANDROID_OFFSET = 90; // Offset mesuré empiriquement
        let compassHeading = norm360(rawAlpha + ANDROID_OFFSET);
        
        // Calibration automatique avec GPS (quand disponible en mouvement)
        if (gpsHeading !== null && !isNaN(gpsHeading) && androidMode === 'MOVING') {
            if (magnetometerOffset === null) {
                magnetometerOffset = angDiff(gpsHeading, compassHeading);
            } else {
                const newOffset = angDiff(gpsHeading, compassHeading);
                magnetometerOffset = emaAngle(magnetometerOffset, newOffset, 0.05);
            }
        }
        
        // Appliquer l'offset de calibration
        if (magnetometerOffset !== null) {
            compassHeading = norm360(compassHeading + magnetometerOffset);
        }
        
        // TOUJOURS utiliser la boussole (réactivité maximale)
        // Le lissage sera fait au moment de l'affichage de la carte
        heading = compassHeading;
    } else {
        // Fallback
        heading = event.alpha || 0;
    }
    
    // Si c'est un événement factice pour la restauration, utiliser l'orientation actuelle
    if (heading === 0 && event.webkitCompassHeading === 0 && event.alpha === 0) {
        // Essayer de récupérer l'orientation actuelle de l'appareil
        if (window.DeviceOrientationEvent) {
            // Attendre un vrai événement d'orientation
            window.isHandlingOrientation = false;
            return;
        }
    }

    if (userPositionMarker && heading !== null && map) {
        // Calculer l'azimuth vers la destination
        let destination = null;
        
        if (localStorage.getItem('museumMode') === 'true') {
            try {
                const museum = JSON.parse(localStorage.getItem("museumData"));
                if (museum && museum.lat && museum.lng) {
                    destination = museum;
                }
            } catch (e) {
                console.error("Erreur lors du calcul de l'azimuth vers le musée:", e);
                window.isHandlingOrientation = false;
                return;
            }
        } else {
            // Vérifier que filteredLocations et currentIndex existent
            if (typeof filteredLocations !== 'undefined' && 
                Array.isArray(filteredLocations) && 
                currentIndex >= 0 && 
                currentIndex < filteredLocations.length) {
                destination = filteredLocations[currentIndex];
            }
        }

        // Vérifier que la destination est valide
        if (!destination || typeof destination.lat === 'undefined' || typeof destination.lng === 'undefined') {
            window.isHandlingOrientation = false;
            return;
        }

        // Obtenir la position actuelle de l'utilisateur
        const userPos = userPositionMarker.getPosition();
        if (userPos) {
            // Calculer l'azimuth vers la destination
            const azimuth = calculateAzimuth(userPos, destination);
            
            // Vérifier que l'azimuth est valide
            if (isNaN(azimuth)) {
                window.isHandlingOrientation = false;
                return;
            }
            let mapBearing = heading; // Google Maps setHeading() utilise directement le heading
            
            // Debug ACTIVÉ pour Android
            const debugDiv = document.getElementById('debug-orientation');
            if (debugDiv && isAndroid) {
                const hasGPS = (gpsHeading !== null && !isNaN(gpsHeading));
                const hasOffset = (magnetometerOffset !== null);
                const rawAlpha = event.alpha || 0;
                debugDiv.innerHTML = `
                    <strong>🧭 v55 SIMPLE ${androidMode === 'MOVING' ? '🚶' : '🛑'}</strong><br>
                    α: ${rawAlpha.toFixed(1)}° +90°<br>
                    ${hasGPS ? '<span style="color:#0f0;">GPS: ' + gpsHeading.toFixed(1) + '°</span><br>' : ''}
                    ${hasOffset ? 'Offset: ' + magnetometerOffset.toFixed(1) + '°<br>' : ''}
                    <strong style="color:#0ff;">Heading: ${heading.toFixed(1)}°</strong><br>
                    <strong style="color:#0ff;">MapBearing: ${mapBearing.toFixed(1)}°</strong><br>
                    <strong style="color:#0f0;">Smoothed: ${bearingSmoothed.toFixed(1)}°</strong><br>
                    <small>Touchez pour masquer</small>
                `;
                debugDiv.onclick = () => debugDiv.style.display = 'none';
            }
            
            // Normaliser l'angle entre 0 et 360
            mapBearing = ((mapBearing % 360) + 360) % 360;
            

            
            // Appliquer la rotation à la carte
            try {
                const mapDiv = document.getElementById('map');
                if (!mapDiv) {
                    console.error('❌ mapDiv introuvable');
                    return;
                }
                
                const gmStyle = mapDiv.querySelector('.gm-style');
                if (!gmStyle) {
                    console.error('❌ .gm-style introuvable dans mapDiv');
                    return;
                }
                
                if (isAndroid) {
                    // ANDROID : Lissage EMA simple et direct
                    // Initialiser si première fois
                    if (bearingSmoothed === 0) {
                        bearingSmoothed = mapBearing;
                    }
                    
                    // EMA direct sur mapBearing
                    bearingSmoothed = emaAngle(bearingSmoothed, mapBearing, 0.4);
                    
                    // Appliquer TOUJOURS (pas de deadband pour voir si ça tourne)
                    const rotationAngle = bearingSmoothed;
                    gmStyle.style.transform = `rotate(${rotationAngle}deg)`;
                    gmStyle.style.transformOrigin = 'center center';
                    gmStyle.style.transition = 'transform 0.1s linear';
                    
                } else {
                    // iOS : rotation directe
                    const rotationAngle = -mapBearing;
                    gmStyle.style.transform = `rotate(${rotationAngle}deg)`;
                    gmStyle.style.transformOrigin = 'center center';
                }
            } catch (error) {
                console.error("❌ Erreur rotation carte:", error);
            }
            
            // LOGIQUE DE LA FLÈCHE (comme un GPS de voiture) :
            // La flèche doit rester vers le haut de l'écran
            const icon = userPositionMarker.getIcon();
            if (icon) {
                // Compenser la rotation de la carte
                // iOS : carte = -mapBearing → flèche = +mapBearing
                // Android : carte = +appliedBearing → flèche = -appliedBearing
                if (isAndroid) {
                    // Utiliser appliedBearing lissé pour la flèche aussi
                    currentArrowRotation = -bearingSmoothed;
                } else {
                    currentArrowRotation = mapBearing;
                }
                
                icon.rotation = currentArrowRotation;
                userPositionMarker.setIcon(icon);
            }
            
            // S'assurer que la carte est centrée sur l'utilisateur
            if (!map.get('userHasPanned')) {
                map.setCenter(userPos);
            }
        }
    }
    
    // Libérer le flag
    window.isHandlingOrientation = false;
}

// ========== ANDROID : Fonctions utilitaires pour filtrage ========== 
// Normaliser angle 0-360
const norm360 = (a) => ((a % 360) + 360) % 360;

// Différence angulaire (gère le passage 0-360)
const angDiff = (a, b) => {
    const d = norm360(a) - norm360(b);
    return ((d + 540) % 360) - 180;
};

// EMA (Exponential Moving Average) angulaire
const emaAngle = (prev, next, alpha = 0.15) => {
    return norm360(prev + alpha * angDiff(next, prev));
};

// Médiane glissante (anti-spike)
const pushHeadingMedian = (h) => {
    headingWindow.push(norm360(h));
    if (headingWindow.length > 5) headingWindow.shift();
    const sorted = [...headingWindow].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2) return sorted[mid];
    return norm360((sorted[mid - 1] + sorted[mid]) / 2);
};

// Fonction pour calculer l'azimuth entre deux points
function calculateAzimuth(from, to) {
    // Vérifier que les paramètres sont valides
    if (!from || !to || 
        typeof from.lat === 'undefined' || typeof from.lng === 'undefined' ||
        typeof to.lat === 'undefined' || typeof to.lng === 'undefined') {
        console.error("Paramètres invalides pour calculateAzimuth:", { from, to });
        return 0; // Retourner 0 au lieu de NaN
    }
    
    const lat1 = from.lat * Math.PI / 180;
    const lat2 = to.lat * Math.PI / 180;
    const lng1 = from.lng * Math.PI / 180;
    const lng2 = to.lng * Math.PI / 180;
    
    const dLng = lng2 - lng1;
    
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
    let azimuth = Math.atan2(y, x) * 180 / Math.PI;
    
    // Normaliser entre 0 et 360
    while (azimuth < 0) azimuth += 360;
    while (azimuth >= 360) azimuth -= 360;
    
    // Vérifier que le résultat est valide
    if (isNaN(azimuth)) {
        console.error("Azimuth calculé est NaN:", { from, to, lat1, lat2, lng1, lng2, dLng, x, y });
        return 0; // Retourner 0 au lieu de NaN
    }
    
    return azimuth;
}

function getUserPosition(successCallback, errorCallback, options) {
    if (navigator.geolocation) {
        // Si l'autorisation a déjà été demandée dans cette session, utiliser directement getCurrentPosition
        if (geoPermissionRequested) {
            navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
            return;
        }
        
        // Marquer que l'autorisation va être demandée
        geoPermissionRequested = true;
        
        // Vérifier d'abord l'état de l'autorisation via l'API Permissions si disponible
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
                
                if (permissionStatus.state === 'granted') {
                    // Autorisation déjà accordée, utiliser directement getCurrentPosition
                    localStorage.setItem('geoPermissionGranted', 'true');
                    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
                } else if (permissionStatus.state === 'denied') {
                    // Autorisation refusée
                    localStorage.setItem('geoPermissionGranted', 'false');
                    errorCallback(new Error("Autorisation de géolocalisation refusée"));
                } else {
                    // État 'prompt' - demander l'autorisation
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            // Autorisation accordée, mémoriser
                            localStorage.setItem('geoPermissionGranted', 'true');
                            successCallback(position);
                        },
                        (error) => {
                            // Autorisation refusée, mémoriser aussi
                            localStorage.setItem('geoPermissionGranted', 'false');
                            errorCallback(error);
                        },
                        options
                    );
                }
            }).catch(() => {
                // Fallback si l'API Permissions n'est pas disponible
                fallbackGetUserPosition(successCallback, errorCallback, options);
            });
        } else {
            // Fallback pour les navigateurs qui ne supportent pas l'API Permissions
            fallbackGetUserPosition(successCallback, errorCallback, options);
        }
    } else {
        console.error("La géolocalisation n'est pas supportée par ce navigateur.");
        if(errorCallback) errorCallback(new Error("Géolocalisation non supportée."));
    }
}

// Fonction de fallback pour les navigateurs sans API Permissions
function fallbackGetUserPosition(successCallback, errorCallback, options) {
    const geoPermissionGranted = localStorage.getItem('geoPermissionGranted');
    const isFirstLaunch = !localStorage.getItem('appLaunchedBefore');
    
    // Si l'autorisation a déjà été demandée dans cette session, utiliser directement getCurrentPosition
    if (geoPermissionRequested) {
        navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
        return;
    }
    
    // Au premier lancement ou si pas d'autorisation, forcer la demande
    if (geoPermissionGranted === 'true' && !isFirstLaunch) {
        // L'autorisation a déjà été donnée, utiliser directement getCurrentPosition
        geoPermissionRequested = true; // Marquer comme demandée
        navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
    } else {
        // Première fois ou autorisation non accordée, demander l'autorisation et la mémoriser
        geoPermissionRequested = true; // Marquer comme demandée
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Autorisation accordée, mémoriser
                localStorage.setItem('geoPermissionGranted', 'true');
                successCallback(position);
            },
            (error) => {
                // Autorisation refusée, mémoriser aussi
                localStorage.setItem('geoPermissionGranted', 'false');
                errorCallback(error);
            },
            options
        );
    }
}

// Nouvelle fonction popup harmonisée
function showStyledPopup(title, message, onClose, closeTextOverride) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 9999;

    const box = document.createElement('div');
    box.style.background = 'url("images/parchemin.jpg") center/cover';
    box.style.border = '4px solid #b8860b';
    box.style.borderRadius = '18px';
    box.style.boxShadow = '0 0 24px #0008';
    box.style.color = '#4b2e05';
    box.style.fontFamily = 'MedievalSharp, Arial, serif';
    box.style.padding = '32px 24px 24px 24px';
    box.style.maxWidth = '90vw';
    box.style.width = '400px';
    box.style.textAlign = 'center';
    box.style.position = 'relative';

    const titleElem = document.createElement('h2');
    titleElem.textContent = title;
    titleElem.style.fontWeight = 'bold';
    titleElem.style.fontSize = '1.3em';
    titleElem.style.color = '#b30000';
    titleElem.style.marginBottom = '15px';
    box.appendChild(titleElem);

    const msgElem = document.createElement('div');
    msgElem.innerHTML = message;
    msgElem.style.marginBottom = '25px';
    msgElem.style.color = '#4b2e05';
    msgElem.style.lineHeight = '1.5';
    box.appendChild(msgElem);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = closeTextOverride || (window.translationManager ? window.translationManager.translate('close') : 'FERMER');
    closeBtn.style.background = '#b30000';
    closeBtn.style.color = 'white';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '8px';
    closeBtn.style.padding = '12px 28px';
    closeBtn.style.fontSize = '1.1rem';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontFamily = 'MedievalSharp, Arial, serif';
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        if (onClose) onClose();
    });
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

// Utilisation pour le début du parcours
// Remplacer : showInfoPopup("Premier point", "Vous êtes déjà au début du parcours !");
// Par :
// showStyledPopup("Premier point", "Vous êtes déjà au début du parcours !");

// Utilisation pour l'aide boussole
// Remplacer l'appel showInfoPopup("Boussole", ...) par showStyledPopup("Boussole", ...);

function showInfoPopup(title, message, onClose) {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(0,0,0,0.7)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = 9999;

  const box = document.createElement('div');
  box.style.background = '#fffbe6';
  box.style.padding = '32px 24px 24px 24px';
  box.style.borderRadius = '18px';
  box.style.boxShadow = '0 4px 32px #0005';
  box.style.textAlign = 'center';
  box.style.maxWidth = '90vw';
  box.style.fontSize = '1.1em';

  const titleElem = document.createElement('h2');
  titleElem.textContent = title;
  titleElem.style.marginBottom = '16px';
  titleElem.style.color = '#b30000';
  box.appendChild(titleElem);

  const msgElem = document.createElement('div');
  msgElem.innerHTML = message;
  msgElem.style.marginBottom = '24px';
  box.appendChild(msgElem);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'FERMER';
  closeBtn.style.background = '#b30000';
  closeBtn.style.color = 'white';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.style.fontSize = '1.1em';
  closeBtn.style.border = 'none';
  closeBtn.style.borderRadius = '8px';
  closeBtn.style.padding = '10px 28px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => {
    document.body.removeChild(overlay);
    if (onClose) onClose();
  };
  box.appendChild(closeBtn);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// === Fonction pour afficher le popup de fin de parcours ===
function showEndOfTourPopup() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.8)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 9999;

    const box = document.createElement('div');
    box.style.background = 'url("images/parchemin.jpg") center/cover';
    box.style.border = '6px solid #b8860b';
    box.style.borderRadius = '20px';
    box.style.boxShadow = '0 0 32px #000a';
    box.style.color = '#4b2e05';
    box.style.fontFamily = 'MedievalSharp, Arial, serif';
    box.style.padding = '40px 32px 32px 32px';
    box.style.maxWidth = '500px';
    box.style.textAlign = 'center';
    box.style.position = 'relative';

    const icon = document.createElement('div');
    icon.textContent = '⚔️🐉🏆';
    icon.style.fontSize = '3em';
    icon.style.marginBottom = '16px';
    box.appendChild(icon);

    const title = document.createElement('div');
    const victoryText = window.translationManager ? window.translationManager.translate('victory') : 'Victoire !';
    title.textContent = victoryText;
    title.style.fontWeight = 'bold';
    title.style.fontSize = '1.5em';
    title.style.color = '#b30000';
    title.style.marginBottom = '20px';
    box.appendChild(title);

    const msg = document.createElement('div');
    const victoryMessage = window.translationManager ? window.translationManager.translate('victory_message') : "C'est la dernière étape de votre parcours !<br><br>Bravo, vous avez vaincu le Dragon !<br>La bête est terrassée !<br><br><strong>Ein V'la co pou ein an !</strong><br><br>À l'arrivée, si vous le souhaitez, vous pourrez prendre un selfie avec Saint Georges !";
    msg.innerHTML = victoryMessage;
    msg.style.marginBottom = '28px';
    msg.style.color = '#222';
    box.appendChild(msg);

    const btnCompris = document.createElement('button');
    const understoodText = window.translationManager ? window.translationManager.translate('understood') : 'COMPRIS';
    btnCompris.textContent = understoodText;
    btnCompris.style.background = '#b30000';
    btnCompris.style.color = '#fff';
    btnCompris.style.fontWeight = 'bold';
    btnCompris.style.border = 'none';
    btnCompris.style.borderRadius = '10px';
    btnCompris.style.padding = '12px 24px';
    btnCompris.style.fontSize = '1.1em';
    btnCompris.style.cursor = 'pointer';
    btnCompris.style.fontFamily = 'MedievalSharp, Arial, serif';
    btnCompris.addEventListener('click', () => {
        document.body.removeChild(overlay);
        // Afficher le bouton selfie
        const selfieBtn = document.getElementById('selfie-btn');
        if (selfieBtn) {
            selfieBtn.style.display = 'block';
        }
    });

    box.appendChild(btnCompris);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

document.addEventListener("DOMContentLoaded", () => {
    nextButton = document.getElementById('next-btn');
    prevButton = document.getElementById('prev-btn');
    homeButton = document.getElementById('home-btn');
    cultureButton = document.getElementById('culture-btn');
    audioBtn = document.getElementById('audio-btn');
    doudouBtn = document.getElementById('doudou-btn');
    pauseBtn = document.getElementById('pause-btn');
    stopBtn = document.getElementById('stop-btn');
    restartBtn = document.getElementById('restart-btn');
    const selfieBtn = document.getElementById('selfie-btn');
    const pwaInstallBtn = document.getElementById('pwa-install-btn');

    // Lancer le processus (le splash screen sera caché une fois la carte prête)
    startMap();

    // Vérifier si le tour est terminé (après refus du selfie ou retour depuis selfie)
    if (localStorage.getItem('tourCompleted') === 'true') {
        disableAllControls();
    }

    // --- Ajout des écouteurs d'événements ---
    
    // Écouteur pour le bouton selfie
    if (selfieBtn) {
        selfieBtn.addEventListener('click', () => {
            // Arrêter tous les flux caméra ouverts
            if (window.stream) {
                try {
                    window.stream.getTracks().forEach(track => track.stop());
                } catch (e) {
                    console.error('Erreur lors de l\'arrêt du flux caméra', e);
                }
            } else {
            }
            // Redirection vers la page selfie
            window.location.href = 'selfie.html';
        });
    }
    
    // Écouteur pour le bouton d'installation PWA
    if (pwaInstallBtn) {
        pwaInstallBtn.addEventListener('click', () => {
            if (window.showManualInstructions) {
                window.showManualInstructions();
            } else {
            }
        });
    }
    
    nextButton.addEventListener('click', () => {
        
        // Masquer la flèche de guidage 2 si elle est visible
        if (typeof hideGuideArrow2 === 'function') {
            hideGuideArrow2();
        }
        
        stopAllAudio();
        if (localStorage.getItem("mons_quizEnabled") === null) {
            showQuizPrompt((wantsQuiz) => {
                quizEnabled = wantsQuiz;
                if (quizEnabled) {
                    showQuizForCurrentPoint(() => advanceToNextPoint());
                } else {
                    advanceToNextPoint();
                }
            });
        } else {
            quizEnabled = localStorage.getItem("mons_quizEnabled") === "true";
            if (quizEnabled) {
                showQuizForCurrentPoint(() => advanceToNextPoint());
            } else {
                advanceToNextPoint();
            }
        }
    });

    prevButton.addEventListener('click', () => {
        stopAllAudio();
        if (currentIndex > 0) {
            isReturning = true;
            if (distanceStack.length > 0) {
                const lastDistance = distanceStack.pop();
                totalDistance -= lastDistance;
            }
            // Enregistrer le point actuel comme visité avant de reculer
            const visitedPoints = JSON.parse(localStorage.getItem('mons_visitedPoints') || '[]');
            if (!visitedPoints.includes(currentIndex)) {
                visitedPoints.push(currentIndex);
                localStorage.setItem('mons_visitedPoints', JSON.stringify(visitedPoints));
            }
            currentIndex--;
            // Réinitialiser le flag pour permettre l'ajout de la distance au point précédent
            distanceAlreadyAddedForCurrentPoint = false;
            steps = [];
            currentStepIndex = 0;
            localStorage.setItem("mons_currentIndex", currentIndex);
            localStorage.setItem("mons_score", score);
            updateLocation();
        } else {
            showStyledPopup(
                window.translationManager ? window.translationManager.translate('first_point_title') : "Premier point",
                window.translationManager ? window.translationManager.translate('first_point_message') : "Vous êtes déjà au début du parcours !"
            );
        }
    });

    homeButton.addEventListener("click", () => {
        const isMuseumMode = localStorage.getItem("museumMode") === "true";
        
        if (isMuseumMode) {
            // En mode musée, rediriger vers la sélection de langue
            showHomeConfirmPopup(() => {
                stopAllAudio();
                const orientationPerm = localStorage.getItem('orientationPermissionGranted');
                localStorage.clear();
                if (orientationPerm) localStorage.setItem('orientationPermissionGranted', orientationPerm);
                window.location.href = "language-selection.html";
            });
        } else {
            // En mode parcours normal, vérifier si l'app est installée et si un code valide existe
            showHomeConfirmPopup(() => {
                stopAllAudio();
                handleResetWithCodeCheck();
            });
        }
    });

    audioBtn.addEventListener('click', () => {
        // Masquer la flèche de guidage 1 si elle est visible
        if (typeof hideGuideArrow1 === 'function') {
            hideGuideArrow1();
        }
        
        stopAllAudio();
        const current = filteredLocations[currentIndex];
        const imageElement = document.getElementById("point-image");
        if(current && current.audio) {
            const textFile = `data/${normalizeFileName(current.name)}.txt`;
            playExclusiveAudio(current.audio, textFile, imageElement);
        }
    });

    doudouBtn.addEventListener('click', () => {
        stopAllAudio();
        const imageElement = document.getElementById("point-image");
        const textContainer = document.getElementById("media-display");
        
        fetch('data/Texte_chanson_doudou.txt')
            .then(response => response.text())
            .then(text => {
                if (textContainer) {
                    currentDescriptionText = text; // Mémoriser les paroles
                    isDoudouSongPlaying = true;    // Activer le flag
                    textContainer.innerText = text;
                    textContainer.style.display = "block";
                }
                if (imageElement) imageElement.style.display = "none";
            });
        
        playExclusiveAudio("Chansons/air_doudou.mp3");
    });

    // --- Ajout : mémorisation de la langue de la dernière lecture audio ---
    let lastAudioLang = null;

    pauseBtn.addEventListener('click', () => {
        const currentLang = window.translationManager ? window.translationManager.getCurrentLanguage() : 'fr';
        if (currentAudio) {
            if (!currentAudio.paused) {
                currentAudio.pause();
                pauseBtn.textContent = "▶️";
            } else {
                // Si la langue a changé depuis la dernière lecture, relancer l'audio dans la nouvelle langue
                if (lastAudioLang !== currentLang) {
                    const current = filteredLocations[currentIndex];
                    const imageElement = document.getElementById("point-image");
                    if(current && current.audio) {
                        const textFile = `data/${normalizeFileName(current.name)}.txt`;
                        playExclusiveAudio(current.audio, textFile, imageElement);
                        lastAudioLang = currentLang;
                    }
                    pauseBtn.textContent = "⏸️";
                } else {
                    currentAudio.play();
                    pauseBtn.textContent = "⏸️";
                    // Restaurer le texte (description ou chanson) si on reprend la lecture
                    if (currentDescriptionText) {
                        const imageElement = document.getElementById("point-image");
                        const textContainer = document.getElementById("media-display");
                        if (imageElement && textContainer) {
                            imageElement.style.display = "none";
                            textContainer.style.display = "block";
                            textContainer.innerText = currentDescriptionText;
                        }
                    }
                }
            }
        } else {
            // Si aucun audio n'est chargé (après stop ou fin), relancer la description et l'audio dans la langue courante
            const current = filteredLocations[currentIndex];
            const imageElement = document.getElementById("point-image");
            if(current && current.audio) {
                const textFile = `data/${normalizeFileName(current.name)}.txt`;
                playExclusiveAudio(current.audio, textFile, imageElement);
                lastAudioLang = currentLang;
            }
            pauseBtn.textContent = "⏸️";
        }
    });

    stopBtn.addEventListener('click', () => {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            pauseBtn.textContent = "▶️";

            // Revert UI to image view, mais SANS vider le texte mémorisé
            const imageElement = document.getElementById("point-image");
            const textContainer = document.getElementById("media-display");
            if (imageElement && textContainer) {
                imageElement.style.display = "block";
                textContainer.style.display = "none";
                textContainer.innerText = "";
            }
        }
    });

    restartBtn.addEventListener('click', () => {
        if (currentAudio) {
            currentAudio.currentTime = 0;
            currentAudio.play();
            pauseBtn.textContent = "⏸️";

            // Ré-afficher le texte (description ou chanson) au redémarrage
            if (currentDescriptionText) {
                const imageElement = document.getElementById("point-image");
                const textContainer = document.getElementById("media-display");
                if (imageElement && textContainer) {
                    imageElement.style.display = "none";
                    textContainer.style.display = "block";
                    textContainer.innerText = currentDescriptionText;
                }
            }
        }
    });

    cultureButton.addEventListener("click", () => {
        stopAllAudio();
        localStorage.setItem("mons_currentIndex", currentIndex);
        localStorage.setItem("mons_score", score);
        window.location.href = "culture.html?v=" + Date.now();
    });

    // Popup d'aide pour la boussole au premier démarrage
    const compassHelpShown = localStorage.getItem('compassHelpShown');
    const orientationPermissionGranted = localStorage.getItem('orientationPermissionGranted') === 'true';

   
    // Afficher le popup si l'aide n'a pas déjà été montrée et si l'autorisation n'est pas accordée
    if (!compassHelpShown && !orientationPermissionGranted) {
        showTranslatedPopup('compass_title', 'compass_message');
    }

    // Affichage temporaire du bouton selfie pour les tests
    if (selfieBtn) {
        selfieBtn.style.display = 'block';
    }
});

function disableAllControls() {
    // Désactiver seulement les boutons de navigation et l'audio du point
    const buttonsToDisable = [
        nextButton, prevButton, audioBtn
    ];
    
    buttonsToDisable.forEach(button => {
        if (button) {
            button.disabled = true;
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
        }
    });

    // Cacher le bouton selfie
    const selfieBtn = document.getElementById('selfie-btn');
    if (selfieBtn) {
        selfieBtn.style.display = 'none';
    }

    if (map) {
        map.setOptions({ gestureHandling: 'none', zoomControl: false });
    }
}

// Fonction universelle pour tous les popups harmonisés
function showUniversalPopup({
  title = '',
  message = '',
  buttons = [{ label: 'FERMER', color: '#b30000', onClick: null }],
  icon1 = '⚔️',
  icon2 = '🐉',
  id = ''
}) {
  // Empêcher les doublons
  if (id && document.getElementById(id)) return;

  const overlay = document.createElement('div');
  if (id) overlay.id = id;
  overlay.style.position = 'fixed';
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(0,0,0,0.7)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = 9999;

  const box = document.createElement('div');
  box.style.background = 'url("images/parchemin.jpg") center/cover';
  box.style.border = '4px solid #b8860b';
  box.style.borderRadius = '18px';
  box.style.boxShadow = '0 0 24px #0008';
  box.style.color = '#4b2e05';
  box.style.fontFamily = 'MedievalSharp, Arial, serif';
  box.style.padding = '32px 24px 24px 24px';
  box.style.maxWidth = '90vw';
  box.style.width = '420px';
  box.style.textAlign = 'center';
  box.style.position = 'relative';

  // Icônes
  const icons = document.createElement('div');
  icons.style.fontSize = '2.5em';
  icons.style.marginBottom = '8px';
  icons.innerHTML = `<span>${icon1}</span> <span>${icon2}</span>`;
  box.appendChild(icons);

  // Titre
  const titleElem = document.createElement('div');
  titleElem.textContent = title;
  titleElem.style.fontWeight = 'bold';
  titleElem.style.fontSize = '1.4em';
  titleElem.style.color = '#b30000';
  titleElem.style.marginBottom = '12px';
  box.appendChild(titleElem);

  // Message
  const msgElem = document.createElement('div');
  msgElem.innerHTML = message;
  msgElem.style.marginBottom = '28px';
  msgElem.style.color = '#222';
  msgElem.style.fontFamily = 'MedievalSharp, Arial, serif';
  msgElem.style.fontSize = '1.08em';
  box.appendChild(msgElem);

  // Boutons
  const btns = document.createElement('div');
  btns.style.display = 'flex';
  btns.style.justifyContent = 'center';
  btns.style.gap = '18px';
  buttons.forEach(btn => {
    const button = document.createElement('button');
    button.textContent = btn.label;
    button.style.background = btn.color;
    button.style.color = '#fff';
    button.style.fontWeight = 'bold';
    button.style.border = 'none';
    button.style.borderRadius = '8px';
    button.style.padding = '12px 28px';
    button.style.fontSize = '1.1rem';
    button.style.cursor = 'pointer';
    button.style.fontFamily = 'MedievalSharp, Arial, serif';
    button.addEventListener('click', () => {
      document.body.removeChild(overlay);
      if (btn.onClick) btn.onClick();
    });
    btns.appendChild(button);
  });
  box.appendChild(btns);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// Remplacer tous les anciens popups par showUniversalPopup avec les bons paramètres (titre, message, boutons, callbacks)

// --- Correction du popup boussole - style unifié ---
function showCompassHelpPopup() {
    // Créer l'overlay
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 10002;

    // Créer la boîte du popup - style unifié (centré via CSS popup-confirm)
    const box = document.createElement('div');
    box.className = 'popup-confirm';
    // Le centrage est géré par la classe popup-confirm via position: fixed, top: 50%, left: 50%, transform: translate(-50%, -50%)
    // On garde seulement les styles essentiels qui peuvent être overridés si nécessaire
    box.style.textAlign = 'center';

    // Icône
    const icon = document.createElement('div');
    icon.textContent = '🧭';
    icon.style.fontSize = '3em';
    icon.style.marginBottom = '16px';
    box.appendChild(icon);

    // Titre - style unifié
    const title = document.createElement('div');
    title.className = 'popup-title';
    const compassTitle = window.translationManager && window.translationManager.isLoaded ? 
        window.translationManager.translate('compass_title') : 'Boussole';
    title.textContent = compassTitle;
    title.style.fontWeight = '700';
    title.style.fontSize = '1.45rem';
    title.style.marginBottom = '18px';
    title.style.color = '#14365c';
    title.style.textShadow = '0 2px 4px rgba(0,0,0,0.25)';
    box.appendChild(title);

    // Message - couleur plus claire pour les explications (identique à parcours.html)
    const msg = document.createElement('div');
    const compassMsg = window.translationManager && window.translationManager.isLoaded ? 
        window.translationManager.translate('compass_message') : "APPUYER SUR L'ICONE BOUSSOLE AUTANT DE FOIS QUE NECESSAIRE POUR BENEFICIER DU GUIDAGE FLECHE";
    msg.innerHTML = compassMsg;
    msg.style.marginBottom = '24px';
    msg.style.color = '#2b6cb0';
    msg.style.fontSize = '14px';
    msg.style.lineHeight = '1.5';
    box.appendChild(msg);

    // Bouton boussole - style unifié
    const compassBtnPopup = document.createElement('button');
    compassBtnPopup.innerHTML = '🧭';
    compassBtnPopup.style.background = '#14365c';
    compassBtnPopup.style.color = 'white';
    compassBtnPopup.style.fontWeight = '600';
    compassBtnPopup.style.fontSize = '2em';
    compassBtnPopup.style.border = 'none';
    compassBtnPopup.style.borderRadius = '12px';
    compassBtnPopup.style.padding = '14px 32px';
    compassBtnPopup.style.cursor = 'pointer';
    compassBtnPopup.style.marginTop = '10px';
    compassBtnPopup.style.boxShadow = '0 8px 18px rgba(20,54,92,0.25)';
    compassBtnPopup.title = compassTitle;
    compassBtnPopup.addEventListener('click', (event) => {
        // Empêcher la propagation de l'événement
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        // Désactiver le bouton pour éviter les clics multiples
        compassBtnPopup.disabled = true;
        compassBtnPopup.style.opacity = '0.5';
        compassBtnPopup.style.cursor = 'not-allowed';
        
        
        // Nettoyer les permissions d'orientation pour forcer la demande
        localStorage.removeItem('orientationPermissionGranted');
        localStorage.removeItem('compassGuidanceActive');
        orientationPermissionRequested = false;
        
        
        // Fermer le popup immédiatement pour éviter les problèmes de timing
        setTimeout(() => {
            try {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                } else {
                }
            } catch (error) {
                console.error("🧭 Erreur lors de la fermeture du popup:", error);
            }
        }, 100); // Petit délai pour s'assurer que l'événement est traité
        
        // Demander l'autorisation d'orientation et activer le guidage fléché
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        localStorage.setItem('orientationPermissionGranted', 'true');
                        activateCompass();
                    } else {
                        // Autorisation refusée, mémoriser aussi
                        localStorage.setItem('orientationPermissionGranted', 'false');
                    }
                })
                .catch(error => {
                    console.error("Erreur lors de la demande d'autorisation d'orientation:", error);
                });
        } else {
            // Navigateur qui ne nécessite pas d'autorisation explicite
            localStorage.setItem('orientationPermissionGranted', 'true');
            activateCompass();
        }
    });
    box.appendChild(compassBtnPopup);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
}



// --- Correction de la ligne d'info (heure/minutes, etc.) ---
function formatDuration(duration, lang) {
    // duration est une string comme "1 heure 12 min" ou "1 hour 12 min"
    // On veut remplacer les unités par la traduction
    if (!duration) return '';
    lang = lang || (window.translationManager ? window.translationManager.getCurrentLanguage() : 'fr');
    
    // Nettoyer d'abord le texte des traductions précédentes
    // Supprimer toutes les traductions possibles des unités de temps
    let cleanedDuration = duration
        .replace(/(Temps|Time|Tijd)\s*/g, '') // Supprimer les labels de temps traduits
        .replace(/(estimé|estimated|geschat)\s*:\s*/g, '') // Supprimer "estimé :"
        .replace(/(heures?|hours?|uren?)\s*/g, 'HEURE_PLACEHOLDER') // Remplacer temporairement
        .replace(/(heure|hour|uur)\s*/g, 'HEURE_PLACEHOLDER') // Remplacer temporairement
        .replace(/(minutes?|minuten?)\s*/g, 'MINUTE_PLACEHOLDER') // Remplacer temporairement
        .replace(/(min)\s*/g, 'MINUTE_PLACEHOLDER'); // Remplacer temporairement
    
    // Maintenant appliquer les nouvelles traductions
    let hKey = 'hour', hsKey = 'hours', mKey = 'minute', msKey = 'minutes';
    if (window.translationManager) {
        hKey = window.translationManager.translate('hour');
        hsKey = window.translationManager.translate('hours');
        mKey = window.translationManager.translate('minute');
        msKey = window.translationManager.translate('minutes');
    }
    
    // Remplacer les placeholders par les vraies traductions
    return cleanedDuration
        .replace(/HEURE_PLACEHOLDER/g, hKey)
        .replace(/MINUTE_PLACEHOLDER/g, mKey);
}

// --- Correction de l'affichage dynamique de la ligne d'info ---
// Dans la fonction qui affiche la ligne d'info (ex: calculateRoute, updateDisplayFallback, etc.),
// remplacer l'affichage de duration par formatDuration(duration)
// Exemple :
// const durationText = formatDuration(duration);
// ... puis utiliser durationText dans la ligne d'info

// --- Synchronisation du sélecteur de langue sur main.html ---
document.addEventListener('DOMContentLoaded', function() {
    if (window.languageSelector) {
        window.languageSelector.updateSelectorValue && window.languageSelector.updateSelectorValue();
    }
    
    // Écouter les changements de langue via un événement personnalisé
    document.addEventListener('languageChanged', function(event) {
        
        // Réinitialiser l'audio si un audio est en cours de lecture
        if (currentAudio && !currentAudio.paused) {
            
            // Mémoriser les informations de l'audio en cours
            const currentAudioSrc = currentAudio.src;
            const currentLocation = filteredLocations[currentIndex];
            
            // Arrêter l'audio actuel
            currentAudio.pause();
            currentAudio.currentTime = 0;
            
            // Relancer l'audio dans la nouvelle langue après un court délai
            setTimeout(() => {
                if (currentLocation && currentLocation.audio) {
                    const imageElement = document.getElementById("point-image");
                    const textFile = `data/${normalizeFileName(currentLocation.name)}.txt`;
                    playExclusiveAudio(currentLocation.audio, textFile, imageElement);
                }
            }, 100);
        }
        
        // Recharger les descriptions pour la nouvelle langue
        loadDescriptions();
        
        // Mettre à jour le splash screen si il est visible (seulement sur index.html)
        const isOnIndexPage = window.location.pathname.endsWith('index.html') || 
                             window.location.pathname.endsWith('/') || 
                             window.location.pathname === '';
        if (isOnIndexPage) {
            const splashText = document.getElementById('splash-text');
            if (splashText && window.translationManager) {
                const translation = window.translationManager.translate('splash_waiting');
                if (translation !== 'splash_waiting') {
                    splashText.innerHTML = translation;
                }
            }
        }
        
        // Mettre à jour la description affichée si elle est visible
        setTimeout(() => {
            const textContainer = document.getElementById("media-display");
            if (textContainer && textContainer.style.display !== "none") {
                const currentLocation = filteredLocations[currentIndex];
                if (currentLocation) {
                    const newDescription = getDescription(currentLocation.name);
                    if (newDescription) {
                        currentDescriptionText = newDescription;
                        textContainer.innerText = newDescription;
                    }
                }
            }
        }, 200); // Délai pour laisser le temps aux descriptions de se charger
        
        // Forcer la mise à jour de la ligne d'info
        setTimeout(updateCurrentDisplay, 100); // Petit délai pour laisser le temps aux traductions de se charger
    });
});

function showTranslatedPopup(titleKey, messageKey) {
    function tryShow() {
        if (window.translationManager && window.translationManager.isLoaded) {
            const title = window.translationManager.translate(titleKey);
            const message = window.translationManager.translate(messageKey);
            const closeText = window.translationManager.translate('close');
            
            // Si c'est la popup boussole, utiliser la fonction spécialisée
            if (titleKey === 'compass_title' && messageKey === 'compass_message') {
                showCompassHelpPopup();
            } else {
                showStyledPopup(title, message, null, closeText);
            }
        } else {
            setTimeout(tryShow, 100); // Réessaie dans 100ms
        }
    }
    tryShow();
}
// Utilisation : showTranslatedPopup('compass_title', 'compass_message');

// Fonction pour mettre à jour l'affichage actuel de la ligne d'info
function updateCurrentDisplay() {
    const display = document.getElementById('location-name');
    if (!display) {
        return;
    }
    
    // Si on est en mode musée
    const isMuseumMode = localStorage.getItem("museumMode") === "true";
    if (isMuseumMode) {
        const selectedMuseum = localStorage.getItem("selectedMuseum");
        if (selectedMuseum) {
            const museumTarget = window.translationManager ? window.translationManager.translate('museum_target') : '🎯 Musée :';
            const estimatedTime = window.translationManager ? window.translationManager.translate('estimated_time') : 'Temps estimé :';
            const distanceLabel = window.translationManager ? window.translationManager.translate('distance') : 'Distance :';
            // On ne peut pas retrouver la durée et la distance sans recalcul, donc on laisse le texte existant traduit
            const currentText = display.textContent;
            const museumName = currentText.split(' – ')[0].replace('🎯 Musée : ', '');
            const timePart = currentText.split(' – ')[1] || '';
            const distancePart = currentText.split(' – ')[2] || '';
            if (timePart && distancePart) {
                const translatedTimePart = formatDuration(timePart.replace(/^Temps estimé : |Estimated time: /, ''));
                const newText = `${museumTarget} ${museumName} – ${estimatedTime} ${translatedTimePart} – ${distanceLabel} ${distancePart.replace(/^Distance : |Distance: /, '')}`;
                display.textContent = newText;
            }
        }
    } else {
        // Mode parcours normal - utiliser les valeurs sauvegardées
        const currentLocation = filteredLocations[currentIndex];
        if (currentLocation) {
            const nextPoint = window.translationManager ? window.translationManager.translate('next_point') : 'Prochain point :';
            const estimatedTime = window.translationManager ? window.translationManager.translate('estimated_time') : 'Temps estimé :';
            const distanceLabel = window.translationManager ? window.translationManager.translate('distance') : 'Distance :';
            const totalDistanceLabel = window.translationManager ? window.translationManager.translate('total_distance') : 'Distance totale :';
            const scoreText = window.translationManager ? window.translationManager.translate('score') : 'Score :';
            
            // Calculer le score maximum basé sur le nombre de questions posées
            const maxScore = getMaxScoreBasedOnQuestions();
            
            // Utiliser les valeurs sauvegardées dans les variables globales
            const totalKm = (totalDistance / 1000).toFixed(2);
            const translatedTimeValue = formatDuration(currentPointDuration);
            
            display.textContent = `${nextPoint} ${currentLocation.name} – ${estimatedTime} ${translatedTimeValue} – ${distanceLabel} ${currentPointDistance} – ${totalDistanceLabel} ${totalKm} km – ${scoreText} ${score}/${maxScore}`;
        }
    }
}

// Fonction pour charger les traductions du quiz
async function loadQuizTranslations() {
    try {
        const response = await fetch('translations/quiz_translations.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        window.quizTranslations = await response.json();
    } catch (error) {
        console.error('❌ Erreur lors du chargement des traductions du quiz:', error);
        window.quizTranslations = {};
    }
}

// Fonction pour réinitialiser la rotation de la carte
function resetMapRotation() {
    if (map) {
        try {
            // Méthode 1: Rotation via CSS (priorité sur mobile)
            const mapDiv = document.getElementById('map');
            if (mapDiv) {
                // Chercher l'élément Google Maps à l'intérieur
                const googleMapElement = mapDiv.querySelector('.gm-style') || mapDiv.querySelector('[style*="transform"]') || mapDiv;
                
                if (googleMapElement) {
                    googleMapElement.style.transform = 'rotate(0deg)';
                } else {
                    mapDiv.style.transform = 'rotate(0deg)';
                }
            } else {
                // Méthode 2: setHeading (si supporté)
                if (typeof map.setHeading === 'function') {
                    map.setHeading(0);
                } else {
                    // Méthode 3: setOptions
                    map.setOptions({ heading: 0 });
                }
            }
            
            // Remettre aussi la flèche à 0
            if (userPositionMarker) {
                const icon = userPositionMarker.getIcon();
                if (icon) {
                    icon.rotation = 0;
                    userPositionMarker.setIcon(icon);
                    currentArrowRotation = 0;
                }
            }
        } catch (error) {
            console.error("❌ Erreur lors de la réinitialisation de la rotation:", error);
        }
    }
}

// Fonction pour forcer le centrage de la carte sur l'utilisateur
function centerMapOnUser() {
    if (map && userPositionMarker) {
        const userPos = userPositionMarker.getPosition();
        if (userPos) {
            map.setCenter(userPos);
            map.set('userHasPanned', false);
        }
    }
}

// Fonction pour tester l'orientation
function testOrientation() {
    if (window.DeviceOrientationEvent) {
        // Test temporaire de l'orientation
        const testHandler = (event) => {
            // Supprimer le test après 3 secondes
            setTimeout(() => {
                window.removeEventListener('deviceorientation', testHandler);
            }, 3000);
        };
        
        window.addEventListener('deviceorientation', testHandler);
    }
}

// Fonction pour tester la rotation CSS
function testCSSRotation() {
    const mapDiv = document.getElementById('map');
    if (mapDiv) {
        // Chercher l'élément Google Maps à l'intérieur
        const googleMapElement = mapDiv.querySelector('.gm-style') || mapDiv.querySelector('[style*="transform"]') || mapDiv;
        
        if (googleMapElement) {
            // Test de rotation de 90 degrés sur l'élément Google Maps
            googleMapElement.style.transform = 'rotate(90deg)';
            
            // Remettre à 0 après 2 secondes
            setTimeout(() => {
                googleMapElement.style.transform = 'rotate(0deg)';
            }, 2000);
        } else {
            // Fallback sur le conteneur principal
            mapDiv.style.transform = 'rotate(90deg)';
            
            // Remettre à 0 après 2 secondes
            setTimeout(() => {
                mapDiv.style.transform = 'rotate(0deg)';
            }, 2000);
        }
    }
}


// Fonction pour gérer les changements d'orientation de l'appareil
function handleOrientationChange() {
    if (isCompassActive && userPositionMarker) {
        // Forcer une mise à jour de l'orientation pour corriger la rotation
        setTimeout(() => {
            // Déclencher un événement d'orientation factice pour forcer la mise à jour
            const fakeEvent = {
                webkitCompassHeading: null,
                alpha: 0
            };
            handleOrientation(fakeEvent);
        }, 100);
        
    }
}

// Fonction de test pour Android - rotation de la carte
function testAndroidRotation() {
    const isAndroid = /android/i.test(navigator.userAgent);
    if (isAndroid) {
        
        // Tester les différentes orientations
        const orientations = [0, 90, 180, 270];
        orientations.forEach((angle, index) => {
            setTimeout(() => {
                // Simuler l'orientation
                Object.defineProperty(window, 'orientation', {
                    value: angle,
                    writable: true
                });
                
                // Tester la correction
                const testRotation = 45; // Rotation de base
                const correctedRotation = correctRotationForDeviceOrientation(testRotation);
            }, index * 1000);
        });
    }
}

// Fonction pour restaurer l'état de la boussole
function restoreCompassState() {
    const orientationPermissionGranted = localStorage.getItem('orientationPermissionGranted');
    const compassGuidanceActive = localStorage.getItem('compassGuidanceActive');
    const isComingFromLanguageSelection = sessionStorage.getItem('comingFromLanguageSelection') === 'true';
    
    // Ne pas restaurer si on vient de language-selection.html
    if (isComingFromLanguageSelection) {
        return;
    }
    
    if (orientationPermissionGranted === 'true' && compassGuidanceActive === 'true') {
        orientationPermissionRequested = true;
        isCompassActive = true;
        
        // Android : utiliser deviceorientationabsolute pour avoir des valeurs absolues
        const isAndroid = /android/i.test(navigator.userAgent);
        if (isAndroid && 'ondeviceorientationabsolute' in window) {
            window.addEventListener('deviceorientationabsolute', handleOrientation, true);
        } else {
            window.addEventListener('deviceorientation', handleOrientation, true);
        }
        window.addEventListener('orientationchange', handleOrientationChange);
        
        // Attendre que la carte et le marqueur utilisateur soient prêts
        const checkAndRestore = () => {
            if (userPositionMarker && map) {
                const fakeEvent = {
                    webkitCompassHeading: 0,
                    alpha: 0
                };
                handleOrientation(fakeEvent);
            } else {
                setTimeout(checkAndRestore, 500);
            }
        };
        
        // Démarrer la vérification après un délai
        setTimeout(checkAndRestore, 1000);
    } else {
    }
}

document.addEventListener('DOMContentLoaded', () => {
    
    
    window.recalculateRoute = function() {
        if (userPositionMarker) {
            const currentPos = userPositionMarker.getPosition();
            if (currentPos) {
                const pos = { lat: currentPos.lat(), lng: currentPos.lng() };
                calculateRouteFromPosition(pos, "Votre position");
            } else {
            }
        } else {
        }
    };
    
    window.testPermissions = function() {
    };
    
    window.forcePermissionRequest = function() {
        // Nettoyer les permissions
        localStorage.removeItem('geoPermissionGranted');
        localStorage.removeItem('orientationPermissionGranted');
        localStorage.removeItem('compassGuidanceActive');
        // Réinitialiser les flags
        geoPermissionRequested = false;
        orientationPermissionRequested = false;
        mapLoadInitiated = false;
        // Marquer comme venant de language-selection
        sessionStorage.setItem('comingFromLanguageSelection', 'true');
        // Relancer updateLocation
        updateLocation();
    };
    
    window.forceCompassRequest = function() {
        // Nettoyer les permissions d'orientation
        localStorage.removeItem('orientationPermissionGranted');
        localStorage.removeItem('compassGuidanceActive');
        orientationPermissionRequested = false;
        // Afficher directement le popup de boussole
        showCompassHelpPopup();
    };
    
    // Nettoyer le sessionStorage quand l'utilisateur quitte la page
    window.addEventListener('pagehide', () => {
        sessionStorage.removeItem('comingFromLanguageSelection');
    });
});

function toggleCompass() {
    if (!orientationPermissionRequested) {
        // Demander la permission d'accès à l'orientation
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        orientationPermissionRequested = true;
                        localStorage.setItem('orientationPermissionGranted', 'true');
                        activateCompass();
                    } else {
                        alert('Permission refusée pour l\'accès à l\'orientation de l\'appareil.');
                    }
                })
                .catch(console.error);
        } else {
            // Sur les navigateurs qui ne demandent pas de permission
            orientationPermissionRequested = true;
            localStorage.setItem('orientationPermissionGranted', 'true');
            activateCompass();
        }
    }
    // Suppression de la logique de désactivation - la boussole reste toujours active
}

function activateCompass() {
    isCompassActive = true;
    localStorage.setItem('compassGuidanceActive', 'true');
    
    // Android : utiliser deviceorientationabsolute pour avoir des valeurs absolues
    const isAndroid = /android/i.test(navigator.userAgent);
    if (isAndroid && 'ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    } else {
        window.addEventListener('deviceorientation', handleOrientation, true);
    }
    window.addEventListener('orientationchange', handleOrientationChange);
}

// La fonction deactivateCompass n'est plus nécessaire car la boussole reste toujours active




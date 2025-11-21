# MODE D'EMPLOI COMPLET POUR LA MODIFICATION DE LA VILLE
## CityLoop Quest - Changement de Mons vers une autre ville (ex: Bruxelles)

---

## 📋 **PRÉREQUIS ET PRÉPARATION**

### **1.1 Informations nécessaires**
- **Nouveau nom de la ville** (ex: "Bruxelles", "Bruxelles", "Brussels")
- **Nouveau nom de la ville dans chaque langue** (ex: "Bruxelles" en français, "Brussels" en anglais, "Brussel" en néerlandais)
- **Nouveau nom des habitants** (ex: "Bruxellois", "Bruxellois", "Brusselaars")
- **Nouveau nom des habitants dans chaque langue**
- **Nouveau nom de la fête folklorique** (ex: "Ommegang" au lieu de "Ducasse")
- **Nouveau nom de la fête folklorique dans chaque langue**
- **Nouveau nom du dialecte local** (ex: "Bruxellois" au lieu de "Montois")
- **Nouveau nom du dialecte local dans chaque langue**

### **1.2 Structure des fichiers à modifier**
```
ROOT/
├── *.html                           ← PAGES HTML PRINCIPALES
├── *.js                             ← FICHIERS JAVASCRIPT
├── translations/                    ← FICHIERS DE TRADUCTION
├── data/                           ← FICHIERS DE DONNÉES
├── manifest.json                   ← MANIFESTE PWA
└── [autres fichiers...]
```

---

## 🔧 **ÉTAPE 1 : MODIFICATION DES FICHIERS HTML PRINCIPAUX**

### **1.1 Modifier `index.html`**

**Localiser et remplacer :**
```html
<!-- AVANT -->
<title>CityLoop Quest Mons</title>
<meta name="apple-mobile-web-app-title" content="CQ Mons">
<meta name="application-name" content="CLQ Mons">

<!-- APRÈS -->
<title>CityLoop Quest Bruxelles</title>
<meta name="apple-mobile-web-app-title" content="CQ Bruxelles">
<meta name="application-name" content="CLQ Bruxelles">
```

**Localiser et remplacer :**
```html
<!-- AVANT -->
CityLoop Quest Mons

<!-- APRÈS -->
CityLoop Quest Bruxelles
```

**Localiser et remplacer :**
```html
<!-- AVANT -->
<p>Pour installer CityLoop Quest Mons sur votre appareil iOS :</p>

<!-- APRÈS -->
<p>Pour installer CityLoop Quest Bruxelles sur votre appareil iOS :</p>
```

**Localiser et remplacer :**
```html
<!-- AVANT -->
<li>Lancez l'application CityLoop Quest Mons depuis l'icône installée</li>

<!-- APRÈS -->
<li>Lancez l'application CityLoop Quest Bruxelles depuis l'icône installée</li>
```

**Localiser et remplacer :**
```html
<!-- AVANT -->
<p>Pour installer CityLoop Quest Mons sur votre appareil :</p>

<!-- APRÈS -->
<p>Pour installer CityLoop Quest Bruxelles sur votre appareil :</p>
```

### **1.2 Modifier `language-selection.html`**

**Localiser et remplacer :**
```html
<!-- AVANT -->
<title>Sélection de langue</title>

<!-- APRÈS -->
<title>Sélection de langue - Bruxelles</title>
```

### **1.3 Modifier tous les autres fichiers HTML**

**Pour chaque fichier HTML, remplacer :**
```html
<!-- AVANT -->
<title>CityLoop Quest Bruxelles- Au cœur de l’Europe</title>
<h1>CityLoop Quest Bruxelles- Au cœur de l’Europe</h1>

<!-- APRÈS -->
<title>CityLoop Quest Bruxelles - La Chevauchée de Saint Georges</title>
<h1>CityLoop Quest Bruxelles - La Chevauchée de Saint Georges</h1>
```

**Fichiers concernés :**
- `associations.html`
- `anto_carte.html`
- `artistes_celebres.html`
- `albert_langue.html`
- `charles_plisnier.html`
- `chansons.html`
- `culture.html`
- `evenements.html`
- `folklore.html`
- `fernand_dumont.html`
- `histoire-ville.html`
- `jacques_du_broeucq.html`
- `la_ducasse_rituelle_*.html` (tous les fichiers)
- `marcel_lefrancq.html`
- `paul_verlaine.html`
- `pierre_coran.html`
- `roland_de_lassus.html`
- `salvatore_adamo.html`
- `victor_hugo.html`
- `vincent_van_gogh.html`

---

## 🔧 **ÉTAPE 2 : MODIFICATION DES FICHIERS JAVASCRIPT**

### **2.1 Modifier `app.js`**

**Localiser et remplacer TOUTES les occurrences :**
```javascript
// AVANT
localStorage.setItem("mons_completedQuizQuestions", ...)
localStorage.getItem("mons_visitedPoints")
localStorage.setItem("mons_visitedPoints", ...)
localStorage.setItem("mons_currentIndex", ...)
localStorage.setItem("mons_score", ...)
localStorage.getItem("mons_quizEnabled")
localStorage.setItem("mons_quizEnabled", ...)
localStorage.getItem("mons_forceTarget")

// APRÈS
localStorage.setItem("bruxelles_completedQuizQuestions", ...)
localStorage.getItem("bruxelles_visitedPoints")
localStorage.setItem("bruxelles_visitedPoints", ...)
localStorage.setItem("bruxelles_currentIndex", ...)
localStorage.setItem("bruxelles_score", ...)
localStorage.getItem("bruxelles_quizEnabled")
localStorage.setItem("bruxelles_quizEnabled", ...)
localStorage.getItem("bruxelles_forceTarget")
```

**⚠️ IMPORTANT :** Utiliser la fonction "Rechercher et remplacer" (Ctrl+H) pour remplacer **TOUTES** les occurrences de `mons_` par `bruxelles_` dans ce fichier.

### **2.2 Modifier `circuit.js`**

**Localiser et remplacer :**
```javascript
// AVANT
localStorage.setItem('mons_parcoursType', parcoursType);

// APRÈS
localStorage.setItem('bruxelles_parcoursType', parcoursType);
```

### **2.3 Modifier `circuit-data.js`**

**Localiser et remplacer :**
```javascript
// AVANT
{ name: "Prison de Mons", lat: 50.460282324772635, lng: 3.95132051280756, audio: "audio/PrisonDeMons.mp3" },
{ name: "Gare de Mons", lat: 50.45349764975374, lng: 3.9432988917169367, audio: "audio/GareDeMons.mp3" },

// APRÈS
{ name: "Prison de Bruxelles", lat: 50.8503, lng: 4.3517, audio: "audio/PrisonDeBruxelles.mp3" },
{ name: "Gare de Bruxelles", lat: 50.8503, lng: 4.3517, audio: "audio/GareDeBruxelles.mp3" },
```

**⚠️ IMPORTANT :** 
- Ajuster les coordonnées GPS (`lat`, `lng`) pour la nouvelle ville
- Modifier les noms des points d'intérêt
- Adapter les noms des fichiers audio

---

## 🔧 **ÉTAPE 3 : MODIFICATION DES FICHIERS DE TRADUCTION**

### **3.1 Modifier `translations/translations.json`**

**Localiser et remplacer TOUTES les occurrences :**
```json
// AVANT
"museum_circuit": "Parcours Musée de Urban Track Mons",
"museum_specific_circuit": "Parcours {museum} de Urban Track Mons",
"title_chevauchee": "CityLoop Quest Bruxelles- Au cœur de l’Europe",
"culture_title": "Culture montoise",
"culture_page_title": "🏛️ Espace Culturel Montois",
"culture_subtitle": "Explorez le patrimoine culturel de Mons",
"culture_btn_parler_montois": "Parler montois",
"chansons_title": "🎵 Chansons montoises",
"histoire_btn_bataille": "Bataille de Mons",
"histoire_btn_anges": "Les Anges de Mons",
"folklore_title": "🎭 Folklore Montois",
"circuit_short": "Parcours court de CityLoop Quest Mons",
"circuit_medium": "Parcours moyen de CityLoop Quest Mons",
"circuit_long": "Parcours long de CityLoop Quest Mons",
"circuit_default": "Parcours de CityLoop Quest Mons"

// APRÈS
"museum_circuit": "Parcours Musée de Urban Track Bruxelles",
"museum_specific_circuit": "Parcours {museum} de Urban Track Bruxelles",
"title_chevauchee": "CityLoop Quest Bruxelles - La Chevauchée de Saint Georges",
"culture_title": "Culture bruxelloise",
"culture_page_title": "🏛️ Espace Culturel Bruxellois",
"culture_subtitle": "Explorez le patrimoine culturel de Bruxelles",
"culture_btn_parler_montois": "Parler bruxellois",
"chansons_title": "🎵 Chansons bruxelloises",
"histoire_btn_bataille": "Bataille de Bruxelles",
"histoire_btn_anges": "Les Anges de Bruxelles",
"folklore_title": "🎭 Folklore Bruxellois",
"circuit_short": "Parcours court de CityLoop Quest Bruxelles",
"circuit_medium": "Parcours moyen de CityLoop Quest Bruxelles",
"circuit_long": "Parcours long de CityLoop Quest Bruxelles",
"circuit_default": "Parcours de CityLoop Quest Bruxelles"
```

**⚠️ IMPORTANT :** Répéter pour **TOUTES** les langues (fr, en, nl) dans le fichier.

### **3.2 Modifier `translations/translations_install.json`**

**Localiser et remplacer TOUTES les occurrences :**
```json
// AVANT
"install_intro": "Pour installer CityLoop Quest Mons sur votre appareil :",
"splash_title": "CityLoop Quest Bruxelles- Au cœur de l’Europe",
"ios_intro": "Pour installer CityLoop Quest Mons sur votre appareil iOS :",

// APRÈS
"install_intro": "Pour installer CityLoop Quest Bruxelles sur votre appareil :",
"splash_title": "CityLoop Quest Bruxelles - La Chevauchée de Saint Georges",
"ios_intro": "Pour installer CityLoop Quest Bruxelles sur votre appareil iOS :",
```

**⚠️ IMPORTANT :** Répéter pour **TOUTES** les langues (fr, en, nl) dans le fichier.

### **3.3 Modifier tous les autres fichiers de traduction**

**Pour chaque fichier dans `translations/`, remplacer :**
```json
// AVANT
"title": "CityLoop Quest Bruxelles- Au cœur de l’Europe",
"intro": "Le Prince des musiciens, aussi père de la chanson française, est Montois",
"histoiresTitle": "Histoires montoises",

// APRÈS
"title": "CityLoop Quest Bruxelles - La Chevauchée de Saint Georges",
"intro": "Le Prince des musiciens, aussi père de la chanson française, est Bruxellois",
"histoiresTitle": "Histoires bruxelloises",
```

**Fichiers concernés :**
- `translations_associations.json`
- `translations_charles_plisnier.json`
- `translations_evenements.json`
- `translations_folklore.json`
- `translations_musees.json`
- `translations_personnages.json`
- `translations_procession.json`
- `translations_personnalites_montoises.json`
- `translations_montois.json`
- `translations_roland_de_lassus.json`
- `translations_salvatore_adamo.json`
- `translations_la_ducasse_rituelle_*.json` (tous les fichiers)
- `descriptions.json`
- `quiz_translations.json`

---

## 🔧 **ÉTAPE 4 : MODIFICATION DES FICHIERS DE DONNÉES**

### **4.1 Modifier tous les fichiers dans `data/`**

**Pour chaque fichier `.txt`, remplacer :**
```text
// AVANT
L'ancienne caserne de la gendarmerie de Mons, située rue du Rossignol, est un édifice emblématique du patrimoine militaire montois.
Le Beffroi de Mons, surnommé El Catiau par les Montois, est un monument emblématique de la ville.
La Ducasse de Mons, également appelée « le Doudou », une fête folklorique inscrite depuis 2005 au patrimoine culturel immatériel de l'humanité par l'UNESCO.

// APRÈS
L'ancienne caserne de la gendarmerie de Bruxelles, située rue du Rossignol, est un édifice emblématique du patrimoine militaire bruxellois.
Le Beffroi de Bruxelles, surnommé El Catiau par les Bruxellois, est un monument emblématique de la ville.
L'Ommegang de Bruxelles, également appelé « le Doudou », une fête folklorique inscrite depuis 2005 au patrimoine culturel immatériel de l'humanité par l'UNESCO.
```

**⚠️ IMPORTANT :** 
- Remplacer **TOUTES** les occurrences de "Mons" par "Bruxelles"
- Remplacer **TOUTES** les occurrences de "montois" par "bruxellois"
- Remplacer **TOUTES** les occurrences de "Ducasse" par "Ommegang" (ou le nom approprié)
- Adapter les noms de rues, lieux, et références géographiques

**Fichiers concernés :**
- `Ancienne_Caserne_de_Gendarmerie.txt`
- `Ancien_Chateau_Comtal.txt`
- `Anciens_Abattoirs.txt`
- `Beffroi.txt`
- `Theatre_Royal.txt`
- `Statue_Saint_Georges.txt`
- `Statue_du_Dragon.txt`
- `Square.txt`
- `Singe_du_Grand_Garde.txt`
- `Ropieur.txt`
- `Porte_Rue_Courte.txt`
- `Place_du_Parc.txt`
- `Pilori.txt`
- `Parc_du_Waux_Hall.txt`
- `Musee_du_Doudou.txt`
- `Marche_aux_Herbes.txt`
- `Maison_Rue_de_Nimy_53.txt`
- `Maison_Rue_de_la_Couronne_20_22.txt`
- `Maison_Rue_de_Bertaimont_33.txt`
- `Maison_Rue_de_Bertaimont_17.txt`
- `Maison_Losseau.txt`
- `Machine_a_Eau.txt`
- `Le_Car_d_Or.txt`
- `Immeuble_Grand_Place_28_30.txt`
- `Immeuble_Grand_Place_14.txt`
- `Hotel_de_Ville.txt`
- `Hotel_de_la_Couronne.txt`
- `Grand-place.txt`
- `Fontaine_du_Rouge_Puits.txt`
- `Eglise_Saint_Nicolas.txt`
- `Eglise_Sainte_Elisabeth.txt`
- `Couvent_des_Soeurs_Noires.txt`
- `Conservatoire_Royal.txt`
- `Collegiale_Sainte_Waudru.txt`
- `Tresors_de_Sainte_Waudru.txt`
- `Texte_chanson_doudou.txt`
- `Maison_Espagnole.txt`
- `Gillis.txt`
- `Statue_Saint_Georges.txt`
- `Statue_du_Dragon.txt`
- `Square.txt`
- `Singe_du_Grand_Garde.txt`
- `Ropieur.txt`
- `Porte_Rue_Courte.txt`
- `Place_du_Parc.txt`
- `Pilori.txt`
- `Parc_du_Waux_Hall.txt`
- `Musee_du_Doudou.txt`
- `Marche_aux_Herbes.txt`
- `Maison_Rue_de_Nimy_53.txt`
- `Maison_Rue_de_la_Couronne_20_22.txt`
- `Maison_Rue_de_Bertaimont_33.txt`
- `Maison_Rue_de_Bertaimont_17.txt`
- `Maison_Losseau.txt`
- `Machine_a_Eau.txt`
- `Le_Car_d_Or.txt`
- `Immeuble_Grand_Place_28_30.txt`
- `Immeuble_Grand_Place_14.txt`
- `Hotel_de_Ville.txt`
- `Hotel_de_la_Couronne.txt`
- `Grand-place.txt`
- `Fontaine_du_Rouge_Puits.txt`
- `Eglise_Saint_Nicolas.txt`
- `Eglise_Sainte_Elisabeth.txt`
- `Couvent_des_Soeurs_Noires.txt`
- `Conservatoire_Royal.txt`
- `Collegiale_Sainte_Waudru.txt`
- `Tresors_de_Sainte_Waudru.txt`
- `Texte_chanson_doudou.txt`
- `Maison_Espagnole.txt`
- `Gillis.txt`

---

## 🔧 **ÉTAPE 5 : MODIFICATION DES NOMS DE FICHIERS**

### **5.1 Renommer les fichiers HTML**

**Renommer :**
```
// AVANT
la_ducasse_rituelle_*.html

// APRÈS
l_ommegang_rituel_*.html
```

**Fichiers à renommer :**
- `la_ducasse_rituelle_en_500_mots.html` → `l_ommegang_rituel_en_500_mots.html`
- `la_ducasse_rituelle_la_descente_de_la_chasse.html` → `l_ommegang_rituel_la_descente_de_la_chasse.html`
- `la_ducasse_rituelle_la_montee_du_car_dor.html` → `l_ommegang_rituel_la_montee_du_car_dor.html`
- `la_ducasse_rituelle_la_procession_du_car_dor.html` → `l_ommegang_rituel_la_procession_du_car_dor.html`
- `la_ducasse_rituelle_le_combat_dit_lumecon.html` → `l_ommegang_rituel_le_combat_dit_lumecon.html`
- `la_ducasse_rituelle_la_reconnaissance_unesco.html` → `l_ommegang_rituel_la_reconnaissance_unesco.html`
- `la_ducasse_rituelle_le_musee_du_doudou.html` → `l_ommegang_rituel_le_musee_du_doudou.html`

### **5.2 Renommer les fichiers de traduction**

**Renommer :**
```
// AVANT
translations_la_ducasse_rituelle_*.json

// APRÈS
translations_l_ommegang_rituel_*.json
```

**Fichiers à renommer :**
- `translations_la_ducasse_rituelle_en_500_mots.json` → `translations_l_ommegang_rituel_en_500_mots.json`
- `translations_la_ducasse_rituelle_la_descente_de_la_chasse.json` → `translations_l_ommegang_rituel_la_descente_de_la_chasse.json`
- `translations_la_ducasse_rituelle_la_montee_du_car_dor.json` → `translations_l_ommegang_rituel_la_montee_du_car_dor.json`
- `translations_la_ducasse_rituelle_la_procession_du_car_dor.json` → `translations_l_ommegang_rituel_la_procession_du_car_dor.json`
- `translations_la_ducasse_rituelle_le_combat_dit_lumecon.json` → `translations_l_ommegang_rituel_le_combat_dit_lumecon.json`
- `translations_la_ducasse_rituelle_reconnaissance_unesco.json` → `translations_l_ommegang_rituel_reconnaissance_unesco.json`
- `translations_la_ducasse_rituelle_le_musee_du_doudou.json` → `translations_l_ommegang_rituel_le_musee_du_doudou.json`

### **5.3 Renommer les fichiers de données**

**Renommer :**
```
// AVANT
translations_montois.json
translations_personnalites_montoises.json

// APRÈS
translations_bruxellois.json
translations_personnalites_bruxelloises.json
```

---

## 🔧 **ÉTAPE 6 : MODIFICATION DES RÉFÉRENCES INTERNES**

### **6.1 Mettre à jour les liens dans les fichiers HTML**

**Après avoir renommé les fichiers, mettre à jour tous les liens :**
```html
<!-- AVANT -->
<a href="la_ducasse_rituelle_en_500_mots.html">La ducasse rituelle en 500 mots</a>

<!-- APRÈS -->
<a href="l_ommegang_rituel_en_500_mots.html">L'ommegang rituel en 500 mots</a>
```

### **6.2 Mettre à jour les références dans les fichiers JavaScript**

**Mettre à jour les chemins de fichiers :**
```javascript
// AVANT
const response = await fetch('translations/translations_la_ducasse_rituelle_en_500_mots.json');

// APRÈS
const response = await fetch('translations/translations_l_ommegang_rituel_en_500_mots.json');
```

---

## 🔧 **ÉTAPE 7 : MODIFICATION DU MANIFESTE PWA**

### **7.1 Modifier `manifest.json`**

**Localiser et remplacer :**
```json
// AVANT
{
  "name": "CityLoop Quest Mons",
  "short_name": "CQ Mons",
  "description": "CityLoop Quest Bruxelles- Au cœur de l’Europe"
}

// APRÈS
{
  "name": "CityLoop Quest Bruxelles",
  "short_name": "CQ Bruxelles",
  "description": "CityLoop Quest Bruxelles - La Chevauchée de Saint Georges"
}
```

---

## 🔧 **ÉTAPE 8 : MODIFICATION DES MÉTADONNÉES**

### **8.1 Modifier tous les fichiers HTML**

**Remplacer dans chaque fichier HTML :**
```html
<!-- AVANT -->
<meta name="description" content="CityLoop Quest Bruxelles- Au cœur de l’Europe">
<meta property="og:title" content="CityLoop Quest Mons">
<meta property="og:description" content="CityLoop Quest Bruxelles- Au cœur de l’Europe">

<!-- APRÈS -->
<meta name="description" content="CityLoop Quest Bruxelles - La Chevauchée de Saint Georges">
<meta property="og:title" content="CityLoop Quest Bruxelles">
<meta property="og:description" content="CityLoop Quest Bruxelles - La Chevauchée de Saint Georges">
```

---

## 🔧 **ÉTAPE 9 : VÉRIFICATIONS ET TESTS**

### **9.1 Vérifications de syntaxe**

**Utiliser un validateur HTML en ligne :**
- [W3C HTML Validator](https://validator.w3.org/)
- [HTML5 Validator](https://html5.validator.nu/)

**Utiliser un validateur JSON en ligne :**
- [JSONLint](https://jsonlint.com/)
- [JSON Validator](https://jsonformatter.curiousconcept.com/)

### **9.2 Tests fonctionnels**

**1. Tester la page d'accueil :**
- Vérifier que le titre affiche "CityLoop Quest Bruxelles"
- Vérifier que le splashscreen fonctionne
- Vérifier que les boutons d'installation fonctionnent

**2. Tester la sélection de langue :**
- Vérifier que la page de sélection s'affiche
- Vérifier que le changement de langue fonctionne

**3. Tester la navigation :**
- Vérifier que tous les liens fonctionnent
- Vérifier que toutes les pages s'affichent
- Vérifier que les traductions sont correctes

**4. Tester les fonctionnalités PWA :**
- Vérifier que l'installation fonctionne
- Vérifier que le manifeste est correct
- Vérifier que l'icône s'affiche correctement

---

## 🚨 **POINTS CRITIQUES ET ERREURS FRÉQUENTES**

### **10.1 Erreurs de référence**
- **Liens cassés** après renommage de fichiers
- **Chemins de fichiers** incorrects dans les traductions
- **Références JavaScript** vers d'anciens noms de fichiers

### **10.2 Erreurs de contenu**
- **Occurrences manquées** de "Mons" ou "montois"
- **Traductions incohérentes** entre les fichiers
- **Références géographiques** non adaptées

### **10.3 Erreurs de navigation**
- **Pages 404** après renommage
- **Liens internes** cassés
- **Redirections** incorrectes

---

## 📝 **CHECKLIST FINALE**

### **11.1 Fichiers HTML modifiés**
- [ ] `index.html` (titre, métadonnées, textes)
- [ ] `language-selection.html` (titre)
- [ ] Tous les autres fichiers HTML (titre, h1, textes)
- [ ] Mise à jour des liens internes

### **11.2 Fichiers JavaScript modifiés**
- [ ] `app.js` (localStorage, références)
- [ ] `circuit.js` (localStorage)
- [ ] `circuit-data.js` (coordonnées, noms)

### **11.3 Fichiers de traduction modifiés**
- [ ] `translations.json` (tous les textes)
- [ ] `translations_install.json` (textes d'installation)
- [ ] Tous les autres fichiers de traduction
- [ ] Mise à jour des références de fichiers

### **11.4 Fichiers de données modifiés**
- [ ] Tous les fichiers `.txt` dans `data/`
- [ ] Remplacement de "Mons" par "Bruxelles"
- [ ] Remplacement de "montois" par "bruxellois"
- [ ] Remplacement de "Ducasse" par "Ommegang"

### **11.5 Fichiers renommés**
- [ ] Fichiers HTML de la ducasse
- [ ] Fichiers de traduction de la ducasse
- [ ] Fichiers de données spécifiques

### **11.6 Métadonnées mises à jour**
- [ ] `manifest.json`
- [ ] Métadonnées HTML
- [ ] Open Graph tags

### **11.7 Vérifications finales**
- [ ] Syntaxe HTML valide
- [ ] Syntaxe JSON valide
- [ ] Tous les liens fonctionnent
- [ ] Toutes les traductions sont correctes
- [ ] Application PWA fonctionne
- [ ] Aucune erreur dans la console

---

## 🎯 **EXEMPLE COMPLET : CHANGEMENT DE MONS VERS BRUXELLES**

### **Ancienne ville :** Mons
### **Nouvelle ville :** Bruxelles
### **Anciens habitants :** Montois
### **Nouveaux habitants :** Bruxellois
### **Ancienne fête :** Ducasse
### **Nouvelle fête :** Ommegang
### **Ancien dialecte :** Montois
### **Nouveau dialecte :** Bruxellois

**Tous les exemples de code ci-dessus utilisent Bruxelles comme référence.**

---

## 📞 **SUPPORT ET DÉPANNAGE**

### **En cas de problème :**
1. **Vérifier la console du navigateur** pour les erreurs JavaScript
2. **Valider la syntaxe HTML et JSON** de tous les fichiers modifiés
3. **Vérifier que tous les liens** pointent vers les bons fichiers
4. **Tester étape par étape** en commençant par la page d'accueil

### **Fichiers de sauvegarde recommandés :**
- Faire une copie de sauvegarde complète avant modification
- Utiliser Git pour versionner les changements
- Tester sur un environnement de développement avant production

### **Outils recommandés :**
- **Éditeur de texte** avec fonction "Rechercher et remplacer" globale
- **Validateur HTML** en ligne
- **Validateur JSON** en ligne
- **Navigateur web** pour les tests

---

## 🔍 **RECHERCHE ET REMPLACEMENT GLOBAL**

### **Utiliser la fonction "Rechercher et remplacer" de votre éditeur :**

**Remplacements à effectuer :**
1. **"Mons"** → **"Bruxelles"**
2. **"montois"** → **"bruxellois"**
3. **"Montois"** → **"Bruxellois"**
4. **"Ducasse"** → **"Ommegang"**
5. **"ducasse"** → **"ommegang"**
6. **"mons_"** → **"bruxelles_"** (dans localStorage)
7. **"CityLoop Quest Mons"** → **"CityLoop Quest Bruxelles"**

**⚠️ IMPORTANT :** 
- Effectuer les remplacements **UN PAR UN**
- Vérifier le contexte de chaque remplacement
- Tester après chaque série de remplacements

---

**✅ En suivant ce mode d'emploi étape par étape, votre ville sera parfaitement modifiée du système CityLoop Quest sans aucune erreur !**

# MODE D'EMPLOI COMPLET POUR L'AJOUT D'UNE NOUVELLE LANGUE
## CityLoop Quest AMons - Système Multilingue

---

## 📋 **PRÉREQUIS ET PRÉPARATION**

### **1.1 Informations nécessaires**
- **Code de langue ISO 639-1** (ex: `de` pour allemand, `es` pour espagnol)
- **Nom de la langue en français** (ex: "Allemand", "Espagnol")
- **Nom de la langue dans sa propre langue** (ex: "Deutsch", "Español")
- **Drapeau SVG** de la langue (format SVG inline)

### **1.2 Structure des fichiers à modifier**
```
translations/
├── translations.json                    ← TRADUCTIONS PRINCIPALES
├── translations_install.json            ← TRADUCTIONS D'INSTALLATION
├── languageSelector.js                  ← SÉLECTEUR DE LANGUE
└── [autres fichiers de traduction]     ← TRADUCTIONS SPÉCIFIQUES

language-selection.html                  ← PAGE DE SÉLECTION
```

---

## 🔧 **ÉTAPE 1 : AJOUTER LA LANGUE DANS LE SÉLECTEUR**

### **1.1 Modifier `translations/languageSelector.js`**

**Localiser la section `availableLanguages` (ligne ~8) :**
```javascript
this.availableLanguages = {
    'fr': 'Français',
    'en': 'English',
    'nl': 'Nederlands'
    // AJOUTER ICI VOTRE NOUVELLE LANGUE
};
```

**Ajouter votre langue :**
```javascript
this.availableLanguages = {
    'fr': 'Français',
    'en': 'English',
    'nl': 'Nederlands',
    'de': 'Deutsch'  // ← NOUVELLE LANGUE
};
```

### **1.2 Ajouter le drapeau SVG**

**Localiser la section des drapeaux (ligne ~100) :**
```javascript
if (code === 'fr') {
    flag.style.backgroundImage = `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="1" height="2" fill="%23002C5F"/><rect x="1" width="1" height="2" fill="%23fff"/><rect x="2" width="1" height="2" fill="%23ED2939"/></svg>')`;
} else if (code === 'en') {
    // ... drapeau anglais
} else if (code === 'nl') {
    // ... drapeau néerlandais
}
// AJOUTER ICI VOTRE NOUVEAU DRAPEAU
```

**Ajouter votre drapeau :**
```javascript
} else if (code === 'de') {
    flag.style.backgroundImage = `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 3"><rect width="5" height="3" fill="%23000"/><rect y="1" width="5" height="1" fill="%23DD0000"/><rect y="2" width="5" height="1" fill="%23FFCE00"/></svg>')`;
}
```

**⚠️ IMPORTANT :** Répéter cette modification **DEUX FOIS** dans le fichier :
- **Première fois** : dans la fonction de création des options (ligne ~100)
- **Deuxième fois** : dans la fonction `_updateDisplay()` (ligne ~200)

---

## 🔧 **ÉTAPE 2 : AJOUTER LA LANGUE DANS LA PAGE DE SÉLECTION**

### **2.1 Modifier `language-selection.html`**

**Localiser la section des drapeaux (ligne ~275) :**
```html
<div class="language-container">
  <div class="flag-button flag-fr" data-lang="fr"></div>
  <div class="flag-button flag-en" data-lang="en"></div>
  <div class="flag-button flag-nl" data-lang="nl"></div>
  <!-- AJOUTER ICI VOTRE NOUVEAU DRAPEAU -->
</div>
```

**Ajouter votre drapeau :**
```html
<div class="language-container">
  <div class="flag-button flag-fr" data-lang="fr"></div>
  <div class="flag-button flag-en" data-lang="en"></div>
  <div class="flag-button flag-nl" data-lang="nl"></div>
  <div class="flag-button flag-de" data-lang="de"></div>  <!-- ← NOUVEAU DRAPEAU -->
</div>
```

### **2.2 Ajouter le style CSS du drapeau**

**Localiser la section des styles de drapeaux (ligne ~100) :**
```css
.flag-nl {
  background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6"><rect width="9" height="6" fill="%23AE1C28"/><rect y="2" width="9" height="2" fill="%23fff"/><rect y="4" width="9" height="2" fill="%2321468B"/></svg>');
}
/* AJOUTER ICI VOTRE NOUVEAU STYLE */
```

**Ajouter votre style :**
```css
.flag-de {
  background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 3"><rect width="5" height="3" fill="%23000"/><rect y="1" width="5" height="1" fill="%23DD0000"/><rect y="2" width="5" height="1" fill="%23FFCE00"/></svg>');
}
```

### **2.3 Ajouter la traduction du message mode paysage**

**Localiser la section du message paysage (ligne ~285) :**
```html
<div class="landscape-text">Utiliser votre appareil en format paysage - Use your device in landscape format - Gebruik uw apparaat in liggend formaat</div>
```

**Ajouter votre traduction :**
```html
<div class="landscape-text">Utiliser votre appareil en format paysage - Use your device in landscape format - Gebruik uw apparaat in liggend formaat - Verwenden Sie Ihr Gerät im Querformat</div>
```

---

## 🔧 **ÉTAPE 3 : AJOUTER LES TRADUCTIONS PRINCIPALES**

### **3.1 Modifier `translations/translations.json`**

**Localiser la fin du fichier (avant la dernière accolade) :**
```json
  },
  "de": {
    "choose_language": "Wählen Sie Ihre Sprache",
    "selfie_title": "Selfie Heiliger Georg",
    "selfie_victory_text": "Ich habe den Drachen von Mons besiegt!",
    "selfie_button": "SELFIE",
    "save_button": "SPEICHERN",
    "share_button": "TEILEN",
    "back_button": "ZURÜCK",
    "camera_error": "Kann nicht auf die Kamera zugreifen. Bitte überprüfen Sie die Berechtigungen Ihres Browsers.",
    "share_title": "Mein Mons Selfie",
    "share_cancelled": "Teilen abgebrochen oder nicht unterstützt.",
    "share_not_supported": "Direktes Teilen wird auf diesem Gerät nicht unterstützt.",
    "museum_circuit": "Museumsparcours Urban Track Mons",
    "museum_specific_circuit": "Museumsparcours {museum} Urban Track Mons",
    "grand_circuit": "Großer Rundgang - 10,5 km - 5h30",
    "medium_circuit": "Mittlerer Rundgang - 6 km - 4h",
    "short_circuit": "Kleiner Rundgang - 4 km - 3h15",
    "yes": "Ja",
    "no": "Nein",
    "confirm_grand": "Sie haben den langen Rundgang gewählt. Bestätigen Sie diese Wahl?",
    "confirm_medium": "Sie haben den mittleren Rundgang gewählt. Bestätigen Sie diese Wahl?",
    "confirm_short": "Sie haben den kurzen Rundgang gewählt. Bestätigen Sie diese Wahl?",
    "orientation_message": "🔄 Für eine bessere Erfahrung drehen Sie bitte Ihr Gerät in den Querformat.",
    "splash_waiting": "<strong>Bitte warten Sie, der Drache erwacht.... !</strong>",
    "quiz_prompt": "Möchten Sie während Ihres Rundgangs mit einem Quiz spielen?",
    "title_chevauchee": "CityLoop Quest Mons - Der Ritt des Heiligen Georg",
    "next_point": "Nächster Punkt:",
    "calculating": "Berechnung läuft",
    "score": "Punktzahl:",
    "estimated_time": "Zeit",
    "distance": "Entf.",
    "total_distance": "Ges. Entf.",
    "unknown_time": "Geschätzte Zeit unbekannt",
    "culture": "Kultur",
    "doudou_song": "Doudou-Lied",
    "culture_title": "Monser Kultur",
    "culture_page_title": "🏛️ Monser Kulturraum",
    "culture_subtitle": "Entdecken Sie das kulturelle Erbe von Mons",
    "culture_btn_1": "🎵 Lieder",
    "culture_btn_2": "📜 Stadtgeschichte",
    "culture_btn_3": "🏛️ Museen",
    "culture_btn_4": "👤 Persönlichkeiten",
    "culture_btn_5": "🎭 Folklore",
    "culture_btn_6": "🎉 Veranstaltungen/Fotos/Videos",
    "culture_btn_histoire_doudou": "Geschichte des Doudou",
    "culture_btn_parler_montois": "Monser Dialekt sprechen",
    "culture_btn_infos_contacts": "Infos / Kontakte",
    "chansons_title": "🎵 Monser Lieder",
    "histoire_ville_title": "📜 Stadtgeschichte",
    "histoire_btn_rcf": "RCF Radio Bericht",
    "histoire_btn_bataille": "Schlacht von Mons",
    "histoire_btn_beffroy": "Der Belfried",
    "histoire_btn_anges": "Die Engel von Mons",
    "histoire_info_videos": "Die hier präsentierten Videos sind frei im Internet verfügbar. Sie sind ausschließlich auf Französisch.",
    "back": "ZURÜCK",
    "btn_go": "Dorthin gehen?",
    "address": "Adresse",
    "map_unavailable": "Karte nicht verfügbar",
    "check_connection": "Überprüfen Sie Ihre Verbindung.",
    "geolocation_impossible": "Geolokalisierung unmöglich. Anzeige vom Startpunkt.",
    "museum_target": "🎯 Museum:",
    "warning": "Warnung!",
    "reset_warning": "Diese Aktion bringt Sie zurück zur Rundgangswahl und die Anwendung wird <b>zurückgesetzt</b>!!!<br>Sind Sie sicher?",
    "yes_reset": "Ja, zurücksetzen",
    "no_cancel": "Nein, abbrechen",
    "close": "SCHLIEßEN",
    "victory": "Sieg!",
    "victory_message": "Dies ist die letzte Etappe Ihres Rundgangs!<br><br>Glückwunsch, Sie haben den Drachen besiegt!<br>Das Biest ist besiegt!<br><br><strong>Ein V'la co pou ein an!</strong><br><br>Bei der Ankunft können Sie, wenn Sie möchten, ein Selfie mit dem Heiligen Georg machen!",
    "understood": "VERSTANDEN",
    "folklore_title": "🎭 Monser Folklore",
    "folklore_btn_1": "Das rituelle Ducasse in 500 Wörtern",
    "folklore_btn_2": "Das rituelle Ducasse, Ursprünge und Entwicklung",
    "folklore_btn_3": "Das rituelle Ducasse, der Abstieg der Reliquie",
    "folklore_btn_4": "Das rituelle Ducasse, die Prozession des Goldenen Wagens",
    "folklore_btn_5": "Das rituelle Ducasse, der Aufstieg des Goldenen Wagens",
    "folklore_btn_6": "Das rituelle Ducasse, der Kampf namens 'Lumeçon'",
    "folklore_btn_7": "Das rituelle Ducasse, UNESCO-Anerkennung",
    "folklore_btn_8": "Das rituelle Ducasse, das Doudou-Museum",
    "compass_title": "Kompass",
    "compass_message": "DRÜCKEN SIE AUF DAS KOMPASS-SYMBOL, UM VON DER PFEIL-NAVIGATION ZU PROFITIEREN",
    "hour": "Stunde",
    "hours": "Stunden",
    "minute": "Min",
    "minutes": "Min",
    "first_point_title": "Erster Punkt",
    "first_point_message": "Sie sind bereits am Anfang des Rundgangs!",
    "without_quiz": "ohne Quiz",
    "quiz_on": "Quiz AN",
    "correct_answer": "Richtige Antwort:",
    "landscape_mode_required": "Querformat erforderlich",
    "tip_install_app": "Tipp:",
    "tip_install_text": "Für den Komfort der Nutzung installieren Sie diese Anwendung auf Ihrem Telefon oder Tablet. Klicken Sie dazu auf Exportieren und dann auf Startbildschirm. Eine Internetverbindung ist dennoch erforderlich.",
    "capture_popup_message": "Sie können den Screenshot machen!! Warten Sie, bis dieser Popup verschwindet...",
    "circuit_short": "Kurzer Rundgang von CityLoop Quest Mons",
    "circuit_medium": "Mittlerer Rundgang von CityLoop Quest Mons",
    "circuit_long": "Langer Rundgang von CityLoop Quest Mons",
    "circuit_default": "Rundgang von CityLoop Quest Mons"
  }
```

**⚠️ IMPORTANT :** 
- Ajouter une **virgule** après la dernière langue existante
- Ajouter votre nouvelle langue avec **TOUTES** les clés de traduction
- Vérifier que la **dernière accolade** est bien fermée

---

## 🔧 **ÉTAPE 4 : AJOUTER LES TRADUCTIONS D'INSTALLATION**

### **4.1 Modifier `translations/translations_install.json`**

**Localiser la fin du fichier (avant la dernière accolade) :**
```json
  },
  "de": {
    "install_title": "Anwendungsinstallation",
    "install_intro": "Um CityLoop Quest Mons auf Ihrem Gerät zu installieren:",
    "step1": "Finden Sie das Installationssymbol oder bestätigen Sie die automatische Installation",
    "step1_detail": "Tippen Sie auf die Schaltfläche 'Teilen' rechts von der Adressleiste <img src=\"images/partager_ios.png\" alt=\"Teilen\" style=\"height:1.3em;vertical-align:-0.2em;margin:0 2px;\">",
    "step2": "Wählen Sie 'Zum Startbildschirm hinzufügen'",
    "step3": "Klicken Sie auf Hinzufügen",
    "benefits_title": "Vorteile der Installation:",
    "benefit1": "🎯 Schneller Zugriff vom Startbildschirm",
    "benefit2": "🚀 Optimierte Leistung",
    "benefit3": "🔔 Push-Benachrichtigungen (falls aktiviert)",
    "install_message": "Für eine bessere Erfahrung installieren Sie die Anwendung auf Ihrem Gerät",
    "splash_title": "CityLoop Quest Mons - Der Ritt des Heiligen Georg",
    "splash_waiting": "Bitte warten Sie, der Drache erwacht...",
    "install_button": "Installieren Sie die Anwendung und starten Sie von der installierten App neu - klicken Sie hier und folgen Sie den Installationsanweisungen. Starten Sie dann die App über das Symbol.",
    "web_usage_button": "Keine Installation, als Webseite verwenden",
    "ios_title": "Installation auf iPhone/iPad",
    "ios_intro": "Um CityLoop Quest Mons auf Ihrem iOS-Gerät zu installieren:",
    "ios_step1": "Tippen Sie auf die Schaltfläche \"Teilen\"",
    "ios_step1_detail": "Finden Sie die quadratische Schaltfläche mit einem Pfeil nach oben in der Safari-Symbolleiste",
    "ios_step2": "Wählen Sie \"Zum Startbildschirm hinzufügen\"",
    "ios_step2_detail": "Scrollen Sie im Menü und tippen Sie auf diese Option",
    "ios_step3": "Tippen Sie auf \"Hinzufügen\"",
    "ios_step3_detail": "Bestätigen Sie das Hinzufügen der Anwendung",
    "ios_tips_title": "iOS-Tipps:",
    "ios_tip1": "Die App erscheint auf Ihrem Startbildschirm",
    "ios_tip2": "Sie können sie verschieben und organisieren wie andere Apps",
    "ios_tip3": "Die App funktioniert nicht offline",
    "warning_button_text": "Einige Plattformen akzeptieren keine Installation als App. Wenn dies der Fall ist, können Sie das System als Webseite verwenden. Die Wahl wird Ihnen im nächsten Bildschirm gegeben. Um fortzufahren, klicken Sie hier."
  }
```

**⚠️ IMPORTANT :** 
- Ajouter une **virgule** après la dernière langue existante
- Ajouter votre nouvelle langue avec **TOUTES** les clés de traduction
- Vérifier que la **dernière accolade** est bien fermée

---

## 🔧 **ÉTAPE 5 : AJOUTER LES TRADUCTIONS SPÉCIFIQUES**

### **5.1 Identifier les fichiers de traduction spécifiques**

**Vérifier dans le dossier `translations/` tous les fichiers commençant par `translations_` :**
```
translations/
├── translations_associations.json
├── translations_charles_plisnier.json
├── translations_evenements.json
├── translations_folklore.json
├── translations_musees.json
├── translations_personnages.json
├── translations_procession.json
├── translations_personnalites_montoises.json
├── translations_montois.json
├── descriptions.json
├── quiz_translations.json
└── [autres fichiers...]
```

### **5.2 Ajouter la traduction dans chaque fichier**

**Pour chaque fichier, ajouter votre langue :**

**Exemple pour `translations_associations.json` :**
```json
{
  "fr": { /* traductions françaises */ },
  "en": { /* traductions anglaises */ },
  "nl": { /* traductions néerlandaises */ },
  "de": { /* traductions allemandes */ }  // ← NOUVELLE LANGUE
}
```

**⚠️ IMPORTANT :** 
- Ajouter une **virgule** après la dernière langue existante
- Ajouter votre nouvelle langue avec **TOUTES** les clés de traduction
- Vérifier que la **dernière accolade** est bien fermée

---

## 🔧 **ÉTAPE 6 : VÉRIFICATIONS ET TESTS**

### **6.1 Vérifications de syntaxe JSON**

**Utiliser un validateur JSON en ligne :**
- [JSONLint](https://jsonlint.com/)
- [JSON Validator](https://jsonformatter.curiousconcept.com/)

**Vérifier chaque fichier modifié :**
- `translations/translations.json`
- `translations/translations_install.json`
- Tous les autres fichiers de traduction

### **6.2 Tests fonctionnels**

**1. Tester la page de sélection de langue :**
- Ouvrir `language-selection.html`
- Vérifier que le nouveau drapeau s'affiche
- Vérifier que le clic fonctionne
- Vérifier que la langue est sauvegardée

**2. Tester le sélecteur de langue :**
- Vérifier que la nouvelle langue apparaît dans le dropdown
- Vérifier que le changement de langue fonctionne
- Vérifier que le drapeau s'affiche correctement

**3. Tester les traductions :**
- Changer la langue vers votre nouvelle langue
- Naviguer dans l'application
- Vérifier que tous les textes sont traduits

---

## 🚨 **POINTS CRITIQUES ET ERREURS FRÉQUENTES**

### **7.1 Erreurs de syntaxe JSON**
- **Virgule manquante** après la dernière langue existante
- **Accolade non fermée** à la fin du fichier
- **Guillemets manquants** autour des clés ou valeurs
- **Caractères spéciaux** non échappés dans les chaînes

### **7.2 Erreurs de référence**
- **Clé de traduction manquante** dans un fichier
- **Incohérence** entre les fichiers de traduction
- **Code de langue** différent entre les fichiers

### **7.3 Erreurs d'affichage**
- **Drapeau SVG mal formaté** (erreur dans le code SVG)
- **Style CSS manquant** pour le nouveau drapeau
- **Z-index incorrect** causant des problèmes de superposition

---

## 📝 **CHECKLIST FINALE**

### **8.1 Fichiers modifiés**
- [ ] `translations/languageSelector.js` (2 modifications : drapeaux)
- [ ] `language-selection.html` (3 modifications : drapeau, style, message paysage)
- [ ] `translations/translations.json` (ajout langue complète)
- [ ] `translations/translations_install.json` (ajout langue complète)
- [ ] Tous les autres fichiers de traduction spécifiques

### **8.2 Vérifications**
- [ ] Syntaxe JSON valide dans tous les fichiers
- [ ] Nouveau drapeau visible sur la page de sélection
- [ ] Nouvelle langue disponible dans le sélecteur
- [ ] Toutes les traductions fonctionnent
- [ ] Aucune erreur dans la console du navigateur

### **8.3 Tests**
- [ ] Sélection de la nouvelle langue
- [ ] Changement de langue via le sélecteur
- [ ] Navigation dans l'application
- [ ] Affichage des textes traduits
- [ ] Fonctionnement PWA et web

---

## 🎯 **EXEMPLE COMPLET : AJOUT DE L'ALLEMAND**

### **Code de langue :** `de`
### **Nom français :** "Allemand"
### **Nom allemand :** "Deutsch"
### **Drapeau :** Drapeau allemand (noir, rouge, or)

**Tous les exemples de code ci-dessus utilisent l'allemand comme référence.**

---

## 📞 **SUPPORT ET DÉPANNAGE**

### **En cas de problème :**
1. **Vérifier la console du navigateur** pour les erreurs JavaScript
2. **Valider la syntaxe JSON** de tous les fichiers modifiés
3. **Comparer avec une langue existante** pour identifier les différences
4. **Tester étape par étape** en commençant par le sélecteur de langue

### **Fichiers de sauvegarde recommandés :**
- Faire une copie de sauvegarde avant modification
- Utiliser Git pour versionner les changements
- Tester sur un environnement de développement avant production

---

**✅ En suivant ce mode d'emploi étape par étape, votre nouvelle langue sera parfaitement intégrée au système CityLoop Quest Mons sans aucune erreur !**

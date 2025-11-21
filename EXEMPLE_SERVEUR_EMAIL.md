# Exemple de modification côté serveur pour inclure la langue dans l'URL d'activation

## Dans votre fichier mailer.ts (côté serveur)

### Avant (URL sans langue) :
```typescript
const activationUrl = `${process.env.FRONTEND_URL}/index.html?code=${activationCode}`;
```

### Après (URL avec langue) :
```typescript
const activationUrl = `${process.env.FRONTEND_URL}/index.html?code=${activationCode}&lang=${userLanguage}`;
```

## Exemple complet dans mailer.ts :

```typescript
async function sendActivationEmail(email: string, code: string, lang: string) {
  
  // Construire l'URL d'activation avec la langue
  const activationUrl = `${process.env.FRONTEND_URL}/index.html?code=${code}&lang=${lang}`;
  
  // Template d'email avec l'URL traduite
  const emailTemplate = {
    to: email,
    subject: getEmailSubject(lang), // Fonction qui retourne le sujet dans la bonne langue
    html: `
      <h2>${getEmailTitle(lang)}</h2>
      <p>${getEmailMessage(lang)}</p>
      <a href="${activationUrl}" style="background: #b30000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
        ${getActivateButtonText(lang)}
      </a>
    `
  };
  
  // Envoyer l'email...
}
```

## Fonctions de traduction pour l'email :

```typescript
function getEmailSubject(lang: string): string {
  const subjects = {
    'fr': 'Activation de votre accès - CityLoop Quest Mons',
    'en': 'Activate your access - CityLoop Quest Mons',
    'nl': 'Activeer uw toegang - CityLoop Quest Mons',
    'de': 'Aktivieren Sie Ihren Zugang - CityLoop Quest Mons',
    // ... autres langues
  };
  return subjects[lang] || subjects['fr'];
}

function getActivateButtonText(lang: string): string {
  const texts = {
    'fr': 'Activer mon accès',
    'en': 'Activate my access',
    'nl': 'Activeer mijn toegang',
    'de': 'Meinen Zugang aktivieren',
    // ... autres langues
  };
  return texts[lang] || texts['fr'];
}
```

## Résultat attendu :

L'URL dans l'email ressemblera à :
- Français : `https://votre-site.com/index.html?code=ABC123&lang=fr`
- Anglais : `https://votre-site.com/index.html?code=ABC123&lang=en`
- Néerlandais : `https://votre-site.com/index.html?code=ABC123&lang=nl`

## Test :

1. Modifiez votre serveur pour inclure `&lang=${userLanguage}` dans l'URL
2. Testez en envoyant un email dans différentes langues
3. Cliquez sur le bouton d'activation
4. Vérifiez que la page s'ouvre dans la bonne langue

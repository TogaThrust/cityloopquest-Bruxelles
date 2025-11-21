# Exemple de réponse serveur avec version

## Problème identifié
Le système de contrôle d'accès ne fonctionne pas car la version (LITE/FULL) n'est pas correctement détectée après l'achat ou l'activation.

## Solution
Le serveur doit **interroger la base de données** pour récupérer le type de licence (LITE/FULL) associé au code d'activation et retourner le champ `plan` dans les données de réponse.

## Logique serveur requise

### 1. Après achat (post-checkout.html)
```javascript
// Le serveur doit stocker le plan dans la base de données
// et le retourner dans la réponse
const sessionData = await getSessionFromStripe(sessionId);
const plan = sessionData.plan; // 'lite' ou 'full' depuis Stripe
await saveLicenseToDatabase(userId, plan, activationCode);
```

### 2. Activation manuelle (activation-manual.html)
```javascript
// Le serveur doit récupérer le plan depuis la base de données
const licenseData = await getLicenseFromDatabase(activationCode);
const plan = licenseData.plan; // 'lite' ou 'full' depuis la DB
```

### 3. Activation via email (index.html)
```javascript
// Le serveur doit récupérer le plan depuis la base de données
const licenseData = await getLicenseFromDatabase(activationCode);
const plan = licenseData.plan; // 'lite' ou 'full' depuis la DB
```

## Exemples de réponses serveur

### 1. Après achat LITE (post-checkout.html)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "plan": "lite",
  "user_id": "user_123",
  "expires_at": "2024-12-31T23:59:59Z"
}
```

### 2. Après achat FULL (post-checkout.html)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "plan": "full",
  "user_id": "user_123",
  "expires_at": "2024-12-31T23:59:59Z"
}
```

### 3. Activation manuelle LITE (activation-manual.html)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "plan": "lite",
  "user_id": "user_123",
  "expires_at": "2024-12-31T23:59:59Z"
}
```

### 4. Activation manuelle FULL (activation-manual.html)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "plan": "full",
  "user_id": "user_123",
  "expires_at": "2024-12-31T23:59:59Z"
}
```

### 5. Activation via email LITE (index.html)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "plan": "lite",
  "user_id": "user_123",
  "expires_at": "2024-12-31T23:59:59Z"
}
```

### 6. Activation via email FULL (index.html)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "plan": "full",
  "user_id": "user_123",
  "expires_at": "2024-12-31T23:59:59Z"
}
```

## Logique frontend
Le frontend utilise cette logique pour déterminer la version :

```javascript
const version = data.plan === 'lite' ? 'LITE' : 'FULL';
localStorage.setItem('user_version', version);
```

## Points d'attention
1. Le champ `plan` doit être présent dans TOUTES les réponses d'activation
2. Les valeurs possibles sont : `"lite"` ou `"full"`
3. Si le champ `plan` n'est pas présent, la version sera par défaut `"FULL"`
4. Le système de contrôle d'accès vérifie `localStorage.getItem('user_version')`

## Structure de base de données requise

### Table des licences
```sql
CREATE TABLE licenses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  activation_code VARCHAR(255) UNIQUE NOT NULL,
  plan ENUM('lite', 'full') NOT NULL,
  user_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL
);
```

### Requêtes SQL nécessaires

#### 1. Sauvegarder une licence après achat
```sql
INSERT INTO licenses (activation_code, plan, user_id, expires_at) 
VALUES (?, ?, ?, ?);
```

#### 2. Récupérer le plan lors de l'activation
```sql
SELECT plan FROM licenses 
WHERE activation_code = ? AND activated_at IS NULL;
```

#### 3. Marquer la licence comme activée
```sql
UPDATE licenses 
SET activated_at = NOW(), user_id = ? 
WHERE activation_code = ?;
```

## Endpoints concernés
- `/api/checkout/lookup` (post-checkout.html)
- `/api/auth/claim-session` (post-checkout.html)
- `/api/auth/activate` (activation-manual.html)
- `/api/auth/activate` (index.html)

## Code serveur TypeScript/JavaScript

### 1. Après achat (checkout.ts)
```typescript
export async function handleCheckoutSession(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const plan = session.metadata?.plan || 'full'; // 'lite' ou 'full'
  
  // Sauvegarder dans la base de données
  await db.query(
    'INSERT INTO licenses (activation_code, plan, user_id, expires_at) VALUES (?, ?, ?, ?)',
    [activationCode, plan, userId, expiresAt]
  );
  
  return {
    token: jwtToken,
    plan: plan, // IMPORTANT: retourner le plan
    user_id: userId
  };
}
```

### 2. Activation manuelle (webhooks.ts)
```typescript
export async function activateLicense(activationCode: string) {
  // Récupérer le plan depuis la base de données
  const license = await db.query(
    'SELECT plan FROM licenses WHERE activation_code = ? AND activated_at IS NULL',
    [activationCode]
  );
  
  if (!license) {
    throw new Error('license_not_found_for_code');
  }
  
  // Marquer comme activée
  await db.query(
    'UPDATE licenses SET activated_at = NOW() WHERE activation_code = ?',
    [activationCode]
  );
  
  return {
    token: jwtToken,
    plan: license.plan, // IMPORTANT: retourner le plan
    user_id: userId
  };
}
```

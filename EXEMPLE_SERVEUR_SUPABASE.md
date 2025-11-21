# Intégration Supabase - Détection de version LITE/FULL

## Structure de base de données Supabase existante

### Table des licences (déjà existante)
```sql
-- Table licenses avec les champs existants :
-- code (UUID)
-- short_code (xxx-xxx-xxx) 
-- plan ('full' | 'lite')
-- status, city_id, valid_until, etc.
```

## Requêtes SQL pour Supabase

### 1. Récupérer le plan avec code flexible (recommandé)
```sql
-- $1 = code saisi par l'utilisateur (peut être "xxx-xxx-xxx" ou UUID)
WITH norm AS (
  SELECT
    LOWER(REGEXP_REPLACE($1, '[^a-zA-Z0-9]', '', 'g')) AS raw
)
SELECT l.plan
FROM licenses l, norm n
WHERE
  -- match sur short_code normalisé (xxx-xxx-xxx → sans tirets)
  LOWER(REPLACE(l.short_code, '-', '')) = n.raw
   OR
  -- match sur UUID exact (après normalisation)
  l.code = (
    CASE WHEN length(n.raw)=32 THEN
      SUBSTRING(n.raw,1,8) || '-' ||
      SUBSTRING(n.raw,9,4) || '-' ||
      SUBSTRING(n.raw,13,4) || '-' ||
      SUBSTRING(n.raw,17,4) || '-' ||
      SUBSTRING(n.raw,21,12)
    ELSE n.raw END
  )
LIMIT 1;
```

### 2. Récupérer le plan avec short_code seulement
```sql
SELECT plan
FROM licenses
WHERE lower(short_code) = lower($1)     -- $1 = "xxx-xxx-xxx"
LIMIT 1;
```

### 3. Récupérer le plan avec UUID seulement
```sql
SELECT plan
FROM licenses
WHERE code = $1     -- $1 = UUID complet
LIMIT 1;
```

## Code serveur TypeScript/JavaScript pour Supabase

### 1. Helper function pour normaliser les codes
```typescript
// src/services/licenses.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

function normalizeShort(input: string): string {
  const raw = String(input).toLowerCase().replace(/[^a-z0-9]/g, '');
  const nine = raw.slice(0, 9);
  return (nine.match(/.{1,3}/g) || [nine]).join('-'); // "xxx-xxx-xxx"
}

export async function getPlanForCode(input: string): Promise<'full'|'lite'|null> {
  const raw = String(input).trim();
  if (!raw) return null;

  // 1) tente short_code
  const short = normalizeShort(raw);
  const { data: r1, error: e1 } = await supabase
    .from('licenses')
    .select('plan')
    .eq('short_code', short)
    .limit(1);
  
  if (r1 && r1.length > 0) return r1[0].plan;

  // 2) tente UUID exact
  const { data: r2, error: e2 } = await supabase
    .from('licenses')
    .select('plan')
    .eq('code', raw)
    .limit(1);
  
  return r2 && r2.length > 0 ? r2[0].plan : null;
}
```

### 2. Endpoint pour récupérer le plan
```typescript
// GET /api/licenses/plan?code=xxx-xxx-xxx
router.get('/licenses/plan', async (req, res) => {
  const code = String(req.query.code || '').trim();
  if (!code) return res.status(400).json({ error: 'missing_code' });

  const plan = await getPlanForCode(code);
  if (!plan) return res.status(404).json({ error: 'not_found' });

  return res.json({ plan });
});
```

### 3. Modification des endpoints d'activation

#### Activation manuelle (activation-manual.html)
```typescript
// Dans votre endpoint d'activation existant
export async function activateLicense(activationCode: string) {
  // Récupérer le plan depuis Supabase
  const plan = await getPlanForCode(activationCode);
  if (!plan) {
    throw new Error('license_not_found_for_code');
  }
  
  // Votre logique d'activation existante...
  // (marquer comme activée, générer token, etc.)
  
  return {
    token: jwtToken,
    plan: plan, // IMPORTANT: retourner le plan
    user_id: userId
  };
}
```

#### Activation via email (index.html)
```typescript
// Même logique que l'activation manuelle
export async function activateLicenseFromEmail(activationCode: string) {
  const plan = await getPlanForCode(activationCode);
  if (!plan) {
    throw new Error('license_not_found_for_code');
  }
  
  return {
    token: jwtToken,
    plan: plan, // IMPORTANT: retourner le plan
    user_id: userId
  };
}
```

#### Après achat (post-checkout.html)
```typescript
// Dans votre webhook Stripe ou endpoint de lookup
export async function handleCheckoutSession(sessionId: string) {
  // Récupérer les données de la session Stripe
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  
  // Déterminer le plan depuis Stripe
  const plan = session.metadata?.plan || 'full'; // 'lite' ou 'full'
  
  // Votre logique existante...
  
  return {
    token: jwtToken,
    plan: plan, // IMPORTANT: retourner le plan
    user_id: userId
  };
}
```

## Optimisations Supabase

### Index recommandé
```sql
-- Index unique sur short_code pour les performances
CREATE UNIQUE INDEX IF NOT EXISTS ux_licenses_short_code
ON licenses (lower(short_code));

-- Index sur code (UUID) si pas déjà présent
CREATE UNIQUE INDEX IF NOT EXISTS ux_licenses_code
ON licenses (code);
```

### Vérifications supplémentaires (optionnel)
```sql
-- Ajouter des vérifications de statut/expiration si nécessaire
SELECT plan
FROM licenses
WHERE 
  (lower(short_code) = lower($1) OR code = $1)
  AND status = 'active'  -- si vous avez un champ status
  AND (valid_until IS NULL OR valid_until > NOW())  -- si vous avez une expiration
LIMIT 1;
```

## Test de l'intégration

### 1. Test direct avec Supabase
```typescript
// Test rapide dans votre console Supabase
const { data, error } = await supabase
  .from('licenses')
  .select('plan, short_code, code')
  .limit(5);

```

### 2. Test de l'endpoint
```bash
# Test avec short_code
curl "http://localhost:3000/api/licenses/plan?code=abc-def-ghi"

# Test avec UUID
curl "http://localhost:3000/api/licenses/plan?code=12345678-1234-1234-1234-123456789abc"
```

## Points d'attention

1. **Le champ `plan` doit être retourné dans TOUTES les réponses d'activation**
2. **Les valeurs possibles sont : `"lite"` ou `"full"`**
3. **Si le champ `plan` n'est pas présent, la version sera par défaut `"FULL"`**
4. **Le système de contrôle d'accès vérifie `localStorage.getItem('user_version')`**

## Gestion de l'upgrade LITE → FULL

### 1. Endpoint pour l'upgrade
```typescript
// POST /api/upgrade/process
export async function processUpgrade(activationCode: string, newPlan: string) {
  // Vérifier que le code existe et est en mode LITE
  const currentPlan = await getPlanForCode(activationCode);
  if (!currentPlan) {
    throw new Error('license_not_found_for_code');
  }
  
  if (currentPlan !== 'lite') {
    throw new Error('upgrade_not_needed'); // Déjà en FULL
  }
  
  // Mettre à jour le plan dans la base de données
  const { error } = await supabase
    .from('licenses')
    .update({ plan: 'full' })
    .eq('code', activationCode); // ou short_code selon votre logique
    
  if (error) {
    throw new Error('upgrade_failed');
  }
  
  return {
    success: true,
    plan: 'full',
    message: 'Upgrade successful'
  };
}
```

### 2. Modification du webhook Stripe pour l'upgrade
```typescript
// Dans votre webhook Stripe existant
export async function handleStripeWebhook(event: Stripe.Event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Vérifier si c'est un upgrade
    if (session.metadata?.plan === 'UPGRADE_FULL') {
      const activationCode = session.metadata?.activation_code;
      
      if (activationCode) {
        // Mettre à jour le plan de l'utilisateur existant
        await processUpgrade(activationCode, 'full');
        
        // Retourner les données pour le frontend
        return {
          token: jwtToken,
          plan: 'full',
          user_id: userId,
          upgrade: true
        };
      }
    }
    
    // Logique normale pour les nouveaux achats...
  }
}
```

### 3. SQL pour l'upgrade direct
```sql
-- Mettre à jour le plan d'une licence existante
UPDATE licenses 
SET plan = 'full' 
WHERE (short_code = $1 OR code = $1) 
  AND plan = 'lite'
RETURNING plan;
```

## Endpoints concernés
- `/api/checkout/lookup` (post-checkout.html)
- `/api/auth/claim-session` (post-checkout.html)
- `/api/auth/activate` (activation-manual.html)
- `/api/auth/activate` (index.html)
- `/api/upgrade/process` (nouveau - pour l'upgrade)


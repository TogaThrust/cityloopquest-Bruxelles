#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script pour traduire les descriptions de personnalités
langue par langue, en vérifiant si le texte est déjà dans la bonne langue
"""

import json
import re
from deep_translator import GoogleTranslator

def is_french_text(text, french_text):
    """
    Vérifie si le texte est en français en comparant avec la version française
    Retourne True si le texte semble être en français (identique ou très similaire)
    """
    if not text or not french_text:
        return False
    
    # Nettoyer les deux textes (supprimer les balises HTML pour la comparaison)
    text_clean = re.sub(r'<[^>]+>', '', text).strip()[:200]  # Premiers 200 caractères
    french_clean = re.sub(r'<[^>]+>', '', french_text).strip()[:200]
    
    # Si les premiers caractères sont identiques, c'est probablement du français
    if text_clean == french_clean:
        return True
    
    # Vérifier si le texte contient des mots français typiques
    french_words = ['le ', 'la ', 'les ', 'de ', 'des ', 'du ', 'et ', 'à ', 'un ', 'une ']
    text_lower = text_clean.lower()
    french_count = sum(1 for word in french_words if word in text_lower)
    
    # Si plus de 3 mots français typiques, probablement en français
    if french_count > 3:
        return True
    
    return False

def translate_description(text, target_lang):
    """
    Traduit un texte vers la langue cible
    """
    try:
        # Mapping des codes de langue
        lang_map = {
            'it': 'it',
            'es': 'es',
            'pl': 'pl',
            'ar': 'ar',
            'cn': 'zh-CN',
            'jp': 'ja'
        }
        
        target_code = lang_map.get(target_lang, target_lang)
        translator = GoogleTranslator(source='fr', target=target_code)
        
        # Traduire le texte (Google Translate a une limite de 5000 caractères)
        if len(text) > 4500:
            # Diviser en parties si trop long
            parts = []
            current = ""
            for char in text:
                current += char
                if len(current) >= 4000 and char in ['>', '.', ' ', '\n']:
                    parts.append(current)
                    current = ""
            if current:
                parts.append(current)
            
            translated_parts = []
            for part in parts:
                translated = translator.translate(part)
                translated_parts.append(translated)
            return ''.join(translated_parts)
        else:
            return translator.translate(text)
    except Exception as e:
        print(f"  ⚠️  Erreur de traduction: {e}")
        return text  # Retourner le texte original en cas d'erreur

def process_language(data, lang_code, lang_name):
    """
    Traite une langue : vérifie et traduit toutes les personnalités
    """
    print(f"\n{'='*60}")
    print(f"Traitement de la langue: {lang_name} ({lang_code})")
    print(f"{'='*60}")
    
    if lang_code not in data:
        print(f"  ❌ Section {lang_code} introuvable!")
        return 0
    
    if 'fr' not in data:
        print(f"  ❌ Section française introuvable!")
        return 0
    
    lang_data = data[lang_code]
    fr_data = data['fr']
    
    total = len(fr_data)
    translated_count = 0
    skipped_count = 0
    
    for i, (person_name, fr_info) in enumerate(fr_data.items(), 1):
        print(f"\n[{i}/{total}] {person_name}")
        
        if person_name not in lang_data:
            print(f"  ⚠️  Personnalité absente dans {lang_code}, ajout...")
            lang_data[person_name] = {
                "name": fr_info["name"],
                "category": fr_info["category"],
                "image": fr_info["image"],
                "description": fr_info["description"]
            }
        
        person_data = lang_data[person_name]
        fr_description = fr_info.get("description", "")
        current_description = person_data.get("description", "")
        
        if not current_description:
            print(f"  ⚠️  Description vide, copie du français...")
            current_description = fr_description
            person_data["description"] = fr_description
        
        # Vérifier si le texte est en français
        if is_french_text(current_description, fr_description):
            print(f"  🔄 Texte en français détecté, traduction en cours...")
            try:
                translated = translate_description(fr_description, lang_code)
                person_data["description"] = translated
                translated_count += 1
                print(f"  ✅ Traduit avec succès")
            except Exception as e:
                print(f"  ❌ Erreur lors de la traduction: {e}")
                # Garder le texte français en cas d'erreur
        else:
            print(f"  ✓ Déjà dans la bonne langue")
            skipped_count += 1
    
    print(f"\n{'='*60}")
    print(f"Résumé pour {lang_name}:")
    print(f"  - Total: {total}")
    print(f"  - Traduits: {translated_count}")
    print(f"  - Déjà traduits: {skipped_count}")
    print(f"{'='*60}")
    
    return translated_count

def main():
    # Charger le JSON
    print("Chargement du fichier personnalites.json...")
    with open('translations/personnalites.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"✅ Fichier chargé: {len(data.get('fr', {}))} personnalités en français")
    
    # Langues à traiter
    languages = [
        ('it', 'Italien'),
        ('es', 'Espagnol'),
        ('pl', 'Polonais'),
        ('ar', 'Arabe'),
        ('cn', 'Chinois'),
        ('jp', 'Japonais')
    ]
    
    total_translated = 0
    
    # Traiter chaque langue
    for lang_code, lang_name in languages:
        try:
            count = process_language(data, lang_code, lang_name)
            total_translated += count
            
            # Sauvegarder après chaque langue (sécurité)
            print(f"\n💾 Sauvegarde intermédiaire...")
            with open('translations/personnalites.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"✅ Sauvegardé!")
            
        except Exception as e:
            print(f"\n❌ Erreur lors du traitement de {lang_name}: {e}")
            continue
    
    # Sauvegarde finale
    print(f"\n\n{'='*60}")
    print(f"SAUVEGARDE FINALE")
    print(f"{'='*60}")
    with open('translations/personnalites.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Traitement terminé!")
    print(f"   Total de traductions effectuées: {total_translated}")

if __name__ == '__main__':
    main()


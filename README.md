# Chrono — préparateur de circuits d'exercice

Petite application web (HTML/CSS/JS pur, **aucune installation**) pour construire,
enregistrer et exécuter des circuits d'entraînement minutés.

Structure : `index.html` (markup) + `style.css` + `app.js` (logique) +
`nosleep.js` (bibliothèque NoSleep.js v0.12.0, MIT, garde l'écran allumé).

## Utilisation

**En ligne (recommandé) :** <https://tartaleb.github.io/Chrono/> — déployé
automatiquement par GitHub Pages à chaque `git push` sur `main`. À utiliser
sur smartphone : l'adresse étant en HTTPS, l'API Wake Lock fonctionne et
l'écran reste allumé pendant la séance. Astuce : « Ajouter à l'écran d'accueil ».

**En local :** servir le dossier avec n'importe quel serveur statique
(`python -m http.server`, extension Live Server, etc.). Les chemins étant
relatifs, ouvrir `index.html` en `file://` fonctionne aussi, mais l'API
Wake Lock y est désactivée par les navigateurs (un repli vidéo NoSleep prend
alors le relais, de façon moins fiable).

## Fonctionnalités

- **Étapes** : chaque étape est un *exercice* ou une *pause*, avec une durée min/s.
- **Ensembles** : regroupe des étapes et répète l'ensemble `× N` tours
  (idéal pour « 3 tours de [pompes 45 s, repos 15 s] »).
- **Dupliquer** une étape *ou* un ensemble entier (bouton ⧉), réordonner (↑ ↓).
- **Enregistrer / charger / supprimer** des circuits (stockés dans le navigateur).
- **Lecteur plein écran** : grand chronomètre, étape suivante, barre de
  progression, contrôles précédent / pause / suivant.
- **Sons** :
  - bips de décompte sur les 3 dernières secondes,
  - **son distinct de fin d'étape** (double bip descendant),
  - **voix française** qui annonce chaque étape et sa durée,
  - carillon de fin de circuit.
- Garde l'écran allumé pendant la séance (Wake Lock) et reprend le brouillon
  en cours au rechargement.

## Stockage

Tout est conservé en `localStorage` (par navigateur/appareil).
Pour utiliser un circuit sur un autre appareil, il faudra le recréer
(une fonction export/import JSON pourra être ajoutée si besoin).

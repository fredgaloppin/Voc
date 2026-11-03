# Vokabel Trainer — Allemand / Français

Application PWA personnelle, sans serveur distant et utilisable hors ligne après son premier lancement/install.

## Contenu
- `index.html` : interface
- `js/app.js` : logique de l'application et progression
- `js/vocabulary.js` : vocabulaire initial A1 à C2
- `css/app.css` : feuille locale utilisée par l'application (aucun CDN)
- `css/input.css` + `tailwind.config.js` : source Tailwind CSS
- `service-worker.js` : mise en cache pour le mode hors ligne
- `manifest.webmanifest` : paramètres d'installation PWA

## Lancer sur ordinateur

La PWA et le service worker nécessitent une origine sécurisée. Pour tester sur PC :

1. Installer Node.js si nécessaire (ou utiliser Python déjà installé).
2. Ouvrir un terminal dans le dossier du projet.
3. Lancer par exemple :

   ```bash
   python -m http.server 8000
   ```

4. Ouvrir `http://localhost:8000` dans Chrome, Edge ou Firefox.

Pour arrêter le serveur : `Ctrl+C`.

## Installer sur smartphone

Pour installer une PWA sur un smartphone, le dossier doit être servi par une adresse HTTPS (ou localhost). Le moyen le plus simple est de publier le dossier sur un hébergement HTTPS statique ou de le servir depuis un ordinateur sur le réseau local avec un certificat HTTPS adapté. Ouvrir ensuite l'adresse dans le navigateur du téléphone et choisir « Ajouter à l'écran d'accueil » / « Installer ».

Après chargement initial et mise en cache, l'application fonctionne hors ligne. Les données de vocabulaire et la séance sont conservées dans le stockage local du navigateur de chaque appareil. Les données ne se synchronisent pas automatiquement entre PC et téléphone : utiliser Exporter/Importer JSON pour les transférer.

## Tailwind CSS

La feuille `css/app.css` fournie permet d'utiliser l'application immédiatement sans connexion. Le fichier source Tailwind est `css/input.css`.

Pour régénérer la feuille avec Tailwind CSS v3 (connexion nécessaire une seule fois pour installer les dépendances) :

```bash
npm install
npm run build:css
```

L'application en fonctionnement n'a pas besoin de Node.js ni d'Internet.

## Méthode de progression

Pour une série de 20 mots :
1. apprentissage des mots 1 à 5 ;
2. apprentissage des mots 6 à 10 ;
3. révision des mots 1 à 10 ;
4. apprentissage des mots 11 à 15 ;
5. apprentissage des mots 16 à 20 ;
6. révision des mots 1 à 20.

La réponse s'affiche uniquement quand tu appuies sur « Afficher la réponse ». Tu avances ensuite manuellement. Aucun score ni contrôle de connaissance n'est effectué.

Pour une série de 40 ou 60 mots, le cycle continue en groupes de cinq avec révisions cumulatives.

## Données
- Les modifications restent dans `localStorage` du navigateur.
- Exporter régulièrement un fichier JSON comme sauvegarde.
- Importer un fichier JSON remplace la liste locale.


## Nouveautés de la version 1.1
- Navigation par boutons Précédent / Suivant et par flèches gauche/droite du clavier.
- Espace affiche la traduction.
- Après révélation, « Bon · retirer » valide le mot pour l'étape courante et le retire de la boucle de cette étape.
- « Pas bon » conserve le mot dans la boucle de révision.
- La progression d'une étape continue jusqu'à ce que tous ses mots soient marqués « Bon ».
- Sélection personnalisée : coche exactement 20 mots dans le tableau, éventuellement de niveaux différents, puis clique sur « Étudier ces 20 mots ».

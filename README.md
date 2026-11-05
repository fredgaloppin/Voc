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

La réponse s’affiche quand tu appuies sur « Afficher la réponse ». Tu évalues ensuite ta réponse avec « Bon » ou « Pas bon », ou tu avances manuellement.

Pour une série de 40 ou 60 mots, le cycle continue en groupes de cinq avec révisions cumulatives.

## Données
- Les modifications restent dans `localStorage` du navigateur.
- Exporter régulièrement un fichier JSON comme sauvegarde.
- Importer un fichier JSON permet d’ajouter des mots ou de remplacer la liste locale.


## Nouveautés de la version 1.1
- Navigation par boutons Précédent / Suivant et par flèches gauche/droite du clavier.
- Espace affiche la traduction.
- Après révélation, « Bon · retirer » valide le mot pour l'étape courante et le retire de la boucle de cette étape.
- « Pas bon » conserve le mot dans la boucle de révision.
- La progression d'une étape continue jusqu'à ce que tous ses mots soient marqués « Bon ».
- Sélection personnalisée : coche exactement 20 mots dans le tableau, éventuellement de niveaux différents, puis clique sur « Étudier ces 20 mots ».

## Nouveautés de la version 1.2

- La case « Choix » dans l’en-tête coche ou décoche tous les mots affichés par le filtre. La sélection peut dépasser 20 mots, puis être ramenée à exactement 20 pour démarrer une série personnalisée.
- Après révélation, « Bon » et « Pas bon » ajoutent chacun une révision. Afficher une réponse ou passer à la suivante ne modifie pas le compteur. Les sauvegardes anciennes sans compteur démarrent à zéro.
- Dans « Ordre des mots », « Les moins révisés » sélectionne jusqu’à 20 mots du niveau demandé, du plus petit au plus grand compteur. À compteur égal, le choix est aléatoire.
- Le pluriel des noms s’affiche à côté du singulier lorsqu’il est renseigné. Saisis la forme entière sans article dans le champ « Pluriel allemand ».
- Pour cumuler les fichiers A1 à C2, choisis « Ajouter / fusionner » avant d’importer chaque fichier. Deux entrées de même niveau, avec le même mot et la même traduction, sont fusionnées. Le compteur le plus élevé est conservé. « Remplacer la liste » permet de restaurer exactement le contenu d’un export et abandonne la séance en cours.

Les six listes par niveau sont des sélections pédagogiques allemand–français à classement indicatif. L’icône SVG fournie remplace l’icône absente des fichiers transmis.

Pour mettre à jour une installation existante, garde la même adresse et le même port pour conserver les données du navigateur. Après la mise à jour, recharge la page pour afficher la nouvelle version.

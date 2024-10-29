# Carte en temps réel des trams de la CTS

## Utilisation

Pour démarrer, il vous faudra vous procurer un compte sur le [portail Opendata](https://cts-strasbourg.eu/fr/portail-open-data/) de la CTS. Après avoir obtenu un compte vous pourrez obtenir une clé d'API, qui sera à renseigner dans un fichier `.env`.

### Téléchargement des données

La version actuelle ne télécha  rge pas en continue les données. Il faut utiliser le script `download_data.py` pour le faire.

### Lancement d'un serveur HTTP

```sh
python3 -m http.server
```

## License

Copyright (C) 2024 Maxime "M4x1m3" FRIESS

Ce programme est un logiciel libre: vous pouvez le redistribuer
et/ou le modifier selon les termes de la "GNU General Public
License", tels que publiés par la "Free Software Foundation"; soit
la version 2 de cette licence ou (à votre choix) toute version
ultérieure.

Ce programme est distribué dans l'espoir qu'il sera utile, mais
SANS AUCUNE GARANTIE, ni explicite ni implicite; sans même les
garanties de commercialisation ou d'adaptation dans un but spécifique.

Se référer à la ["GNU General Public License"](LICENCE.md) pour plus de détails.

Vous devriez avoir reçu une copie de la "GNU General Public License"
en même temps que ce programme; sinon, écrivez a la "Free Software
Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA".
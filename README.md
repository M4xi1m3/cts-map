# Carte en temps réel des trams de la CTS

## Utilisation

Pour démarrer, créez un virtual env puis installez les dépendances :

```sh
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Lancement du serveur HTTP

```sh
fastapi run main.py
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
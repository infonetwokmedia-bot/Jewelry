#!/usr/bin/env python3

"""
🚀 Automatizador de Contenido Bilingual - Remedio Joyería
Actualiza páginas via WP-CLI de forma confiable
"""

import subprocess
import sys
from datetime import datetime
from pathlib import Path


class ContentUpdater:
    def __init__(self):
        self.container = "jewelry_wordpress"
        self.workspace = Path("/srv/stacks/jewelry")
        self.backup_dir = self.workspace / "backups"
        self.backup_dir.mkdir(exist_ok=True)

        # Definir traducciones
        self.translations = {
            "home": {
                "es": 1388,
                "en": 1403,
                "replacements": [
                    (
                        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                        "Descubre nuestra colección de joyas premium, auténticas y diseñadas con perfección. Cada pieza cuenta una historia.",
                    ),
                    (
                        "In Our Store, You Will Be Able To Find All Types Of Jewelry To Impress Your Other Half.",
                        "En Nuestra Tienda, Encontrarás Todo Tipo de Joyas para Impresionar a tu Pareja.",
                    ),
                ],
            },
            "about": {
                "es": 1383,
                "en": 1404,
                "replacements": [
                    (
                        "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
                        "Remedio Joyería fue fundada hace más de 20 años en Miami con una misión simple",
                    ),
                ],
            },
        }

    def wp_cli(self, command: str) -> str:
        """Ejecutar WP-CLI en Docker"""
        cmd = f"docker exec {self.container} wp {command} --allow-root"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"WP-CLI error: {result.stderr}")
        return result.stdout.strip()

    def get_content(self, post_id: int) -> str:
        """Obtener contenido de una página"""
        print(f"  📥 Obteniendo contenido de post {post_id}...")
        # Guardar en archivo temporal primero
        self.wp_cli(
            f"post get {post_id} --field=post_content > /tmp/post_{post_id}.html"
        )

        # Leer archivo
        try:
            with open(f"/tmp/post_{post_id}.html", "r") as f:
                return f.read()
        except:
            # Alternativa: usar WP-CLI stdin
            result = subprocess.run(
                f"docker exec {self.container} wp post get {post_id} --field=post_content --allow-root",
                shell=True,
                capture_output=True,
                text=True,
            )
            return result.stdout

    def backup_content(self, post_id: int, content: str) -> Path:
        """Crear backup del contenido"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = self.backup_dir / f"page_{post_id}_{timestamp}.html"

        with open(backup_file, "w") as f:
            f.write(content)

        print(f"  💾 Backup creado: {backup_file}")
        return backup_file

    def update_content(self, post_id: int, content: str) -> bool:
        """Actualizar contenido de una página"""
        # Guardar contenido en archivo temporal
        temp_file = f"/tmp/update_{post_id}.html"
        with open(temp_file, "w") as f:
            f.write(content)

        print(f"  📤 Actualizando post {post_id}...")

        # Usar comando para actualizar desde archivo
        cmd = (
            f"docker cp {temp_file} {self.container}:/tmp/update.html && "
            f"docker exec {self.container} wp post update {post_id} --post_content=$(cat /tmp/update.html) --allow-root"
        )

        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

        if "updated" in result.stdout.lower() or result.returncode == 0:
            print(f"  ✅ Post {post_id} actualizado")
            return True
        else:
            print(f"  ❌ Error: {result.stderr}")
            return False

    def update_page(self, page_key: str, lang: str, is_spanish: bool = True) -> bool:
        """Actualizar una página en un idioma"""
        print(f"\n📝 Actualizando {page_key.upper()} ({lang})...")

        page_data = self.translations[page_key]
        post_id = page_data["es"] if is_spanish else page_data["en"]

        # Obtener contenido actual
        try:
            content = self.get_content(post_id)
        except Exception as e:
            print(f"  ❌ Error obteniendo contenido: {e}")
            return False

        # Crear backup
        self.backup_content(post_id, content)

        # Aplicar reemplazos
        original_content = content
        replacements = page_data["replacements"]

        for old_text, new_text in replacements:
            if old_text in content:
                content = content.replace(old_text, new_text)
                print(f"  ✓ Reemplazado: '{old_text[:50]}...'")
            else:
                print(f"  ⚠️  No encontrado: '{old_text[:50]}...'")

        # Actualizar si hay cambios
        if content != original_content:
            return self.update_content(post_id, content)
        else:
            print("  ℹ️  No hay cambios")
            return True

    def update_bilingual_page(self, page_key: str) -> bool:
        """Actualizar ambas versiones de una página"""
        print(f"\n{'=' * 60}")
        print(f"Actualizando {page_key.upper()}")
        print(f"{'=' * 60}")

        success = True
        success &= self.update_page(page_key, "ES", is_spanish=True)

        # Para EN, usar diferentes reemplazos
        print(f"\n📝 Actualizando {page_key.upper()} (EN)...")
        post_id = self.translations[page_key]["en"]

        try:
            content = self.get_content(post_id)
        except:
            print("  ❌ Error obteniendo contenido EN")
            return False

        self.backup_content(post_id, content)

        # Reemplazos en inglés
        en_replacements = [
            (
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                "Discover our collection of premium, authentic jewelry pieces designed with perfection. Each piece tells a story.",
            ),
            (
                "In Our Store, You Will Be Able To Find All Types Of Jewelry To Impress Your Other Half.",
                "Browse Our Exclusive Collection of Premium Jewelry Handcrafted with Excellence.",
            ),
        ]

        original = content
        for old, new in en_replacements:
            if old in content:
                content = content.replace(old, new)
                print(f"  ✓ Reemplazado: '{old[:50]}...'")

        if content != original:
            success &= self.update_content(post_id, content)

        return success

    def validate_changes(self, page_key: str) -> None:
        """Validar cambios después de actualizar"""
        print(f"\n🔍 Validando cambios en {page_key.upper()}...")

        page = self.translations[page_key]

        for lang, post_id in [("ES", page["es"]), ("EN", page["en"])]:
            try:
                content = self.get_content(post_id)
                # Verificar que Lorem ipsum fue reemplazado
                lorem_count = content.count("Lorem ipsum")
                print(
                    f"  {lang} (ID {post_id}): {len(content)} caracteres, {lorem_count} Lorem ipsum"
                )
            except Exception as e:
                print(f"  ❌ Error validando {lang}: {e}")


def main():
    if len(sys.argv) < 2:
        print("Uso: python3 update-pages.py <home|about|all> [--validate]")
        sys.exit(1)

    page_key = sys.argv[1].lower()
    validate = "--validate" in sys.argv

    updater = ContentUpdater()

    try:
        if page_key in ["home", "about"]:
            updater.update_bilingual_page(page_key)
            if validate:
                updater.validate_changes(page_key)
        elif page_key == "all":
            updater.update_bilingual_page("home")
            updater.update_bilingual_page("about")
            if validate:
                updater.validate_changes("home")
                updater.validate_changes("about")
        else:
            print(f"❌ Página desconocida: {page_key}")
            sys.exit(1)

        print("\n✨ Actualización completada")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

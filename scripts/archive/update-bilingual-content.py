#!/usr/bin/env python3
"""
🤖 Automatizador de Contenido Bilingual - Remedio Joyería
Actualiza páginas ES/EN manteniendo estructura Kadence Blocks
"""

import re
import subprocess
import sys


class BilingualPageUpdater:
    """Actualiza páginas WordPress con contenido bilingual"""

    def __init__(self, docker_container="jewelry_wordpress"):
        self.container = docker_container
        self.pages = {
            "home": {"es": 1388, "en": 1403, "name": "Home/Inicio"},
            "about": {"es": 1383, "en": 1404, "name": "About/Nosotros"},
            "materials": {"es": 1385, "en": 1405, "name": "Materials/Materiales"},
            "contact": {"es": 1384, "en": 1406, "name": "Contacts/Contacto"},
        }

    def wp_cli(self, command: str) -> str:
        """Ejecutar comando WP-CLI en Docker"""
        full_cmd = f"docker exec {self.container} wp {command} --allow-root"
        try:
            result = subprocess.run(
                full_cmd, shell=True, capture_output=True, text=True, timeout=30
            )
            if result.returncode != 0:
                print(f"❌ Error: {result.stderr}")
                return None
            return result.stdout.strip()
        except subprocess.TimeoutExpired:
            print(f"❌ Timeout ejecutando: {command}")
            return None

    def get_post_content(self, post_id: int) -> str:
        """Obtener contenido actual de la página"""
        output = self.wp_cli(f"post get {post_id} --field=post_content")
        return output if output else ""

    def update_post_content(self, post_id: int, content: str, backup=True) -> bool:
        """Actualizar contenido de post"""
        if backup:
            # Crear backup
            current = self.get_post_content(post_id)
            backup_file = (
                f"/srv/stacks/jewelry/backups/page_{post_id}_backup_$(date +%s).html"
            )
            with open(f"/tmp/page_{post_id}_backup.html", "w") as f:
                f.write(current)
            print(f"  💾 Backup creado: /tmp/page_{post_id}_backup.html")

        # Escaped content para WP-CLI
        escaped = content.replace("\\", "\\\\").replace('"', '\\"')

        # Actualizar vía WP-CLI
        cmd = f'post update {post_id} --post_content="{escaped}"'
        result = self.wp_cli(cmd)

        if result and "updated" in result.lower():
            print(f"  ✅ Contenido actualizado: Post {post_id}")
            return True
        else:
            print(f"  ❌ Error actualizando: Post {post_id}")
            return False

    def replace_heading(
        self, content: str, old_text: str, new_text: str, level=1
    ) -> str:
        """Reemplazar texto en heading manteniendo estructura Kadence"""
        # Buscar el heading HTML
        pattern = f"<h{level}[^>]*>([^<]*{re.escape(old_text)}[^<]*)</h{level}>"
        replacement = (
            f"<h{level}>".replace("<h", f'<h{level} class="').replace(
                ">", '" data-kb-block="...">'
            )
            + new_text
            + f"</h{level}>"
        )

        # Más simple: buscar contenido directo
        simple_pattern = f">{re.escape(old_text)}<"
        if re.search(simple_pattern, content):
            content = content.replace(f">{old_text}<", f">{new_text}<")

        return content

    def update_home_es(self) -> bool:
        """Actualizar Home en Español"""
        print("\n📝 Actualizando HOME (Español)...")

        current = self.get_post_content(1388)

        replacements = [
            (
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
                "Descubre nuestra colección de joyas premium, auténticas y diseñadas con perfección. Cada pieza cuenta una historia.",
            ),
            (
                "In Our Store, You Will Be Able To Find All Types Of Jewelry To Impress Your Other Half.",
                "En Nuestra Tienda, Encontrarás Todo Tipo de Joyas para Impresionar a tu Pareja.",
            ),
            # Agregar más reemplazos según sea necesario
        ]

        updated = current
        for old, new in replacements:
            if old in updated:
                updated = updated.replace(old, new)
                print(f"  ✓ Reemplazado: '{old[:40]}...'")

        if updated != current:
            return self.update_post_content(1388, updated)
        else:
            print("  ℹ️  No hay cambios detectados")
            return False

    def update_home_en(self) -> bool:
        """Actualizar Home en Inglés"""
        print("\n📝 Actualizando HOME (Inglés)...")

        current = self.get_post_content(1403)

        replacements = [
            (
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
                "Discover our collection of premium, authentic jewelry pieces designed with perfection. Each piece tells a story.",
            ),
            (
                "In Our Store, You Will Be Able To Find All Types Of Jewelry To Impress Your Other Half.",
                "Browse Our Exclusive Collection of Premium Jewelry Handcrafted with Excellence.",
            ),
        ]

        updated = current
        for old, new in replacements:
            if old in updated:
                updated = updated.replace(old, new)
                print(f"  ✓ Reemplazado: '{old[:40]}...'")

        if updated != current:
            return self.update_post_content(1403, updated)
        else:
            print("  ℹ️  No hay cambios detectados")
            return False

    def validate_bogo_linking(self, page_key: str) -> bool:
        """Validar vinculación Bogo entre ES/EN"""
        print(f"\n🔗 Validando Bogo linking para {self.pages[page_key]['name']}...")

        page_ids = self.pages[page_key]
        es_id = page_ids["es"]
        en_id = page_ids["en"]

        # Obtener traducciones de la página ES
        es_translations = self.wp_cli(f"post meta get {es_id} bogo_translations")

        if es_translations:
            print(f"  ✅ Página ES ({es_id}) vinculada")
            if str(en_id) in es_translations:
                print(f"  ✅ Enlace válido a EN ({en_id})")
                return True
            else:
                print(f"  ⚠️  EN ({en_id}) no está en traducciones")
        else:
            print("  ⚠️  No hay meta Bogo para ES")

        return False

    def run_demo(self, page_key: str = "home") -> bool:
        """Ejecutar actualización de prueba"""
        page = self.pages[page_key]
        print(f"🚀 Ejecutando actualización de {page['name']}...")

        # Mostrar estado actual
        print("\n📊 Estado ANTES:")
        es_content = self.get_post_content(page["es"])
        en_content = self.get_post_content(page["en"])

        print(f"  ES ({page['es']}): {len(es_content)} caracteres")
        print(f"  EN ({page['en']}): {len(en_content)} caracteres")

        # Ejecutar actualizaciones
        if page_key == "home":
            success_es = self.update_home_es()
            success_en = self.update_home_en()
        else:
            print(f"  ℹ️  Actualización para {page_key} no implementada aún")
            return False

        # Validar
        print("\n📊 Estado DESPUÉS:")
        es_content_new = self.get_post_content(page["es"])
        en_content_new = self.get_post_content(page["en"])

        print(f"  ES ({page['es']}): {len(es_content_new)} caracteres")
        print(f"  EN ({page['en']}): {len(en_content_new)} caracteres")

        # Validar Bogo
        self.validate_bogo_linking(page_key)

        print(f"\n✨ Actualización completada: {page['name']}")
        return success_es and success_en


def main():
    """Función principal"""
    if len(sys.argv) < 2:
        print(
            "Uso: python3 update-content.py <home|about|materials|contact> [--dry-run]"
        )
        sys.exit(1)

    page_key = sys.argv[1].lower()
    dry_run = "--dry-run" in sys.argv

    updater = BilingualPageUpdater()

    valid_pages = list(updater.pages.keys())
    if page_key not in valid_pages:
        print(f"❌ Página inválida. Opciones: {', '.join(valid_pages)}")
        sys.exit(1)

    if dry_run:
        print("🧪 MODO DRY-RUN (sin hacer cambios)\n")

    success = updater.run_demo(page_key)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

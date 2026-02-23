#!/usr/bin/env python3
"""
Elementor Translation Applier
Aplica traducciones a una página Elementor desde archivo JSON.

Uso:
  python3 apply-translation.py translations.json 1403 [--dry-run] [--backup]

  translations.json: Archivo con traducciones (de extract-elementor-translations.py)
  1403: ID de la página a actualizar
  --dry-run: Mostrar cambios sin aplicarlos
  --backup: Crear backup antes de aplicar (recomendado)
"""

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple


class ElementorTranslationApplier:
    def __init__(self, page_id: int, elementor_json: str):
        """Inicializar con página ID y JSON de Elementor."""
        self.page_id = page_id
        self.elementor_data = (
            json.loads(elementor_json)
            if isinstance(elementor_json, str)
            else elementor_json
        )
        self.changes_applied = 0
        self.changes_failed = 0

    def apply_translations(self, translations: List[Dict]) -> Tuple[int, int, list]:
        """
        Aplicar traducciones a los elementos.

        Returns:
            (applied_count, failed_count, failed_items)
        """
        failed_items = []

        for translation in translations:
            try:
                # Validar que tiene traducción
                if (
                    "translation_en" not in translation
                    or not translation["translation_en"]
                ):
                    continue

                # Encontrar el widget
                widget_type = translation.get("widget_type")
                widget_id = translation.get("widget_id")
                field = translation.get("field")
                new_value = translation["translation_en"]

                # Buscar y actualizar
                if self._update_widget(widget_id, widget_type, field, new_value):
                    self.changes_applied += 1
                else:
                    self.changes_failed += 1
                    failed_items.append(translation)

            except Exception as e:
                self.changes_failed += 1
                failed_items.append({**translation, "error": str(e)})

        return self.changes_applied, self.changes_failed, failed_items

    def _update_widget(
        self, widget_id: str, widget_type: str, field: str, new_value: str
    ) -> bool:
        """Encontrar y actualizar un widget específico."""
        return self._traverse_and_update(
            self.elementor_data, widget_id, widget_type, field, new_value
        )

    def _traverse_and_update(
        self,
        elements: List[Dict],
        target_id: str,
        target_type: str,
        field: str,
        new_value: str,
    ) -> bool:
        """Recorrer elementos y actualizar el widget objetivo."""
        if not isinstance(elements, list):
            return False

        for element in elements:
            if not isinstance(element, dict):
                continue

            # Verificar si es el elemento que buscamos
            element_id = element.get("id")
            element_type = element.get("widgetType")

            if element_id == target_id and element_type == target_type:
                # Encontrado, actualizar
                settings = element.get("settings", {})

                # Manejar campo especial icon-list
                if field.startswith("icon_list["):
                    # Formato: icon_list[0].text
                    import re

                    match = re.match(r"icon_list\[(\d+)\]\.text", field)
                    if match:
                        idx = int(match.group(1))
                        icon_list = settings.get("icon_list", [])
                        if idx < len(icon_list) and isinstance(icon_list[idx], dict):
                            icon_list[idx]["text"] = new_value
                            settings["icon_list"] = icon_list
                            element["settings"] = settings
                            return True
                else:
                    # Campo simple
                    if field in settings:
                        settings[field] = new_value
                        element["settings"] = settings
                        return True

                return False

            # Recorrer elementos hijos
            if "elements" in element:
                if self._traverse_and_update(
                    element["elements"], target_id, target_type, field, new_value
                ):
                    return True

        return False

    def get_json(self) -> str:
        """Obtener JSON actualizado."""
        return json.dumps(self.elementor_data, ensure_ascii=False, indent=2)


def create_backup(page_id: int) -> str:
    """Crear backup de la página antes de cambios."""
    backup_dir = Path("backups/elementor")
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"page_{page_id}_backup_{timestamp}.json"
    filepath = backup_dir / filename

    # Obtener datos actuales
    try:
        result = subprocess.run(
            [
                "docker",
                "exec",
                "jewelry_wordpress",
                "wp",
                "post",
                "meta",
                "get",
                str(page_id),
                "_elementor_data",
                "--allow-root",
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )

        if result.returncode == 0:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(result.stdout)
            return str(filepath)
    except Exception as e:
        print(f"⚠️  No se pudo crear backup: {e}")

    return None


def update_page_in_wordpress(page_id: int, elementor_json: str) -> bool:
    """Actualizar página en WordPress con nuevo JSON de Elementor."""
    try:
        # Escapar JSON para CLI
        escaped_json = elementor_json.replace('"', '\\"').replace("$", "\\$")

        cmd = f"""
        docker exec jewelry_wordpress wp eval '
        $result = update_post_meta({page_id}, "_elementor_data", json_decode(stripslashes(<<<JSON
{elementor_json}
JSON
), true));
        if ($result) {{
            echo "Success";
        }} else {{
            echo "Failed";
        }}
        ' --allow-root
        """

        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=30
        )

        # Verificar éxito
        if "Success" in result.stdout:
            return True
        else:
            print(f"Error al actualizar: {result.stdout}")
            print(f"Stderr: {result.stderr}")
            return False

    except Exception as e:
        print(f"Error ejecutando comando WordPress: {e}")
        return False


def load_translations(filepath: str) -> List[Dict]:
    """Cargar traducciones desde archivo JSON."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Esperar estructura de extract-elementor-translations.py
        if isinstance(data, dict) and "translations" in data:
            return data["translations"]
        elif isinstance(data, list):
            return data
        else:
            raise ValueError("Formato de JSON no reconocido")

    except json.JSONDecodeError as e:
        print(f"Error al parsear JSON: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print(f"Archivo no encontrado: {filepath}")
        sys.exit(1)


def validate_translations(translations: List[Dict]) -> Tuple[int, List[str]]:
    """Validar que todas las traducciones tengan campos obligatorios."""
    errors = []
    valid_count = 0

    for idx, t in enumerate(translations):
        if not all(k in t for k in ["widget_id", "widget_type", "field", "value"]):
            errors.append(f"Item {idx}: falta campo obligatorio")
        elif "translation_en" not in t:
            errors.append(f"Item {idx}: falta campo 'translation_en'")
        elif t.get("translation_en"):
            valid_count += 1

    return valid_count, errors


def main():
    if len(sys.argv) < 3:
        print(
            "Uso: python3 apply-translation.py <translations.json> <page_id> [--dry-run] [--backup]"
        )
        print("\nEjemplos:")
        print("  python3 apply-translation.py translations.json 1403")
        print("  python3 apply-translation.py translations.json 1403 --dry-run")
        print(
            "  python3 apply-translation.py translations.json 1403 --backup --dry-run"
        )
        sys.exit(1)

    trans_file = sys.argv[1]
    page_id = int(sys.argv[2])
    dry_run = "--dry-run" in sys.argv
    create_bkp = "--backup" in sys.argv

    print("=" * 60)
    print("Elementor Translation Applier")
    print("=" * 60)
    print(f"Archivo de traducciones: {trans_file}")
    print(f"Página ID: {page_id}")
    print(f"Modo: {'DRY RUN (no aplicar cambios)' if dry_run else 'APLICAR CAMBIOS'}")
    print()

    # Cargar traducciones
    print("📖 Cargando traducciones...")
    translations = load_translations(trans_file)
    print(f"✓ Cargadas {len(translations)} traducciones")

    # Validar
    print("\n✔️ Validando traducciones...")
    valid_count, errors = validate_translations(translations)
    print(f"✓ {valid_count} traducciones válidas para aplicar")
    if errors:
        print(f"⚠️ {len(errors)} advertencias:")
        for err in errors[:5]:  # Mostrar máximo 5
            print(f"   - {err}")
        if len(errors) > 5:
            print(f"   ... y {len(errors) - 5} más")

    # Obtener JSON actual
    print(f"\n📥 Obteniendo datos de página {page_id}...")
    try:
        result = subprocess.run(
            [
                "docker",
                "exec",
                "jewelry_wordpress",
                "wp",
                "post",
                "meta",
                "get",
                str(page_id),
                "_elementor_data",
                "--allow-root",
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode != 0:
            print(f"❌ Error al obtener datos: {result.stderr}")
            sys.exit(1)

        original_json = result.stdout.strip()
        print(f"✓ JSON obtenido ({len(original_json)} bytes)")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

    # Crear backup si está activado
    if create_bkp:
        print("\n💾 Creando backup...")
        backup_path = create_backup(page_id)
        if backup_path:
            print(f"✓ Backup guardado: {backup_path}")
        else:
            print("⚠️  No se pudo crear backup (pero continuando)")

    # Aplicar traducciones
    print("\n🔄 Aplicando traducciones...")
    try:
        applier = ElementorTranslationApplier(page_id, original_json)
        applied, failed, failed_items = applier.apply_translations(translations)

        print(f"✓ Aplicadas: {applied}")
        if failed:
            print(f"❌ Fallidas: {failed}")
            if len(failed_items) <= 5:
                for item in failed_items:
                    print(
                        f"   - {item.get('widget_type', 'unknown')}: {item.get('value', 'N/A')[:50]}"
                    )
            else:
                for item in failed_items[:3]:
                    print(
                        f"   - {item.get('widget_type', 'unknown')}: {item.get('value', 'N/A')[:50]}"
                    )
                print(f"   ... y {failed - 3} más")
    except Exception as e:
        print(f"❌ Error durante aplicación: {e}")
        sys.exit(1)

    # Mostrar preview
    print("\n📋 Preview de cambios:")
    updated_json = applier.get_json()
    print(
        f"   JSON actualizado: {len(updated_json)} bytes ({len(updated_json) - len(original_json):+d} bytes)"
    )

    # DRY RUN: guardar archivo de preview
    if dry_run:
        preview_file = Path("preview_changes.json")
        with open(preview_file, "w", encoding="utf-8") as f:
            f.write(updated_json)
        print(f"   💾 Preview guardado en: {preview_file}")
        print("\n✓ DRY RUN COMPLETADO - No se aplicaron cambios")
        print("   Ejecuta sin --dry-run para aplicar")
    else:
        # Aplicar cambios reales
        print("\n⚙️ Actualizando página en WordPress...")
        if update_page_in_wordpress(page_id, updated_json):
            print("✓ Página actualizada exitosamente")
            print(f"\n✅ CAMBIOS APLICADOS: {applied} traducciones")
            print("🌐 Verifica en: https://jewelry.local.dev/en/")
        else:
            print("❌ Error al actualizar la página")
            print("   Intenta con --dry-run para ver el preview")
            sys.exit(1)

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()

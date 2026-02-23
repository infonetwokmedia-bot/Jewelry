#!/usr/bin/env python3
"""
Elementor Translation Extractor
Extrae todos los textos de una página Elementor para traducción.

Uso:
  python3 extract-translation.py HOME_ES --output translations.json
"""

import json
import sys
from pathlib import Path
from typing import Dict, List


class ElementorTranslationExtractor:
    def __init__(self, json_data: str):
        """Inicializar con JSON de Elementor."""
        self.data = json.loads(json_data) if isinstance(json_data, str) else json_data
        self.translations = []
        self.widget_count = {}

    def extract(self) -> List[Dict]:
        """Extraer todos los textos traducibles."""
        self._traverse_elements(self.data)
        return self.translations

    def _traverse_elements(self, elements: List[Dict], path: str = "root"):
        """Recorrer elementos recursivamente."""
        if not isinstance(elements, list):
            return

        for idx, element in enumerate(elements):
            if not isinstance(element, dict):
                continue

            element_id = element.get("id", f"element_{idx}")
            widget_type = element.get("widgetType", "section")
            current_path = f"{path}/{widget_type}[{idx}]"

            # Contar widgets
            self.widget_count[widget_type] = self.widget_count.get(widget_type, 0) + 1

            # Extraer traducciones
            self._extract_from_widget(element, widget_type, element_id, current_path)

            # Recorrer elementos hijos
            if "elements" in element:
                self._traverse_elements(element["elements"], current_path)

    def _extract_from_widget(self, widget: Dict, wtype: str, wid: str, path: str):
        """Extraer campos traducibles según tipo de widget."""
        settings = widget.get("settings", {})

        # Mapeo de campos traducibles por widget type
        field_mappings = {
            "heading": ["title"],
            "text-editor": ["editor"],
            "image-box": ["title_text", "description_text"],
            "icon-box": ["title_text", "description_text"],
            "button": ["text"],
            "icon": ["title"],
            "text-path": ["text"],
            "icon-list": ["icon_list"],  # especial
        }

        fields = field_mappings.get(wtype, [])

        for field in fields:
            if field == "icon-list":
                # Caso especial: es un array
                items = settings.get("icon_list", [])
                if isinstance(items, list):
                    for idx, item in enumerate(items):
                        if isinstance(item, dict) and "text" in item:
                            self.translations.append(
                                {
                                    "widget_id": wid,
                                    "widget_type": wtype,
                                    "field": f"{field}[{idx}].text",
                                    "value": item["text"],
                                    "path": path,
                                }
                            )
            elif field in settings:
                value = settings[field]
                # No extraer valores vacíos o muy cortos
                if value and (isinstance(value, str) and len(value) > 0):
                    self.translations.append(
                        {
                            "widget_id": wid,
                            "widget_type": wtype,
                            "field": field,
                            "value": value,
                            "path": path,
                        }
                    )

    def get_stats(self) -> Dict:
        """Obtener estadísticas."""
        return {
            "total_translatable_items": len(self.translations),
            "widget_count": self.widget_count,
            "widgets_by_type": sorted(
                self.widget_count.items(), key=lambda x: x[1], reverse=True
            ),
        }

    def to_json(self) -> str:
        """Convertir a JSON."""
        return json.dumps(
            {"translations": self.translations, "stats": self.get_stats()},
            indent=2,
            ensure_ascii=False,
        )

    def to_csv(self) -> str:
        """Convertir a CSV para Excel."""
        lines = ["widget_id,widget_type,field,current_value,translation_en"]
        for t in self.translations:
            # Escapar comillas y saltos de línea
            value = t["value"].replace('"', '""').replace("\n", " ")
            lines.append(f'{t["widget_id"]},{t["widget_type"]},{t["field"]},"{value}",')
        return "\n".join(lines)


def main():
    if len(sys.argv) < 2:
        print(
            "Uso: python3 extract-translation.py <json_file> [--output output.json] [--csv]"
        )
        print("  <json_file>: Archivo JSON exportado o 'stdin' para leer de stdin")
        print("  --output: Archivo de salida (por defecto: translations.json)")
        print("  --csv: Exportar también a CSV para Excel")
        sys.exit(1)

    json_source = sys.argv[1]
    output_file = "translations.json"
    export_csv = "--csv" in sys.argv

    # Parsear argumentos
    for i, arg in enumerate(sys.argv[2:]):
        if arg == "--output" and i + 2 < len(sys.argv):
            output_file = sys.argv[i + 3]

    # Leer JSON
    if json_source == "stdin":
        json_data = sys.stdin.read()
    else:
        try:
            with open(json_source, "r", encoding="utf-8") as f:
                json_data = f.read()
        except FileNotFoundError:
            print(f"Error: Archivo '{json_source}' no encontrado")
            sys.exit(1)

    # Parsear y extraer
    try:
        extractor = ElementorTranslationExtractor(json_data)
        translations = extractor.extract()
        stats = extractor.get_stats()

        # Mostrar stats en consola
        print("\n=== EXTRACTION STATS ===")
        print(f"Total de items a traducir: {stats['total_translatable_items']}")
        print("\nWidgets encontrados:")
        for widget_type, count in stats["widgets_by_type"]:
            print(f"  {widget_type}: {count}")

        # Guardar JSON
        output_path = Path(output_file)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(extractor.to_json())
        print(f"\n✓ JSON guardado en: {output_path}")

        # Exportar CSV si se solicita
        if export_csv:
            csv_file = output_path.stem + ".csv"
            with open(csv_file, "w", encoding="utf-8") as f:
                f.write(extractor.to_csv())
            print(f"✓ CSV guardado en: {csv_file}")
            print(
                "  (Puedes abrirlo en Excel y traducir en la columna 'translation_en')"
            )

        print("\n=== NEXT STEPS ===")
        print(f"1. Abre {output_file} en tu editor JSON favorito")
        print("2. Para cada item, agrega 'translation_en' con el texto traducido")
        print(f"3. Ejecuta: python3 apply-translation.py {output_file} [PAGE_ID]")

    except json.JSONDecodeError as e:
        print(f"Error: JSON inválido - {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

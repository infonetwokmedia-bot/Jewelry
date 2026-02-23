#!/usr/bin/env python3
"""
Script para revisar y corregir datos del catálogo

Ejecutar:
    python3 /srv/stacks/jewelry/scripts/review-catalog-data.py
"""

import csv
import os

CSV_PATH = "/srv/stacks/jewelry/docs/catalog/data/catalog_editable.csv"


def review_csv():
    """Revisar CSV y reportar problemas"""

    if not os.path.exists(CSV_PATH):
        print(f"❌ No se encontró el archivo: {CSV_PATH}")
        return

    print("\n📋 REVISIÓN DEL CATÁLOGO\n")
    print("=" * 60)

    # Leer CSV
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        rows = list(reader)

    total = len(rows)
    issues = []

    # Contadores
    missing_desc_en = 0
    missing_prices = 0
    empty_category = 0
    typos_fixed = 0

    print(f"\n📦 Total de productos: {total}\n")

    for idx, row in enumerate(rows, 1):
        product_id = row.get("id", "")
        desc_es = row.get("raw_description_es", "").strip()
        desc_en = row.get("raw_description_en", "").strip()
        category_es = row.get("category_es", "").strip()
        web_ready = row.get("web_ready", "TRUE").strip().upper()

        # Verificar descripción en inglés
        if not desc_en or len(desc_en) < 5:
            missing_desc_en += 1
            issues.append(f"{product_id}: Falta traducción EN")

        # Verificar categoría
        if not category_es:
            empty_category += 1
            issues.append(f"{product_id}: Sin categoría")

        # Corregir typos comunes en descripción ES
        if desc_es:
            original = desc_es
            # Correcciones
            desc_es = desc_es.replace("Cardenas", "Cadenas")
            desc_es = desc_es.replace("Morelos", "Modelos")
            desc_es = desc_es.replace("algollas", "argollas")
            desc_es = desc_es.replace("differences", "diferentes")
            desc_es = desc_es.replace("differentes", "diferentes")
            desc_es = desc_es.replace("Izquierdo's", "izquierda")
            desc_es = desc_es.replace("añera", "añera")
            desc_es = desc_es.replace("ovens", "oro")
            desc_es = desc_es.replace("naturals", "naturales")
            desc_es = desc_es.replace("virgin", "virgen")

            if desc_es != original:
                row["raw_description_es"] = desc_es
                typos_fixed += 1

    # Guardar correcciones si hubo cambios
    if typos_fixed > 0:
        output_path = CSV_PATH.replace(".csv", "_reviewed.csv")
        with open(output_path, "w", encoding="utf-8", newline="") as f:
            if rows:
                writer = csv.DictWriter(
                    f, fieldnames=rows[0].keys(), delimiter=";", quoting=csv.QUOTE_ALL
                )
                writer.writeheader()
                writer.writerows(rows)
        print(f"✅ Correcciones guardadas en: {output_path}\n")

    # Reporte
    print("\n📊 REPORTE DE REVISIÓN:\n")
    print(f"   {'Total productos:':<30} {total}")
    print(f"   {'Sin traducción EN:':<30} {missing_desc_en}")
    print(f"   {'Sin categoría:':<30} {empty_category}")
    print(f"   {'Typos corregidos:':<30} {typos_fixed}")

    if issues:
        print(f"\n⚠️  PROBLEMAS ENCONTRADOS ({len(issues)}):\n")
        for issue in issues[:10]:  # Mostrar primeros 10
            print(f"   • {issue}")
        if len(issues) > 10:
            print(f"   ... y {len(issues) - 10} más")

    print("\n" + "=" * 60)

    # Recomendaciones
    print("\n💡 RECOMENDACIONES:\n")
    if missing_desc_en > 0:
        print(
            "   1. Ejecutar translate-catalog-descriptions.py para traducir automáticamente"
        )
    if empty_category > 0:
        print("   2. Asignar categorías manualmente en el CSV")
    print("   3. Revisar manualmente todas las traducciones automáticas")
    print("   4. Agregar precios a los productos")
    print("\n")


if __name__ == "__main__":
    review_csv()

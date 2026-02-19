#!/usr/bin/env python3
"""
Script para traducir las descripciones del catálogo al inglés

Ejecutar:
    python3 /srv/stacks/jewelry/scripts/translate-catalog-descriptions.py
"""

import csv
import os
import re

CSV_PATH = "/srv/stacks/jewelry/docs/catalog/data/catalog_editable.csv"

# Diccionario de traducciones comunes
TRANSLATIONS = {
    # Modelos
    "Modelo": "Model",
    "Cardenas": "Chains",
    "Cadenas": "Chains",
    "Cadena": "Chain",
    "Gargantilla": "Choker",
    "Gargantillas": "Chokers",
    "Pulso": "Bracelet",
    "Pulsos": "Bracelets",
    "Anillo": "Ring",
    "Aretes": "Earrings",
    "Argollas": "Hoops",
    "Dije": "Pendant",
    "Dijes": "Pendants",
    "Manilla": "Bangle",
    "Manillas": "Bangles",
    "Rosetas": "Rosettes",
    "Juego": "Set",
    "Juegos": "Sets",
    # Materiales
    "Oro": "Gold",
    "Plata": "Silver",
    "Oro blanco": "White gold",
    "Oro Blanco": "White Gold",
    "Diamantes Naturales": "Natural Diamonds",
    "Diamantes naturales": "Natural diamonds",
    "Diamante de Laboratorio": "Lab Diamond",
    "Zirconia": "Zirconia",
    "Piedras": "Stones",
    "piedras": "stones",
    # Tamaños y medidas
    "size": "size",
    "mm": "mm",
    "pulgadas": "inches",
    # Diseños
    "still": "style",
    "modelo": "model",
    "sólidos": "solid",
    "solids": "solid",
    "semisólidos": "semi-solid",
    "semisolidos": "semi-solid",
    "segmentado": "segmented",
    "nevadas": "iced",
    "torcidas": "twisted",
    "de hombres": "men's",
    "de mujer": "women's",
    "para quince añera": "for quinceañera",
    # Características
    "con": "with",
    "de": "of",
    "en": "in",
    "y": "and",
    "o": "or",
    "todos los": "all",
    "diferentes": "different",
    "se personalizan": "can be personalized",
    "ponen nombre": "engrave name",
    # Tipos específicos
    "cara de Cristo": "Christ face",
    "Virgen de la Caridad": "Our Lady of Charity",
    "compromiso": "engagement",
    "personalizado": "custom",
    "con su": "with its",
    "con chapa": "with plate",
    "cabeza de pantera": "panther head",
    "corazón": "heart",
    "corazon": "heart",
    "medusa": "medusa",
    "pantera": "panther",
    "flor": "flower",
    "inicial": "initial",
    "iniciales": "initials",
    "fotos": "photos",
    "mano de orula": "Orula hand",
    "igde": "Igde",
    "clavos": "nails",
}


def translate_text(text_es):
    """Traducir texto del español al inglés usando diccionario"""
    if not text_es or text_es.strip() == "":
        return ""

    text_en = text_es

    # Aplicar traducciones palabra por palabra
    for es, en in TRANSLATIONS.items():
        # Reemplazar con respeto a mayúsculas/minúsculas
        text_en = re.sub(
            r"\b" + re.escape(es) + r"\b", en, text_en, flags=re.IGNORECASE
        )

    # Limpiar espacios duplicados
    text_en = re.sub(r"\s+", " ", text_en).strip()

    # Capitalizar primera letra
    if text_en:
        text_en = text_en[0].upper() + text_en[1:]

    return text_en


def automatic_translate_description(desc_es):
    """Traducción automática mejorada de descripciones"""

    # Patrones comunes y sus traducciones
    patterns = [
        (
            r"Cardenas (.*?) con piedras (.*?) (\d+[,\d]*) mm y size (\d+[,\d]*) pulgadas",
            r"Chains \1 with \2 stones \3 mm and sizes \4 inches",
        ),
        (r"Gargantilla (.*?) (\d+k?) size(\d+) y (.*)", r"Choker \1 \2 size \3 and \4"),
        (r"Modelo de Cadena (.*?) de (\d+-?\d*) mm", r"Chain model \1 from \2 mm"),
        (r"Pulsos (.*?) de (\d+) pulgadas", r"Bracelets \1 \2 inches"),
        (r"Aretes (.*?) de mujer", r"Women\'s earrings \1"),
    ]

    text_en = translate_text(desc_es)

    # Aplicar patrones específicos
    for pattern_es, pattern_en in patterns:
        if re.search(pattern_es, desc_es, re.IGNORECASE):
            text_en = re.sub(pattern_es, pattern_en, desc_es, flags=re.IGNORECASE)
            text_en = translate_text(text_en)  # Segunda pasada
            break

    return text_en


def process_csv():
    """Procesar CSV y agregar traducciones al inglés"""

    if not os.path.exists(CSV_PATH):
        print(f"❌ No se encontró el archivo: {CSV_PATH}")
        return

    print(f"\n📄 Procesando: {CSV_PATH}\n")

    # Leer CSV
    rows = []
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        rows = list(reader)

    total = len(rows)
    translated = 0
    skipped = 0

    # Procesar cada fila
    for idx, row in enumerate(rows, 1):
        product_id = row.get("id", "")
        desc_es = row.get("raw_description_es", "").strip()
        desc_en = row.get("raw_description_en", "").strip()

        print(f"[{idx}/{total}] {product_id}: ", end="")

        # Si ya tiene traducción, saltar
        if desc_en and len(desc_en) > 10:
            print("✅ Ya traducido")
            skipped += 1
            continue

        # Traducir automáticamente
        if desc_es:
            desc_en_auto = automatic_translate_description(desc_es)
            row["raw_description_en"] = desc_en_auto
            print("🔄 Traducido")
            print(f"     ES: {desc_es[:60]}...")
            print(f"     EN: {desc_en_auto[:60]}...")
            translated += 1
        else:
            print("⚠️  Sin descripción ES")
            skipped += 1

    # Guardar CSV actualizado
    output_path = CSV_PATH.replace(".csv", "_translated.csv")

    with open(output_path, "w", encoding="utf-8", newline="") as f:
        if rows:
            writer = csv.DictWriter(
                f, fieldnames=rows[0].keys(), delimiter=";", quoting=csv.QUOTE_ALL
            )
            writer.writeheader()
            writer.writerows(rows)

    print("\n📊 RESUMEN:")
    print(f"   • Total: {total} productos")
    print(f"   • Traducidos: {translated}")
    print(f"   • Saltados: {skipped}")
    print(f"\n💾 Guardado en: {output_path}")
    print("\n⚠️  IMPORTANTE: Revisar manualmente las traducciones automáticas")
    print("   Algunas pueden necesitar ajustes para mayor precisión.\n")


if __name__ == "__main__":
    process_csv()

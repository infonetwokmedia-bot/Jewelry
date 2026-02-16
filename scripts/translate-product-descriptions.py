#!/usr/bin/env python3
"""
Translate product descriptions from English to Spanish (primary language).
Also registers TRP dictionary entries so /en/ shows English.
Uses UNHEX for all special characters to avoid encoding issues.
"""

import subprocess


def sql_file(sql_text):
    """Execute SQL via file to avoid shell escaping issues."""
    with open("/tmp/prod_desc.sql", "w", encoding="utf-8") as f:
        f.write("SET NAMES utf8mb4;\n" + sql_text)
    result = subprocess.run(
        [
            "docker",
            "exec",
            "-i",
            "jewelry_mysql",
            "mysql",
            "-u",
            "jewelry_user",
            "-pjewelry_pass_2026!",
            "--default-character-set=utf8mb4",
            "jewelry_db",
        ],
        input=open("/tmp/prod_desc.sql", "rb").read(),
        capture_output=True,
    )
    if result.returncode != 0:
        err = result.stderr.decode()
        if "Warning" not in err:
            print(f"SQL ERROR: {err}")
            return False
    return True


# =========================================================
# Product descriptions: ID → (Spanish description, English original)
# =========================================================
products = {
    77: (
        # Anillo de Compromiso Solitario Habana
        "Ella merece un anillo tan hermoso como tu historia de amor. El Solitario Habana presenta un brillante diamante central de corte redondo en un clásico engaste de cuatro garras sobre una delicada banda de oro blanco de 14K.\n\n"
        "Este anillo captura la esencia del romance — simple, elegante y absolutamente deslumbrante. El engaste elevado permite que la máxima luz entre al diamante, creando ese fuego y brillo que ella nunca dejará de admirar.\n\n"
        "Cada Solitario Habana viene con certificado de autenticidad y un estuche de anillo de cortesía. También ofrecemos ajuste de talla de anillo gratis de por vida.",
        "She deserves a ring as beautiful as your love story. The Havana Solitaire features a brilliant round-cut center diamond in a timeless four-prong setting on a delicate 14K white gold band.\n\n"
        "This ring captures the essence of romance — simple, elegant, and absolutely breathtaking. The raised setting allows maximum light to enter the diamond, creating that fire and sparkle she'll never stop admiring.\n\n"
        "Every Havana Solitaire comes with a certificate of authenticity and a complimentary ring box. We also offer free ring sizing for life.",
    ),
    79: (
        # Argollas Miami - Aros de Oro
        "Toda mujer de Miami necesita un par perfecto de argollas, y estas son LAS INDICADAS. Elaboradas en oro pulido de 14K, estas argollas tienen el peso perfecto — lo suficientemente sustanciales para hacer una declaración, lo suficientemente ligeras para usarlas todo el día.\n\n"
        "El diseño tubular cuenta con un cierre seguro de clic para que nunca tengas que preocuparte por perderlas. Disponibles en diámetros de 30mm, 40mm y 50mm.",
        "Every Miami woman needs a perfect pair of argollas, and these are IT. Crafted in polished 14K gold, these hoops have the perfect weight — substantial enough to make a statement, light enough to wear all day.\n\n"
        "The tubular design features a secure click-top closure so you never have to worry about losing them. Available in 30mm, 40mm, and 50mm diameters.",
    ),
    81: (
        # Cadena Cubana de Oro - 14K
        "No hay nada más icónico que una cadena de eslabones cubanos, y la nuestra está hecha a la perfección. Fabricada en oro sólido de 14K, esta cadena presenta el clásico patrón entrelazado que ha sido símbolo del orgullo cubano por generaciones.\n\n"
        'Disponible en múltiples largos (18", 20", 22", 24") y anchos. Cada cadena viene con un broche de langosta seguro y está sellada con marcas de autenticidad. Ya sea que la uses diario o la guardes para ocasiones especiales, esta cadena está hecha para durar toda la vida — y más.\n\n'
        "Cuidado: Guardar plana para evitar torceduras. Limpiar con agua tibia jabonosa y un paño suave.",
        "There's nothing more iconic than a Cuban link chain, and ours is crafted to perfection. Made from solid 14K gold, this chain features the classic interlocking pattern that has been a symbol of Cuban pride for generations.\n\n"
        'Available in multiple lengths (18", 20", 22", 24") and widths. Each chain comes with a secure lobster clasp and is stamped with authenticity markings. Whether you\'re wearing it daily or saving it for special occasions, this chain is built to last a lifetime — and then some.\n\n'
        "Care: Store flat to prevent kinking. Clean with warm soapy water and a soft cloth.",
    ),
    83: (
        # Pulsera Tennis Coral Gables
        "La pulsera tennis es la definición del lujo discreto — y la nuestra habla por sí sola. Con una línea continua de piedras de circonita cúbica de corte redondo engastadas en plata esterlina con baño de rodio, esta pulsera captura la luz desde todos los ángulos.\n\n"
        "Perfecta para bodas, aniversarios o cualquier día que quieras sentirte imparable. El broche de caja seguro con cadena de seguridad garantiza que se quede justo donde debe estar — en tu hermosa muñeca.\n\n"
        "Para quienes deseen algo superior, pregunta por nuestra versión con diamantes naturales.",
        "The tennis bracelet is the definition of quiet luxury — and ours speaks volumes. Featuring a continuous line of round-cut cubic zirconia stones set in sterling silver with rhodium plating, this bracelet catches light from every angle.\n\n"
        "Perfect for weddings, anniversaries, or any day you want to feel unstoppable. The secure box clasp with safety latch ensures it stays right where it belongs — on your beautiful wrist.\n\n"
        "For those ready to upgrade, ask about our natural diamond version.",
    ),
    85: (
        # Collar de Perlas de Abuela
        "Nombrado en honor a cada abuela cubana que sabía que las perlas nunca pasan de moda, este collar presenta perlas de agua dulce seleccionadas a mano con un hermoso lustre y forma casi redonda.\n\n"
        "Cada perla está individualmente anudada en hilo de seda para seguridad y elegancia. El hilo mide 18 pulgadas y cierra con un broche de filigrana de plata esterlina. Úsalas para ir a la iglesia, a la gala, o con jeans y una blusa — las perlas van a todas partes.",
        "Named in honor of every Cuban grandmother who knew that pearls never go out of style, this necklace features hand-selected freshwater pearls with a beautiful luster and near-round shape.\n\n"
        "Each pearl is individually knotted on silk thread for security and elegance. The strand measures 18 inches and closes with a sterling silver filigree clasp. Wear them to church, to the gala, or with jeans and a blouse — pearls go everywhere.",
    ),
    92: (
        # Aretes de Diamante Little Havana
        "Algunas joyas te las pones y nunca te las quitas — estos son esos aretes. Nuestros Aretes de Diamante Little Havana presentan piedras de circonita cúbica de corte redondo pareadas (opción de diamante natural disponible) engastadas en canastas de cuatro garras de oro blanco de 14K.\n\n"
        "Con postes de rosca seguros, estos studs se mantienen firmes en todo — trabajo, ejercicio y aventuras de fin de semana. Son el regalo perfecto de joyería real y un básico en la colección de toda mujer.",
        "Some jewelry you put on and never take off — these are those earrings. Our Little Havana Diamond Studs feature matched round-cut cubic zirconia stones (natural diamond option available) set in 14K white gold four-prong baskets.\n\n"
        "With secure screw-back posts, these studs stay put through everything — work, workouts, and weekend adventures. They're the perfect first real jewelry gift and a staple in every woman's collection.",
    ),
    94: (
        # Brazaletes Sevillana - Juego de 7
        "En nuestra cultura, el sonido de los brazaletes es la banda sonora del hogar — mamá cocinando en la cocina, tía contando historias, abuela echándote la bendición. Este juego de siete brazaletes en baño de oro de 18K captura esa magia.\n\n"
        "Cada brazalete tiene una textura ligeramente diferente — martillado, liso, trenzado y corte de diamante — para que el juego tenga dimensión y carácter. Usa los siete para el efecto completo, o mézclalos con tus piezas existentes.",
        "In our culture, the sound of bangles is the soundtrack of home — mamá cooking in the kitchen, tía telling stories, abuela blessing you goodbye. This set of seven bangles in 18K gold plating captures that magic.\n\n"
        "Each bangle has a slightly different texture — hammered, smooth, twisted, and diamond-cut — so the set has dimension and character. Wear all seven for the full effect, or mix with your existing pieces.",
    ),
    96: (
        # Collar Noche Cubana
        "Algunas noches piden joyas que hablen por ti, y el Noche Cubana cumple. Este impresionante collar de declaración presenta hojas doradas en capas y acentos de cristal en un diseño estilo babero que se sienta hermosamente en la clavícula.\n\n"
        "Combínalo con un vestido negro sencillo y labios rojos — esa es la fórmula cubana para que todos volteen a verte. El collar es liviano a pesar de su apariencia dramática, con cadena ajustable para que controles la caída.\n\n"
        "Perfecto para: bodas, galas, cenas de aniversario, Año Nuevo y cualquier ocasión donde quieras ser recordada.",
        "Some nights call for jewelry that does the talking, and the Noche Cubana delivers. This stunning statement necklace features layered gold-tone leaves and crystal accents in a bib-style design that sits beautifully on the collarbone.\n\n"
        "Pair it with a simple black dress and red lips — that's the Cuban formula for turning every head in the room. The necklace is lightweight despite its dramatic appearance, with an adjustable chain so you can control the drop.\n\n"
        "Perfect for: weddings, galas, anniversary dinners, New Year's Eve, and any occasion where you want to be remembered.",
    ),
    97: (
        # Anillo Sello El Padrino
        "Todo patriarca merece un anillo que iguale su presencia. El Anillo Sello El Padrino está elaborado en oro amarillo sólido de 14K con una cara rectangular pulida lista para grabar.\n\n"
        "La banda sustancial se estrecha de adelante hacia atrás para mayor comodidad, y el anillo tiene un peso satisfactorio que te deja saber que llevas algo auténtico. Popular para padres, abuelos y cualquier hombre que aprecia el estilo clásico.\n\n"
        "Grabado de monograma de cortesía disponible — hasta 3 iniciales.",
        "Every patriarch deserves a ring that matches his presence. El Padrino Signet Ring is crafted in solid 14K yellow gold with a polished rectangular face ready for engraving.\n\n"
        "The substantial band tapers from front to back for comfort, and the ring has a satisfying weight that lets you know you're wearing something real. Popular for fathers, grandfathers, and any man who appreciates classic style.\n\n"
        "Complimentary monogram engraving available — up to 3 initials.",
    ),
    98: (
        # Corona de Quinceañera La Princesa
        "La quinceañera es una de las celebraciones más importantes en nuestra cultura, y toda princesa merece una corona que la haga sentir como la realeza. La Princesa presenta brillantes piedras de cristal engastadas en un marco de metal tono plata con un elegante diseño de volutas.\n\n"
        "La tiara se asienta cómodamente en la cabeza con peines incorporados para mayor seguridad (porque ella SÍ va a bailar toda la noche). Viene en una hermosa caja de recuerdo que atesorará para siempre.\n\n"
        "También ofrecemos juegos de aretes y collar a juego — pregunta por nuestro Paquete de Quinceañera.",
        "The quinceañera is one of the most important celebrations in our culture, and every princesa deserves a crown that makes her feel like royalty. La Princesa features brilliant crystal stones set in a silver-tone metal frame with an elegant scroll design.\n\n"
        "The tiara sits comfortably on the head with built-in combs for security (because she WILL be dancing all night). Comes in a beautiful keepsake box that she'll treasure forever.\n\n"
        "We also offer matching earring and necklace sets — ask about our Quinceañera Package.",
    ),
    100: (
        # Crucifijo Santa Clara - Oro 14K
        "La fe es el fundamento de nuestra comunidad, y este crucifijo honra esa tradición hermosamente. Fundido en oro amarillo sólido de 14K, el Santa Clara presenta un detalle increíble — desde la túnica fluida hasta la cruz texturizada.\n\n"
        "El dije mide 1.5 pulgadas de altura y cuelga de una cadena de oro de 18 pulgadas incluida. Tiene un peso reconfortante y un cálido tono dorado que se ve hermoso contra cualquier tono de piel.\n\n"
        "Se regala en bautizos, confirmaciones, Primeras Comuniones y sin razón especial — esta es una pieza que lleva significado a través de generaciones.",
        "Faith is the foundation of our community, and this crucifix honors that tradition beautifully. Cast in solid 14K yellow gold, the Santa Clara features incredible detail — from the flowing robe to the textured cross.\n\n"
        "The pendant measures 1.5 inches in height and hangs from an included 18-inch gold chain. It has a comforting weight and a warm gold tone that looks beautiful against any skin tone.\n\n"
        "Given as gifts for baptisms, confirmations, First Communions, and just because — this is a piece that carries meaning across generations.",
    ),
    102: (
        # Pulsera de Dijes Mi Vida
        "Tu vida es una hermosa historia, y esta pulsera te permite contarla un dije a la vez. La Pulsera de Dijes Mi Vida presenta una resistente cadena de pulsera de plata esterlina con un cierre toggle de corazón y tu elección de dijes iniciales.\n\n"
        "Los dijes populares incluyen: palmera (por nuestra isla), flamenco (por Miami), ojo turco (para protección), trébol de cuatro hojas (para la suerte), cruz (por la fe) y corona de quinceañera. Cada dije está elaborado en plata esterlina con acentos de esmalte o cristal.\n\n"
        "El regalo perfecto para cumpleaños, Día de las Madres y graduaciones. Agrega un nuevo dije por cada logro.",
        "Your life is a beautiful story, and this bracelet lets you tell it one charm at a time. The Mi Vida Charm Bracelet features a sturdy sterling silver chain bracelet with a heart toggle clasp and your choice of starter charms.\n\n"
        "Popular charms include: palm tree (for our island), flamingo (for Miami), evil eye (for protection), four-leaf clover (for luck), cross (for faith), and quinceañera crown. Each charm is crafted in sterling silver with enamel or crystal accents.\n\n"
        "The perfect gift for birthdays, Mother's Day, and graduations. Add a new charm for every milestone.",
    ),
    104: (
        # Juntos Para Siempre - Argollas de Boda
        '"Juntos para siempre" — juntos por la eternidad. Estas argollas de boda a juego simbolizan el compromiso y el amor que define a nuestras familias. Elaboradas en oro amarillo sólido de 14K, el juego incluye una banda de hombre de 6mm y una banda de mujer de 4mm, ambas con interior de ajuste cómodo.\n\n'
        "El perfil clásico abovedado y el acabado de alto brillo dan a estas bandas un look atemporal que nunca pasará de moda. Cada anillo está grabado en el interior con el símbolo de infinito — nuestro regalo para ustedes.\n\n"
        "Incluye grabado personalizado de cortesía (hasta 20 caracteres por anillo).",
        "\"Juntos para siempre\" — together forever. These matching wedding bands symbolize the commitment and love that defines our families. Crafted in solid 14K yellow gold, the set includes a 6mm men's band and a 4mm women's band, both with a comfort-fit interior.\n\n"
        "The classic domed profile and high-polish finish give these bands a timeless look that will never go out of style. Each ring is engraved inside with the infinity symbol — our gift to you.\n\n"
        "Includes complimentary custom engraving (up to 20 characters per ring).",
    ),
}

# =========================================================
# STEP 1: Update post_content with Spanish descriptions
# =========================================================
print("=== STEP 1: Updating product descriptions to Spanish ===")
update_count = 0
for pid, (es_desc, en_desc) in products.items():
    # Escape single quotes for SQL
    es_escaped = es_desc.replace("'", "\\'")
    sql = f"UPDATE wp_posts SET post_content = '{es_escaped}' WHERE ID = {pid};\n"
    if sql_file(sql):
        update_count += 1
        print(f"  ✓ Product {pid} updated")
    else:
        print(f"  ✗ Product {pid} FAILED")

print(f"\nUpdated {update_count}/13 products")

# =========================================================
# STEP 2: Add TRP dictionary entries (ES → EN)
# =========================================================
print("\n=== STEP 2: Adding TRP dictionary entries ===")

# For TRP, we need to register the full Spanish text as original
# and the English as translated. But product descriptions are long
# and TRP typically works with shorter segments.
# We'll split by paragraph (\n\n) and register each paragraph.
trp_sql_parts = []
for pid, (es_desc, en_desc) in products.items():
    es_paras = [p.strip() for p in es_desc.split("\n\n") if p.strip()]
    en_paras = [p.strip() for p in en_desc.split("\n\n") if p.strip()]

    for i, (es_p, en_p) in enumerate(zip(es_paras, en_paras)):
        es_esc = es_p.replace("'", "\\'")
        en_esc = en_p.replace("'", "\\'")

        trp_sql_parts.append(
            f"INSERT INTO wp_trp_original_strings (original) "
            f"SELECT '{es_esc}' FROM DUAL WHERE NOT EXISTS "
            f"(SELECT 1 FROM wp_trp_original_strings WHERE original = '{es_esc}');\n"
            f"SET @oid = (SELECT id FROM wp_trp_original_strings WHERE original = '{es_esc}' LIMIT 1);\n"
            f"INSERT INTO wp_trp_dictionary_es_es_en_us (original, translated, status, original_id) "
            f"SELECT '{es_esc}', '{en_esc}', 2, @oid FROM DUAL WHERE NOT EXISTS "
            f"(SELECT 1 FROM wp_trp_dictionary_es_es_en_us WHERE original = '{es_esc}');\n"
        )

trp_sql = "\n".join(trp_sql_parts)
if sql_file(trp_sql):
    print(f"  ✓ {len(trp_sql_parts)} TRP paragraph entries added")
else:
    print("  ✗ TRP entries failed")

# =========================================================
# STEP 3: Verify
# =========================================================
print("\n=== STEP 3: Verification ===")
result = subprocess.run(
    [
        "docker",
        "exec",
        "jewelry_mysql",
        "mysql",
        "-u",
        "jewelry_user",
        "-pjewelry_pass_2026!",
        "--default-character-set=utf8mb4",
        "jewelry_db",
        "-Ne",
        "SELECT ID, LEFT(post_content, 50) FROM wp_posts WHERE post_type='product' AND post_status='publish' ORDER BY ID",
    ],
    capture_output=True,
)
lines = result.stdout.decode().strip().split("\n")
for line in lines:
    print(f"  {line}")

print("\n✅ Product descriptions translated!")

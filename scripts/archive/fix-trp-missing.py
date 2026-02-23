#!/usr/bin/env python3
"""
Fix all missing TRP dictionary translations.
Generates SQL and executes it in a single MySQL session.
"""

import subprocess
import sys

# Map of TRP dictionary id → English translation
# For strings already in English, we set them to the same value
fixes = {
    # === MAIN PAGE ===
    217: "Where Cuban Heritage Meets Miami Glamour",
    218: "Handcrafted jewelry that celebrates your roots, your family, and every moment worth remembering",
    219: "&#8211; EXPLORE COLLECTIONS",
    221: "&#8211; View All",
    222: "Necklaces &amp; Chains",  # already English
    226: "At Jewelry Miami, we understand that jewelry is more than an accessory — it\\'s heritage. Each piece is chosen with the same love our abuelas put into everything.",
    227: "&#8211; OUR STORY",
    230: "Cuban Gold Chain &#8211; 14K",
    231: "Sevillana Bangles &#8211; Set of 7",
    232: "Jewelry Miami — Our Story",
    233: "Whether it\\'s your daughter\\'s quinceañera or your wedding day — we\\'ve got you, familia",
    234: "&#8211; SHOP THE COLLECTION",
    236: "I bought my wife\\'s anniversary gift here and she cried happy tears. The staff helped me pick the perfect piece. This IS Miami\\'s jewelry store. — Carlos M., Hialeah",
    248: "Miami Hoops &#8211; Gold Hoop Earrings",
    250: "They made my quinceañera so special! My tiara was absolutely breathtaking. Everyone asked where I got it. Thank you, Jewelry Miami! — Isabella R., Kendall",
    253: "&#8211; EXPLORE",
    254: "Fair prices, real quality, and they always remember my name. That\\'s how you do business. — Roberto L., Westchester",
    255: "&#8211; VISIT US ON BIRD ROAD",
    # === FOOTER / UI (already English, set same) ===
    256: "FAQ",
    257: "Virtual Shopping",
    258: "Shipping &#038; Returns",
    259: "Create Your Jewelry",
    260: "Ring Sizer",
    261: "Stores",
    262: "Copyright &copy; 2026 Jewelry Miami",
    263: "View Shopping Cart, empty",
    264: "Footer Widget 1",
    265: "Facebook",
    266: "Twitter",
    267: "Instagram",
    268: "YouTube",
    269: "Website language selector",
    270: "Available languages",
    274: "Breadcrumb",
    300: "&rarr;",
    # === PRODUCT / SHOP PAGES ===
    271: "&#47;&nbsp;Earrings",
    272: "Hoops, studs, chandeliers, and huggies. Complete your look with earrings that sparkle as bright as you do.",
    275: "&#47;&nbsp;Little Havana Diamond Stud Earrings",
    277: "Some jewelry you put on and never take off — these are those earrings. Our Little Havana Diamond Studs feature matched round-cut cubic zirconia stones (natural diamond option available) set in 14K white gold four-prong baskets.",
    278: "With secure screw-back posts, these studs stay put through everything — work, workouts, and weekend adventures. They&#8217;re the perfect first real jewelry gift and a staple in every woman&#8217;s collection.",
    279: "\\n",
    281: "\\n\\n\\n\\n",
    284: "At Jewelry Miami, we believe everyone deserves to shine. Our Bird Road showroom offers dazzling pieces at prices that make luxury accessible — from everyday elegance to once-in-a-lifetime moments.",
    287: "Luxurious 18k gold over sterling silver — the smart choice for designer-quality jewelry. All the glamour at a fraction of the price.",
    291: "&#8211; VISIT OUR STORES",
    292: "&#47;&nbsp;Shop",
    297: "Santa Clara Crucifix &#8211; 14K Gold",
    298: "Together Forever &#8211; Wedding Bands",
    301: "&#47;&nbsp;Cuban Gold Chain &#8211; 14K",
    303: "There&#8217;s nothing more iconic than a Cuban link chain, and ours is crafted to perfection. Made from solid 14K gold, this chain features the classic interlocking pattern that has been a symbol of Cuban pride for generations.",
    304: "Available in multiple lengths (18&#8243;, 20&#8243;, 22&#8243;, 24&#8243;) and widths. Each chain comes with a secure lobster clasp and is stamped with authenticity markings. Whether you&#8217;re wearing it daily or saving it for special occasions, this chain is built to last a lifetime — and then some.",
    305: "Care: Store flat to prevent kinking. Clean with warm soapy water and a soft cloth.",
}

# Build SQL
sql_lines = ["SET NAMES utf8mb4;"]
for tid, translation in fixes.items():
    sql_lines.append(
        f"UPDATE wp_trp_dictionary_es_es_en_us SET translated='{translation}', status=2 WHERE id={tid};"
    )

sql = "\n".join(sql_lines)

# Write to file
with open("/tmp/trp_fix.sql", "w", encoding="utf-8") as f:
    f.write(sql)

print(f"Generated {len(fixes)} UPDATE statements → /tmp/trp_fix.sql")

# Execute
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
    input=sql.encode("utf-8"),
    capture_output=True,
)

if result.returncode == 0:
    print("✅ All translations applied successfully!")
else:
    err = result.stderr.decode()
    if "Warning" in err and "password" in err.lower():
        print("✅ All translations applied (password warning ignored)")
    else:
        print(f"❌ Error: {err}")
        sys.exit(1)

# Verify
verify = subprocess.run(
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
        "SELECT COUNT(*) FROM wp_trp_dictionary_es_es_en_us WHERE (translated = '' OR translated IS NULL) AND status != 2",
    ],
    capture_output=True,
)
remaining = verify.stdout.decode().strip().split("\n")[-1]
print(f"Remaining untranslated entries: {remaining}")

// ============================================================
//  NIKKE DATABASE — Roster, Weapons, Icons, Slugs
//  Single source of truth for all Nikke game entity data.
// ============================================================

const SLOTS = ["Helmet", "Chest", "Gloves", "Boots"];

const PRIORITY_TIERS = ["Essential", "Ideal", "Passable"];

// Full Nikke roster from Prydwen.gg (name, burst, element, weapon)
// Burst: I, II, III; Element: Fire, Water, Wind, Electric, Iron
// Weapon: SR=Sniper, RL=Rocket Launcher, AR=Assault Rifle, SMG=Submachine Gun, SG=Shotgun, MG=Minigun
const NIKKE_DATABASE = [
    { id: 810, name: "2B", burst: "III", element: "Fire", weapon: "SR" },
    { id: 811, name: "A2", burst: "III", element: "Fire", weapon: "RL" },
    { id: 840, name: "Ada Wong", burst: "III", element: "Electric", weapon: "SMG" },
    { id: 310, name: "Ade", burst: "II", element: "Wind", weapon: "SMG" },
    { id: 315, name: "Ade: Agent Bunny", burst: "II", element: "Iron", weapon: "SMG" },
    { id: 172, name: "Admi", burst: "II", element: "Wind", weapon: "SMG" },
    { id: 191, name: "Alice", burst: "III", element: "Fire", weapon: "SR" },
    { id: 195, name: "Alice: Wonderland Bunny", burst: "I", element: "Water", weapon: "RL" },
    { id: 351, name: "Anchor", burst: "I", element: "Wind", weapon: "SMG" },
    { id: 355, name: "Anchor: Innocent Maid", burst: "II", element: "Water", weapon: "SMG" },
    { id: 12, name: "Anis", burst: "II", element: "Iron", weapon: "RL" },
    { id: 15, name: "Anis: Sparkling Summer", burst: "III", element: "Electric", weapon: "RL", slug: "sparkling-summer-anis" },
    { id: 17, name: "Anis: Star", burst: "I", element: "Electric", weapon: "RL" },
    { id: 121, name: "Anne: Miracle Fairy", burst: "II", element: "Wind", weapon: "AR", slug: "miracle-fairy-anne" },
    { id: 581, name: "Arcana", burst: "II", element: "Electric", weapon: "SMG" },
    { id: 583, name: "Arcana: Fortune Mate", burst: "II", element: "Fire", weapon: "SMG" },
    { id: 432, name: "Aria", burst: "II", element: "Water", weapon: "SR" },
    { id: 570, name: "Ark Ranger Black", burst: "III", element: "Wind", weapon: "AR" },
    { id: 830, name: "Asuka Shikinami Langley", burst: "III", element: "Fire", weapon: "RL" },
    { id: 835, name: "Asuka Shikinami Langley: Wille", burst: "III", element: "Wind", weapon: "RL" },
    { id: 441, name: "Avistar", burst: "I", element: "Electric", weapon: "AR" },
    { id: 550, name: "Bay", burst: "II", element: "Fire", weapon: "SG", slug: "bay-treasure" },
    { id: 60, name: "Belorta", burst: "II", element: "Electric", weapon: "AR" },
    { id: 381, name: "Biscuit", burst: "II", element: "Electric", weapon: "RL" },
    { id: 270, name: "Blanc", burst: "II", element: "Wind", weapon: "AR" },
    { id: 520, name: "Bready", burst: "III", element: "Water", weapon: "SG" },
    { id: 70, name: "Brid", burst: "III", element: "Water", weapon: "SR" },
    { id: 73, name: "Brid: Silent Track", burst: "II", element: "Fire", weapon: "SR" },
    { id: 80, name: "Centi", burst: "II", element: "Iron", weapon: "AR", slug: "centi-treasure" },
    { id: 331, name: "Chime", burst: "II", element: "Iron", weapon: "SMG" },
    { id: 860, name: "Chisato Nishikigi", burst: "III", element: "Iron", weapon: "AR" },
    { id: 511, name: "Cinderella", burst: "III", element: "Electric", weapon: "RL" },
    { id: 842, name: "Claire Redfield", burst: "I", element: "Electric", weapon: "AR" },
    { id: 551, name: "Clay", burst: "II", element: "Electric", weapon: "AR" },
    { id: 311, name: "Cocoa", burst: "I", element: "Fire", weapon: "SG" },
    { id: 110, name: "Crow", burst: "III", element: "Fire", weapon: "AR" },
    { id: 330, name: "Crown", burst: "II", element: "Iron", weapon: "MG" },
    { id: 521, name: "Crust", burst: "II", element: "Water", weapon: "AR" },
    { id: 40, name: "D", burst: "III", element: "Wind", weapon: "SMG" },
    { id: 43, name: "D: Killer Wife", burst: "I", element: "Fire", weapon: "SMG" },
    { id: 20, name: "Delta", burst: "II", element: "Wind", weapon: "AR" },
    { id: 23, name: "Delta: Ninja Thief", burst: "II", element: "Water", weapon: "AR" },
    { id: 72, name: "Diesel", burst: "II", element: "Wind", weapon: "MG", slug: "diesel-treasure" },
    { id: 75, name: "Diesel: Winter Sweets", burst: "III", element: "Fire", weapon: "MG" },
    { id: 202, name: "Dolla", burst: "II", element: "Wind", weapon: "SMG" },
    { id: 233, name: "Dorothy", burst: "I", element: "Water", weapon: "SMG" },
    { id: 234, name: "Dorothy: Serendipity", burst: "III", element: "Water", weapon: "SR" },
    { id: 101, name: "Drake", burst: "III", element: "Fire", weapon: "AR", slug: "drake-treasure" },
    { id: 113, name: "E.H.", burst: "III", element: "Wind", weapon: "SR", slug: "e-h" },
    { id: 391, name: "Ein", burst: "III", element: "Electric", weapon: "SR" },
    { id: 500, name: "Elegg", burst: "II", element: "Electric", weapon: "RL" },
    { id: 502, name: "Elegg: Boom and Shock", burst: "III", element: "Water", weapon: "RL" },
    { id: 821, name: "Emilia", burst: "III", element: "Water", weapon: "RL" },
    { id: 90, name: "Emma", burst: "I", element: "Fire", weapon: "AR" },
    { id: 93, name: "Emma: Tactical Upgrade", burst: "I", element: "Fire", weapon: "AR" },
    { id: 241, name: "Epinel", burst: "III", element: "Wind", weapon: "AR" },
    { id: 291, name: "Ether", burst: "I", element: "Electric", weapon: "SMG" },
    { id: 92, name: "Eunhwa", burst: "II", element: "Fire", weapon: "SR" },
    { id: 95, name: "Eunhwa: Tactical Upgrade", burst: "II", element: "Fire", weapon: "SR" },
    { id: 850, name: "Eve", burst: "III", element: "Iron", weapon: "MG" },
    { id: 210, name: "Exia", burst: "I", element: "Electric", weapon: "AR", slug: "exia-treasure" },
    { id: 411, name: "Flora", burst: "II", element: "Electric", weapon: "AR" },
    { id: 242, name: "Folkwang", burst: "II", element: "Water", weapon: "AR" },
    { id: 142, name: "Frima", burst: "I", element: "Iron", weapon: "SMG", slug: "frima-treasure" },
    { id: 514, name: "Grave", burst: "II", element: "Fire", weapon: "SG" },
    { id: 180, name: "Guillotine", burst: "III", element: "Electric", weapon: "MG" },
    { id: 182, name: "Guillotine: Winter Slayer", burst: "III", element: "Water", weapon: "MG" },
    { id: 400, name: "Guilty", burst: "II", element: "Wind", weapon: "AR" },
    { id: 230, name: "Harran", burst: "III", element: "Electric", weapon: "SR" },
    { id: 352, name: "Helm", burst: "III", element: "Water", weapon: "SR", slug: "helm-treasure" },
    { id: 353, name: "Helm: Aquamarine", burst: "II", element: "Iron", weapon: "SR", slug: "aqua-marine-helm" },
    { id: 802, name: "Himeno", burst: "II", element: "Wind", weapon: "SMG" },
    { id: 231, name: "Isabel", burst: "III", element: "Electric", weapon: "AR" },
    { id: 111, name: "Jackal", burst: "I", element: "Iron", weapon: "RL" },
    { id: 841, name: "Jill Valentine", burst: "III", element: "Electric", weapon: "SMG" },
    { id: 150, name: "Julia", burst: "III", element: "Iron", weapon: "MG", slug: "julia-treasure" },
    { id: 41, name: "K", burst: "III", element: "Electric", weapon: "SMG" },
    { id: 361, name: "Kilo", burst: "III", element: "Fire", weapon: "SG" },
    { id: 862, name: "Kurumi", burst: "I", element: "Iron", weapon: "SMG" },
    { id: 582, name: "Label", burst: "I", element: "Iron", weapon: "SMG" },
    { id: 100, name: "Laplace", burst: "III", element: "Iron", weapon: "RL", slug: "laplace-treasure" },
    { id: 382, name: "Leona", burst: "II", element: "Water", weapon: "SG" },
    { id: 262, name: "Liberalio", burst: "III", element: "Wind", weapon: "SR" },
    { id: 852, name: "Lily", burst: "II", element: "Wind", weapon: "AR" },
    { id: 82, name: "Liter", burst: "I", element: "Iron", weapon: "AR" },
    { id: 513, name: "Siren", burst: "I", element: "Wind", weapon: "SMG" },
    { id: 190, name: "Ludmilla", burst: "I", element: "Water", weapon: "SG" },
    { id: 194, name: "Ludmilla: Winter Owner", burst: "III", element: "Water", weapon: "SG" },
    { id: 181, name: "Maiden", burst: "III", element: "Electric", weapon: "SR" },
    { id: 183, name: "Maiden: Ice Rose", burst: "III", element: "Electric", weapon: "SR" },
    { id: 800, name: "Makima", burst: "II", element: "Water", weapon: "AR" },
    { id: 290, name: "Mana", burst: "III", element: "Wind", weapon: "AR" },
    { id: 321, name: "Marciana", burst: "II", element: "Iron", weapon: "AR" },
    { id: 832, name: "Mari Makinami Illustrious", burst: "II", element: "Electric", weapon: "SR" },
    { id: 130, name: "Mary", burst: "I", element: "Water", weapon: "SMG" },
    { id: 132, name: "Mary: Bay Goddess", burst: "I", element: "Water", weapon: "SMG", slug: "bay-goddess-mary" },
    { id: 350, name: "Mast", burst: "II", element: "Electric", weapon: "SMG" },
    { id: 354, name: "Mast: Romantic Maid", burst: "II", element: "Water", weapon: "SMG" },
    { id: 102, name: "Maxwell", burst: "III", element: "Iron", weapon: "SR" },
    { id: 61, name: "Mica", burst: "I", element: "Wind", weapon: "SMG" },
    { id: 62, name: "Mica: Snow Buddy", burst: "I", element: "Iron", weapon: "SMG" },
    { id: 161, name: "Mihara", burst: "III", element: "Water", weapon: "SR" },
    { id: 162, name: "Mihara: Bonding Chain", burst: "III", element: "Fire", weapon: "SR" },
    { id: 141, name: "Milk", burst: "I", element: "Water", weapon: "SR", slug: "milk-treasure" },
    { id: 143, name: "Milk: Blooming Bunny", burst: "III", element: "Iron", weapon: "SR" },
    { id: 600, name: "Mint", burst: "II", element: "Iron", weapon: "AR" },
    { id: 32, name: "Miranda", burst: "I", element: "Fire", weapon: "SMG", slug: "miranda-treasure" },
    { id: 833, name: "Misato Katsuragi", burst: "I", element: "Iron", weapon: "RL" },
    { id: 260, name: "Modernia", burst: "III", element: "Fire", weapon: "MG" },
    { id: 281, name: "Moran", burst: "I", element: "Electric", weapon: "SG", slug: "moran-treasure" },
    { id: 590, name: "Mori", burst: "II", element: "Wind", weapon: "AR" },
    { id: 120, name: "N102", burst: "I", element: "Water", weapon: "SMG" },
    { id: 450, name: "Naga", burst: "II", element: "Electric", weapon: "SMG" },
    { id: 223, name: "Nayuta", burst: "II", element: "Wind", weapon: "SMG" },
    { id: 11, name: "Neon", burst: "I", element: "Fire", weapon: "AR" },
    { id: 14, name: "Neon: Blue Ocean", burst: "III", element: "Water", weapon: "AR", slug: "blue-ocean-neon" },
    { id: 18, name: "Neon: Vision Eye", burst: "III", element: "Electric", weapon: "AR" },
    { id: 380, name: "Nero", burst: "II", element: "Fire", weapon: "SG" },
    { id: 193, name: "Neve", burst: "III", element: "Water", weapon: "SR" },
    { id: 261, name: "Nihilister", burst: "II", element: "Fire", weapon: "MG" },
    { id: 232, name: "Noah", burst: "II", element: "Wind", weapon: "AR" },
    { id: 271, name: "Noir", burst: "III", element: "Wind", weapon: "SR" },
    { id: 430, name: "Noise", burst: "I", element: "Electric", weapon: "RL" },
    { id: 212, name: "Novel", burst: "II", element: "Iron", weapon: "RL" },
    { id: 812, name: "Pascal", burst: "I", element: "Iron", weapon: "RL" },
    { id: 131, name: "Pepper", burst: "I", element: "Wind", weapon: "SMG" },
    { id: 580, name: "Phantom", burst: "III", element: "Water", weapon: "AR" },
    { id: 30, name: "Poli", burst: "II", element: "Water", weapon: "SG", slug: "poli-treasure" },
    { id: 801, name: "Power", burst: "III", element: "Fire", weapon: "MG" },
    { id: 601, name: "Prika", burst: "II", element: "Water", weapon: "SR" },
    { id: 170, name: "Privaty", burst: "III", element: "Water", weapon: "AR", slug: "privaty-treasure" },
    { id: 313, name: "Privaty: Unkind Maid", burst: "III", element: "Electric", weapon: "AR" },
    { id: 302, name: "Product 08", burst: "I", element: "Electric", weapon: "SMG" },
    { id: 303, name: "Product 12", burst: "III", element: "Fire", weapon: "AR" },
    { id: 307, name: "Product 23", burst: "II", element: "Wind", weapon: "AR" },
    { id: 402, name: "Quency", burst: "II", element: "Electric", weapon: "AR" },
    { id: 403, name: "Quency: Escape Queen", burst: "III", element: "Water", weapon: "AR" },
    { id: 33, name: "Quiry", burst: "III", element: "Wind", weapon: "SR" },
    { id: 822, name: "Ram", burst: "I", element: "Wind", weapon: "AR" },
    { id: 10, name: "Rapi", burst: "III", element: "Fire", weapon: "AR" },
    { id: 16, name: "Rapi: Red Hood", burst: "I", element: "Fire", weapon: "SR" },
    { id: 221, name: "Rapunzel", burst: "I", element: "Iron", weapon: "RL" },
    { id: 226, name: "Rapunzel: Pure Grace", burst: "I", element: "Iron", weapon: "RL" },
    { id: 851, name: "Raven", burst: "III", element: "Iron", weapon: "SR" },
    { id: 470, name: "Red Hood", burst: "All", element: "Iron", weapon: "SR" },
    { id: 392, name: "Rei", burst: "I", element: "Water", weapon: "SMG" },
    { id: 831, name: "Rei Ayanami", burst: "III", element: "Fire", weapon: "RL" },
    { id: 834, name: "Rei Ayanami (Tentative Name)", burst: "III", element: "Wind", weapon: "RL" },
    { id: 820, name: "Rem", burst: "II", element: "Water", weapon: "AR" },
    { id: 280, name: "Rosanna", burst: "I", element: "Electric", weapon: "SG" },
    { id: 283, name: "Rosanna: Chic Ocean", burst: "II", element: "Wind", weapon: "SG" },
    { id: 272, name: "Rouge", burst: "I", element: "Electric", weapon: "SR" },
    { id: 240, name: "Rumani", burst: "I", element: "Fire", weapon: "AR" },
    { id: 200, name: "Rupee", burst: "II", element: "Iron", weapon: "AR" },
    { id: 203, name: "Rupee: Winter Shopper", burst: "I", element: "Electric", weapon: "RL", slug: "winter-shopper-rupee" },
    { id: 282, name: "Sakura", burst: "I", element: "Fire", weapon: "SG" },
    { id: 836, name: "Sakura Suzuhara", burst: "I", element: "Water", weapon: "SMG" },
    { id: 284, name: "Sakura: Bloom in Summer", burst: "III", element: "Wind", weapon: "SG" },
    { id: 222, name: "Scarlet", burst: "III", element: "Electric", weapon: "SR" },
    { id: 225, name: "Scarlet: Black Shadow", burst: "III", element: "Wind", weapon: "SMG" },
    { id: 22, name: "Signal", burst: "II", element: "Fire", weapon: "AR" },
    { id: 401, name: "Sin", burst: "II", element: "Electric", weapon: "AR" },
    { id: 620, name: "Snow Crane", burst: "II", element: "Water", weapon: "SG" },
    { id: 220, name: "Snow White", burst: "III", element: "Iron", weapon: "SR" },
    { id: 471, name: "Snow White: Heavy Arms", burst: "III", element: "Water", weapon: "SR" },
    { id: 224, name: "Snow White: Innocent Days", burst: "III", element: "Iron", weapon: "SR", slug: "innocent-dayss-snow-white" },
    { id: 312, name: "Soda", burst: "I", element: "Fire", weapon: "SG" },
    { id: 314, name: "Soda: Twinkling Bunny", burst: "III", element: "Iron", weapon: "SG" },
    { id: 300, name: "Soldier EG", burst: "III", element: "Electric", weapon: "AR" },
    { id: 301, name: "Soldier FA", burst: "II", element: "Iron", weapon: "AR" },
    { id: 306, name: "Soldier OW", burst: "I", element: "Fire", weapon: "AR" },
    { id: 71, name: "Soline", burst: "III", element: "Iron", weapon: "AR" },
    { id: 74, name: "Soline: Frost Ticket", burst: "I", element: "Water", weapon: "AR" },
    { id: 532, name: "Sora", burst: "I", element: "Wind", weapon: "SMG" },
    { id: 140, name: "Sugar", burst: "III", element: "Iron", weapon: "RL" },
    { id: 861, name: "Takina Inoue", burst: "II", element: "Iron", weapon: "AR" },
    { id: 451, name: "Tia", burst: "I", element: "Iron", weapon: "RL" },
    { id: 192, name: "Tove", burst: "I", element: "Water", weapon: "SMG", slug: "tove-treasure" },
    { id: 412, name: "Trina", burst: "II", element: "Electric", weapon: "AR" },
    { id: 501, name: "Trony", burst: "III", element: "Fire", weapon: "AR" },
    { id: 316, name: "Velvet", burst: "II", element: "Wind", weapon: "SR" },
    { id: 91, name: "Vesti", burst: "III", element: "Water", weapon: "SR" },
    { id: 94, name: "Vesti: Tactical Upgrade", burst: "III", element: "Fire", weapon: "SR" },
    { id: 112, name: "Viper", burst: "II", element: "Water", weapon: "SG", slug: "viper-treasure" },
    { id: 431, name: "Volume", burst: "I", element: "Wind", weapon: "SMG" },
    { id: 201, name: "Yan", burst: "I", element: "Fire", weapon: "SR" },
    { id: 171, name: "Yulha", burst: "III", element: "Fire", weapon: "RL" },
    { id: 160, name: "Yuni", burst: "II", element: "Fire", weapon: "AR" },
    { id: 390, name: "Zwei", burst: "I", element: "Electric", weapon: "RL", slug: "zwei-treasure" },
    { id: 304, name: "iDoll Flower", burst: "I", element: "Wind", weapon: "AR" },
    { id: 305, name: "iDoll Ocean", burst: "I", element: "Water", weapon: "AR" },
    { id: 308, name: "iDoll Sun", burst: "III", element: "Iron", weapon: "AR" },
];

const NIKKE_DB_MAP = new Map(NIKKE_DATABASE.map(n => [n.name, n]));

// All possible overload stats
const ALL_LINES = [
    "ATK",
    "Elemental Damage",
    "Max Ammo",
    "Charge Speed",
    "Charge Damage",
    "Critical Rate",
    "Critical Damage",
    "Hit Rate",
    "DEF",
];

// Stats that are always trash — never worth keeping
const ALWAYS_TRASH = new Set(["DEF"]);

// Element icon URLs from Prydwen CDN
const ELEMENT_ICON = {
    Fire: "https://cdn.prydwen.gg/images/nikke/icons/fire_bg.webp",
    Water: "https://cdn.prydwen.gg/images/nikke/icons/water_bg.webp",
    Wind: "https://cdn.prydwen.gg/images/nikke/icons/wind_bg.webp",
    Electric: "https://cdn.prydwen.gg/images/nikke/icons/ele_bg.webp",
    Iron: "https://cdn.prydwen.gg/images/nikke/icons/iron_bg.webp",
};

function elemIcon(element) {
    const url = ELEMENT_ICON[element];
    return url
        ? `<img src="${url}" alt="${element}" style="width:20px;height:20px;vertical-align:middle;border-radius:3px;object-fit:contain">`
        : "";
}

// Nikke portrait icon from Prydwen CDN
function nikkeSlug(name) {
    const entry = NIKKE_DB_MAP.get(name);
    if (entry && entry.slug) return entry.slug;
    return name
        .toLowerCase()
        .replace(/:/g, "")
        .replace(/\./g, "")
        .replace(/'/g, "")
        .replace(/\(/g, "")
        .replace(/\)/g, "")
        .replace(/\s+/g, "-");
}

function nikkeIcon(name, size) {
    const sz = size || 22;
    const slug = nikkeSlug(name);
    return `<div style="width:${sz}px;height:${sz}px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#1e3a5f"><img src="https://cdn.prydwen.gg/images/nikke/characters/${slug}_icon.webp" alt="${name}" style="width:${sz * 1.8}px;height:${sz * 1.8}px;object-fit:cover;object-position:top center;margin-left:-${sz * 0.4}px;margin-top:-${sz * 0.05}px" onerror="this.src='https://cdn.prydwen.gg/images/nikke/characters/${slug}_card.webp';this.onerror=function(){this.parentElement.style.display='none'}"></div>`;
}

// Preload nikke icons into browser cache to prevent flicker on re-render
const _preloadedIcons = new Set();
function preloadNikkeIcons() {
    state.nikkes.forEach((n) => {
        if (_preloadedIcons.has(n.name)) return;
        _preloadedIcons.add(n.name);
        const slug = nikkeSlug(n.name);
        const img = new Image();
        img.src = `https://cdn.prydwen.gg/images/nikke/characters/${slug}_icon.webp`;
    });
}

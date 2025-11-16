import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import React, { useMemo } from "react";


const ALL_MAPS = [
  "Champs de l'Éternité",
  "Comté du dragon",
  "Fonderie de Volskaya",
  "Jardins de Terreur",
  "Laboratoire de Braxis",
  "Menace nucléaire",
  "Mine hantée",
  "Passe d'Alterac",
  "Sanctuaires infernaux",
  "Temple céleste",
  "Temple d'Hanamura",
  "Tombe de la Reine araignée",
  "Tours du destin",
  "Val maudit",
];

const HERO_LIST = [
  "Abathur",
  "Aile-de-mort",
  "Alarak",
  "Alexstrasza",
  "Ana",
  "Anduin",
  "Anub'arak",
  "Artanis",
  "Arthas",
  "Asmodan",
  "Auriel",
  "Balafré",
  "Blanchetête",
  "Blaze",
  "Bourbie",
  "Brightwing",
  "Cassia",
  "Chacal",
  "Chen",
  "Chogall",
  "Chromie",
  "D.Va",
  "Deckard",
  "Dehaka",
  "Diablo",
  "EDN-OS",
  "ETC",
  "Falstad",
  "Fénix",
  "Garrosh",
  "Gazleu",
  "Genji",
  "Greymane",
  "Gul'dan",
  "Hanzo",
  "Impérius",
  "Illidan",
  "Jaina",
  "Johanna",
  "Kael'thas",
  "Kel'thuzad",
  "Kerrigan",
  "Kharazim",
  "Lardeur",
  "Le boucher",
  "Léoric",
  "Les Vikings Perdus",
  "Li-Ming",
  "Lili",
  "Lt Morales",
  "Lúcio",
  "Lunara",
  "Maiev",
  "Mal'Ganis",
  "Malfurion",
  "Malthaël",
  "Medivh",
  "Mei",
  "Mephisto",
  "Muradin",
  "Nasibo",
  "Nova",
  "Orphéa",
  "Qhira",
  "Ragnaros",
  "Raynor",
  "Rehgar",
  "Rexxar",
  "Samuro",
  "Sgt. Marteau",
  "Sonya",
  "Stukov",
  "Sylvanas",
  "Tassadar",
  "Thrall",
  "Tracer",
  "Tyrande",
  "Tyraël",
  "Tychus",
  "Uther",
  "Valeera",
  "Valla",
  "Varian",
  "Xul",
  "Yrel",
  "Zagara",
  "Zarya",
  "Zeratul",
  "Zul'jin"
];

const BASE_ROLE = {
  "Abathur": "dps range mage",
  "Aile-de-mort": "guerrier offensif",
  "Alarak": "dps melee",
  "Alexstrasza": "healer",
  "Ana": "healer",
  "Anduin": "healer",
  "Anub'arak": "guerrier defensif",
  "Artanis": "guerrier offensif",
  "Arthas": "guerrier defensif",
  "Asmodan": "dps range mage",
  "Auriel": "healer",
  "Balafré": "guerrier defensif",
  "Blanchetête": "healer",
  "Blaze": "guerrier defensif",
  "Bourbie": "dps melee",
  "Brightwing": "healer",
  "Cassia": "dps range auto attack",
  "Chacal": "dps range auto attack",
  "Chen": "guerrier defensif",
  "Chogall": "guerrier offensif",
  "Chromie": "dps range mage",
  "D.Va": "guerrier offensif",
  "Deckard": "healer",
  "Dehaka": "guerrier offensif",
  "Diablo": "guerrier defensif",
  "EDN-OS": "dps range mage",
  "ETC": "guerrier defensif",
  "Falstad": "dps range auto attack",
  "Fénix": "dps range mage",
  "Garrosh": "guerrier defensif",
  "Gazleu": "dps melee",
  "Genji": "dps melee",
  "Greymane": "dps melee",
  "Gul'dan": "dps range mage",
  "Hanzo": "dps range auto attack",
  "Impérius": "guerrier offensif",
  "Illidan": "dps melee",
  "Jaina": "dps range mage",
  "Johanna": "guerrier defensif",
  "Kael'thas": "dps range mage",
  "Kel'thuzad": "dps range mage",
  "Kerrigan": "dps melee",
  "Kharazim": "healer",
  "Lardeur": "guerrier offensif",
  "Le boucher": "dps melee",
  "Léoric": "guerrier offensif",
  "Les Vikings Perdus": "dps range auto attack",
  "Li-Ming": "dps range mage",
  "Lili": "healer",
  "Lt Morales": "healer",
  "Lúcio": "healer",
  "Lunara": "dps range auto attack",
  "Maiev": "dps melee",
  "Mal'Ganis": "guerrier defensif",
  "Malfurion": "healer",
  "Malthaël": "dps melee",
  "Medivh": "dps range mage",
  "Mei": "guerrier offensif",
  "Mephisto": "dps range mage",
  "Muradin": "guerrier defensif",
  "Nasibo": "dps range mage",
  "Nova": "dps range auto attack",
  "Orphéa": "dps range mage",
  "Qhuira": "dps melee",
  "Ragnaros": "guerrier offensif",
  "Raynor": "dps range auto attack",
  "Rehgar": "healer",
  "Rexxar": "guerrier offensif",
  "Samuro": "dps melee",
  "Sgt. Marteau": "dps range auto attack",
  "Sonya": "guerrier offensif",
  "Stukov": "healer",
  "Sylvanas": "dps range mage",
  "Tassadar": "dps range mage",
  "Thrall": "guerrier offensif",
  "Tracer": "dps range auto attack",
  "Tyrande": "healer",
  "Tyraël": "guerrier defensif",
  "Tychus": "dps range auto attack",
  "Uther": "healer",
  "Valeera": "dps melee",
  "Valla": "dps range auto attack",
  "Varian": "guerrier defensif",
  "Xul": "guerrier offensif",
  "Yrel": "guerrier offensif",
  "Zagara": "dps range mage",
  "Zarya": "guerrier offensif",
  "Zeratul": "dps melee",
  "Zul'jin": "dps range auto attack"
};

const TIER = {
  "Abathur": "D",
  "Aile-de-mort": "C",
  "Alarak": "B",
  "Alexstrasza": "B",
  "Ana": "C",
  "Anduin": "A",
  "Anub'arak": "A",
  "Artanis": "B",
  "Arthas": "B",
  "Asmodan": "B",
  "Auriel": "A",
  "Balafré": "C",
  "Blanchetête": "B",
  "Blaze": "S",
  "Bourbie": "C",
  "Brightwing": "A",
  "Cassia": "B",
  "Chacal": "B",
  "Chen": "C",
  "Chogall": "B",
  "Chromie": "A",
  "D.Va": "B",
  "Deckard": "B",
  "Dehaka": "S",
  "Diablo": "A",
  "EDN-OS": "D",
  "ETC": "A",
  "Falstad": "A",
  "Fénix": "B",
  "Garrosh": "S",
  "Gazleu": "B",
  "Genji": "B",
  "Greymane": "B",
  "Gul'dan": "B",
  "Hanzo": "B",
  "Impérius": "B",
  "Illidan": "B",
  "Jaina": "A",
  "Johanna": "S",
  "Kael'thas": "A",
  "Kel'thuzad": "C",
  "Kerrigan": "A",
  "Kharazim": "C",
  "Lardeur": "S",
  "Le boucher": "B",
  "Léoric": "A",
  "Les Vikings Perdus": "B",
  "Li-Ming": "B",
  "Lili": "D",
  "Lt Morales": "C",
  "Lúcio": "B",
  "Lunara": "C",
  "Maiev": "A",
  "Mal'Ganis": "B",
  "Malfurion": "A",
  "Malthaël": "C",
  "Medivh": "D",
  "Mei": "C",
  "Mephisto": "S",
  "Muradin": "A",
  "Nasibo": "A",
  "Nova": "D",
  "Orphéa": "B",
  "qhuira": "C",
  "Ragnaros": "B",
  "Raynor": "B",
  "Rehgar": "S",
  "Rexxar": "A",
  "Samuro": "A",
  "Sgt. Marteau": "A",
  "Sonya": "A",
  "Stukov": "B",
  "Sylvanas": "A",
  "Tassadar": "B",
  "Thrall": "A",
  "Tracer": "A",
  "Tyrande": "B",
  "Tyraël": "S",
  "Tychus": "B",
  "Uther": "C",
  "Valeera": "C",
  "Valla": "S",
  "Varian": "B",
  "Xul": "B",
  "Yrel": "B",
  "Zagara": "B",
  "Zarya": "C",
  "Zeratul": "B",
  "Zul'jin": "A"
};


const TIER_BONUS = {
  "S": 2,
  "A": 1,
  "B": 0,
  "C": -1,
  "D": -2
};

const SYNERGY = {
  "Abathur": [
    "Illidan",
    "Zeratul",
    "Tracer",
    "Greymane",
    "Malthaël",
    "Sonya",
    "Yrel",
    "Genji"
  ],
  "Aile-de-mort": [
    "ETC",
    "Arthas",
    "Johanna",
    "Muradin"
  ],
  "Alarak": [
    "Raynor",
    "Jaina",
    "ETC",
    "Garrosh"
  ],
  "Alexstrasza": [
    "Johanna",
    "Blaze",
    "Kael'thas",
    "Asmodan"
  ],
  "Ana": [
    "Li-Ming",
    "ETC"
  ],
  "Anduin": [
    "Johanna",
    "Blaze",
    "Le boucher",
    "Alarak",
    "Genji",
    "Sylvanas"
  ],
  "Anub'arak": [
    "Greymane",
    "Jaina",
    "Kael'thas",
    "Kerrigan",
    "Rehgar",
    "Le boucher"
  ],
  "Artanis": [
    "Garrosh",
    "Arthas",
    "Kael'thas",
    "Lunara",
    "Medivh",
    "Malfurion"
  ],
  "Arthas": [
    "Diablo",
    "Tyraël",
    "Maiev",
    "Greymane",
    "Raynor",
    "Chromie",
    "Zarya",
    "Stukov",
    "Rehgar"
  ],
  "Asmodan": [
    "Jaina",
    "Johanna",
    "Maiev",
    "Malfurion"
  ],
  "Auriel": [
    "Diablo",
    "Xul",
    "Raynor",
    "Tassadar"
  ],
  "Balafré": [
    "Blaze",
    "Falstad",
    "Kael'thas",
    "Malfurion"
  ],
  "Blanchetête": [
    "Valla",
    "Li-Ming",
    "Raynor"
  ],
  "Blaze": [
    "Arthas",
    "Kerrigan",
    "Maiev",
    "Malfurion"
  ],
  "Bourbie": [
    "Johanna",
    "Zarya",
    "Brightwing"
  ],
  "Brightwing": [
    "Diablo",
    "Chogall",
    "Balafré",
    "Tracer",
    "Genji"
  ],
  "Cassia": [
    "Lili",
    "Johanna",
    "Artanis",
    "Thrall",
    "Jaina"
  ],
  "Chacal": [
    "ETC",
    "Garrosh",
    "Uther",
    "Malfurion",
    "Zeratul"
  ],
  "Chen": [
    "Tyraël",
    "Greymane",
    "Li-Ming",
    "Abathur",
    "Rehgar"
  ],
  "Chogall": [
    "Alexstrasza",
    "Ana",
    "Auriel",
    "Brightwing",
    "Yrel",
    "Blaze"
  ],
  "Chromie": [
    "Johanna",
    "Ana",
    "Malfurion"
  ],
  "D.Va": [
    "Garrosh",
    "Maiev",
    "Falstad",
    "Deckard"
  ],
  "Deckard": [
    "Johanna",
    "Blaze",
    "Hanzo",
    "Jaina"
  ],
  "Dehaka": [
    "Dehaka",
    "Jaina",
    "Hanzo",
    "Maiev"
  ],
  "Diablo": [
    "Thrall",
    "Tassadar",
    "Medivh",
    "Tyrande"
  ],
  "EDN-OS": [
    "ETC",
    "Diablo",
    "Anub'arak",
    "Arthas",
    "Malfurion"
  ],
  "ETC": [
    "Blaze",
    "Alarak",
    "Greymane",
    "Kael'thas",
    "Uther"
  ],
  "Falstad": [
    "Arthas",
    "ETC",
    "Tassadar",
    "Uther"
  ],
  "Fénix": [
    "Johanna",
    "Maiev",
    "Thrall",
    "Diablo"
  ],
  "Garrosh": [
    "Hanzo",
    "Jaina",
    "Zarya",
    "Malfurion"
  ],
  "Gazleu": [
    "Diablo",
    "Jaina",
    "ETC",
    "Malfurion",
    "Kael'thas",
    "Johanna"
  ],
  "Genji": [
    "Jaina",
    "Uther",
    "ETC"
  ],
  "Greymane": [
    "Abathur",
    "ETC",
    "Garrosh",
    "Tyraël",
    "Uther",
    "Rehgar",
    "Malthaël"
  ],
  "Gul'dan": [
    "ETC",
    "Malfurion",
    "Auriel"
  ],
  "Hanzo": [
    "Zeratul",
    "ETC",
    "Diablo",
    "Blaze",
    "Johanna",
    "Mal'Ganis"
  ],
  "Impérius": [
    "Jaina",
    "Fénix",
    "Rehgar",
    "Mal'Ganis",
    "ETC",
    "Yrel",
    "Blaze"
  ],
  "Illidan": [
    "Abathur",
    "Medivh",
    "Rehgar",
    "Tyraël",
    "Uther",
    "Zarya"
  ],
  "Jaina": [
    "ETC",
    "Johanna",
    "Maiev",
    "Malfurion",
    "Muradin",
    "Varian",
    "Xul"
  ],
  "Johanna": [
    "Blaze",
    "Medivh",
    "Hanzo",
    "Jaina",
    "Deckard"
  ],
  "Kael'thas": [
    "ETC",
    "Arthas",
    "Malfurion",
    "Uther"
  ],
  "Kel'thuzad": [
    "Anduin",
    "Arthas",
    "Malfurion",
    "Valeera",
    "Varian",
    "Xul",
    "Johanna",
    "Le boucher"
  ],
  "Kerrigan": [
    "Tyraël",
    "Uther",
    "Medivh",
    "Tyrande"
  ],
  "Kharazim": [
    "ETC",
    "Garrosh",
    "Anub'arak",
    "Genji"
  ],
  "Lardeur": [
    "Diablo",
    "Sonya",
    "Hanzo",
    "Li-Ming",
    "Stukov"
  ],
  "Le boucher": [
    "Abathur",
    "Tyrande",
    "Uther",
    "Tyraël"
  ],
  "Léoric": [
    "Diablo",
    "Stukov",
    "Orphéa"
  ],
  "Les Vikings Perdus": [
    "Zarya",
    "Garrosh",
    "Sylvanas",
    "Raynor",
    "Sgt. Marteau"
  ],
  "Li-Ming": [
    "Arthas",
    "ETC",
    "Johanna",
    "Malfurion",
    "Valeera",
    "Varian",
    "Xul"
  ],
  "Lili": [
    "Johanna",
    "Blaze",
    "Hanzo",
    "Kael'thas",
    "Uther"
  ],
  "Lt Morales": [
    "Johanna",
    "Raynor"
  ],
  "Lúcio": [
    "Arthas",
    "Diablo",
    "Greymane",
    "Valla"
  ],
  "Lunara": [
    "Arthas",
    "Muradin",
    "Jaina"
  ],
  "Maiev": [
    "ETC",
    "Maiev",
    "Jaina",
    "Tassadar",
    "Deckard",
    "Malfurion"
  ],
  "Mal'Ganis": [
    "Zeratul",
    "Malfurion",
    "Jaina"
  ],
  "Malfurion": [
    "Blaze",
    "Chromie",
    "Gul'dan",
    "Jaina",
    "Kael'thas",
    "Kel'thuzad",
    "Nasibo",
    "Ragnaros"
  ],
  "Malthaël": [
    "ETC",
    "Garrosh",
    "Greymane",
    "Tychus",
    "Medivh",
    "Ana",
    "Malfurion"
  ],
  "Medivh": [
    "Illidan",
    "Greymane",
    "Genji",
    "Tracer",
    "Diablo",
    "Balafré"
  ],
  "Mei": [
    "Xul",
    "Lunara",
    "Jaina",
    "Deckard"
  ],
  "Mephisto": [
    "ETC",
    "Diablo",
    "Zarya",
    "Deckard"
  ],
  "Muradin": [
    "Blaze",
    "Kerrigan",
    "Kael'thas",
    "Hanzo",
    "Malfurion"
  ],
  "Nasibo": [
    "Arthas",
    "Muradin",
    "Raynor"
  ],
  "Nova": [
    "Johanna",
    "Stukov",
    "Blaze",
    "Sylvanas"
  ],
  "Orphéa": [
    "Arthas",
    "Diablo",
    "Johanna",
    "Mal'Ganis",
    "Varian",
    "Xul"
  ],
  "Qhuira": [
    "Uther",
    "Rehgar",
    "Abathur",
    "Anub'arak"
  ],
  "Ragnaros": [
    "ETC",
    "Hanzo",
    "Kael'thas",
    "Ana"
  ],
  "Raynor": [
    "ETC",
    "Garrosh",
    "Thrall",
    "Lt Morales"
  ],
  "Rehgar": [
    "Sonya",
    "Illidan",
    "Greymane",
    "Anub'arak"
  ],
  "Rexxar": [
    "Johanna",
    "Malfurion",
    "Jaina"
  ],
  "Samuro": [
    "Abathur",
    "Deckard",
    "Malfurion",
    "Sylvanas"
  ],
  "Sgt. Marteau": [
    "ETC",
    "Johanna",
    "Lt Morales",
    "Ana"
  ],
  "Sonya": [
    "Medivh",
    "Rehgar",
    "Zarya",
    "Jaina"
  ],
  "Stukov": [
    "Thrall",
    "Malfurion",
    "Tyrande"
  ],
  "Sylvanas": [
    "Diablo",
    "ETC",
    "Tyrande",
    "Jaina",
    "Tassadar",
    "Valla"
  ],
  "Tassadar": [
    "Maiev",
    "Johanna",
    "ETC",
    "Genji",
    "Zeratul"
  ],
  "Thrall": [
    "Valla",
    "Li-Ming",
    "Raynor"
  ],
  "Tracer": [
    "Tassadar",
    "Jaina",
    "Gul'dan",
    "Kael'thas",
    "Malfurion",
    "Anduin",
    "Abathur"
  ],
  "Tyrande": [
    "Diablo",
    "ETC",
    "Varian",
    "Anub'arak",
    "Li-Ming"
  ],
  "Tyraël": [
    "Blaze",
    "Illidan",
    "Malfurion"
  ],
  "Tychus": [
    "Garrosh",
    "ETC",
    "Dehaka",
    "Uther"
  ],
  "Uther": [
    "ETC",
    "Kerrigan",
    "Illidan",
    "Le boucher",
    "Zeratul",
    "Malfurion"
  ],
  "Valeera": [
    "Garrosh",
    "ETC",
    "Thrall"
  ],
  "Valla": [
    "Arthas",
    "Garrosh",
    "Auriel",
    "Uther"
  ],
  "Varian": [
    "ETC",
    "Blaze",
    "Li-Ming",
    "Tyrande"
  ],
  "Xul": [
    "Tyrande",
    "Li-Ming",
    "Medivh",
    "Falstad"
  ],
  "Yrel": [
    "Garrosh",
    "Johanna",
    "Medivh",
    "Abathur"
  ],
  "Zagara": [
    "ETC",
    "Jaina",
    "Deckard"
  ],
  "Zarya": [
    "Garrosh",
    "Sonya",
    "Valla",
    "Malfurion"
  ],
  "Zeratul": [
    "Abathur",
    "Li-Ming",
    "Diablo",
    "Garrosh",
    "Malfurion",
    "Kharazim",
    "Jaina",
    "Chacal",
    "Hanzo"
  ],
  "Zul'jin": [
    "Tyraël",
    "ETC",
    "Tassadar",
    "Uther",
    "Medivh",
    "Arthas"
  ]
};

const COUNTERS = {
  "Abathur": [
    "Dehaka",
    "Falstad",
    "Nova",
    "Zeratul",
    "Ragnaros",
    "Zarya",
    "Sgt. Marteau",
    "Sylvanas"
  ],
  "Aile-de-mort": [
    "Tychus",
    "Greymane",
    "Valla",
    "Zeratul",
    "Tracer"
  ],
  "Alarak": [
    "ETC",
    "Johanna",
    "Aile-de-mort",
    "Medivh"
  ],
  "Alexstrasza": [
    "Anub'arak",
    "Yrel",
    "Kael'thas",
    "Sylvanas",
    "Ana"
  ],
  "Ana": [
    "Anub'arak",
    "Zeratul",
    "Hanzo",
    "Lúcio"
  ],
  "Anduin": [
    "Varian",
    "Sonya",
    "Lunara",
    "Kael'thas",
    "Stukov"
  ],
  "Anub'arak": [
    "Léoric",
    "Malthaël",
    "Tracer",
    "Valla",
    "Varian",
    "Zul'jin"
  ],
  "Artanis": [
    "ETC",
    "Arthas",
    "Varian",
    "Jaina",
    "Lunara",
    "Lili"
  ],
  "Arthas": [
    "Garrosh",
    "Sonya",
    "Tracer",
    "Raynor",
    "Jaina",
    "Ana"
  ],
  "Asmodan": [
    "Artanis",
    "Anub'arak",
    "Diablo",
    "Léoric",
    "Malthaël",
    "Muradin",
    "Sonya",
    "Le boucher"
  ],
  "Auriel": [
    "Anub'arak",
    "Chacal",
    "Chen",
    "Chromie",
    "Deckard"
  ],
  "Balafré": [
    "Johanna",
    "Malthaël",
    "Greymane",
    "Tychus",
    "Anduin"
  ],
  "Blanchetête": [
    "Muradin",
    "Diablo",
    "Chen"
  ],
  "Blaze": [
    "Léoric",
    "Lunara",
    "Malthaël",
    "Nova",
    "Tracer",
    "Valla"
  ],
  "Bourbie": [
    "Sonya",
    "Falstad"
  ],
  "Brightwing": [
    "Anub'arak",
    "Johanna",
    "ETC"
  ],
  "Cassia": [
    "Kael'thas",
    "Xul",
    "ETC",
    "Mal'Ganis",
    "Impérius",
    "Johanna"
  ],
  "Chacal": [
    "Illidan",
    "Tracer",
    "Zeratul",
    "Tyraël",
    "Genji"
  ],
  "Chen": [
    "ETC",
    "Yrel",
    "Raynor",
    "Li-Ming",
    "Les Vikings Perdus"
  ],
  "Chogall": [
    "Anub'arak",
    "Garrosh",
    "Greymane",
    "Impérius",
    "Kharazim",
    "Léoric",
    "Malthaël",
    "Raynor"
  ],
  "Chromie": [
    "Illidan",
    "Diablo",
    "Zeratul",
    "Tracer"
  ],
  "D.Va": [
    "ETC",
    "Kael'thas",
    "Malthaël",
    "Raynor",
    "Stukov"
  ],
  "Deckard": [
    "Johanna",
    "Aile-de-mort",
    "Tracer",
    "Li-Ming",
    "Malfurion"
  ],
  "Dehaka": [
    "Raynor",
    "Valla",
    "ETC",
    "Sgt. Marteau",
    "Lúcio"
  ],
  "Diablo": [
    "Garrosh",
    "Léoric",
    "Malthaël",
    "Raynor",
    "Tychus"
  ],
  "EDN-OS": [
    "Kerrigan",
    "Alarak",
    "Zeratul",
    "Tracer"
  ],
  "ETC": [
    "Johanna",
    "Aile-de-mort",
    "Raynor",
    "Kael'thas",
    "Brightwing"
  ],
  "Falstad": [
    "Genji",
    "Greymane",
    "Illidan",
    "Nova",
    "Valeera",
    "Zeratul"
  ],
  "Fénix": [
    "ETC",
    "Genji",
    "Varian",
    "Lúcio",
    "Zeratul"
  ],
  "Garrosh": [
    "Johanna",
    "Hanzo",
    "Malthaël",
    "Jaina",
    "Anduin"
  ],
  "Gazleu": [
    "Raynor",
    "Hanzo",
    "Lunara",
    "Li-Ming",
    "Chromie",
    "Gul'dan"
  ],
  "Genji": [
    "Varian",
    "Malfurion",
    "Lunara",
    "Uther"
  ],
  "Greymane": [
    "Arthas",
    "Brightwing",
    "Johanna",
    "Muradin",
    "Le boucher",
    "Uther",
    "Xul"
  ],
  "Gul'dan": [
    "Illidan",
    "Greymane",
    "Kerrigan",
    "Tracer"
  ],
  "Hanzo": [
    "Illidan",
    "Genji",
    "Zeratul"
  ],
  "Impérius": [
    "Jaina",
    "Raynor",
    "Sgt. Marteau",
    "Zul'jin",
    "ETC",
    "Lúcio"
  ],
  "Illidan": [
    "Muradin",
    "Arthas",
    "Brightwing",
    "ETC",
    "Lili",
    "Johanna",
    "Sonya",
    "Uther",
    "Varian"
  ],
  "Jaina": [
    "Alarak",
    "Anub'arak",
    "Chen",
    "Genji",
    "Nova",
    "Tracer",
    "Valeera",
    "Zeratul"
  ],
  "Johanna": [
    "Varian",
    "Léoric",
    "Hanzo",
    "Zeratul"
  ],
  "Kael'thas": [
    "Illidan",
    "Zeratul",
    "Kerrigan",
    "Tracer"
  ],
  "Kel'thuzad": [
    "Anub'arak",
    "Chen",
    "Genji",
    "Nova",
    "Tracer",
    "Valeera",
    "Zeratul"
  ],
  "Kerrigan": [
    "Tyraël",
    "ETC",
    "Garrosh",
    "Uther",
    "Medivh",
    "Auriel"
  ],
  "Kharazim": [
    "Johanna",
    "Auriel",
    "Medivh",
    "Uther"
  ],
  "Lardeur": [
    "Diablo",
    "Malthaël",
    "Tychus",
    "Lunara",
    "Uther"
  ],
  "Le boucher": [
    "Johanna",
    "ETC",
    "Brightwing",
    "Uther"
  ],
  "Léoric": [
    "Tracer",
    "Samuro",
    "Falstad",
    "Ana",
    "Dehaka"
  ],
  "Les Vikings Perdus": [
    "Zagara",
    "Sonya",
    "Zeratul",
    "Nova",
    "Falstad",
    "Dehaka",
    "Li-Ming"
  ],
  "Li-Ming": [
    "Anub'arak",
    "Chen",
    "Genji",
    "Samuro",
    "Tracer",
    "Valeera",
    "Zeratul"
  ],
  "Lili": [
    "ETC",
    "Yrel",
    "Sylvanas",
    "Jaina",
    "Stukov"
  ],
  "Lt Morales": [
    "Garrosh",
    "Chen",
    "Chromie",
    "Lunara",
    "Auriel"
  ],
  "Lúcio": [
    "Varian",
    "Anub'arak",
    "Sgt. Marteau",
    "Raynor"
  ],
  "Lunara": [
    "Illidan",
    "Genji",
    "Malfurion",
    "Stukov"
  ],
  "Maiev": [
    "Arthas",
    "Tyraël",
    "ETC",
    "Johanna",
    "Lunara",
    "Tracer",
    "Lúcio",
    "Brightwing"
  ],
  "Mal'Ganis": [
    "Garrosh",
    "Hanzo",
    "Zeratul",
    "Malfurion"
  ],
  "Malfurion": [
    "Alarak",
    "Anub'arak",
    "Artanis",
    "Jaina",
    "Kerrigan",
    "Li-Ming",
    "Tracer"
  ],
  "Malthaël": [
    "Blaze",
    "Falstad",
    "Fénix",
    "Lunara",
    "Tracer",
    "Valla"
  ],
  "Medivh": [
    "Gul'dan",
    "Lunara",
    "Garrosh",
    "Malfurion"
  ],
  "Mei": [
    "ETC",
    "Yrel",
    "Hanzo",
    "Chacal",
    "Zeratul",
    "Ana"
  ],
  "Mephisto": [
    "Kael'thas",
    "Yrel",
    "Kel'thuzad",
    "Balafré",
    "Anub'arak"
  ],
  "Muradin": [
    "ETC",
    "Thrall",
    "Raynor",
    "Jaina",
    "Malfurion"
  ],
  "Nasibo": [
    "Illidan",
    "Genji",
    "Malfurion",
    "Stukov"
  ],
  "Nova": [
    "Anub'arak",
    "Chen",
    "Genji",
    "Zarya",
    "Brightwing"
  ],
  "Orphéa": [
    "Anub'arak",
    "Chen",
    "Genji",
    "Lunara",
    "Muradin",
    "Nova",
    "Tracer"
  ],
  "Qhuira": [
    "ETC",
    "Diablo",
    "Anub'arak",
    "Arthas",
    "Malfurion"
  ],
  "Ragnaros": [
    "Garrosh",
    "Diablo",
    "Lucio",
    "E.T.C",
    "Tracer",
    "Uther"
  ],
  "Raynor": [
    "Johanna",
    "Artanis",
    "Cassia"
  ],
  "Rehgar": [
    "Muradin",
    "Varian",
    "Ana",
    "Tracer"
  ],
  "Rexxar": [
    "Zeratul",
    "Qhira"
  ],
  "Samuro": [
    "ETC",
    "Lúcio",
    "Yrel",
    "Cassia",
    "Orphéa",
    "Medivh",
    "Diablo",
    "Stukov"
  ],
  "Sgt. Marteau": [
    "Artanis",
    "Chromie",
    "Kel'thuzad",
    "Li-Ming",
    "Balafré"
  ],
  "Sonya": [
    "Brightwing",
    "ETC",
    "Diablo",
    "Garrosh",
    "Tychus",
    "Sylvanas"
  ],
  "Stukov": [
    "Muradin",
    "Léoric",
    "Malthaël",
    "Raynor",
    "Tychus"
  ],
  "Sylvanas": [
    "Diablo",
    "Chen",
    "Genji",
    "Nova",
    "Le boucher",
    "Valeera",
    "Zeratul"
  ],
  "Tassadar": [
    "Tracer",
    "Greymane",
    "Zeratul",
    "Anub'arak",
    "Kerrigan"
  ],
  "Thrall": [
    "Muradin",
    "Diablo",
    "Chen"
  ],
  "Tracer": [
    "Varian",
    "Diablo",
    "Medivh",
    "Raynor",
    "Sgt. Marteau"
  ],
  "Tyrande": [
    "Muradin",
    "Anub'arak",
    "Zeratul",
    "Maiev",
    "Fénix",
    "Lunara"
  ],
  "Tyraël": [
    "Garrosh",
    "ETC",
    "Zeratul",
    "Greymane"
  ],
  "Tychus": [
    "Anub'arak",
    "Johanna",
    "Lúcio"
  ],
  "Uther": [
    "Gul'dan",
    "Lúcio",
    "Malthaël",
    "Nasibo",
    "Sylvanas",
    "Zagara"
  ],
  "Valeera": [
    "ETC",
    "Arthas",
    "Medivh",
    "Lúcio"
  ],
  "Valla": [
    "Greymane",
    "Illidan",
    "Nova",
    "Le boucher",
    "Valeera",
    "Zeratul"
  ],
  "Varian": [
    "ETC",
    "Arthas",
    "Lunara",
    "Medivh",
    "Rehgar"
  ],
  "Xul": [
    "ETC",
    "Johanna",
    "Jaina",
    "Sgt. Marteau",
    "Auriel"
  ],
  "Yrel": [
    "ETC",
    "Johanna",
    "Lúcio",
    "Raynor"
  ],
  "Zagara": [
    "Illidan",
    "Falstad",
    "Chen",
    "Zeratul"
  ],
  "Zarya": [
    "Mal'Ganis",
    "Yrel",
    "Lunara",
    "Tassadar",
    "Auriel"
  ],
  "Zeratul": [
    "Brightwing",
    "Diablo",
    "Uther",
    "Varian",
    "ETC",
    "Medivh"
  ],
  "Zul'jin": [
    "ETC",
    "Diablo",
    "Dehaka",
    "Garrosh",
    "Uther"
  ]
};

const MAP_GOOD = {
  "Champs de l'Éternité": [
    "Alarak",
    "Anduin",
    "Artanis",
    "Arthas",
    "Deckard",
    "ETC",
    "Greymane",
    "Hanzo",
    "Impérius",
    "Kel'thuzad",
    "Li-Ming",
    "Lili",
    "Lt Morales",
    "Lúcio",
    "Lunara",
    "Mal'Ganis",
    "Malfurion",
    "Mei",
    "Mephisto",
    "Muradin",
    "Nasibo",
    "Raynor",
    "Samuro",
    "Sgt. Marteau",
    "Thrall",
    "Tyrande",
    "Valla",
    "Zarya"
  ],
  "Comté du dragon": [
    "Anub'arak",
    "Asmodan",
    "Auriel",
    "Brightwing",
    "Chacal",
    "Chen",
    "Dehaka",
    "Diablo",
    "Falstad",
    "Garrosh",
    "Greymane",
    "Gul'dan",
    "Hanzo",
    "Jaina",
    "Kael'thas",
    "Kerrigan",
    "Kharazim",
    "Lardeur",
    "Le boucher",
    "Lili",
    "Maiev",
    "Malthaël",
    "Nova",
    "Raynor",
    "Rexxar",
    "Samuro",
    "Sonya",
    "Thrall",
    "Tracer",
    "Tyrande",
    "Valeera",
    "Varian",
    "Yrel"
  ],
  "Fonderie de Volskaya": [],
  "Jardins de Terreur": [
    "Abathur",
    "Anub'arak",
    "Asmodan",
    "Auriel",
    "Bourbie",
    "Brightwing",
    "Chacal",
    "Chogall",
    "Genji",
    "Greymane",
    "Illidan",
    "Jaina",
    "Le boucher",
    "Les Vikings Perdus",
    "Maiev",
    "Mal'Ganis",
    "Malfurion",
    "Malthaël",
    "Mei",
    "Orphéa",
    "Rehgar",
    "Tassadar",
    "Varian",
    "Xul",
    "Zagara"
  ],
  "Laboratoire de Braxis": [
    "Aile-de-mort",
    "Chacal",
    "Chen",
    "Chromie",
    "Dehaka",
    "EDN-OS",
    "Falstad",
    "Fénix",
    "Garrosh",
    "Gazleu",
    "Genji",
    "Gul'dan",
    "Jaina",
    "Kael'thas",
    "Kel'thuzad",
    "Kerrigan",
    "Lt Morales",
    "Maiev",
    "Mal'Ganis",
    "Malfurion",
    "Mei",
    "Mephisto",
    "Rexxar",
    "Samuro",
    "Sgt. Marteau",
    "Sonya",
    "Stukov",
    "Sylvanas",
    "Tassadar",
    "Thrall",
    "Varian",
    "Yrel",
    "Zagara",
    "Zarya"
  ],
  "Menace nucléaire": [
    "Chacal",
    "Dehaka",
    "Falstad",
    "Gazleu",
    "Illidan",
    "Johanna",
    "Le boucher",
    "Les Vikings Perdus",
    "Malthaël",
    "Nova",
    "Orphéa",
    "Ragnaros",
    "Rehgar",
    "Tyraël",
    "Valeera",
    "Varian",
    "Zagara"
  ],
  "Mine hantée": [],
  "Passe d'Alterac": [
    "Abathur",
    "Aile-de-mort",
    "Anub'arak",
    "Chacal",
    "Deckard",
    "Dehaka",
    "EDN-OS",
    "Gazleu",
    "Gul'dan",
    "Impérius",
    "Johanna",
    "Kael'thas",
    "Kerrigan",
    "Kharazim",
    "Les Vikings Perdus",
    "Li-Ming",
    "Lúcio",
    "Mal'Ganis",
    "Malfurion",
    "Mei",
    "Mephisto",
    "Orphéa",
    "Samuro",
    "Sylvanas",
    "Zagara"
  ],
  "Tombe de la Reine araignée": [
    "Ana",
    "Anduin",
    "Balafré",
    "Chacal",
    "Chogall",
    "D.Va",
    "Diablo",
    "EDN-OS",
    "Fénix",
    "Garrosh",
    "Greymane",
    "Gul'dan",
    "Jaina",
    "Johanna",
    "Kael'thas",
    "Kerrigan",
    "Lardeur",
    "Le boucher",
    "Léoric",
    "Maiev",
    "Malthaël",
    "Ragnaros",
    "Raynor",
    "Rexxar",
    "Sonya",
    "Sylvanas",
    "Tassadar",
    "Tyrande",
    "Valla",
    "Xul"
  ],
  "Sanctuaires infernaux": [
    "Aile-de-mort",
    "Alexstrasza",
    "Anduin",
    "Asmodan",
    "Auriel",
    "Blanchetête",
    "Blaze",
    "Brightwing",
    "Chacal",
    "Chen",
    "Chogall",
    "D.Va",
    "Deckard",
    "Diablo",
    "EDN-OS",
    "Fénix",
    "Gazleu",
    "Genji",
    "Gul'dan",
    "Hanzo",
    "Impérius",
    "Jaina",
    "Johanna",
    "Kael'thas",
    "Kerrigan",
    "Lardeur",
    "Léoric",
    "Li-Ming",
    "Maiev",
    "Mal'Ganis",
    "Malfurion",
    "Malthaël",
    "Mei",
    "Mephisto",
    "Ragnaros",
    "Raynor",
    "Sgt. Marteau",
    "Sonya",
    "Tassadar",
    "Tyrande",
    "Tychus",
    "Uther",
    "Valla",
    "Xul",
    "Yrel",
    "Zeratul"
  ],
  "Temple céleste": [
    "Abathur",
    "Blaze",
    "Chacal",
    "Dehaka",
    "Gazleu",
    "Greymane",
    "Gul'dan",
    "Illidan",
    "Le boucher",
    "Les Vikings Perdus",
    "Mal'Ganis",
    "Malthaël",
    "Medivh",
    "Samuro",
    "Thrall",
    "Tracer",
    "Tracer",
    "Tyraël",
    "Valeera",
    "Xul",
    "Yrel",
    "Zagara",
    "Zeratul"
  ],
  "Temple d'Hanamura": [
    "Ana",
    "Artanis",
    "Balafré",
    "Chen",
    "Falstad",
    "Genji",
    "Kharazim",
    "Kharazim",
    "Lili",
    "Lt Morales",
    "Mal'Ganis",
    "Muradin",
    "Nova",
    "Orphéa",
    "Rehgar",
    "Thrall",
    "Varian",
    "Zarya"
  ],
  "Tours du destin": [
    "Abathur",
    "Alarak",
    "Ana",
    "Balafré",
    "Blanchetête",
    "Blaze",
    "Chacal",
    "D.Va",
    "Dehaka",
    "EDN-OS",
    "Falstad",
    "Garrosh",
    "Hanzo",
    "Impérius",
    "Johanna",
    "Kael'thas",
    "Kel'thuzad",
    "Lardeur",
    "Le boucher",
    "Léoric",
    "Les Vikings Perdus",
    "Lúcio",
    "Mal'Ganis",
    "Malthaël",
    "Orphéa",
    "Raynor",
    "Samuro",
    "Tracer",
    "Tyraël",
    "Tychus",
    "Varian",
    "Zagara",
    "Zeratul"
  ],
  "Val maudit": [
    "Abathur",
    "Anduin",
    "Anub'arak",
    "Asmodan",
    "Auriel",
    "Balafré",
    "Balafré",
    "Brightwing",
    "Chacal",
    "Deckard",
    "Dehaka",
    "Diablo",
    "Falstad",
    "Genji",
    "Hanzo",
    "Illidan",
    "Lardeur",
    "Léoric",
    "Les Vikings Perdus",
    "Li-Ming",
    "Lúcio",
    "Maiev",
    "Medivh",
    "Mei",
    "Mephisto",
    "Orphéa",
    "Rehgar",
    "Stukov",
    "Tracer",
    "Tyraël",
    "Tychus",
    "Valeera",
    "Xul",
    "Zagara",
    "Zeratul"
  ]
};

const MAP_BAD = {
  "Champs de l'Éternité": [
    "Abathur",
    "Alexstrasza",
    "Balafré",
    "Blanchetête",
    "Chogall",
    "D.Va",
    "Dehaka",
    "EDN-OS",
    "Illidan",
    "Johanna",
    "Le boucher",
    "Les Vikings Perdus",
    "Maiev",
    "Malthaël",
    "Medivh",
    "Orphéa",
    "Ragnaros",
    "Stukov",
    "Tassadar",
    "Varian",
    "Xul"
  ],
  "Comté du dragon": [
    "Artanis",
    "Arthas",
    "Blanchetête",
    "ETC",
    "Johanna",
    "Nova",
    "Tyraël"
  ],
  "Fonderie de Volskaya": [],
  "Jardins de Terreur": [
    "Ana",
    "Ana",
    "Arthas",
    "Chen",
    "Lt Morales",
    "Nova",
    "Sgt. Marteau",
    "Tyraël",
    "Zarya"
  ],
  "Laboratoire de Braxis": [
    "Abathur",
    "Alexstrasza",
    "Anduin",
    "Anub'arak",
    "Anub'arak",
    "Arthas",
    "Asmodan",
    "Auriel",
    "Blanchetête",
    "Bourbie",
    "Brightwing",
    "D.Va",
    "Diablo",
    "ETC",
    "Illidan",
    "Kharazim",
    "Le boucher",
    "Léoric",
    "Les Vikings Perdus",
    "Medivh",
    "Muradin",
    "Nova",
    "Rehgar",
    "Tyraël",
    "Uther",
    "Xul",
    "Zeratul"
  ],
  "Menace nucléaire": [
    "Ana",
    "Balafré",
    "Chen",
    "Chogall",
    "Deckard",
    "Diablo",
    "Hanzo",
    "Impérius",
    "Kael'thas",
    "Kel'thuzad",
    "Kerrigan",
    "Léoric",
    "Lunara",
    "Maiev",
    "Mal'Ganis",
    "Mei",
    "Mephisto",
    "Nasibo",
    "Sgt. Marteau",
    "Sylvanas",
    "Tychus",
    "Uther",
    "Zarya"
  ],
  "Mine hantée": [],
  "Passe d'Alterac": [
    "Artanis",
    "Kel'thuzad",
    "Lt Morales",
    "Sgt. Marteau"
  ],
  "Tombe de la Reine araignée": [
    "Abathur",
    "Anub'arak",
    "Asmodan",
    "Auriel",
    "Blanchetête",
    "Bourbie",
    "Brightwing",
    "ETC",
    "Genji",
    "Kharazim",
    "Les Vikings Perdus",
    "Lt Morales",
    "Mal'Ganis",
    "Muradin",
    "Rehgar",
    "Samuro",
    "Sgt. Marteau",
    "Thrall",
    "Tracer",
    "Tyraël",
    "Valeera",
    "Zeratul"
  ],
  "Sanctuaires infernaux": [
    "Alarak",
    "Artanis",
    "Muradin",
    "Tracer",
    "Tyraël",
    "Varian"
  ],
  "Temple céleste": [
    "Alarak",
    "Ana",
    "Asmodan",
    "Auriel",
    "Balafré",
    "Blanchetête",
    "Brightwing",
    "Diablo",
    "Léoric",
    "Lili",
    "Mei",
    "Nova",
    "Tychus",
    "Varian"
  ],
  "Temple d'Hanamura": [
    "Abathur",
    "Alexstrasza",
    "Asmodan",
    "Auriel",
    "Blanchetête",
    "Brightwing",
    "D.Va",
    "Deckard",
    "Deckard",
    "Dehaka",
    "Diablo",
    "Gazleu",
    "Impérius",
    "Johanna",
    "Lardeur",
    "Les Vikings Perdus",
    "Maiev",
    "Malthaël",
    "Mei",
    "Rehgar",
    "Samuro",
    "Tassadar",
    "Tyraël",
    "Xul",
    "Zagara"
  ],
  "Tours du destin": [
    "Artanis",
    "Chen",
    "Gazleu",
    "Illidan",
    "Nova",
    "Ragnaros"
  ],
  "Val maudit": [
    "Chen",
    "D.Va",
    "Samuro",
    "Tassadar",
    "Zarya"
  ]
};



function buildHeroDB() {
  const db = {};
  HERO_LIST.forEach((h) => {
    db[h] = {
      name: h,
      tier: TIER[h] || "B",
      role: BASE_ROLE[h] || "dps range auto attack",
      favMaps: Object.entries(MAP_GOOD)
        .filter(([_, arr]) => Array.isArray(arr) && arr.includes(h))
        .map(([m]) => m),
      badMaps: Object.entries(MAP_BAD)
        .filter(([_, arr]) => Array.isArray(arr) && arr.includes(h))
        .map(([m]) => m),
      synergies: SYNERGY[h] || [],
      counters: COUNTERS[h] || [],
    };
  });
  return db;
}

const ROLE_KEYS = [
  "guerrier defensif",
  "guerrier offensif",
  "healer",
  "dps melee",
  "dps range mage",
  "dps range auto attack",
];

function teamRoleCounts(names, DB) {
  const c = Object.fromEntries(ROLE_KEYS.map((k) => [k, 0]));
  names.forEach((n) => {
    const r = DB[n]?.role;
    if (r) c[r]++;
  });
  return c;
}

function meleeCount(names, DB) {
  return names.filter((n) => DB[n]?.role === "dps melee").length;
}

const MAX_BY_ROLE = {
  "guerrier defensif": 1,
  "guerrier offensif": 1,
  healer: 1,
  "dps melee": 1,
  "dps range mage": 1,
  "dps range auto attack": 1,
};

function computeScoreFor(hero, DB, state, opts = {}) {
  const { ignoreLocks = false, selfNeutralizeRole = false, sideForRole = "allies" } = opts;
  const H = DB[hero];
  if (!H) return -999;
  const picked = [...state.allies, ...state.enemies];
  const banned = [...state.bansAllies, ...state.bansEnemies];
  if (!ignoreLocks) {
    if (picked.includes(hero) || banned.includes(hero)) return -999;
  }
  let score = 10;
  score += TIER_BONUS[H.tier] ?? 0;

  const teamList = sideForRole === "enemies" ? state.enemies : state.allies;
  const oppList = sideForRole === "enemies" ? state.allies : state.enemies;
  const listForCount = selfNeutralizeRole
    ? teamList.filter((n) => n !== hero)
    : teamList;

  const counts = teamRoleCounts(listForCount, DB);
  const currentCount = counts[H.role] || 0;
  if (currentCount >= 1) score -= currentCount === 1 ? 1 : 2;
  if (H.role === "dps melee" && meleeCount(listForCount, DB) >= 1) score -= 2;
  if (currentCount >= (MAX_BY_ROLE[H.role] || 1)) score -= 3;

  if (state.map && H.favMaps.includes(state.map)) score += 1;
  if (state.map && H.badMaps.includes(state.map)) score -= 1;

  H.synergies.forEach((a) => {
    if (teamList.includes(a)) score += 1;
  });
  H.counters.forEach((e) => {
    if (oppList.includes(e)) score += 1.5;
  });
  oppList.forEach((e) => {
    const list = DB[e]?.counters || [];
    if (list.includes(hero)) score -= 1.5;
  });
  teamList.forEach((e) => {
    const syn = DB[e]?.synergies || [];
    if (syn.includes(hero)) score += 0.5;
  });

  return score;
}

function computeScore(hero, DB, state) {
  return computeScoreFor(hero, DB, state, { ignoreLocks: false });
}

function explainScore(hero, DB, state, opts = {}) {
  const { selfNeutralizeRole = false, sideForRole = "allies" } = opts;
  const H = DB[hero];
  if (!H) return [];
  const rows = [];
  rows.push({ label: "Base", delta: 10 });
  const tier = TIER_BONUS[H.tier] ?? 0;
  if (tier) rows.push({ label: `Tier ${H.tier}`, delta: tier });

  const teamList = sideForRole === "enemies" ? state.enemies : state.allies;
  const oppList = sideForRole === "enemies" ? state.allies : state.enemies;
  const listForCount = selfNeutralizeRole
    ? teamList.filter((n) => n !== hero)
    : teamList;

  const counts = teamRoleCounts(listForCount, DB);
  const currentCount = counts[H.role] || 0;
  if (currentCount >= 1)
    rows.push({
      label: `Rôle déjà présent (${H.role})`,
      delta: currentCount === 1 ? -1 : -2,
    });
  if (H.role === "dps melee" && meleeCount(listForCount, DB) >= 1)
    rows.push({ label: "Deuxième melee (éviter 2× melee)", delta: -2 });
  if (currentCount >= (MAX_BY_ROLE[H.role] || 1))
    rows.push({ label: "Slot de rôle déjà complet", delta: -3 });

  if (state.map && H.favMaps.includes(state.map))
    rows.push({ label: `Carte favorable (${state.map})`, delta: +1 });
  if (state.map && H.badMaps.includes(state.map))
    rows.push({ label: `Carte défavorable (${state.map})`, delta: -1 });

  H.synergies.forEach((a) => {
    if (teamList.includes(a))
      rows.push({ label: `Synergie avec ${a}`, delta: +1 });
  });
  H.counters.forEach((e) => {
    if (oppList.includes(e))
      rows.push({ label: `Contre ${e}`, delta: +1.5 });
  });
  oppList.forEach((e) => {
    const list = DB[e]?.counters || [];
    if (list.includes(hero))
      rows.push({ label: `Se fait contrer par ${e}`, delta: -1.5 });
  });
  teamList.forEach((e) => {
    const syn = DB[e]?.synergies || [];
    if (syn.includes(hero))
      rows.push({ label: `Bloque synergie adverse avec ${e}`, delta: +0.5 });
  });

  return rows;
}

const ROLE_META = {
  healer: {
    badge: "✚",
    cls: "bg-emerald-900/40 text-emerald-200 border-emerald-500/50",
  },
  "guerrier defensif": {
    badge: "🛡",
    cls: "bg-cyan-900/40 text-cyan-200 border-cyan-500/50",
  },
  "guerrier offensif": {
    badge: "⛨",
    cls: "bg-amber-900/40 text-amber-200 border-amber-500/50",
  },
  "dps melee": {
    badge: "⚔",
    cls: "bg-rose-900/40 text-rose-200 border-rose-500/50",
  },
  "dps range mage": {
    badge: "✦",
    cls: "bg-fuchsia-900/40 text-fuchsia-200 border-fuchsia-500/50",
  },
  "dps range auto attack": {
    badge: "➤",
    cls: "bg-indigo-900/40 text-indigo-200 border-indigo-500/50",
  },
};

function RoleChip({ role }) {
  const m = ROLE_META[role] || { badge: "•", cls: "bg-slate-800/40" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border ${m.cls}`}>
      <span>{m.badge}</span>
      {role}
    </span>
  );
}

function HeroInfoHover({ name, DB, children }) {
  const info = DB?.[name];
  if (!info) return <>{children}</>;
  return (
    <span className="relative group inline-block">
      {children}
      <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition absolute top-full left-0 mt-2 z-[999] rounded-2xl border border-indigo-700/40 bg-[#05070f] w-[300px] max-w-[92vw] p-4 text-[12px] shadow-2xl">
        <div className="font-semibold text-sm mb-3 text-indigo-300">{name}</div>
        <div className="flex flex-col text-[11px] text-left space-y-2">
          <div>
            <b><span className="text-indigo-400">Tier:</span></b> <span className="text-slate-200">{info.tier}</span>
          </div>
          <div>
            <b><span className="text-indigo-400">Rôle:</span></b> <span className="text-slate-200">{info.role}</span>
          </div>

          <div>
            <b><span className="text-emerald-400">Maps favorable:</span></b>
            <div className="text-slate-300 ml-2">{info.favMaps.join(", ") || "—"}</div>
          </div>

          <div>
            <b><span className="text-rose-400">Maps nulles:</span></b>
            <div className="text-slate-300 ml-2">{info.badMaps.join(", ") || "—"}</div>
          </div>

          <div>
            <b><span className="text-cyan-400">Synergies:</span></b>
            <div className="text-slate-300 ml-2">{info.synergies.join(", ") || "—"}</div>
          </div>

          <div>
            <b><span className="text-amber-400">Contre:</span></b>
            <div className="text-slate-300 ml-2">{info.counters.join(", ") || "—"}</div>
          </div>
        </div>
      </div>
    </span>
  );
}

function ScoreBadge({ value, breakdown }) {
  return (
    <span className="relative group inline-flex items-center">
      <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-950/70 border border-indigo-600/40">
        {value.toFixed(1)}
      </span>
      {breakdown && (
        <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-40 rounded-2xl border border-indigo-700/40 bg-[#05070f] w-[300px] max-w-[92vw] p-4 text-[12px] shadow-2xl">
          <div className="font-semibold text-sm mb-2">Détail du score</div>
          <ul className="space-y-1 max-h-64 overflow-auto pr-1">
            {breakdown.map((row, idx) => (
              <li key={idx} className="flex justify-between gap-3">
                <span className="opacity-80">{row.label}</span>
                <span className="font-mono">
                  {row.delta > 0 ? "+" : ""}
                  {row.delta.toFixed(2)}
                </span>
              </li>
            ))}
            <li className="flex justify-between gap-3 pt-1 mt-1 border-t border-slate-700">
              <span className="font-semibold">Total</span>
              <span className="font-mono font-bold">{value.toFixed(2)}</span>
            </li>
          </ul>
        </div>
      )}
    </span>
  );
}

function HeroCard({ name, role, score, breakdown, DB }) {
  return (
    <div className="group relative rounded-2xl bg-[#0a0e1a]/90 border border-slate-800 p-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-indigo-500/70 hover:bg-[#0c1222]">
      <div className="flex items-center justify-between">
        <HeroInfoHover name={name} DB={DB}>
          <div className="font-semibold text-sm truncate mr-2">{name}</div>
        </HeroInfoHover>
        <ScoreBadge value={score} breakdown={breakdown} />
      </div>
      <div className="mt-1 flex justify-start">
        <RoleChip role={role} />
      </div>
    </div>
  );
}

function ListBox({ title, items, onRemove, compact, DB, state, side = "allies" }) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-[#0a0e1a]/90 p-3 ${compact ? "py-2" : ""}`}>
      <div className="text-sm font-semibold mb-2">{title}</div>
      <div className={`flex flex-col ${compact ? "gap-1 min-h-[120px]" : "gap-2 min-h-[180px]"}`}>
        {items.map((h, i) => {
          const role = DB[h]?.role;
          const score = computeScoreFor(h, DB, state, {
            ignoreLocks: true,
            selfNeutralizeRole: true,
            sideForRole: side,
          });
          const breakdown = explainScore(h, DB, state, {
            selfNeutralizeRole: true,
            sideForRole: side,
          });
          return (
            <div key={h + String(i)} className={`flex items-center ${compact ? "gap-1 text-xs" : "gap-2 text-sm"}`}>
              <HeroInfoHover name={h} DB={DB}>
                <span className={`rounded-lg bg-slate-900/80 border border-slate-700 ${compact ? "px-2 py-0.5" : "px-2 py-1"}`}>
                  {h}
                </span>
              </HeroInfoHover>
              {role && (
                <span className="ml-1">
                  <RoleChip role={role} />
                </span>
              )}
              <ScoreBadge value={score} breakdown={breakdown} />
              <button
                onClick={() => onRemove(i)}
                className={`ml-auto ${compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"} rounded bg-slate-700 hover:bg-slate-600`}
              >
                Retirer
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddHeroInput({ placeholder, onAdd, disabled }) {
  const [value, setValue] = useState("");
  const submit = () => {
    if (!value) return;
    onAdd(value);
    setValue("");
  };
  return (
    <div className="flex gap-2 items-center mb-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        list="all-heroes"
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
      />
      <button
        onClick={submit}
        disabled={disabled}
        className="px-3 py-1 text-sm rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40"
      >
        OK
      </button>
      <datalist id="all-heroes">
        {HERO_LIST.map((h) => (
          <option key={h} value={h} />
        ))}
      </datalist>
    </div>
  );
}

function StatusChip({ label, state }) {
  const cls =
    state === "ok"
      ? "bg-emerald-900/40 text-emerald-200 border-emerald-600/40"
      : state === "warn"
        ? "bg-rose-900/40 text-rose-200 border-rose-600/40"
        : "bg-amber-900/40 text-amber-200 border-amber-600/40";
  const icon = state === "ok" ? "✔" : state === "warn" ? "⚠" : "…";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] ${cls}`}>
      <span>{icon}</span>
      {label}
    </span>
  );
}

function getCompositionStatus(allies, DB) {
  const c = teamRoleCounts(allies, DB);
  const defCount = c["guerrier defensif"];
  const offCount = c["guerrier offensif"];
  const healCount = c["healer"];

  const defOk = defCount >= 1;
  const offOk = offCount >= 1;
  const healOk = healCount >= 1;

  const defTooMany = defCount > 1;
  const offTooMany = offCount > 1;
  const healTooMany = healCount > 1;

  const dpsSlot1Ok = c["dps range mage"] + c["dps melee"] >= 1;
  const dpsSlot2Ok = c["dps range auto attack"] + c["dps melee"] >= 1;
  const noDoubleMelee = c["dps melee"] <= 1;

  return { defOk, offOk, healOk, defTooMany, offTooMany, healTooMany, dpsSlot1Ok, dpsSlot2Ok, noDoubleMelee };
}

function GlobalScores({ DB, state }) {
  const alliesScore = state.allies.reduce(
    (acc, h) =>
      acc +
      computeScoreFor(h, DB, state, {
        ignoreLocks: true,
        selfNeutralizeRole: true,
        sideForRole: "allies",
      }),
    0
  );
  const enemiesScore = state.enemies.reduce(
    (acc, h) =>
      acc +
      computeScoreFor(h, DB, state, {
        ignoreLocks: true,
        selfNeutralizeRole: true,
        sideForRole: "enemies",
      }),
    0
  );
  return (
    <div className="rounded-xl bg-[#0a0e1a]/80 border border-slate-800 p-3 flex items-center justify-center gap-6">
      <div className="text-sm opacity-70"></div>
      <div className="text-lg font-semibold">
        Alliés : <span className="text-emerald-300">{alliesScore.toFixed(1)}</span>
      </div>
      <div className="text-lg font-semibold">
        Adversaires : <span className="text-rose-300">{enemiesScore.toFixed(1)}</span>
      </div>
    </div>
  );
}

export default function DraftAssistant() {
  const DB = useMemo(() => buildHeroDB(), []);
  const [map, setMap] = useState(ALL_MAPS[0]);
  const [allies, setAllies] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [bansAllies, setBansAllies] = useState([]);
  const [bansEnemies, setBansEnemies] = useState([]);
  const [showHelp, setShowHelp] = useState(false);

  const state = { map, allies, enemies, bansAllies, bansEnemies };

  function addTo(setter, list, name, limit) {
    if (!HERO_LIST.includes(name)) return;
    if (list.includes(name)) return;
    if ([...allies, ...enemies, ...bansAllies, ...bansEnemies].includes(name)) return;
    if (limit && list.length >= limit) return;
    setter([...list, name]);
  }

  function removeFrom(setter, list, idx) {
    const copy = [...list];
    copy.splice(idx, 1);
    setter(copy);
  }

  function resetAll() {
    setAllies([]);
    setEnemies([]);
    setBansAllies([]);
    setBansEnemies([]);
    setMap(ALL_MAPS[0]);
  }

  const allyReco = useMemo(() => {
    return HERO_LIST.filter(
      (h) =>
        !allies.includes(h) &&
        !enemies.includes(h) &&
        !bansAllies.includes(h) &&
        !bansEnemies.includes(h)
    )
      .map((h) => ({
        name: h,
        role: DB[h].role,
        score: computeScore(h, DB, state),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [map, allies, enemies, bansAllies, bansEnemies, DB]);

  const enemyPotential = useMemo(() => {
    const mirrorState = {
      map,
      allies: enemies,
      enemies: allies,
      bansAllies: bansEnemies,
      bansEnemies: bansAllies,
    };
    return HERO_LIST.filter(
      (h) =>
        !allies.includes(h) &&
        !enemies.includes(h) &&
        !bansAllies.includes(h) &&
        !bansEnemies.includes(h)
    )
      .map((h) => ({
        name: h,
        role: DB[h].role,
        score: computeScoreFor(h, DB, mirrorState, { sideForRole: "allies" }),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [map, allies, enemies, bansAllies, bansEnemies, DB]);

  const comp = getCompositionStatus(allies, DB);

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(1200px_600px_at_50%_-200px,rgba(26,32,54,0.7),transparent)] bg-[#05070d] text-slate-100">
      <div className="sticky top-0 z-10 backdrop-blur bg-[#080c17]/90  border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-3">
          <div className="text-xl font-semibold">Draft Assistant</div>
          <div className="flex-1 text-sm text-center">
            Map:
            <select
              className="ml-2 bg-slate-900 border border-slate-700 rounded px-2 py-1"
              value={map}
              onChange={(e) => setMap(e.target.value)}
            >
              {ALL_MAPS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="text-sm rounded-lg bg-indigo-900/40 border border-indigo-700/40 px-3 py-1 hover:bg-indigo-800/50"
            >
              Scores
            </button>
            <button
              onClick={resetAll}
              className="text-sm rounded-lg bg-slate-800 border border-slate-700 px-3 py-1 hover:bg-slate-700"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-3 pb-3">
          <GlobalScores DB={DB} state={state} />
        </div>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowHelp(false)}
          />
          <div className="relative z-50 w-[680px] max-w-[92vw] rounded-2xl bg-[#0a0e1a] border border-slate-800 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Calcul des scores</div>
              <button
                onClick={() => setShowHelp(false)}
                className="text-sm rounded-md px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700"
              >
                Fermer
              </button>
            </div>
            <div className="text-sm leading-relaxed space-y-2">
              <p>Chaque héros démarre à 10, puis :</p>
              <ul className="list-disc ml-5 space-y-1 text-left">
                <li>Tier : S = +2, A = +1, B = 0, C = −1, D = −2</li>
                <li>Rôle déjà présent : −1 (−2 si déjà 2×). Si slot complet : −3.</li>
                <li>Carte : favorable +1, défavorable −1</li>
                <li>Contre un ennemi : +1.5 par cible</li>
                <li>Se fait contrer : −1.5 par héros qui le contre</li>
                <li>Synergies alliées : +1 par allié synergique</li>
                <li>Bloque une synergie ennemie : +0.5</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-4 p-4">
        {/* Colonne gauche */}
        <aside className="col-span-12 md:col-span-3 flex flex-col gap-3">
          <div className="rounded-2xl border border-slate-800 bg-[#0a0e1a]/90 p-3">
            <div className="text-sm font-semibold mb-2">Ban allié (3 max)</div>
            <AddHeroInput
              placeholder="Ajouter un ban…"
              onAdd={(v) => addTo(setBansAllies, bansAllies, v, 3)}
              disabled={bansAllies.length >= 3}
            />
            <ListBox
              items={bansAllies}
              onRemove={(i) => removeFrom(setBansAllies, bansAllies, i)}
              compact
              DB={DB}
              state={state}
              side="allies"
            />
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
            <div className="text-sm font-semibold mb-2">Picks alliés</div>
            <AddHeroInput
              placeholder="Ajouter un pick…"
              onAdd={(v) => addTo(setAllies, allies, v)}
            />
            <ListBox
              items={allies}
              onRemove={(i) => removeFrom(setAllies, allies, i)}
              DB={DB}
              state={state}
              side="allies"
            />
          </div>
        </aside>

        {/* Centre */}
        <main className="col-span-12 md:col-span-6 flex flex-col gap-4">
          <div className="rounded-xl bg-[#0a0e1a]/80 border border-slate-800 p-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusChip
                label="Guerrier défensif"
                state={!comp.defOk ? "need" : comp.defTooMany ? "warn" : "ok"}
              />
              <StatusChip
                label="Guerrier offensif"
                state={!comp.offOk ? "need" : comp.offTooMany ? "warn" : "ok"}
              />
              <StatusChip
                label="Healer"
                state={!comp.healOk ? "need" : comp.healTooMany ? "warn" : "ok"}
              />
              <StatusChip
                label="Mage OU Melee"
                state={!comp.dpsSlot1Ok ? "need" : !comp.noDoubleMelee ? "warn" : "ok"}
              />
              <StatusChip
                label="AA OU Melee"
                state={!comp.dpsSlot2Ok ? "need" : !comp.noDoubleMelee ? "warn" : "ok"}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0a0e1a]/80 p-3">
            <div className="text-sm font-semibold mb-3">Reco allié à pick</div>
            <div className="grid grid-cols-3 gap-3">
              {allyReco.map((r) => (
                <HeroCard
                  key={r.name}
                  name={r.name}
                  role={r.role}
                  score={r.score}
                  breakdown={explainScore(r.name, DB, state, { sideForRole: "allies" })}
                  DB={DB}
                />
              ))}
              {allyReco.length === 0 && (
                <div className="col-span-3 text-xs opacity-60">Aucun héros disponible</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
            <div className="text-sm font-semibold mb-3">
              Reco à ban (meilleurs picks potentiels pour l'adversaire)
            </div>
            <div className="grid grid-cols-3 gap-3">
              {enemyPotential.map((r) => (
                <HeroCard
                  key={r.name}
                  name={r.name}
                  role={r.role}
                  score={r.score}
                  breakdown={explainScore(
                    r.name,
                    DB,
                    {
                      map,
                      allies: enemies,
                      enemies: allies,
                      bansAllies: bansEnemies,
                      bansEnemies: bansAllies,
                    },
                    { sideForRole: "allies" }
                  )}
                  DB={DB}
                />
              ))}
              {enemyPotential.length === 0 && (
                <div className="col-span-3 text-xs opacity-60">
                  Aucun héros à ban suggéré
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Colonne droite */}
        <aside className="col-span-12 md:col-span-3 flex flex-col gap-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
            <div className="text-sm font-semibold mb-2">Ban adversaire (3 max)</div>
            <AddHeroInput
              placeholder="Ajouter un ban adverse…"
              onAdd={(v) => addTo(setBansEnemies, bansEnemies, v, 3)}
              disabled={bansEnemies.length >= 3}
            />
            <ListBox
              items={bansEnemies}
              onRemove={(i) => removeFrom(setBansEnemies, bansEnemies, i)}
              compact
              DB={DB}
              state={state}
              side="enemies"
            />
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
            <div className="text-sm font-semibold mb-2">Picks adverses</div>
            <AddHeroInput
              placeholder="Ajouter un pick adverse…"
              onAdd={(v) => addTo(setEnemies, enemies, v)}
            />
            <ListBox
              items={enemies}
              onRemove={(i) => removeFrom(setEnemies, enemies, i)}
              DB={DB}
              state={state}
              side="enemies"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}





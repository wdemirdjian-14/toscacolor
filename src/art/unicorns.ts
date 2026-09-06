import {
  VB_H,
  VB_W,
  circle,
  cloud,
  dot,
  ear,
  ellipse,
  flower,
  frame,
  group,
  happyEye,
  heart,
  hill,
  horn,
  openEye,
  page,
  path,
  rainbow,
  sparkles,
  star,
} from './shapes'

/** Une meche bouclee : un simple disque, mais empiles ils font une criniere. */
const curl = (x: number, y: number, r: number) => circle(x, y, r)

/**
 * Patte ouverte en haut : c'est le corps qui referme la zone. On evite ainsi
 * la barre horizontale disgracieuse en travers du ventre.
 */
function leg(x: number, ytop: number, w: number, ybot: number, lean = 0) {
  return path(
    `M ${x - w / 2},${ytop} L ${x - w / 2 + lean},${ybot - w * 0.45} ` +
      `Q ${x - w / 2 + lean},${ybot} ${x + lean},${ybot} ` +
      `Q ${x + w / 2 + lean},${ybot} ${x + w / 2 + lean},${ybot - w * 0.45} ` +
      `L ${x + w / 2},${ytop}`,
  ) + path(`M ${x - w / 2 + lean * 0.8},${ybot - w * 0.62} L ${x + w / 2 + lean * 0.8},${ybot - w * 0.62}`)
}

/**
 * Le visage de licorne, dessine autour de l'origine puis pose ou l'on veut.
 * Toutes les pages s'en servent : un seul endroit a retoucher pour changer
 * l'expression de la mascotte.
 */
function unicornFace(x: number, y: number, s: number, sleeping = false) {
  const eyes = sleeping
    ? [happyEye(-72, 16, 34, true), happyEye(72, 16, 34)]
    : [openEye(-72, 12, 36), openEye(72, 12, 36)]
  return group(
    [
      // criniere : les boucles passent derriere la tete, en dehors des oreilles
      curl(-170, -66, 44),
      curl(-198, 14, 48),
      curl(-178, 96, 42),
      curl(170, -66, 44),
      curl(198, 14, 48),
      curl(178, 96, 42),
      path(
        `M 0,150 C -100,150 -160,80 -160,0 C -160,-85 -95,-145 0,-145 ` +
          `C 95,-145 160,-85 160,0 C 160,80 100,150 0,150 Z`,
      ),
      ear(-100, -96, 60, 100, -26),
      ear(100, -96, 60, 100, 26),
      horn(0, -140, 70, 176),
      ...eyes,
      circle(-118, 66, 22),
      circle(118, 66, 22),
      ellipse(0, 98, 84, 50),
      dot(-22, 88, 8),
      dot(22, 88, 8),
      path(`M 0,108 Q -20,128 -40,116`),
      path(`M 0,108 Q 20,128 40,116`),
    ],
    `translate(${x} ${y}) scale(${s})`,
  )
}

// ---------------------------------------------------------------- 1. la tete

const tete = () =>
  page([
    frame(),
    sparkles([
      [140, 246, 26],
      [866, 288, 22],
      [500, 178, 18],
      [206, 986, 8],
      [800, 1020, 8],
    ]),
    unicornFace(500, 690, 1.32, true),
    flower(184, 1136, 84),
    flower(818, 1178, 74),
    heart(500, 1120, 78),
    star(316, 1290, 40),
    star(686, 1310, 36),
  ])

// ------------------------------------------------------- 2. licorne complete

const licorne = () =>
  page([
    frame(),
    hill(1190, 44),
    circle(196, 244, 88),
    cloud(772, 282, 300, 148),
    sparkles([
      [400, 190, 22],
      [128, 520, 18],
      [886, 566, 20],
    ]),
    // queue : des boucles posees sur la croupe
    group([curl(704, 890, 48), curl(752, 952, 42), curl(736, 1022, 34)]),
    // pattes : ouvertes en haut, c'est le corps qui referme la zone
    leg(372, 1000, 54, 1150),
    leg(628, 1000, 54, 1150),
    leg(450, 1010, 68, 1178),
    leg(550, 1010, 68, 1178),
    ellipse(500, 930, 172, 140),
    unicornFace(500, 650, 1, false),
    flower(150, 1270, 76),
    flower(856, 1298, 68),
    star(872, 1156, 34),
  ])

// ------------------------------------------------------------ 3. arc-en-ciel

const arcEnCiel = () =>
  page([
    frame(),
    sparkles([
      [180, 240, 26],
      [830, 220, 22],
      [500, 168, 18],
      [140, 620, 8],
      [880, 640, 8],
    ]),
    rainbow(500, 880, 400, 5, 66),
    cloud(215, 880, 330, 200),
    cloud(785, 880, 330, 200),
    cloud(500, 380, 260, 130),
    heart(360, 1160, 74),
    heart(500, 1220, 62),
    heart(640, 1160, 74),
    star(500, 1030, 46),
  ])

// -------------------------------------------------------- 4. cupcake licorne

const cupcake = () => {
  const ridges = [0, 1, 2, 3, 4].map((i) => {
    const x = 352 + i * 74
    return path(`M ${x},1000 L ${x - 18},1250`)
  })
  return page([
    frame(),
    sparkles([
      [160, 300, 24],
      [850, 340, 20],
      [180, 1150, 18],
      [840, 1160, 22],
    ]),
    // caissette
    path(`M 320,1000 L 680,1000 L 638,1268 Q 634,1296 604,1296 L 396,1296 Q 366,1296 362,1268 Z`),
    ...ridges,
    // glacage : trois bourrelets
    path(
      `M 306,1000 C 286,928 322,876 386,868 C 406,806 470,780 522,808 ` +
        `C 578,776 646,806 654,868 C 716,882 736,940 694,1000 Z`,
    ),
    path(`M 358,868 C 400,830 470,826 512,858`),
    path(`M 540,812 C 590,798 636,820 648,862`),
    ear(414, 872, 60, 96, -22),
    ear(596, 872, 60, 96, 22),
    horn(505, 800, 76, 196),
    happyEye(430, 940, 40),
    happyEye(580, 940, 40, true),
    circle(384, 972, 26),
    circle(626, 972, 26),
    path(`M 480,976 Q 505,1002 530,976`),
    // vermicelles
    group(
      [
        [370, 700, 20],
        [640, 690, -30],
        [500, 640, 10],
        [270, 900, 50],
        [740, 930, -40],
      ].map(([x, y, r]) => ellipse(x, y, 26, 11, r)),
    ),
    star(500, 520, 54),
  ])
}

// ------------------------------------------------------------- 5. le chateau

const chateau = () => {
  const tower = (x: number, top: number, w: number, roof: number) =>
    group([
      path(`M ${x - w / 2},1160 L ${x - w / 2},${top} L ${x + w / 2},${top} L ${x + w / 2},1160 Z`),
      path(`M ${x - w / 2 - 22},${top} L ${x},${top - roof} L ${x + w / 2 + 22},${top} Z`),
      path(`M ${x},${top - roof} L ${x},${top - roof - 54} L ${x + 78},${top - roof - 32} L ${x},${top - roof - 12} Z`),
      circle(x, 880, 30),
    ])
  return page([
    frame(),
    hill(1150, 40),
    cloud(230, 300, 280, 140),
    cloud(790, 380, 240, 120),
    circle(760, 210, 74),
    sparkles([
      [140, 560, 20],
      [880, 600, 18],
      [500, 240, 16],
    ]),
    tower(268, 760, 150, 130),
    tower(732, 760, 150, 130),
    tower(500, 640, 190, 160),
    // corps du chateau
    path(`M 343,1160 L 343,900 L 657,900 L 657,1160 Z`),
    // porte
    path(`M 440,1160 L 440,1020 Q 500,952 560,1020 L 560,1160 Z`),
    path(`M 500,1160 L 500,986`),
    dot(534, 1080, 12),
    // fenetres du corps
    path(`M 386,1000 L 386,940 Q 412,912 438,940 L 438,1000 Z`),
    path(`M 562,1000 L 562,940 Q 588,912 614,940 L 614,1000 Z`),
    flower(150, 1250, 60),
    flower(860, 1270, 56),
    star(500, 400, 40),
  ])
}

// -------------------------------------------------------- 6. la lune et l'etoile

const lune = () =>
  page([
    frame(),
    // croissant ferme
    path(
      `M 470,300 C 250,340 130,540 190,760 C 250,980 470,1090 660,1010 ` +
        `C 470,1000 330,860 330,660 C 330,470 400,350 470,300 Z`,
    ),
    happyEye(300, 620, 40, true),
    circle(268, 706, 28),
    path(`M 316,690 Q 340,714 366,694`),
    star(720, 420, 116),
    star(830, 700, 62),
    star(700, 900, 46),
    sparkles([
      [180, 240, 26],
      [880, 260, 20],
      [150, 1000, 22],
      [860, 1080, 26],
      [520, 1180, 34],
      [300, 1240, 8],
      [740, 1210, 8],
    ]),
    cloud(300, 1150, 300, 150),
    heart(760, 1180, 62),
  ])

// ------------------------------------------------- 7. licorne endormie sur un nuage

const dodo = () =>
  page([
    frame(),
    star(196, 268, 62),
    star(838, 330, 46),
    star(704, 186, 34),
    sparkles([
      [136, 540, 20],
      [884, 578, 18],
      [430, 208, 8],
    ]),
    // ZZZ
    path(`M 690,470 L 782,470 L 690,566 L 782,566 Z`),
    path(`M 800,340 L 868,340 L 800,412 L 868,412 Z`),
    // le gros nuage porteur
    cloud(500, 1010, 760, 400),
    // la licorne roulee en boule dessus
    group([curl(672, 812, 52), curl(722, 878, 44)]),
    ellipse(560, 902, 158, 108, -6),
    unicornFace(430, 790, 0.78, true),
    heart(216, 1268, 54),
    heart(806, 1292, 48),
  ])

// ------------------------------------------------------------ 8. jardin magique

const jardin = () => {
  const stem = (x: number, y: number, bend: number) =>
    path(`M ${x - 14},1300 C ${x - 14 + bend},${y + 180} ${x - 14 + bend},${y + 60} ${x - 14},${y} ` +
      `L ${x + 14},${y} C ${x + 14 + bend},${y + 60} ${x + 14 + bend},${y + 180} ${x + 14},1300 Z`)
  const leaf = (x: number, y: number, rot: number) =>
    group(
      [path(`M 0,0 C 60,-46 132,-30 150,0 C 132,30 60,46 0,0 Z`), path(`M 12,0 L 132,0`)],
      `translate(${x} ${y}) rotate(${rot})`,
    )
  return page([
    frame(),
    hill(1290, 26),
    cloud(760, 250, 280, 140),
    circle(210, 230, 84),
    stem(320, 560, -60),
    stem(500, 420, 0),
    stem(690, 600, 55),
    leaf(334, 900, 200),
    leaf(486, 800, -20),
    leaf(676, 940, -10),
    flower(320, 560, 150, 6),
    flower(500, 420, 176, 8),
    flower(690, 600, 140, 5),
    // papillon
    group([
      path(`M 0,0 C -70,-80 -140,-40 -96,26 C -66,70 -18,40 0,0 Z`),
      path(`M 0,0 C 70,-80 140,-40 96,26 C 66,70 18,40 0,0 Z`),
      ellipse(0, 6, 15, 46),
      path(`M -8,-38 L -40,-84`),
      path(`M 8,-38 L 40,-84`),
    ], 'translate(830 880) rotate(12)'),
    sparkles([
      [140, 640, 22],
      [880, 470, 18],
      [430, 210, 20],
    ]),
    star(120, 1080, 36),
  ])
}

// ---------------------------------------------------- 9. la baguette magique

const baguette = () =>
  page([
    frame(),
    // manche
    path(`M 470,1230 L 530,1230 L 596,700 L 404,700 Z`),
    path(`M 434,940 L 566,940`),
    path(`M 452,820 L 548,820`),
    // etoile au bout
    star(500, 560, 250),
    star(500, 560, 130),
    // rubans
    path(
      `M 404,700 C 300,760 258,880 300,980 C 322,1032 372,1044 396,1006 ` +
        `C 366,982 358,930 396,860 C 420,816 424,760 404,700 Z`,
    ),
    path(
      `M 596,700 C 700,760 742,880 700,980 C 678,1032 628,1044 604,1006 ` +
        `C 634,982 642,930 604,860 C 580,816 576,760 596,700 Z`,
    ),
    heart(190, 1120, 76),
    heart(810, 1120, 76),
    heart(500, 1330, 54),
    sparkles([
      [160, 300, 30],
      [840, 300, 30],
      [250, 700, 22],
      [750, 700, 22],
      [500, 170, 24],
      [120, 900, 8],
      [880, 900, 8],
    ]),
  ])

// ------------------------------------------------------ 10. licorne dans la tasse

const tasse = () =>
  page([
    frame(),
    // vapeur
    path(`M 380,340 C 330,270 430,240 386,170 C 366,140 380,120 410,116 C 372,150 452,190 420,250 C 400,290 400,320 414,352 Z`),
    path(`M 620,360 C 570,290 670,260 626,190 C 606,160 620,140 650,136 C 612,170 692,210 660,270 C 640,310 640,340 654,372 Z`),
    // tete de licorne qui depasse de la tasse
    unicornFace(500, 706, 0.98, true),
    // tasse
    path(`M 268,860 L 732,860 L 690,1180 Q 684,1226 636,1226 L 364,1226 Q 316,1226 310,1180 Z`),
    path(`M 268,860 L 732,860`),
    // anse
    path(`M 726,920 C 830,912 862,1010 800,1078 C 776,1104 748,1108 736,1090 C 792,1042 792,966 722,972 Z`),
    // soucoupe
    path(`M 220,1256 L 780,1256 Q 760,1330 700,1330 L 300,1330 Q 240,1330 220,1256 Z`),
    heart(360, 920, 44),
    heart(640, 920, 44),
    sparkles([
      [160, 480, 24],
      [850, 440, 20],
      [180, 1120, 18],
      [830, 1180, 22],
    ]),
  ])

export type Level = 'facile' | 'moyen'

export interface Coloring {
  id: string
  title: string
  level: Level
  svg: () => string
}

export const UNICORN_PAGES: Coloring[] = [
  { id: 'tete', title: 'Tête de licorne', level: 'facile', svg: tete },
  { id: 'arc', title: 'Arc-en-ciel', level: 'facile', svg: arcEnCiel },
  { id: 'cupcake', title: 'Cupcake licorne', level: 'facile', svg: cupcake },
  { id: 'lune', title: 'La lune et les étoiles', level: 'facile', svg: lune },
  { id: 'baguette', title: 'Baguette magique', level: 'facile', svg: baguette },
  { id: 'licorne', title: 'Licorne dans le pré', level: 'moyen', svg: licorne },
  { id: 'dodo', title: 'Dodo sur un nuage', level: 'moyen', svg: dodo },
  { id: 'chateau', title: 'Le château', level: 'moyen', svg: chateau },
  { id: 'jardin', title: 'Jardin magique', level: 'moyen', svg: jardin },
  { id: 'tasse', title: 'Licorne dans la tasse', level: 'moyen', svg: tasse },
]

export { VB_W, VB_H }

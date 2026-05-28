/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MoonPhaseData {
  index: number;
  nameKey: string;
  icon: string;
  angleDeg: number; // 在月球轨道上的角度位置 (0-360)
  knowledgeZh: string;
  knowledgeEn: string;
  poetry: {
    title: string;
    titleEn: string;
    dynasty: string;
    dynastyEn: string;
    author: string;
    authorEn: string;
    lines: string[];
    linesEn: string[];
  };
}

export const MOON_PHASES: MoonPhaseData[] = [
  {
    index: 0,
    nameKey: "phase_new",
    icon: "🌑",
    angleDeg: 0,
    knowledgeZh:
      "新月时，月球位于太阳和地球之间，亮面完全朝向太阳，暗面朝向地球。此时肉眼几乎看不到月亮，是观测深空天体的最佳时机，因为月光干扰最小。新月也是农历每月初一，古人以此作为月份的开端。",
    knowledgeEn:
      "During the New Moon, the Moon is positioned between the Sun and Earth. Its illuminated side faces the Sun while the dark side faces Earth. The Moon is nearly invisible to the naked eye, making this the best time for deep-sky observation as moonlight interference is minimal. The New Moon marks the first day of each lunar month.",
    poetry: {
      title: "望月怀远",
      titleEn: "Gazing at the Moon from Afar",
      dynasty: "唐",
      dynastyEn: "Tang",
      author: "张九龄",
      authorEn: "Zhang Jiuling",
      lines: [
        "海上生明月，天涯共此时。",
        "情人怨遥夜，竟夕起相思。",
      ],
      linesEn: [
        "The bright moon rises from the sea,",
        "We share this moment though far apart.",
      ],
    },
  },
  {
    index: 1,
    nameKey: "phase_waxing_crescent",
    icon: "🌒",
    angleDeg: 45,
    knowledgeZh:
      '峨眉月是月相周期的第二阶段，呈现镰刀般的弯月形状。此时月球逐渐远离太阳，傍晚时分在西方低空可见一弯细月。古人称之为「新月如钩」，常用于诗词中寄托思念之情。',
    knowledgeEn:
      "The Waxing Crescent is the second phase of the lunar cycle, appearing as a slender sickle-shaped moon. As the Moon gradually moves away from the Sun, a thin crescent becomes visible low in the western sky after sunset. Ancient poets called it the 'new moon like a hook,' often using it as a symbol of longing.",
    poetry: {
      title: "暮江吟",
      titleEn: "Evening River Song",
      dynasty: "唐",
      dynastyEn: "Tang",
      author: "白居易",
      authorEn: "Bai Juyi",
      lines: [
        "可怜九月初三夜，",
        "露似真珠月似弓。",
      ],
      linesEn: [
        "How lovely is the night of early September,",
        "Dewdrops like pearls, the moon like a bow.",
      ],
    },
  },
  {
    index: 2,
    nameKey: "phase_first_quarter",
    icon: "🌓",
    angleDeg: 90,
    knowledgeZh:
      "上弦月时，月球的右半边被太阳照亮，呈现完美的半圆形。此时月球与太阳在天空中的夹角约为90度，因此上弦月通常在中午升起、午夜落下，傍晚时分位于南方天空最高处。",
    knowledgeEn:
      "During the First Quarter, the right half of the Moon is illuminated by the Sun, forming a perfect semicircle. The Moon and Sun are separated by about 90 degrees in the sky, so the First Quarter Moon rises around noon and sets around midnight, reaching its highest point in the southern sky in the evening.",
    poetry: {
      title: "八月十五日夜",
      titleEn: "The Night of the Mid-Autumn Moon",
      dynasty: "唐",
      dynastyEn: "Tang",
      author: "张祜",
      authorEn: "Zhang Hu",
      lines: [
        "万里清光不可思，添愁益恨绕天涯。",
        "谁人陇外久征戍，何处庭前新别离。",
      ],
      linesEn: [
        "The clear moonlight stretches ten thousand miles,",
        "Adding sorrow and longing across the world.",
      ],
    },
  },
  {
    index: 3,
    nameKey: "phase_waxing_gibbous",
    icon: "🌔",
    angleDeg: 135,
    knowledgeZh:
      "盈凸月是满月前的过渡阶段，月球亮面超过一半但尚未圆满。此时月球表面的环形山、月海等地形在侧向光照下呈现出强烈的立体感，是观测月球地貌细节的绝佳时机。",
    knowledgeEn:
      "The Waxing Gibbous is the transitional phase before Full Moon, with more than half but not yet the entire disk illuminated. The lunar surface features such as craters and maria stand out dramatically under oblique lighting, making this an excellent time for observing lunar topography details.",
    poetry: {
      title: "水调歌头",
      titleEn: "Prelude to Water Melody",
      dynasty: "宋",
      dynastyEn: "Song",
      author: "苏轼",
      authorEn: "Su Shi",
      lines: [
        "明月几时有？把酒问青天。",
        "不知天上宫阙，今夕是何年。",
      ],
      linesEn: [
        "How often does the bright moon appear?",
        "I raise my wine cup to ask the blue sky.",
      ],
    },
  },
  {
    index: 4,
    nameKey: "phase_full",
    icon: "🌕",
    angleDeg: 180,
    knowledgeZh:
      "满月时，月球位于地球背向太阳的一侧，整个亮面完全朝向地球。满月是夜空中最亮的天体之一，平均视星等约-12.7等。中秋节、元宵节等传统节日都以满月为标志，象征团圆和圆满。",
    knowledgeEn:
      "During the Full Moon, the Moon is on the opposite side of Earth from the Sun, with its entire illuminated face visible from Earth. It is one of the brightest objects in the night sky with an apparent magnitude of about -12.7. Traditional festivals like the Mid-Autumn Festival and Lantern Festival are celebrated during the Full Moon, symbolizing reunion and completeness.",
    poetry: {
      title: "静夜思",
      titleEn: "Quiet Night Thoughts",
      dynasty: "唐",
      dynastyEn: "Tang",
      author: "李白",
      authorEn: "Li Bai",
      lines: [
        "床前明月光，疑是地上霜。",
        "举头望明月，低头思故乡。",
      ],
      linesEn: [
        "Before my bed, bright moonlight glows,",
        "I wonder if it's frost upon the ground.",
        "I raise my head to gaze at the bright moon,",
        "I lower my head and think of my hometown.",
      ],
    },
  },
  {
    index: 5,
    nameKey: "phase_waning_gibbous",
    icon: "🌖",
    angleDeg: 225,
    knowledgeZh:
      "亏凸月是满月后的过渡阶段，月球亮面从圆满逐渐消退。此时从地球看去，月球的左上部开始出现阴影。亏凸月在子夜前后升起，清晨时分仍可在西方天空看到。",
    knowledgeEn:
      "The Waning Gibbous is the transitional phase after Full Moon, as the illuminated portion gradually shrinks. A shadow begins to appear on the upper left of the lunar disk as seen from Earth. The Waning Gibbous rises around midnight and can still be seen in the western sky in the early morning.",
    poetry: {
      title: "月夜",
      titleEn: "Moonlit Night",
      dynasty: "唐",
      dynastyEn: "Tang",
      author: "刘方平",
      authorEn: "Liu Fangping",
      lines: [
        "更深月色半人家，北斗阑干南斗斜。",
        "今夜偏知春气暖，虫声新透绿窗纱。",
      ],
      linesEn: [
        "Deep in the night, moonlight fills half the house,",
        "The Big Dipper turns, the Southern Dipper tilts.",
      ],
    },
  },
  {
    index: 6,
    nameKey: "phase_last_quarter",
    icon: "🌗",
    angleDeg: 270,
    knowledgeZh:
      "下弦月时，月球的左半边被太阳照亮。此时月球与太阳的夹角再次约为90度，但位于太阳的另一侧。下弦月通常在子夜升起、中午落下，清晨时分位于南方天空最高处。",
    knowledgeEn:
      "During the Last Quarter, the left half of the Moon is illuminated. The Moon and Sun are again separated by about 90 degrees, but on the opposite side from the First Quarter. The Last Quarter rises around midnight and sets around noon, reaching its highest point in the southern sky in the early morning.",
    poetry: {
      title: "枫桥夜泊",
      titleEn: "Mooring by Maple Bridge at Night",
      dynasty: "唐",
      dynastyEn: "Tang",
      author: "张继",
      authorEn: "Zhang Ji",
      lines: [
        "月落乌啼霜满天，江枫渔火对愁眠。",
        "姑苏城外寒山寺，夜半钟声到客船。",
      ],
      linesEn: [
        "The moon sets, crows cry under frosty skies,",
        "River maples and fishing lights face my sleepless sorrow.",
      ],
    },
  },
  {
    index: 7,
    nameKey: "phase_waning_crescent",
    icon: "🌘",
    angleDeg: 315,
    knowledgeZh:
      "残月是月相周期的最后阶段，呈现一弯细月。此时月球逐渐接近太阳，在黎明前的东方低空可见。残月之后，月球重新回到新月位置，开始新的月相周期。整个月相周期平均为29.53天，称为朔望月。",
    knowledgeEn:
      "The Waning Crescent is the final phase of the lunar cycle, appearing as a thin crescent. As the Moon approaches the Sun again, it becomes visible low in the eastern sky before dawn. After the Waning Crescent, the Moon returns to the New Moon position, beginning a new cycle. The complete lunar phase cycle averages 29.53 days, known as a synodic month.",
    poetry: {
      title: "相见欢",
      titleEn: "Joy of Meeting",
      dynasty: "五代",
      dynastyEn: "Five Dynasties",
      author: "李煜",
      authorEn: "Li Yu",
      lines: [
        "无言独上西楼，月如钩。",
        "寂寞梧桐深院锁清秋。",
      ],
      linesEn: [
        "Silently I ascend the western tower alone,",
        "The moon like a hook.",
        "A lonely parasol tree in a deep courtyard,",
        "Locked in clear autumn.",
      ],
    },
  },
];

/** 获取月相名称 */
export function getMoonPhaseName(index: number, lang: 'zh' | 'en'): string {
  const phase = MOON_PHASES[index];
  if (!phase) return '';
  // nameKey 对应 i18n 中的翻译键
  return phase.nameKey;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// 星体介绍面板数据定义
// 为所有太阳系天体提供丰富的科普内容：翻转卡片、生活对比、冷知识等
// ============================================================================

export interface StatCard {
  emoji: string;
  value: string;
  unit: string;
  label: string;
  tip?: string;
}

export interface FlipCard {
  front: {
    emoji: string;
    question: string;
    hint?: string;
  };
  back: {
    emoji: string;
    answer: string;
    explanation: string;
    wowFactor: string;
  };
}

export interface ComparisonCard {
  emoji: string;
  question: string;
  comparison: string;
  relatable: string;
  reaction: string;
}

export interface FunFact {
  emoji: string;
  fact: string;
  extra?: string;
}

export interface ImagineEffect {
  emoji: string;
  text: string;
}

export interface ImagineCard {
  scenario: string;
  effects: ImagineEffect[];
}

export interface CelestialProfile {
  id: string;
  iconEmoji: string;
  title: { zh: string; en: string };
  tagline: { zh: string; en: string };
  stats: StatCard[];
  flipCards: FlipCard[];
  comparisons: ComparisonCard[];
  funFacts: FunFact[];
  imagine: ImagineCard;
}

// =============================================================================
// 太阳系星体科普档案 —— 写给8-14岁小朋友的天文知识宝库
// =============================================================================

export const CELESTIAL_PROFILES: Record<string, CelestialProfile> = {
  // ==========================================================================
  // 1. 太阳 ☀️
  // ==========================================================================
  sun: {
    id: "sun",
    iconEmoji: "☀️",
    title: { zh: "太阳", en: "Sun" },
    tagline: {
      zh: "太阳系的超级大灯泡，没有它就没有我们！",
      en: "The super spotlight of the solar system — without it, no us!",
    },
    stats: [
      {
        emoji: "🌡️",
        value: "5500",
        unit: "°C",
        label: "表面温度",
        tip: "核心温度高达1500万°C，比表面热几千倍！",
      },
      {
        emoji: "📏",
        value: "139",
        unit: "万公里",
        label: "直径",
        tip: "可以并排放下109个地球！",
      },
      {
        emoji: "⚖️",
        value: "33",
        unit: "万倍地球",
        label: "质量",
        tip: "太阳系99.86%的质量都在太阳身上！",
      },
      {
        emoji: "💡",
        value: "8.3",
        unit: "光分",
        label: "光到地球",
        tip: "光从太阳出发，8分20秒后才能到达你眼中——所以小心！我们看到的太阳是它 8 分钟前的模样！",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "🎨",
          question: "太阳真正的颜色是什么？",
          hint: "不是黄色也不是红色哦~",
        },
        back: {
          emoji: "⚪",
          answer: "白色！",
          explanation:
            "太阳其实是白色的！我们看起来黄黄的，是因为地球大气把蓝光散射掉了，就像给太阳加了一层暖色滤镜。",
          wowFactor: "在太空中看，太阳就像一颗超级亮的白炽灯球！",
        },
      },
      {
        front: {
          emoji: "🚶",
          question: "如果能在太阳表面走路，会发生什么？",
          hint: "先别说热，还有更神奇的事...",
        },
        back: {
          emoji: "🪶",
          answer: "你会变轻28倍！",
          explanation:
            "太阳表面的重力只有地球的1/28。一个60斤的小朋友，在上面只相当于2斤重！",
          wowFactor: "≈ 像一只小猫那么轻，轻轻一跳就能飞起来！",
        },
      },
      {
        front: {
          emoji: "🔥",
          question: "太阳是怎么燃烧的？需要氧气吗？",
          hint: "太空里可没有空气哦~",
        },
        back: {
          emoji: "⚛️",
          answer: "不用氧气，它在玩'核聚变'！",
          explanation:
            "太阳不是靠火烧，而是把氢原子压成氦原子，像无数颗微型氢弹在内部不断爆炸，释放出巨大能量。",
          wowFactor: "≈ 每秒爆炸400万吨物质，够地球用几百万年！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🚗",
        question: "开车绕太阳一圈要多久？",
        comparison: "以100km/h绕赤道开",
        relatable: "≈ 需要连续开5年多，不吃不喝不休息！",
        reaction: "😱",
      },
      {
        emoji: "🎈",
        question: "太阳能装下多少个地球？",
        comparison: "像往大箱子里塞小球",
        relatable: "≈ 130万个地球才能填满一个太阳！",
        reaction: "🤯",
      },
    ],
    funFacts: [
      {
        emoji: "🌌",
        fact: "太阳其实是一颗很普通的恒星，宇宙中比它大得多的恒星数不胜数。",
        extra: "但在我们眼里，它是最特别的！",
      },
      {
        emoji: "🌊",
        fact: "太阳也会'打喷嚏'——太阳耀斑和日冕物质抛射，一次喷出的物质比地球还重！",
      },
      {
        emoji: "⏳",
        fact: "太阳已经46亿岁了，目前正值'中年'，还能再燃烧约50亿年。",
        extra: "到时候它会变成一颗红巨星，地球可能会被吞掉...",
      },
      {
        emoji: "🌪️",
        fact: "太阳表面有超级风暴，风速可达每秒几百公里，比地球上的飓风快100倍！",
      },
    ],
    imagine: {
      scenario: "假如你在太阳上...",
      effects: [
        { emoji: "🕶️", text: "你必须戴超级墨镜，因为亮度是地球的几十万倍" },
        { emoji: "🪶", text: "你轻得像一片羽毛，走路像在月球上飘" },
        { emoji: "🔥", text: "哪怕只是靠近，你也会瞬间变成一缕青烟（所以只能在想象中游玩！）" },
        { emoji: "🎵", text: "如果太阳会唱歌，它的'太阳震'声音比钢琴最低音还要低几万倍" },
      ],
    },
  },

  // ==========================================================================
  // 2. 水星 ☿️
  // ==========================================================================
  mercury: {
    id: "mercury",
    iconEmoji: "☿️",
    title: { zh: "水星", en: "Mercury" },
    tagline: {
      zh: "离太阳最近的'飞毛腿'，却有个超级慢的秘密！",
      en: "The closest planet to the Sun, with a surprisingly slow secret!",
    },
    stats: [
      {
        emoji: "🌡️",
        value: "-173~427",
        unit: "°C",
        label: "昼夜温差",
        tip: "白天热到融化铅，晚上冷到冻僵氮气！",
      },
      {
        emoji: "📏",
        value: "4879",
        unit: "公里",
        label: "直径",
        tip: "只比月球大一点点~",
      },
      {
        emoji: "💡",
        value: "3.2",
        unit: "光分",
        label: "距太阳光程",
        tip: "光从太阳出发，只需 3 分 13 秒就能到达水星——你数到200还没到地球呢！",
      },
      {
        emoji: "⏱️",
        value: "88",
        unit: "天",
        label: "公转周期",
        tip: "绕太阳一圈只要3个月！",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "🐢",
          question: "水星上一天有多长？",
          hint: "比它的一年还长哦！",
        },
        back: {
          emoji: "⏳",
          answer: "176个地球日！",
          explanation:
            "水星自转超级慢，转一圈要58天，而绕太阳公转只要88天。更神奇的是，因为一种叫'自转-公转共振'的现象，水星上的一天（太阳两次升起之间）居然长达176天！",
          wowFactor: "≈ 在水星上，你的一年只过了2天！",
        },
      },
      {
        front: {
          emoji: "❄️",
          question: "水星上竟然有冰？！",
          hint: "离太阳这么近，怎么可能？",
        },
        back: {
          emoji: "🧊",
          answer: "没错！在永远晒不到太阳的陨石坑底部！",
          explanation:
            "水星两极有一些深坑，坑壁像围墙一样挡住了阳光，底部永远处于黑暗中，温度低到可以保存冰层。",
          wowFactor: "≈ 就像把冰淇淋放在保温箱最深处，永远化不掉！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🏃",
        question: "水星绕太阳跑得多快？",
        comparison: "每秒跑48公里",
        relatable: "≈ 比高铁快500倍，1分钟就能从北京跑到上海！",
        reaction: "😲",
      },
      {
        emoji: "🌙",
        question: "水星和月亮谁大？",
        comparison: "直径只比月球大38%",
        relatable: "≈ 如果你见过满月，水星也就大那么一圈",
        reaction: "🤔",
      },
    ],
    funFacts: [
      {
        emoji: "📜",
        fact: "古人早就发现了水星，因为它总是在太阳附近出没，所以叫'水星'，但其实上面一滴水都没有！",
      },
      {
        emoji: "🌑",
        fact: "水星几乎没有大气层，所以天空永远是黑色的，即使在白天也能看到星星！",
      },
      {
        emoji: "🗺️",
        fact: "水星表面坑坑洼洼，看起来和月球很像，因为它被陨石砸了几十亿年。",
      },
      {
        emoji: "🌡️",
        fact: "水星是太阳系中温差最大的行星，白天和晚上的温差超过600°C！",
      },
    ],
    imagine: {
      scenario: "假如你在水星上...",
      effects: [
        { emoji: "🌅", text: "你会看到太阳变得超级大，比地球上大3倍！" },
        { emoji: "🌑", text: "天空是漆黑的，星星在白天也闪闪发光" },
        { emoji: "🥶", text: "站在阴影里瞬间冻僵，走到阳光下瞬间烤熟" },
        { emoji: "⏳", text: "等一次日出要等88天，看完日出又等88天看日落" },
      ],
    },
  },

  // ==========================================================================
  // 3. 金星 ♀️
  // ==========================================================================
  venus: {
    id: "venus",
    iconEmoji: "♀️",
    title: { zh: "金星", en: "Venus" },
    tagline: {
      zh: "地球的'邪恶双胞胎'，美丽外表下藏着地狱！",
      en: "Earth's evil twin — beautiful on the outside, hellish within!",
    },
    stats: [
      {
        emoji: "🌡️",
        value: "462",
        unit: "°C",
        label: "表面温度",
        tip: "比水星还热，是太阳系最热的行星！",
      },
      {
        emoji: "📏",
        value: "12104",
        unit: "公里",
        label: "直径",
        tip: "和地球差不多大，是地球的95%",
      },
      {
        emoji: "🏋️",
        value: "91%",
        unit: "地球重力",
        label: "表面重力",
        tip: "站在上面和地球上感觉差不多重",
      },
      {
        emoji: "⏱️",
        value: "243",
        unit: "天",
        label: "自转周期",
        tip: "自转比公转还慢，而且方向是反的！",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "🔄",
          question: "金星上太阳是从西边升起的？",
          hint: "和地球完全相反！",
        },
        back: {
          emoji: "🌅",
          answer: "没错！太阳西升东落！",
          explanation:
            "金星的自转方向和大多数行星相反，所以在金星上，太阳是从西边升起、东边落下的，一天也比一年还长！",
          wowFactor: "≈ 在金星上，一年只有2个'太阳日'！",
        },
      },
      {
        front: {
          emoji: "☁️",
          question: "为什么金星比水星还热？",
          hint: "秘密藏在云层里...",
        },
        back: {
          emoji: "🏭",
          answer: "超级温室效应！",
          explanation:
            "金星的大气层96%是二氧化碳，像一床超级厚的棉被把热量捂在里面。再加上云层里的硫酸，热量进得来出不去。",
          wowFactor: "≈ 像把你关在一个不断加热的高压锅里！",
        },
      },
      {
        front: {
          emoji: "💡",
          question: "金星是夜空中最亮的星吗？",
          hint: "古人叫它'启明星'或'长庚星'！",
        },
        back: {
          emoji: "✨",
          answer: "是的！亮度仅次于月亮！",
          explanation:
            "金星的云层能反射70%的阳光，所以在地球上看起来特别亮。古人不知道它是行星，还以为它是两颗不同的星星呢！",
          wowFactor: "≈ 亮到在晴朗的白天都能用肉眼看到！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🔥",
        question: "金星表面有多热？",
        comparison: "462°C的高温",
        relatable: "≈ 比家里烤箱最高温还要热2倍，铅都会融化成水！",
        reaction: "🥵",
      },
      {
        emoji: "🌪️",
        question: "金星的大气压力有多强？",
        comparison: "地球海平面的92倍",
        relatable: "≈ 潜入地球海洋1000米深的感觉，瞬间被压扁！",
        reaction: "😰",
      },
    ],
    funFacts: [
      {
        emoji: "🌋",
        fact: "金星上可能有活火山！科学家发现了上千座火山，有些可能还在喷发。",
      },
      {
        emoji: "🕵️",
        fact: "前苏联的金星探测器成功着陆了，但都在几小时内被高温高压摧毁，最长的一个只坚持了2小时。",
      },
      {
        emoji: "🌧️",
        fact: "金星上下的是硫酸雨！不过因为温度太高，硫酸雨在落到地面之前就蒸发掉了。",
      },
      {
        emoji: "🌍",
        fact: "几十亿年前，金星可能和地球一样有海洋，但因为温室效应失控，水全部蒸发了。",
        extra: "科学家说：地球千万别学金星！",
      },
    ],
    imagine: {
      scenario: "假如你在金星上...",
      effects: [
        { emoji: "🌅", text: "你会看到太阳从西边升起，而且升起一次要等243天" },
        { emoji: "🌫️", text: "天空是橙黄色的，永远看不到蓝天，因为厚厚的硫酸云挡住了" },
        { emoji: "🏋️", text: "你感觉自己重了一点，走路稍微费劲一些" },
        { emoji: "💀", text: "如果不穿防护服，你会在1秒内被压扁、烤焦、毒死——三件套齐全！" },
      ],
    },
  },

  // ==========================================================================
  // 4. 地球 🌍
  // ==========================================================================
  earth: {
    id: "earth",
    iconEmoji: "🌍",
    title: { zh: "地球", en: "Earth" },
    tagline: {
      zh: "我们唯一的家园，宇宙中已知的生命绿洲！",
      en: "Our only home — the only known oasis of life in the universe!",
    },
    stats: [
      {
        emoji: "🌡️",
        value: "15",
        unit: "°C",
        label: "平均温度",
        tip: "刚刚好，不冷不热，适合生命生存！",
      },
      {
        emoji: "📏",
        value: "12742",
        unit: "公里",
        label: "直径",
        tip: "太阳系中第五大的行星",
      },
      {
        emoji: "🌊",
        value: "71%",
        unit: "表面积",
        label: "海洋覆盖",
        tip: "所以地球看起来是蓝色的！",
      },
      {
        emoji: "⏱️",
        value: "23小时56分",
        unit: "",
        label: "自转周期",
        tip: "我们说的24小时是约数，真实是23小时56分4秒！",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "🌙",
          question: "为什么地球是唯一有生命的星球？",
          hint: "不是运气，是多重保护！",
        },
        back: {
          emoji: "🛡️",
          answer: "地球有'四大保镖'！",
          explanation:
            "地球有磁场挡住太阳风暴、大气层保温、液态水孕育生命、月球稳定自转轴。这四样凑在一起，在太阳系里独一无二！",
          wowFactor: "≈ 就像中了宇宙彩票头奖，而且是连续中了好几张！",
        },
      },
      {
        front: {
          emoji: "🌊",
          question: "地球上的水是从哪里来的？",
          hint: "不是一开始就有的哦~",
        },
        back: {
          emoji: "☄️",
          answer: "可能是彗星和小行星送来的！",
          explanation:
            "科学家认为，地球形成初期非常热，水都蒸发了。后来无数颗含冰的彗星和小行星像送水工一样撞向地球，带来了海洋。",
          wowFactor: "≈ 相当于几十亿颗大冰块从太空快递到地球！",
        },
      },
      {
        front: {
          emoji: "🌍",
          question: "地球其实不是圆的？",
          hint: "仔细看它的形状...",
        },
        back: {
          emoji: "🍐",
          answer: "它是一个'梨形'！",
          explanation:
            "地球因为自转，赤道鼓出来，两极扁下去。而且南半球比北半球稍微胖一点，整体像个大鸭梨，只不过扁得很少，肉眼看不出来。",
          wowFactor: "≈ 如果地球缩成篮球大小，扁的程度比篮球表面的小凹凸还小！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🚀",
        question: "绕地球飞一圈有多快？",
        comparison: "国际空间站90分钟一圈",
        relatable: "≈ 你看一集动画片的时间，宇航员已经绕地球飞了一圈！",
        reaction: "😲",
      },
      {
        emoji: "🌊",
        question: "如果把海洋的水做成一个大水球，有多大？",
        comparison: "直径约1385公里",
        relatable: "≈ 从北京到上海那么宽的一个超级大水球！",
        reaction: "🤯",
      },
    ],
    funFacts: [
      {
        emoji: "🧲",
        fact: "地球的磁场正在慢慢减弱，而且磁极会翻转！上一次翻转发生在78万年前。",
        extra: "翻转时指南针会指向南方而不是北方！",
      },
      {
        emoji: "🌋",
        fact: "地球内部是热的，地核温度和太阳表面差不多热！这些热量驱动着板块运动。",
      },
      {
        emoji: "🌙",
        fact: "月球正在以每年3.8厘米的速度远离地球，几亿年后的一天会变成30小时！",
      },
      {
        emoji: "🦠",
        fact: "地球上所有生物的DNA都长得差不多，说明我们可能都来自同一个'原始祖先'。",
      },
      {
        emoji: "🌈",
        fact: "地球是太阳系中唯一有板块构造的行星，这就是为什么我们有高山、深海和地震。",
      },
    ],
    imagine: {
      scenario: "假如你在太空中看地球...",
      effects: [
        { emoji: "🔵", text: "你会看到一个闪闪发光的蓝色弹珠，白云像棉花糖飘在上面" },
        { emoji: "✨", text: "夜晚那一面，城市灯光像撒在地上的星星碎片" },
        { emoji: "🌌", text: "你会突然明白：所有你认识的人、所有的历史，都在这个小点上" },
        { emoji: "💙", text: "宇航员说，从太空看地球会让人想好好保护它" },
      ],
    },
  },

  // ==========================================================================
  // 5. 火星 ♂️
  // ==========================================================================
  mars: {
    id: "mars",
    iconEmoji: "♂️",
    title: { zh: "火星", en: "Mars" },
    tagline: {
      zh: "红色星球，人类未来的第二个家？",
      en: "The Red Planet — humanity's future second home?",
    },
    stats: [
      {
        emoji: "🌡️",
        value: "-63",
        unit: "°C",
        label: "平均温度",
        tip: "夏天赤道中午可以到20°C，但晚上会跌到-80°C！",
      },
      {
        emoji: "📏",
        value: "6779",
        unit: "公里",
        label: "直径",
        tip: "大约是地球的一半大小",
      },
      {
        emoji: "💡",
        value: "12.7",
        unit: "光分",
        label: "距太阳光程",
        tip: "光从太阳飞 12 分 43 秒才能照到火星——是照到地球时间的1.5倍！",
      },
      {
        emoji: "⏱️",
        value: "687",
        unit: "天",
        label: "公转周期",
        tip: "火星上的一年差不多是地球的2年！",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "🏔️",
          question: "火星上有太阳系最高的山？",
          hint: "比地球上的珠穆朗玛峰还高得多！",
        },
        back: {
          emoji: "🌋",
          answer: "奥林帕斯山，高21公里！",
          explanation:
            "奥林帕斯山是一座巨大的盾状火山，高21公里，是珠穆朗玛峰的2.4倍。它底部宽达600公里，大到你站在上面都感觉不到坡度！",
          wowFactor: "≈ 站在山顶，你已经在太空边缘了！",
        },
      },
      {
        front: {
          emoji: "🌊",
          question: "火星上曾经有大河大海？",
          hint: "现在的火星看起来干巴巴的...",
        },
        back: {
          emoji: "🏜️",
          answer: "是的！几十亿年前有河流和湖泊！",
          explanation:
            "火星探测器发现了古老的河床、三角洲和矿物质，证明火星曾经温暖湿润。但后来大气层流失，水要么蒸发到太空，要么冻在地下。",
          wowFactor: "≈ 曾经的火星可能是第二个地球！",
        },
      },
      {
        front: {
          emoji: "🌪️",
          question: "火星上的沙尘暴能覆盖整个星球？",
          hint: "地球上最大的沙尘暴和它比就是小儿科...",
        },
        back: {
          emoji: "🌫️",
          answer: "没错！可以持续好几个月！",
          explanation:
            "火星沙尘暴非常猛烈，细小的红色尘土被风吹起，有时能覆盖整个星球，让天空变暗持续数月。NASA的机遇号火星车就是被一场沙尘暴'闷死'的。",
          wowFactor: "≈ 像给整个星球盖了一层红被子！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🏔️",
        question: "奥林帕斯山有多高？",
        comparison: "高21公里",
        relatable: "≈ 把珠穆朗玛峰叠两个半，才能摸到它的山顶！",
        reaction: "🤯",
      },
      {
        emoji: "🚗",
        question: "开车去火星要多久？",
        comparison: "以100km/h开",
        relatable: "≈ 不停开26年才能到达！（当然没有公路）",
        reaction: "😱",
      },
    ],
    funFacts: [
      {
        emoji: "🤖",
        fact: "已经有50多个探测器去过火星，但只有约一半成功，火星被称为'探测器的坟墓'。",
      },
      {
        emoji: "🌅",
        fact: "火星上的日落是蓝色的！因为红色尘土散射了红光，剩下的蓝光让天空呈现蓝色。",
      },
      {
        emoji: "🎵",
        fact: "火星上声音传播的方式和地球不同，说话声音会更低沉，音乐也会变调。",
      },
      {
        emoji: "🥔",
        fact: "电影《火星救援》里种土豆是真的有可能的！科学家已经在模拟火星土壤中种出了作物。",
      },
      {
        emoji: "👽",
        fact: "火星有两颗小卫星——火卫一和火卫二，它们可能都是被火星引力捕获的小行星。",
      },
    ],
    imagine: {
      scenario: "假如你在火星上...",
      effects: [
        { emoji: "🌅", text: "你会看到蓝色的日落，天空是奶油色的，太阳看起来小了一圈" },
        { emoji: "🪶", text: "你轻了60%！一个100斤的人只剩38斤，轻轻一跳就能飞3米高" },
        { emoji: "🥶", text: "白天可能还行，但晚上温度暴跌，必须穿超级保暖的宇航服" },
        { emoji: "🔴", text: "脚下是红色的沙土，远处的山也是红色的，像在一个巨大的 Rust 色世界里" },
      ],
    },
  },

  // ==========================================================================
  // 6. 木星 ♃
  // ==========================================================================
  jupiter: {
    id: "jupiter",
    iconEmoji: "♃",
    title: { zh: "木星", en: "Jupiter" },
    tagline: {
      zh: "太阳系的老大哥，行星中的巨无霸！",
      en: "The big brother of the solar system, a true giant!",
    },
    stats: [
      {
        emoji: "📏",
        value: "139820",
        unit: "公里",
        label: "直径",
        tip: "是地球的11倍，太阳的1/10！",
      },
      {
        emoji: "⚖️",
        value: "318",
        unit: "倍地球",
        label: "质量",
        tip: "比其他所有行星加起来还重2.5倍！",
      },
      {
        emoji: "⏱️",
        value: "9小时55分",
        unit: "",
        label: "自转周期",
        tip: "转得飞快，是太阳系自转最快的行星！",
      },
      {
        emoji: "🌙",
        value: "95",
        unit: "颗",
        label: "已知卫星",
        tip: "像一个小太阳系，卫星数量还在增加！",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "🔴",
          question: "木星上的大红斑是什么？",
          hint: "它已经存在几百年了！",
        },
        back: {
          emoji: "🌪️",
          answer: "一个超级巨大的风暴！",
          explanation:
            "大红斑是一个直径比地球还大的反气旋风暴，已经至少存在了350年。风速高达每小时400多公里，是地球上最强飓风的2倍！",
          wowFactor: "≈ 可以装下1.3个地球！",
        },
      },
      {
        front: {
          emoji: "🛡️",
          question: "木星是地球的'保镖'？",
          hint: "它一直在默默保护我们...",
        },
        back: {
          emoji: "☄️",
          answer: "没错！它像一块巨大的吸铁石！",
          explanation:
            "木星强大的引力把很多可能撞向地球的小行星和彗星吸引过去，或者把它们甩出太阳系。1994年，木星还'吃'掉了一颗彗星！",
          wowFactor: "≈ 没有木星，地球被小行星撞击的概率会增加1000倍！",
        },
      },
      {
        front: {
          emoji: "🌈",
          question: "木星有固体表面吗？",
          hint: "你能站在木星上吗？",
        },
        back: {
          emoji: "🌫️",
          answer: "没有！它全是气体和液体！",
          explanation:
            "木星是一颗气态巨行星，越往下气压越大，气体逐渐被压成液体。没有一个明确的'地面'让你站立，你会一直往下掉，直到被压扁！",
          wowFactor: "≈ 像掉进一个没有底、越来越稠密的棉花糖海洋！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🎈",
        question: "木星能装下多少个地球？",
        comparison: "体积对比",
        relatable: "≈ 1300个地球才能填满木星！",
        reaction: "🤯",
      },
      {
        emoji: "⚡",
        question: "木星的闪电有多强？",
        comparison: "比地球闪电强1000倍",
        relatable: "≈ 一道闪电够全中国用好几秒！",
        reaction: "😱",
      },
    ],
    funFacts: [
      {
        emoji: "🌌",
        fact: "木星自己也会发光！虽然它是一颗行星，但发出的热量比从太阳接收的还多。",
      },
      {
        emoji: "💍",
        fact: "木星有一个很淡的行星环，是1979年旅行者号探测器才发现的，肉眼根本看不见。",
      },
      {
        emoji: "🧲",
        fact: "木星的磁场是地球的14倍强，如果肉眼能看见，从地球上看它比满月还大！",
      },
      {
        emoji: "🌙",
        fact: "木星的卫星木卫二（欧罗巴）冰层下可能有海洋，是寻找外星生命的热门目标！",
      },
    ],
    imagine: {
      scenario: "假如你在木星上...",
      effects: [
        { emoji: "🪶", text: "你重了两倍多，100斤的人变成236斤，走路像背着个大书包" },
        { emoji: "⏰", text: "一天不到10小时，你刚起床没多久就要睡觉了" },
        { emoji: "🌪️", text: "抬头看到巨大的彩色云带，还有比地球还大的红斑风暴在旋转" },
        { emoji: "🌑", text: "没有地面可以站，你会一直往下掉，穿过越来越厚的大气层" },
      ],
    },
  },

  // ==========================================================================
  // 7. 土星 ♄
  // ==========================================================================
  saturn: {
    id: "saturn",
    iconEmoji: "♄",
    title: { zh: "土星", en: "Saturn" },
    tagline: {
      zh: "戴着美丽光环的宇宙舞者，轻得能漂在水上！",
      en: "The cosmic dancer with beautiful rings — light enough to float on water!",
    },
    stats: [
      {
        emoji: "📏",
        value: "116460",
        unit: "公里",
        label: "直径",
        tip: "太阳系第二大行星，仅次于木星",
      },
      {
        emoji: "⚖️",
        value: "0.69",
        unit: "g/cm³",
        label: "平均密度",
        tip: "比水还轻！如果有个足够大的浴缸，土星能漂起来！",
      },
      {
        emoji: "⏱️",
        value: "29.5",
        unit: "年",
        label: "公转周期",
        tip: "土星上的一年，地球上要过近30年！",
      },
      {
        emoji: "🌙",
        value: "146",
        unit: "颗",
        label: "已知卫星",
        tip: "卫星数量冠绝太阳系！",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "💍",
          question: "土星的光环是什么做的？",
          hint: "不是固体光盘哦~",
        },
        back: {
          emoji: "🧊",
          answer: "无数块冰和岩石碎片！",
          explanation:
            "土星环由数十亿块小冰块和岩石组成，大小从沙粒到房子那么大。它们像一群听话的小卫星，整齐地排成一圈圈围绕土星旋转。",
          wowFactor: "≈ 有些冰块比公交车还大，但环的厚度只有几十米！",
        },
      },
      {
        front: {
          emoji: "🏊",
          question: "土星真的能漂在水上？",
          hint: "它的密度比水还小！",
        },
        back: {
          emoji: "🛁",
          answer: "理论上可以！",
          explanation:
            "土星的平均密度只有0.69g/cm³，而水是1g/cm³。如果有一个宇宙级的大浴缸，土星真的能像皮球一样漂在水面上！",
          wowFactor: "≈ 就像把一个巨大的充气球放进游泳池！",
        },
      },
      {
        front: {
          emoji: "🌪️",
          question: "土星北极有一个六边形风暴？",
          hint: "自然界怎么会有六边形的？",
        },
        back: {
          emoji: "⬡",
          answer: "没错！一个巨大的六边形！",
          explanation:
            "土星北极有一个奇怪的六边形风暴，每边长约13800公里，是地球直径那么宽。科学家认为这是不同风速的气流相互作用形成的。",
          wowFactor: "≈ 可以装下4个地球！而且转一圈只要10小时！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "💍",
        question: "土星环有多宽？",
        comparison: "环的宽度约28万公里",
        relatable: "≈ 把20个地球并排摆在一起那么宽！",
        reaction: "🤯",
      },
      {
        emoji: "🎈",
        question: "土星有多轻？",
        comparison: "密度比水小31%",
        relatable: "≈ 像一块大木头漂在水上，只不过这块'木头'有11万公里宽！",
        reaction: "😲",
      },
    ],
    funFacts: [
      {
        emoji: "🌧️",
        fact: "土星上下的'雨'是钻石！大气中的碳在高压下变成钻石，像冰雹一样往下掉。",
        extra: "可惜没人能去捡...",
      },
      {
        emoji: "🌪️",
        fact: "土星上的风速可达每小时1800公里，是地球上最强飓风的5倍！",
      },
      {
        emoji: "🌙",
        fact: "土卫六（泰坦）是太阳系唯一有浓厚大气层的卫星，表面还有液态甲烷湖泊！",
      },
      {
        emoji: "🎵",
        fact: "土星会'唱歌'！它的磁场和太阳风相互作用，发出无线电波，NASA把它转换成了我们能听的声音。",
      },
    ],
    imagine: {
      scenario: "假如你在土星上...",
      effects: [
        { emoji: "🪶", text: "你和在地球上差不多重，因为土星的重力只比地球强一点点" },
        { emoji: "💍", text: "抬头看到巨大的光环横跨天空，像一道发光的彩虹桥" },
        { emoji: "🌪️", text: "云层移动超快，一天只有10个半小时" },
        { emoji: "🧊", text: "如果你飞到光环里，会看到无数冰块像雪花一样围绕你旋转" },
      ],
    },
  },

  // ==========================================================================
  // 8. 天王星 ♅
  // ==========================================================================
  uranus: {
    id: "uranus",
    iconEmoji: "♅",
    title: { zh: "天王星", en: "Uranus" },
    tagline: {
      zh: "躺着转的冰蓝色星球，太阳系的'懒汉'！",
      en: "The ice-blue planet that rolls on its side — the solar system's lazybones!",
    },
    stats: [
      {
        emoji: "🌡️",
        value: "-224",
        unit: "°C",
        label: "表面温度",
        tip: "太阳系最冷的行星，比冥王星还冷！",
      },
      {
        emoji: "📏",
        value: "50724",
        unit: "公里",
        label: "直径",
        tip: "大约是地球的4倍",
      },
      {
        emoji: "💡",
        value: "2.7",
        unit: "光小时",
        label: "距太阳光程",
        tip: "太阳光要飞 2 小时 40 分钟才能照到天王星！你等了快一部电影的时间。",
      },
      {
        emoji: "⏱️",
        value: "84",
        unit: "年",
        label: "公转周期",
        tip: "天王星的'一年'，地球上要过84年！",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "🛏️",
          question: "为什么说天王星'躺着'转？",
          hint: "其他行星都是'站着'的！",
        },
        back: {
          emoji: "🔄",
          answer: "它的自转轴倾斜了98度！",
          explanation:
            "天王星的自转轴几乎横躺着，就像一个人侧躺在地上滚着前进。科学家认为，很久以前有一颗巨大的天体撞翻了它。",
          wowFactor: "≈ 像保龄球横着滚过球道，而不是竖着转！",
        },
      },
      {
        front: {
          emoji: "🔵",
          question: "天王星为什么是蓝色的？",
          hint: "和地球蓝天的原理有点像...",
        },
        back: {
          emoji: "💨",
          answer: "因为大气里有甲烷！",
          explanation:
            "天王星的大气中含有甲烷，甲烷吸收了红光，反射了蓝光，所以整颗星球看起来是美丽的蓝绿色。",
          wowFactor: "≈ 像给星球戴了一副蓝色墨镜！",
        },
      },
      {
        front: {
          emoji: "💍",
          question: "天王星也有光环？",
          hint: "它可不是土星的专利！",
        },
        back: {
          emoji: "✨",
          answer: "有！而且非常暗，很难看见",
          explanation:
            "天王星有13个已知的光环，但它们又窄又暗，是1977年才偶然发现的。和土星明亮壮观的光环完全不同。",
          wowFactor: "≈ 像一圈圈细细的黑色橡皮筋围绕着星球！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🎂",
        question: "在天王星上过生日要等多久？",
        comparison: "公转一圈84年",
        relatable: "≈ 如果你现在8岁，下一次天王星生日你已经92岁了！",
        reaction: "😱",
      },
      {
        emoji: "❄️",
        question: "天王星有多冷？",
        comparison: "表面-224°C",
        relatable: "≈ 比干冰还冷，呼出的气会立刻冻成冰晶掉下来！",
        reaction: "🥶",
      },
    ],
    funFacts: [
      {
        emoji: "🔭",
        fact: "天王星是用望远镜发现的第一颗行星，1781年由威廉·赫歇尔发现。",
        extra: "之前古人就知道的行星只有金木水火土。",
      },
      {
        emoji: "🌬️",
        fact: "天王星的大气层里有硫化氢，闻起来像臭鸡蛋！幸好你闻不到...",
      },
      {
        emoji: "🌙",
        fact: "天王星的卫星名字都来自莎士比亚和亚历山大·蒲柏的作品，比如泰坦尼亚、奥伯龙。",
      },
      {
        emoji: "🧊",
        fact: "天王星可能有一个巨大的液态水海洋，里面还有氨，像超级冷的'雪泥'！",
      },
    ],
    imagine: {
      scenario: "假如你在天王星上...",
      effects: [
        { emoji: "🛏️", text: "你会看到太阳在头顶画圆圈，而不是东升西落，因为天王星横躺着转" },
        { emoji: "🥶", text: "冷到无法形容，你呼出的每一口气都会变成冰晶飘落在地上" },
        { emoji: "🔵", text: "天空是深蓝色的，一切都笼罩在冰冷神秘的蓝光中" },
        { emoji: "⏳", text: "一个季节持续21年，你从小到大只经历过一个'夏天'" },
      ],
    },
  },

  // ==========================================================================
  // 9. 海王星 ♆
  // ==========================================================================
  neptune: {
    id: "neptune",
    iconEmoji: "♆",
    title: { zh: "海王星", en: "Neptune" },
    tagline: {
      zh: "太阳系最远的蓝色风暴之王，风速快到离谱！",
      en: "The distant blue storm king with insanely fast winds!",
    },
    stats: [
      {
        emoji: "🌡️",
        value: "-214",
        unit: "°C",
        label: "表面温度",
        tip: "冷得连甲烷都冻成冰了",
      },
      {
        emoji: "📏",
        value: "49244",
        unit: "公里",
        label: "直径",
        tip: "比天王星小一点，但质量更大",
      },
      {
        emoji: "💨",
        value: "2100",
        unit: "km/h",
        label: "最高风速",
        tip: "太阳系最快风速！",
      },
      {
        emoji: "⏱️",
        value: "165",
        unit: "年",
        label: "公转周期",
        tip: "1846年发现的海王星，2011年才过完第一个'海王星年'！",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "💨",
          question: "海王星上的风有多快？",
          hint: "比地球上的任何风都快得多！",
        },
        back: {
          emoji: "🌪️",
          answer: "每小时2100公里！",
          explanation:
            "海王星上的风速可达每小时2100公里，是地球上最强飓风的5倍，比音速还快将近2倍！科学家不知道为什么离太阳最远的地方风却最大。",
          wowFactor: "≈ 从北京到上海只要1小时！",
        },
      },
      {
        front: {
          emoji: "🔵",
          question: "海王星为什么比天王星更蓝？",
          hint: "两颗行星看起来很像，但颜色不同...",
        },
        back: {
          emoji: "🧪",
          answer: "大气里有未知的'蓝色物质'！",
          explanation:
            "海王星和天王星的大气成分差不多，但海王星更蓝更亮。科学家认为海王星大气中可能有一种未知物质增强了蓝色，但还没确定是什么。",
          wowFactor: "≈ 像有人偷偷给海王星加了蓝色滤镜！",
        },
      },
      {
        front: {
          emoji: "🔭",
          question: "海王星是用望远镜'算'出来的？",
          hint: "不是先看到，而是先算出来的！",
        },
        back: {
          emoji: "🧮",
          answer: "没错！数学家的胜利！",
          explanation:
            "天文学家发现天王星的轨道不对劲，推测有另一颗行星在拉它。数学家用笔和纸算出了海王星的位置，望远镜对准一看，真的在那里！",
          wowFactor: "≈ 像用数学公式预测了一个藏起来的朋友！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "💨",
        question: "海王星的风速有多夸张？",
        comparison: "2100km/h",
        relatable: "≈ 比战斗机还快3倍，站上去瞬间被吹到外太空！",
        reaction: "😱",
      },
      {
        emoji: "🎂",
        question: "海王星上的一年有多长？",
        comparison: "165个地球年",
        relatable: "≈ 你爷爷的爷爷出生时，海王星才刚过完一个年！",
        reaction: "🤯",
      },
    ],
    funFacts: [
      {
        emoji: "🌙",
        fact: "海卫一（特里同）是太阳系中最冷的天体之一，表面只有-235°C，但它有冰火山！",
      },
      {
        emoji: "💙",
        fact: "海王星上有一个叫'大黑斑'的风暴，和木星大红斑类似，但时隐时现，像在玩捉迷藏。",
      },
      {
        emoji: "🚀",
        fact: "只有旅行者2号一个探测器飞掠过海王星，那是1989年，此后再也没有探测器去过。",
      },
      {
        emoji: "⏰",
        fact: "海王星的一天只有16小时，但它的一年有165年，所以一个海王星年约有9万天！",
      },
    ],
    imagine: {
      scenario: "假如你在海王星上...",
      effects: [
        { emoji: "💨", text: "你会被超音速狂风吹得站不住脚，比站在飞机引擎后面还猛" },
        { emoji: "🔵", text: "整个世界是深蓝色的，像沉在海底最深处" },
        { emoji: "🥶", text: "冷到空气里的甲烷都结冰了，像蓝色的雪花飘落" },
        { emoji: "⏳", text: "你活了一辈子，海王星的日历只翻了几页" },
      ],
    },
  },

  // ==========================================================================
  // 10. 月球 🌙
  // ==========================================================================
  moon: {
    id: "moon",
    iconEmoji: "🌙",
    title: { zh: "月球", en: "Moon" },
    tagline: {
      zh: "地球最忠实的伙伴，夜空中最亮的天体！",
      en: "Earth's most loyal companion, the brightest object in the night sky!",
    },
    stats: [
      {
        emoji: "📏",
        value: "3474",
        unit: "公里",
        label: "直径",
        tip: "大约是地球的四分之一",
      },
      {
        emoji: "💡",
        value: "1.28",
        unit: "光秒",
        label: "距地球光程",
        tip: "光从地球进入太空、抑截1.28秒后就到月球！还没嗝完一口气呢。",
      },
      {
        emoji: "⏱️",
        value: "27.3",
        unit: "天",
        label: "公转周期",
        tip: "和自转周期一样，所以永远同一面朝向我们",
      },
      {
        emoji: "🏋️",
        value: "1/6",
        unit: "地球重力",
        label: "表面重力",
        tip: "在月球上你只有地球上的1/6重！",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "🌑",
          question: "为什么我们只能看到月球的一面？",
          hint: "它明明在转啊...",
        },
        back: {
          emoji: "🔄",
          answer: "这叫'潮汐锁定'！",
          explanation:
            "月球的自转速度和绕地球公转的速度完全一样，就像一个人围着篝火转圈时，脸始终朝着篝火。所以地球上永远只能看到月球的同一面。",
          wowFactor: "≈ 像被一根看不见的绳子拴住了！",
        },
      },
      {
        front: {
          emoji: "🌊",
          question: "没有月球，地球会怎样？",
          hint: "可不只是晚上变暗这么简单...",
        },
        back: {
          emoji: "🌍",
          answer: "地球会'疯'掉！",
          explanation:
            "月球稳定了地球的自转轴，让四季保持稳定。没有月球，地球会像陀螺一样乱晃，温度会极端变化，一天可能变成几小时或几百小时！",
          wowFactor: "≈ 没有月球，地球上可能根本不会有生命！",
        },
      },
      {
        front: {
          emoji: "👣",
          question: "月球上的脚印能保存多久？",
          hint: "比地球上的长久得多...",
        },
        back: {
          emoji: "⏳",
          answer: "几百万年！",
          explanation:
            "月球没有大气层，没有风，没有雨，所以什么都不会被侵蚀。阿波罗宇航员留下的脚印，会原封不动地保存几百万年！",
          wowFactor: "≈ 除非被陨石砸中，否则那些脚印会比你爷爷的爷爷的爷爷的...还长寿！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🚗",
        question: "开车去月球要多久？",
        comparison: "以100km/h开",
        relatable: "≈ 不停开160天，相当于从北京开到广州5000次！",
        reaction: "😱",
      },
      {
        emoji: "🪶",
        question: "在月球上你有多轻？",
        comparison: "只有地球上的1/6重",
        relatable: "≈ 一个90斤的小朋友在月球上只有15斤，像抱着一只小猫那么轻！",
        reaction: "🤩",
      },
    ],
    funFacts: [
      {
        emoji: "🧀",
        fact: "月球正在慢慢远离地球，每年跑远3.8厘米，和指甲生长的速度差不多。",
      },
      {
        emoji: "🌡️",
        fact: "月球白天温度127°C，晚上-173°C，温差300度！因为没大气层保温。",
      },
      {
        emoji: "🚀",
        fact: "人类只在1969-1972年间登月过6次，之后50多年再没有人踏上月球。",
        extra: "但NASA计划2026年让宇航员重返月球！",
      },
      {
        emoji: "💧",
        fact: "月球两极的陨石坑底部有冰！未来月球基地可能用这些冰来制造饮用水和火箭燃料。",
      },
    ],
    imagine: {
      scenario: "假如你在月球上...",
      effects: [
        { emoji: "🪶", text: "你轻得像一片羽毛，轻轻一跳就能飞3米高，走路像在慢动作" },
        { emoji: "🌑", text: "天空是漆黑的，即使在白天也能看到星星，因为月球没有大气层" },
        { emoji: "🔇", text: "这里完全安静，因为没有空气传播声音，你说话只有自己能听到" },
        { emoji: "🌍", text: "你会看到巨大的地球挂在天上，像一颗美丽的蓝色大理石" },
      ],
    },
  },

  // ==========================================================================
  // 11. 火卫一 Phobos
  // ==========================================================================
  phobos: {
    id: "phobos",
    iconEmoji: "🥔",
    title: { zh: "火卫一（福波斯）", en: "Phobos" },
    tagline: {
      zh: "火星的'土豆卫星'，太阳系最奇怪的月亮之一！",
      en: "Mars' potato moon — one of the solar system's strangest satellites!",
    },
    stats: [
      {
        emoji: "📏",
        value: "22",
        unit: "公里",
        label: "最长直径",
        tip: "形状不规则，像个大土豆",
      },
      {
        emoji: "🚀",
        value: "9377",
        unit: "公里",
        label: "距火星",
        tip: "是太阳系中最靠近主行星的卫星",
      },
      {
        emoji: "⏱️",
        value: "7小时39分",
        unit: "",
        label: "公转周期",
        tip: "比火星自转还快！",
      },
      {
        emoji: "⚖️",
        value: "1/1000",
        unit: "月球质量",
        label: "质量",
        tip: "轻到引力几乎感觉不到",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "⏰",
          question: "火卫一的一天有多短？",
          hint: "短到让你头晕！",
        },
        back: {
          emoji: "🔄",
          answer: "不到8小时！",
          explanation:
            "火卫一绕火星转得比火星自转还快，所以在火星上看，它从西边升起、东边落下，一天能看到它升起两次！",
          wowFactor: "≈ 你睡个觉的时间，它已经绕火星转了一圈！",
        },
      },
      {
        front: {
          emoji: "💥",
          question: "火卫一正在撞向火星？",
          hint: "它越来越近了...",
        },
        back: {
          emoji: "⏳",
          answer: "没错！但还要等很久",
          explanation:
            "火卫一每年靠近火星约2厘米，大约5000万年后，它要么撞上火星，要么被火星引力撕碎变成光环！",
          wowFactor: "≈ 火星未来可能也会有一个像土星那样的环！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🥔",
        question: "火卫一有多大？",
        comparison: "最长22公里",
        relatable: "≈ 一个中等城市的大小，开车20分钟就能绕一圈！",
        reaction: "🤔",
      },
      {
        emoji: "🪶",
        question: "在火卫一上你有多轻？",
        comparison: "重力只有地球的1/1000",
        relatable: "≈ 一个90斤的人只有0.09斤重，比一张纸还轻！",
        reaction: "🤯",
      },
    ],
    funFacts: [
      {
        emoji: "🕳️",
        fact: "火卫一上有一个巨大的撞击坑叫'斯蒂克尼'，直径9公里，几乎占了卫星的一半宽！",
      },
      {
        emoji: "🌑",
        fact: "火卫一表面布满裂纹，科学家认为它可能是一颗被火星引力撕碎的小行星的碎片。",
      },
      {
        emoji: "👻",
        fact: "火卫一的名字'福波斯'在希腊语中是'恐惧'的意思，它是战神阿瑞斯（火星）的儿子。",
      },
    ],
    imagine: {
      scenario: "假如你在火卫一上...",
      effects: [
        { emoji: "🪶", text: "你几乎感觉不到重力，轻轻一跳就能飞上太空，再也回不来" },
        { emoji: "🔴", text: "巨大的火星占据了半边天空，红得像一颗燃烧的煤炭" },
        { emoji: "⏰", text: "一天不到8小时，你刚吃完早饭，太阳又要落山了" },
        { emoji: "🥔", text: "脚下是不规则的形状，走路要小心，一不小心就会'飞'出去" },
      ],
    },
  },

  // ==========================================================================
  // 12. 火卫二 Deimos
  // ==========================================================================
  deimos: {
    id: "deimos",
    iconEmoji: "🪨",
    title: { zh: "火卫二（德imos）", en: "Deimos" },
    tagline: {
      zh: "火星的小跟班，一颗像煤球一样暗的小卫星！",
      en: "Mars' tiny sidekick — a dark little moon like a lump of coal!",
    },
    stats: [
      {
        emoji: "📏",
        value: "12",
        unit: "公里",
        label: "最长直径",
        tip: "比火卫一还小，像个大石头",
      },
      {
        emoji: "🚀",
        value: "23463",
        unit: "公里",
        label: "距火星",
        tip: "比火卫一远一倍多",
      },
      {
        emoji: "⏱️",
        value: "30.3",
        unit: "小时",
        label: "公转周期",
        tip: "比火星自转慢一点",
      },
      {
        emoji: "🌑",
        value: "0.07",
        unit: "反照率",
        label: "反射率",
        tip: "非常暗，像一块黑炭",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "🌑",
          question: "火卫二为什么那么暗？",
          hint: "它几乎不反光...",
        },
        back: {
          emoji: "🪨",
          answer: "因为它像一块碳质陨石！",
          explanation:
            "火卫二的表面像碳质球粒陨石一样暗，只反射7%的阳光。如果把它放在夜空中，你几乎看不见它。",
          wowFactor: "≈ 像一块涂了黑漆的石头在太空中飘！",
        },
      },
      {
        front: {
          emoji: "🏃",
          question: "在火卫二上跑步会怎样？",
          hint: "它的引力太小了...",
        },
        back: {
          emoji: "🚀",
          answer: "你会变成'人肉火箭'！",
          explanation:
            "火卫二的逃逸速度只有每小时20公里，你全力奔跑就能飞离它！在火卫二上，自行车都骑不了，因为稍微蹬快点就会飘走。",
          wowFactor: "≈ 像在一个巨大的蹦床上，一蹬腿就飞上天！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🏙️",
        question: "火卫二有多大？",
        comparison: "直径约12公里",
        relatable: "≈ 北京三环内面积的1/10，是个超级小的'月亮'！",
        reaction: "🤔",
      },
      {
        emoji: "🚴",
        question: "骑自行车能逃离火卫二？",
        comparison: "逃逸速度仅20km/h",
        relatable: "≈ 你骑快一点就能飞进太空，成为第一个'骑'出卫星的人！",
        reaction: "😲",
      },
    ],
    funFacts: [
      {
        emoji: "😱",
        fact: "火卫二的名字'德imos'在希腊语中是'恐慌'的意思，和火卫一'恐惧'是兄弟。",
      },
      {
        emoji: "🪨",
        fact: "火卫二可能是一颗被火星引力捕获的小行星，因为它和火卫一看起来都不像'原生'卫星。",
      },
      {
        emoji: "🌑",
        fact: "从火星表面看，火卫二只比夜空中的星星亮一点点，不像我们的月亮那么壮观。",
      },
    ],
    imagine: {
      scenario: "假如你在火卫二上...",
      effects: [
        { emoji: "🪶", text: "你轻得像根羽毛，走路必须小碎步，不然一步就飞到天上" },
        { emoji: "🔴", text: "火星挂在天上，虽然小一点，但依然是红色的主宰" },
        { emoji: "🌑", text: "地面是黑色的，像走在煤渣路上，踩上去软软的" },
        { emoji: "🏃", text: "你试着跑几步，发现自己越跑越高，最后飘到了太空中" },
      ],
    },
  },

  // ==========================================================================
  // 13. 木卫一 Io
  // ==========================================================================
  io: {
    id: "io",
    iconEmoji: "🌋",
    title: { zh: "木卫一（艾奥）", en: "Io" },
    tagline: {
      zh: "太阳系中的火山之王，一颗永远在喷发的'披萨卫星'！",
      en: "The volcanic king of the solar system — a forever-erupting 'pizza moon'!",
    },
    stats: [
      {
        emoji: "📏",
        value: "3643",
        unit: "公里",
        label: "直径",
        tip: "和月球差不多大",
      },
      {
        emoji: "🌋",
        value: "400+",
        unit: "座",
        label: "活火山",
        tip: "太阳系中火山最活跃的天体！",
      },
      {
        emoji: "🚀",
        value: "42",
        unit: "万公里",
        label: "距木星",
        tip: "是离木星最近的伽利略卫星",
      },
      {
        emoji: "🌡️",
        value: "1300",
        unit: "°C",
        label: "火山温度",
        tip: "比地球岩浆热得多！",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "🌋",
          question: "木卫一上为什么有这么多火山？",
          hint: "木星'捏'出来的！",
        },
        back: {
          emoji: "🤏",
          answer: "木星在'揉面团'！",
          explanation:
            "木卫一被木星和其他卫星的引力反复拉扯，就像你捏橡皮泥一样，内部被揉得热乎乎的，所以火山不停地喷发。",
          wowFactor: "≈ 像一颗被巨人不停揉捏的火山球！",
        },
      },
      {
        front: {
          emoji: "🎨",
          question: "木卫一为什么像一张披萨？",
          hint: "颜色花花绿绿的...",
        },
        back: {
          emoji: "🍕",
          answer: "因为硫磺！",
          explanation:
            "木卫一的火山喷出大量硫磺，不同温度的硫磺呈现不同颜色：黄色、橙色、红色、黑色，像一张撒满各种配料的披萨饼！",
          wowFactor: "≈ 一张直径3600公里的超级披萨，永远在'烤'！",
        },
      },
      {
        front: {
          emoji: "⚡",
          question: "木卫一能给木星'发电'？",
          hint: "它喷出的东西变成了电流...",
        },
        back: {
          emoji: "💡",
          answer: "没错！它制造了木星极光！",
          explanation:
            "木卫一喷出的带电粒子沿着木星的磁场线运动，在木星两极撞出绚丽的极光，功率高达100万亿瓦！",
          wowFactor: "≈ 比全人类文明用电总量还多！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🌋",
        question: "木卫一的火山有多猛？",
        comparison: "喷发高度可达500公里",
        relatable: "≈ 从地面喷到太空，比国际空间站还高60倍！",
        reaction: "😱",
      },
      {
        emoji: "🍕",
        question: "木卫一像什么食物？",
        comparison: "五颜六色的硫磺表面",
        relatable: "≈ 一张巨大的、永远在烤的芝士披萨，上面撒了黄色和红色的'辣椒粉'！",
        reaction: "🤤",
      },
    ],
    funFacts: [
      {
        emoji: "🌋",
        fact: "木卫一的火山喷发物可以飞到太空里，形成围绕木星的'等离子体环'。",
      },
      {
        emoji: "🌑",
        fact: "木卫一几乎没有陨石坑，因为新喷发的熔岩不断覆盖旧表面，像永远在翻新装修。",
      },
      {
        emoji: "💨",
        fact: "木卫一的大气非常稀薄，主要是二氧化硫，闻起来像臭鸡蛋和火柴的味道。",
      },
      {
        emoji: "🔴",
        fact: "木卫一是伽利略在1610年发现的四颗木星卫星之一，但直到1979年旅行者号飞过，才知道它这么'火爆'。",
      },
    ],
    imagine: {
      scenario: "假如你在木卫一上...",
      effects: [
        { emoji: "🌋", text: "脚下的大地一直在颤抖，远处有巨大的火山在喷出橙红色的岩浆柱" },
        { emoji: "🍕", text: "地面是黄色、橙色和红色的，像走在一张巨大的披萨上" },
        { emoji: "🔴", text: "巨大的木星占据了半边天空，像一个永远盯着你的大眼睛" },
        { emoji: "🌑", text: "硫磺的味道充满空气，天空是淡淡的黄色，像黄昏永远不会结束" },
      ],
    },
  },

  // ==========================================================================
  // 14. 木卫二 Europa
  // ==========================================================================
  europa: {
    id: "europa",
    iconEmoji: "🧊",
    title: { zh: "木卫二（欧罗巴）", en: "Europa" },
    tagline: {
      zh: "冰层下的神秘海洋，寻找外星生命的头号目标！",
      en: "The mysterious ocean under ice — top target in the search for alien life!",
    },
    stats: [
      {
        emoji: "📏",
        value: "3122",
        unit: "公里",
        label: "直径",
        tip: "比月球小一点",
      },
      {
        emoji: "🌊",
        value: "100",
        unit: "公里",
        label: "冰层厚度",
        tip: "冰层下面藏着巨大的海洋！",
      },
      {
        emoji: "🚀",
        value: "67",
        unit: "万公里",
        label: "距木星",
        tip: "是伽利略卫星中第二近的",
      },
      {
        emoji: "🌡️",
        value: "-160",
        unit: "°C",
        label: "表面温度",
        tip: "冷到冰层像岩石一样硬",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "🌊",
          question: "木卫二下面真的有海洋？",
          hint: "比地球上的水还多！",
        },
        back: {
          emoji: "🐟",
          answer: "没错！而且水量是地球的两倍！",
          explanation:
            "木卫二表面覆盖着厚厚的冰层，但冰层下面有一个深达100公里的巨大海洋。科学家认为这个海洋和地球海洋一样，可能有生命存在！",
          wowFactor: "≈ 地球所有海洋的水加起来，还没有木卫二多！",
        },
      },
      {
        front: {
          emoji: "🧊",
          question: "木卫二的冰为什么有条纹？",
          hint: "像老虎的斑纹一样...",
        },
        back: {
          emoji: "🌊",
          answer: "因为冰层在'呼吸'！",
          explanation:
            "木卫二的冰层像地球的海冰一样，会裂开、移动、再冻结。这些条纹就是冰层不断运动留下的痕迹，说明下面的海洋在流动。",
          wowFactor: "≈ 像一张不断被揉皱又展平的玻璃纸！",
        },
      },
      {
        front: {
          emoji: "👽",
          question: "木卫二上可能有外星人？",
          hint: "不是科幻，是科学家的认真猜测！",
        },
        back: {
          emoji: "🦠",
          answer: "可能有微生物！",
          explanation:
            "木卫二的海洋有液态水、有能量来源（木星引力加热）、有矿物质，这三个条件都满足生命的需要。NASA正在计划发射探测器去挖冰找生命！",
          wowFactor: "≈ 如果找到生命，说明宇宙中生命可能到处都是！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🧊",
        question: "木卫二的冰有多厚？",
        comparison: "约100公里",
        relatable: "≈ 从北京到天津的距离，全是冰！",
        reaction: "🥶",
      },
      {
        emoji: "🌊",
        question: "木卫二的海洋有多大？",
        comparison: "水量是地球的两倍",
        relatable: "≈ 把地球上所有的海洋再复制一份，才能和木卫二比！",
        reaction: "🤯",
      },
    ],
    funFacts: [
      {
        emoji: "🌊",
        fact: "木卫二的海洋可能有60-150公里深，而地球海洋平均只有3.7公里深。",
      },
      {
        emoji: "🧂",
        fact: "科学家认为木卫二的海洋是咸的，和地球海水一样，因为冰层表面检测到了盐的痕迹。",
      },
      {
        emoji: "🚀",
        fact: "NASA计划在2030年代发射'欧罗巴快船'探测器，专门去研究这颗冰卫星。",
      },
      {
        emoji: "💡",
        fact: "木卫二虽然离太阳很远，但木星引力产生的潮汐加热让它内部保持温暖，冰不会完全冻住。",
      },
    ],
    imagine: {
      scenario: "假如你在木卫二上...",
      effects: [
        { emoji: "🧊", text: "脚下是光滑的冰原，像一面巨大的镜子反射着木星的光" },
        { emoji: "🔵", text: "冰层是淡蓝色的，因为冰太厚了，光线穿过时变成了蓝色" },
        { emoji: "🌊", text: "如果你钻个洞下去，会发现下面是一个黑暗的、巨大的海洋" },
        { emoji: "🪐", text: "木星在天上巨大而明亮，像一盏永不熄灭的蓝白色路灯" },
      ],
    },
  },

  // ==========================================================================
  // 15. 木卫三 Ganymede
  // ==========================================================================
  ganymede: {
    id: "ganymede",
    iconEmoji: "👑",
    title: { zh: "木卫三（盖尼米德）", en: "Ganymede" },
    tagline: {
      zh: "太阳系卫星之王，比水星还大的超级月亮！",
      en: "The king of solar system moons — bigger than the planet Mercury!",
    },
    stats: [
      {
        emoji: "📏",
        value: "5268",
        unit: "公里",
        label: "直径",
        tip: "比水星还大，是太阳系最大的卫星！",
      },
      {
        emoji: "⚖️",
        value: "2.02",
        unit: "倍月球",
        label: "质量",
        tip: "太阳系最重的卫星",
      },
      {
        emoji: "🧲",
        value: "有",
        unit: "",
        label: "自身磁场",
        tip: "唯一有磁场的卫星！",
      },
      {
        emoji: "🚀",
        value: "107",
        unit: "万公里",
        label: "距木星",
        tip: "是伽利略卫星中最远的",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "👑",
          question: "木卫三为什么叫'卫星之王'？",
          hint: "它有一项所有卫星都没有的'超能力'！",
        },
        back: {
          emoji: "🧲",
          answer: "它是唯一有磁场的卫星！",
          explanation:
            "木卫三有一个自己的磁场，像一件隐形防护服一样保护着它。这是太阳系所有卫星中独一无二的！科学家认为它内部有一个液态的铁核。",
          wowFactor: "≈ 像一颗小行星戴上了地球的'防护罩'！",
        },
      },
      {
        front: {
          emoji: "🌊",
          question: "木卫三下面也有海洋？",
          hint: "而且不止一个！",
        },
        back: {
          emoji: "🥪",
          answer: "可能有多个'夹心'海洋！",
          explanation:
            "科学家认为木卫三内部像三明治一样分层：冰层-海洋-冰层-海洋-岩石。可能有多个海洋被冰层隔开，每个海洋都可能有自己的秘密！",
          wowFactor: "≈ 像一颗巨大的夹心糖果，每层都有惊喜！",
        },
      },
      {
        front: {
          emoji: "🎨",
          question: "木卫三表面为什么有两种颜色？",
          hint: "一半黑一半亮...",
        },
        back: {
          emoji: "🌑",
          answer: "古老的黑暗区域和年轻的明亮区域！",
          explanation:
            "木卫三表面有深色的古老区域（几十亿年）和浅色的年轻区域（几亿年）。深色区域布满陨石坑，浅色区域被冰覆盖，像一张'阴阳脸'。",
          wowFactor: "≈ 像一颗被时间分成两半的古老星球！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "📏",
        question: "木卫三有多大？",
        comparison: "直径5268公里",
        relatable: "≈ 比水星还大！如果它绕太阳转而不是绕木星转，它就是一颗行星！",
        reaction: "🤯",
      },
      {
        emoji: "🚗",
        question: "开车绕木卫三一圈要多久？",
        comparison: "以100km/h开",
        relatable: "≈ 不停开55天，相当于绕地球赤道1.3圈！",
        reaction: "😲",
      },
    ],
    funFacts: [
      {
        emoji: "🧲",
        fact: "木卫三的磁场和木星的磁场相互作用，在木卫三两极产生了绚丽的极光。",
      },
      {
        emoji: "🌊",
        fact: "木卫三的海洋可能比地球所有海洋加起来还要大，深度可能超过100公里。",
      },
      {
        emoji: "🚀",
        fact: "NASA计划发射探测器专门研究木卫三，因为它同时有磁场、海洋和冰层，是寻找生命的绝佳地点。",
      },
      {
        emoji: "🏛️",
        fact: "木卫三的名字来自希腊神话中宙斯的神侍盖尼米德，是众神中最美的少年。",
      },
    ],
    imagine: {
      scenario: "假如你在木卫三上...",
      effects: [
        { emoji: "🧊", text: "脚下是巨大的冰原，有些地方裂开露出下面深蓝色的冰" },
        { emoji: "🧲", text: "你的指南针会乱转，因为木卫三有自己的磁场在捣乱" },
        { emoji: "🪐", text: "木星在天上像一面巨大的旗帜，占据了很大一片天空" },
        { emoji: "✨", text: "两极有淡淡的极光在舞动，像绿色的丝带飘在黑色的天空中" },
      ],
    },
  },

  // ==========================================================================
  // 16. 木卫四 Callisto
  // ==========================================================================
  callisto: {
    id: "callisto",
    iconEmoji: "🎯",
    title: { zh: "木卫四（卡利斯托）", en: "Callisto" },
    tagline: {
      zh: "太阳系最'老'的脸，布满伤疤的沉默守护者！",
      en: "The oldest face in the solar system — a scarred silent guardian!",
    },
    stats: [
      {
        emoji: "📏",
        value: "4821",
        unit: "公里",
        label: "直径",
        tip: "和 Mercury 差不多大",
      },
      {
        emoji: "🚀",
        value: "188",
        unit: "万公里",
        label: "距木星",
        tip: "伽利略卫星中最远的",
      },
      {
        emoji: "⏱️",
        value: "16.7",
        unit: "天",
        label: "公转周期",
        tip: "绕木星一圈要半个月",
      },
      {
        emoji: "🌑",
        value: "最老",
        unit: "",
        label: "表面年龄",
        tip: "40亿年几乎没有变化！",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "🎯",
          question: "木卫四为什么像个'麻子脸'？",
          hint: "陨石坑密密麻麻...",
        },
        back: {
          emoji: "💥",
          answer: "因为它几十亿年都没'翻新'过！",
          explanation:
            "木卫四是太阳系中表面最古老的天体之一，40多亿年来几乎没有地质活动，所以每一个撞上来的陨石坑都原封不动地保留下来，像一张记满了历史的老脸。",
          wowFactor: "≈ 像一本翻开的地质历史书，每一页都是陨石的故事！",
        },
      },
      {
        front: {
          emoji: "🛡️",
          question: "木卫四可能是未来的人类基地？",
          hint: "它有一个特别的优点...",
        },
        back: {
          emoji: "🏗️",
          answer: "因为它远离木星辐射带！",
          explanation:
            "木卫四离木星最远，受到的致命辐射最少。科学家认为它是建立木星系统基地的最佳选择，而且冰层下面可能也有海洋。",
          wowFactor: "≈ 像木星系统中的'安全屋'！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🎯",
        question: "木卫四上有多少个陨石坑？",
        comparison: "数不清，可能有数百万个",
        relatable: "≈ 像一张被无数针扎过的纸，密密麻麻全是洞！",
        reaction: "😱",
      },
      {
        emoji: "🛡️",
        question: "木卫四的辐射有多弱？",
        comparison: "只有木卫一的1/300",
        relatable: "≈ 在木卫四上待一个月，接受的辐射才相当于在木卫一上待一天！",
        reaction: "😌",
      },
    ],
    funFacts: [
      {
        emoji: "🌑",
        fact: "木卫四的表面反照率很低，只有20%，像一块深色的石头，是伽利略卫星中最暗的。",
      },
      {
        emoji: "🌊",
        fact: "虽然表面古老，但木卫四冰层下可能也有一个深达150公里的海洋。",
      },
      {
        emoji: "🚀",
        fact: "木卫四是伽利略卫星中唯一没有和另外三颗卫星形成轨道共振的，所以它的内部没有被潮汐加热。",
      },
      {
        emoji: "🏛️",
        fact: "木卫四的名字来自希腊神话中被宙斯爱慕的仙女卡利斯托，后来被变成了熊。",
      },
    ],
    imagine: {
      scenario: "假如你在木卫四上...",
      effects: [
        { emoji: "🌑", text: "脚下是深灰色的古老地面，每一步都可能踩在一个几十亿年前的陨石坑上" },
        { emoji: "🎯", text: "地平线凹凸不平，像月球表面一样荒凉而寂静" },
        { emoji: "🪐", text: "木星在天上显得小一些，但依然明亮，像一颗巨大的珍珠" },
        { emoji: "🔇", text: "这里安静得可怕，没有风声，没有火山，只有永恒的寂静" },
      ],
    },
  },

  // ==========================================================================
  // 17. 土卫六 Titan
  // ==========================================================================
  titan: {
    id: "titan",
    iconEmoji: "🌫️",
    title: { zh: "土卫六（泰坦）", en: "Titan" },
    tagline: {
      zh: "有大气、有湖泊、有雨——最像地球的'外星世界'！",
      en: "With air, lakes, and rain — the most Earth-like alien world!",
    },
    stats: [
      {
        emoji: "📏",
        value: "5149",
        unit: "公里",
        label: "直径",
        tip: "比水星还大，是第二大卫星",
      },
      {
        emoji: "🌫️",
        value: "1.5",
        unit: "倍地球大气压",
        label: "表面气压",
        tip: "大气层比地球还浓厚！",
      },
      {
        emoji: "🚀",
        value: "122",
        unit: "万公里",
        label: "距土星",
        tip: "是土星最大的卫星",
      },
      {
        emoji: "🌡️",
        value: "-179",
        unit: "°C",
        label: "表面温度",
        tip: "冷到甲烷都变成了液体",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "🌧️",
          question: "土卫六上下雨吗？",
          hint: "但它下的不是水...",
        },
        back: {
          emoji: "⛽",
          answer: "下的是液态甲烷雨！",
          explanation:
            "土卫六太冷了，水都冻成了岩石一样硬的冰。但甲烷在这里是液态的，会形成云层、下雨、汇成河流和湖泊，就像一个'甲烷版的地球水循环'。",
          wowFactor: "≈ 像地球，但所有水都换成了汽油！",
        },
      },
      {
        front: {
          emoji: "🌫️",
          question: "土卫六的大气为什么那么浓？",
          hint: "比地球大气层还厚！",
        },
        back: {
          emoji: "🛡️",
          answer: "因为它有'大气护盾'！",
          explanation:
            "土卫六离太阳很远，温度极低，气体不容易逃逸。加上它有活跃的甲烷循环和氮气大气，形成了太阳系中唯一能和地球媲美的大气层。",
          wowFactor: "≈ 站在表面，你看不到土星，因为云层太厚了！",
        },
      },
      {
        front: {
          emoji: "🚁",
          question: "人类有探测器登陆过土卫六吗？",
          hint: "而且成功发回了照片！",
        },
        back: {
          emoji: "🛬",
          answer: "有！惠更斯号2005年着陆！",
          explanation:
            "2005年，欧洲航天局的惠更斯号探测器成功降落在土卫六表面，发回了第一张外星表面的照片——看起来有点像干涸的河床和鹅卵石海滩！",
          wowFactor: "≈ 人类唯一成功着陆外太阳系卫星的探测器！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🌊",
        question: "土卫六的湖泊有多大？",
        comparison: "最大的湖泊直径约400公里",
        relatable: "≈ 和北京到济南差不多远，但里面全是液态甲烷和乙烷！",
        reaction: "🤯",
      },
      {
        emoji: "🪶",
        question: "在土卫六上你能飞起来吗？",
        comparison: "重力只有地球的14%",
        relatable: "≈ 如果你穿上翅膀，真的可以像鸟一样在浓厚的大气中飞翔！",
        reaction: "🤩",
      },
    ],
    funFacts: [
      {
        emoji: "🌊",
        fact: "土卫六的液态烃湖泊中，甲烷和乙烷的储量可能是地球石油和天然气总储量的几百倍。",
      },
      {
        emoji: "🌫️",
        fact: "土卫六的大气层是橙色的，因为阳光和甲烷反应产生了复杂的有机分子，像雾霾一样。",
      },
      {
        emoji: "🌊",
        fact: "土卫六冰壳下面可能有一个深达100公里的咸水海洋，和木卫二一样可能有生命。",
      },
      {
        emoji: "🚀",
        fact: "NASA计划在2027年发射'蜻蜓'探测器，它是一个核动力无人机，将在土卫六表面飞行探索！",
      },
    ],
    imagine: {
      scenario: "假如你在土卫六上...",
      effects: [
        { emoji: "🌫️", text: "天空是橙黄色的，像黄昏永远不会结束，看不到土星因为云层太厚" },
        { emoji: "🌧️", text: "天空飘下黑色的'雨滴'——那是液态甲烷，落在地上汇成黑色的河流" },
        { emoji: "🪶", text: "你轻得像气球，如果穿上翅膀，真的可以像鸟一样飞翔" },
        { emoji: "🧊", text: "地面是冰和有机物的混合物，踩上去像冻硬的沥青，远处有黑色的湖泊在闪光" },
      ],
    },
  },

  // ==========================================================================
  // 18. 土卫五 Rhea
  // ==========================================================================
  rhea: {
    id: "rhea",
    iconEmoji: "🥚",
    title: { zh: "土卫五（瑞亚）", en: "Rhea" },
    tagline: {
      zh: "土星的小冰球，可能有一个超级薄的'隐形环'！",
      en: "Saturn's little ice ball — possibly with a super thin invisible ring!",
    },
    stats: [
      {
        emoji: "📏",
        value: "1528",
        unit: "公里",
        label: "直径",
        tip: "大约是月球的一半",
      },
      {
        emoji: "🚀",
        value: "52.7",
        unit: "万公里",
        label: "距土星",
        tip: "土星第二大卫星",
      },
      {
        emoji: "⏱️",
        value: "4.5",
        unit: "天",
        label: "公转周期",
        tip: "绕土星一圈不到一周",
      },
      {
        emoji: "🧊",
        value: "75%",
        unit: "",
        label: "冰含量",
        tip: "基本上是个冰球！",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "💍",
          question: "土卫五也有自己的环？",
          hint: "比土星的环还神秘...",
        },
        back: {
          emoji: "🕸️",
          answer: "可能有一个超级薄的环系统！",
          explanation:
            "2008年科学家发现土卫五可能有一个由微小颗粒组成的环系统，非常稀薄，像一层看不见的蜘蛛网围绕着它。如果是真的，它是第一颗被发现有环的卫星！",
          wowFactor: "≈ 像一颗迷你土星，戴着几乎看不见的细项链！",
        },
      },
      {
        front: {
          emoji: "🥚",
          question: "土卫五为什么像个大鸡蛋？",
          hint: "它不是很圆...",
        },
        back: {
          emoji: "🧊",
          answer: "因为它是个冰球，被土星拉变形了！",
          explanation:
            "土卫五主要由冰组成，比较软，被土星的引力拉成了椭球形。而且它的密度只有水的1.2倍，说明它内部可能有很多空隙。",
          wowFactor: "≈ 像一颗被轻轻捏过的雪球！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🧊",
        question: "土卫五有多'冰'？",
        comparison: "75%是冰，25%是岩石",
        relatable: "≈ 像一个大雪球里混了一些石头，基本上就是块太空冰！",
        reaction: "🥶",
      },
      {
        emoji: "🪶",
        question: "在土卫五上你有多轻？",
        comparison: "只有地球上的1/20重",
        relatable: "≈ 一个100斤的人只有5斤重，像抱着一只小兔子！",
        reaction: "🤩",
      },
    ],
    funFacts: [
      {
        emoji: "🌑",
        fact: "土卫五表面有很多陨石坑，但比木卫四少得多，说明它的表面比木卫四'年轻'一些。",
      },
      {
        emoji: "🧊",
        fact: "土卫五的密度非常低，如果有个足够大的海洋，它也能像土星一样漂在水上！",
      },
      {
        emoji: "🏛️",
        fact: "土卫五的名字来自希腊神话中宙斯的妻子瑞亚，她是众神之母。",
      },
    ],
    imagine: {
      scenario: "假如你在土卫五上...",
      effects: [
        { emoji: "🧊", text: "脚下是白色的冰原，像走在北极的冻土上" },
        { emoji: "🪶", text: "你轻得像羽毛，走路像在月球上，轻轻一跳就能飞很高" },
        { emoji: "💍", text: "如果你往旁边看，可能会看到一圈几乎看不见的细环围绕着你" },
        { emoji: "🪐", text: "土星和它的巨大光环在天上壮观无比，像一幅巨大的油画" },
      ],
    },
  },

  // ==========================================================================
  // 19. 土卫二 Enceladus
  // ==========================================================================
  enceladus: {
    id: "enceladus",
    iconEmoji: "🚀",
    title: { zh: "土卫二（恩克拉多斯）", en: "Enceladus" },
    tagline: {
      zh: "会喷水的冰卫星，外星生命的超级热门候选！",
      en: "The ice moon that spouts water — a top candidate for alien life!",
    },
    stats: [
      {
        emoji: "📏",
        value: "504",
        unit: "公里",
        label: "直径",
        tip: "只有月球直径的1/7",
      },
      {
        emoji: "🚀",
        value: "23.8",
        unit: "万公里",
        label: "距土星",
        tip: "土星最亮的卫星之一",
      },
      {
        emoji: "💨",
        value: "800",
        unit: "km/h",
        label: "喷流速度",
        tip: "从南极裂缝中喷出的水蒸气！",
      },
      {
        emoji: "✨",
        value: "100%",
        unit: "反照率",
        label: "反射率",
        tip: "太阳系最亮的天体之一！",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "🚀",
          question: "土卫二为什么会'喷水'？",
          hint: "像一座太空喷泉！",
        },
        back: {
          emoji: "🌊",
          answer: "因为它有'冰火山'！",
          explanation:
            "土卫二南极有巨大的裂缝，冰层下面的海水被土星引力加热后，从裂缝中喷涌而出，形成高达几百公里的水蒸气和冰晶喷流。",
          wowFactor: "≈ 像一颗在太空中不停喷发的巨大喷泉！",
        },
      },
      {
        front: {
          emoji: "🌊",
          question: "土卫二的喷流形成了什么？",
          hint: "它不仅喷向太空，还...",
        },
        back: {
          emoji: "💍",
          answer: "它形成了土星的E环！",
          explanation:
            "土卫二喷出的冰晶和水蒸气进入太空后，围绕土星形成了一个巨大而稀薄的光环——E环。可以说，土卫二在'制造'土星环！",
          wowFactor: "≈ 像一台永不停歇的'造环机器'！",
        },
      },
      {
        front: {
          emoji: "👽",
          question: "土卫二上可能有生命？",
          hint: "科学家非常兴奋！",
        },
        back: {
          emoji: "🦠",
          answer: "有可能！而且条件很好！",
          explanation:
            "土卫二喷出的物质中含有盐、有机分子和氢气——这些都是生命需要的东西。而且冰层下面的海洋有液态水和能量来源，可能真的有微生物！",
          wowFactor: "≈ 我们可能已经'尝'到了外星海洋的味道！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🚀",
        question: "土卫二的喷流有多高？",
        comparison: "高达几百公里",
        relatable: "≈ 从地面喷到太空，比珠穆朗玛峰高几十倍！",
        reaction: "😱",
      },
      {
        emoji: "✨",
        question: "土卫二有多亮？",
        comparison: "反射几乎100%的阳光",
        relatable: "≈ 像一面巨大的镜子，是太阳系中最亮的天体之一！",
        reaction: "✨",
      },
    ],
    funFacts: [
      {
        emoji: "🌊",
        fact: "土卫二的海洋可能有10公里深，虽然卫星很小，但海洋的体积可能和北美五大湖加起来一样大。",
      },
      {
        emoji: "🚀",
        fact: "卡西尼号探测器多次穿过土卫二的喷流，直接'品尝'了它的成分，发现了生命所需的化学元素。",
      },
      {
        emoji: "🧊",
        fact: "土卫二表面几乎没有任何陨石坑，说明它的表面非常年轻，可能只有几百万年。",
      },
      {
        emoji: "🌡️",
        fact: "土卫二南极的裂缝温度比周围高很多，说明内部有热源在加热海洋。",
      },
    ],
    imagine: {
      scenario: "假如你在土卫二上...",
      effects: [
        { emoji: "✨", text: "地面白得刺眼，像走在一片巨大的镜子上，阳光被完美反射" },
        { emoji: "🚀", text: "南极方向有巨大的水柱冲向太空，像无数条银色的龙在飞舞" },
        { emoji: "🪶", text: "你非常轻，轻轻一跳就能飞得很高，像在一个微型星球上" },
        { emoji: "🪐", text: "土星在天上巨大而壮观，光环像一道发光的桥梁横跨天空" },
      ],
    },
  },

  // ==========================================================================
  // 20. 天卫三 Titania
  // ==========================================================================
  titania: {
    id: "titania",
    iconEmoji: "👸",
    title: { zh: "天卫三（泰坦尼亚）", en: "Titania" },
    tagline: {
      zh: "天王星最大的卫星，冰与岩石的沉睡公主！",
      en: "Uranus' largest moon — an ice and rock sleeping princess!",
    },
    stats: [
      {
        emoji: "📏",
        value: "1578",
        unit: "公里",
        label: "直径",
        tip: "天王星最大的卫星",
      },
      {
        emoji: "🚀",
        value: "43.6",
        unit: "万公里",
        label: "距天王星",
        tip: "八大行星卫星中第八大",
      },
      {
        emoji: "⏱️",
        value: "8.7",
        unit: "天",
        label: "公转周期",
        tip: "绕天王星一圈不到9天",
      },
      {
        emoji: "🌡️",
        value: "-210",
        unit: "°C",
        label: "表面温度",
        tip: "冷得连二氧化碳都会冻成冰",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "🏔️",
          question: "天卫三上有大峡谷？",
          hint: "比美国大峡谷还壮观！",
        },
        back: {
          emoji: "🌄",
          answer: "没错！有深达5公里的大峡谷！",
          explanation:
            "天卫三表面有一条巨大的断层峡谷，长度超过1500公里，深度达5公里。科学家认为它是在卫星内部冷却收缩时，表面裂开形成的。",
          wowFactor: "≈ 可以装下几百个摩天大楼！",
        },
      },
      {
        front: {
          emoji: "🌑",
          question: "天卫三为什么一边亮一边暗？",
          hint: "它的两个半球不一样...",
        },
        back: {
          emoji: "🎨",
          answer: "因为一边更'年轻'！",
          explanation:
            "天卫三的一个半球陨石坑很多（老的），另一个半球比较光滑（年轻的）。科学家认为它曾经经历过一次'表面翻新'事件，但只有一半被翻新了。",
          wowFactor: "≈ 像一张只化了一半妆的脸！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🏔️",
        question: "天卫三的峡谷有多长？",
        comparison: "超过1500公里",
        relatable: "≈ 从北京到上海那么长的一条超级大裂缝！",
        reaction: "🤯",
      },
      {
        emoji: "🥶",
        question: "天卫三有多冷？",
        comparison: "-210°C",
        relatable: "≈ 比干冰冷一倍，你呼出的气会立刻变成冰沙掉下来！",
        reaction: "🥶",
      },
    ],
    funFacts: [
      {
        emoji: "🏛️",
        fact: "天卫三的名字来自莎士比亚戏剧《仲夏夜之梦》中的仙后泰坦尼亚。",
      },
      {
        emoji: "🔭",
        fact: "天卫三是威廉·赫歇尔在1787年发现的，就在他发现天王星6年之后。",
      },
      {
        emoji: "🧊",
        fact: "天卫三可能有一个地下海洋，但因为离太阳太远，海洋可能完全冻结了。",
      },
      {
        emoji: "🌑",
        fact: "天卫三的表面是太阳系中最暗的天体之一，反照率只有17%，像一块深色的木炭。",
      },
    ],
    imagine: {
      scenario: "假如你在天卫三上...",
      effects: [
        { emoji: "🌑", text: "脚下是深灰色的冰原，像走在月球上，但更加寒冷和黑暗" },
        { emoji: "🌄", text: "远处有巨大的峡谷横贯地平线，像大地被巨人撕开了一道口子" },
        { emoji: "🔵", text: "天王星在天上是淡蓝色的，因为天卫三的自转轴和天王星一样横躺着，所以太阳的运动很奇怪" },
        { emoji: "🥶", text: "冷到无法呼吸，空气都冻成了冰晶，你必须穿最厚的宇航服" },
      ],
    },
  },

  // ==========================================================================
  // 21. 天卫四 Oberon
  // ==========================================================================
  oberon: {
    id: "oberon",
    iconEmoji: "🤴",
    title: { zh: "天卫四（奥伯龙）", en: "Oberon" },
    tagline: {
      zh: "天王星最远的'王子'，布满陨石坑的古老世界！",
      en: "Uranus' most distant 'prince' — an ancient world covered in craters!",
    },
    stats: [
      {
        emoji: "📏",
        value: "1523",
        unit: "公里",
        label: "直径",
        tip: "天王星第二大卫星",
      },
      {
        emoji: "🚀",
        value: "58.4",
        unit: "万公里",
        label: "距天王星",
        tip: "天王星最远的五大卫星之一",
      },
      {
        emoji: "⏱️",
        value: "13.5",
        unit: "天",
        label: "公转周期",
        tip: "绕天王星一圈要近两周",
      },
      {
        emoji: "🌑",
        value: "最老",
        unit: "",
        label: "表面年龄",
        tip: "40多亿年几乎没有变化",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "🌑",
          question: "天卫四为什么那么多陨石坑？",
          hint: "它从来没有'翻新'过自己...",
        },
        back: {
          emoji: "⏳",
          answer: "因为它是一颗'死'卫星！",
          explanation:
            "天卫四内部已经完全冷却，没有地质活动，没有火山，没有地震。所以几十亿年来每一个撞上来的陨石都原封不动地留在表面，像一本记满了历史的书。",
          wowFactor: "≈ 像一座40亿年没有打扫过的老房子！",
        },
      },
      {
        front: {
          emoji: "🏔️",
          question: "天卫四上有座神秘的山？",
          hint: "它不是撞击形成的...",
        },
        back: {
          emoji: "🌋",
          answer: "可能是一座古老的冰火山！",
          explanation:
            "天卫四上有一座约11公里高的山，周围没有陨石坑。科学家认为它可能是一座古老的冰火山，在天卫四还'年轻'的时候喷发形成的。",
          wowFactor: "≈ 像一座在冰冻世界里沉睡的古老火山！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🎯",
        question: "天卫四的陨石坑有多密集？",
        comparison: "表面几乎全是坑",
        relatable: "≈ 像一张被无数针扎过的纸，几乎没有空白的地方！",
        reaction: "😱",
      },
      {
        emoji: "🚀",
        question: "天卫四离天王星有多远？",
        comparison: "58.4万公里",
        relatable: "≈ 比月球到地球还远1.5倍，站在上面看天王星只有满月那么大！",
        reaction: "🤔",
      },
    ],
    funFacts: [
      {
        emoji: "🏛️",
        fact: "天卫四的名字来自莎士比亚戏剧《仲夏夜之梦》中的仙王奥伯龙，和天卫三是'夫妻'。",
      },
      {
        emoji: "🔭",
        fact: "天卫四也是威廉·赫歇尔在1787年发现的，和天卫三同一天被发现。",
      },
      {
        emoji: "🧊",
        fact: "天卫四表面有很多暗红色的物质，科学家认为可能是被辐射改变的有机物或冰。",
      },
      {
        emoji: "🌑",
        fact: "天卫四的反照率只有14%，是天王星主要卫星中最暗的，像一块深色的石头。",
      },
    ],
    imagine: {
      scenario: "假如你在天卫四上...",
      effects: [
        { emoji: "🌑", text: "脚下是深灰色的地面，每一步都可能踩在一个几十亿年前的陨石坑上" },
        { emoji: "🏔️", text: "远处有一座孤独的高山，像一座古老的纪念碑矗立在荒原上" },
        { emoji: "🔵", text: "天王星在天上是淡蓝色的，但因为距离远，看起来只有月亮那么大" },
        { emoji: "🥶", text: "这里冷得像永恒的黑夜，没有任何声音，没有任何动静" },
      ],
    },
  },

  // ==========================================================================
  // 22. 天卫一 Ariel
  // ==========================================================================
  ariel: {
    id: "ariel",
    iconEmoji: "🧚",
    title: { zh: "天卫一（艾瑞尔）", en: "Ariel" },
    tagline: {
      zh: "天王星最亮的'精灵'，冰与峡谷交织的美丽世界！",
      en: "Uranus' brightest 'spirit' — a beautiful world of ice and canyons!",
    },
    stats: [
      {
        emoji: "📏",
        value: "1158",
        unit: "公里",
        label: "直径",
        tip: "天王星第四大卫星",
      },
      {
        emoji: "🚀",
        value: "19",
        unit: "万公里",
        label: "距天王星",
        tip: "离天王星最近的五大卫星之一",
      },
      {
        emoji: "⏱️",
        value: "2.5",
        unit: "天",
        label: "公转周期",
        tip: "绕天王星一圈只要两天半",
      },
      {
        emoji: "✨",
        value: "39%",
        unit: "",
        label: "反照率",
        tip: "天王星卫星中最亮的！",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "🌊",
          question: "天卫一上曾经有'冰熔岩'流过？",
          hint: "不是真的熔岩，是...",
        },
        back: {
          emoji: "🧊",
          answer: "是液态水或氨水！",
          explanation:
            "天卫一表面有很多光滑的区域和峡谷，科学家认为这些是由液态水或氨水从内部流出后冻结形成的，就像'冰的熔岩'一样。",
          wowFactor: "≈ 像看一场由冰和水主演的'火山喷发'！",
        },
      },
      {
        front: {
          emoji: "✨",
          question: "天卫一为什么是最亮的天王星卫星？",
          hint: "它的表面很'新'...",
        },
        back: {
          emoji: "🎨",
          answer: "因为它的表面被'翻新'过！",
          explanation:
            "天卫一是天王星主要卫星中最亮的，因为它的表面相对年轻，冰层反射了很多阳光。而那些古老的陨石坑被新的冰流覆盖了。",
          wowFactor: "≈ 像一颗被重新打磨过的宝石！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🌊",
        question: "天卫一的峡谷有多深？",
        comparison: "深达5-10公里",
        relatable: "≈ 把泰山放进去都看不见山顶！",
        reaction: "😱",
      },
      {
        emoji: "✨",
        question: "天卫一有多亮？",
        comparison: "反射39%的阳光",
        relatable: "≈ 像新下的雪一样白，是天王星卫星中最耀眼的！",
        reaction: "✨",
      },
    ],
    funFacts: [
      {
        emoji: "🏛️",
        fact: "天卫一的名字来自莎士比亚戏剧《暴风雨》中的精灵艾瑞尔，是一个活泼好动的空气精灵。",
      },
      {
        emoji: "🧊",
        fact: "天卫一表面有太阳系中最深的峡谷之一，深度可能超过10公里。",
      },
      {
        emoji: "🌊",
        fact: "天卫一可能有一个地下海洋，但因为离太阳太远，海洋可能大部分冻结了。",
      },
      {
        emoji: "🔭",
        fact: "天卫一是1851年由英国天文学家威廉·拉塞尔发现的，他也是海王星的发现者之一。",
      },
    ],
    imagine: {
      scenario: "假如你在天卫一上...",
      effects: [
        { emoji: "✨", text: "地面是明亮的白色和灰色，像走在新下的雪地上" },
        { emoji: "🌊", text: "巨大的峡谷纵横交错，像大地被巨人用刀切成了棋盘" },
        { emoji: "🔵", text: "天王星在天上巨大而明亮，淡蓝色的光芒照亮了整个表面" },
        { emoji: "🧊", text: "如果你仔细看，会发现一些峡谷底部有光滑的冰面，像被水冲刷过一样" },
      ],
    },
  },

  // ==========================================================================
  // 23. 海卫一 Triton
  // ==========================================================================
  triton: {
    id: "triton",
    iconEmoji: "❄️",
    title: { zh: "海卫一（特里同）", en: "Triton" },
    tagline: {
      zh: "太阳系最冷的天体之一，会喷冰的'叛逆'卫星！",
      en: "One of the coldest objects in the solar system — an icy 'rebel' moon!",
    },
    stats: [
      {
        emoji: "📏",
        value: "2707",
        unit: "公里",
        label: "直径",
        tip: "海王星最大的卫星，比冥王星还大",
      },
      {
        emoji: "🌡️",
        value: "-235",
        unit: "°C",
        label: "表面温度",
        tip: "太阳系已知最冷的天体之一！",
      },
      {
        emoji: "🚀",
        value: "35.5",
        unit: "万公里",
        label: "距海王星",
        tip: "几乎和月球到地球一样远",
      },
      {
        emoji: "⏱️",
        value: "-200",
        unit: "年",
        label: "轨道趋势",
        tip: "轨道是逆行的，正在慢慢靠近海王星",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "🔄",
          question: "海卫一为什么是'叛逆'的？",
          hint: "它和其他卫星不一样...",
        },
        back: {
          emoji: "🚀",
          answer: "它的轨道方向是反的！",
          explanation:
            "海卫一是太阳系中最大的逆行轨道卫星，它绕海王星转的方向和海王星自转方向相反。科学家认为它不是和海王星一起形成的，而是被海王星从柯伊伯带抓来的！",
          wowFactor: "≈ 像一颗被海王星'绑架'的外来星球！",
        },
      },
      {
        front: {
          emoji: "🌋",
          question: "海卫一上会喷什么？",
          hint: "不是岩浆，是更冷的东西...",
        },
        back: {
          emoji: "🧊",
          answer: "喷的是氮气冰！",
          explanation:
            "海卫一有'冰火山'，喷出的不是热岩浆，而是液态氮、尘埃和水冰！这些喷流可以高达8公里，在黑色的天空背景下像黑色的羽毛。",
          wowFactor: "≈ 像一座喷出'冰沙'而不是岩浆的火山！",
        },
      },
      {
        front: {
          emoji: "💥",
          question: "海卫一未来会毁灭？",
          hint: "它正在慢慢靠近海王星...",
        },
        back: {
          emoji: "💫",
          answer: "大约36亿年后会被撕碎！",
          explanation:
            "海卫一的轨道正在慢慢靠近海王星，当它靠得太近时，海王星的引力会把它撕碎，碎片可能形成一个新的光环系统。",
          wowFactor: "≈ 海王星未来可能也会有一个像土星那样的光环！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🥶",
        question: "海卫一有多冷？",
        comparison: "表面-235°C",
        relatable: "≈ 比液氮还冷，你掉进去会立刻冻成一块冰雕！",
        reaction: "🥶",
      },
      {
        emoji: "🌋",
        question: "海卫一的冰火山喷多高？",
        comparison: "高达8公里",
        relatable: "≈ 比珠穆朗玛峰还高，但喷的是冰和氮气！",
        reaction: "🤯",
      },
    ],
    funFacts: [
      {
        emoji: "🌑",
        fact: "海卫一是1846年由英国天文学家威廉·拉塞尔在海王星被发现后17天发现的。",
      },
      {
        emoji: "🧊",
        fact: "海卫一表面有太阳系中已知的唯一一个'氮冰湖'，湖面上还有水冰漂浮着。",
      },
      {
        emoji: "🌫️",
        fact: "海卫一有稀薄的大气层，主要是氮气，和地球大气成分很像，但稀薄得多。",
      },
      {
        emoji: "🚀",
        fact: "旅行者2号在1989年飞掠海卫一时，只探测了不到一半的表面，另一半至今仍是谜。",
      },
    ],
    imagine: {
      scenario: "假如你在海卫一上...",
      effects: [
        { emoji: "🥶", text: "你站在太阳系最冷的地方之一，呼吸都会立刻冻成冰晶" },
        { emoji: "🌋", text: "远处有黑色的喷流冲向天空，那是氮气冰火山在喷发" },
        { emoji: "🔵", text: "海王星在天上巨大而深蓝，像一颗冰冷的蓝宝石" },
        { emoji: "🧊", text: "地面是粉红色的冰，因为甲烷冰被辐射变成了粉红色" },
      ],
    },
  },

  // ==========================================================================
  // 24. 海卫八 Proteus
  // ==========================================================================
  proteus: {
    id: "proteus",
    iconEmoji: "🎭",
    title: { zh: "海卫八（普罗透斯）", en: "Proteus" },
    tagline: {
      zh: "海王星最大的'隐形'卫星，形状像颗大土豆！",
      en: "Neptune's largest 'invisible' moon — shaped like a giant potato!",
    },
    stats: [
      {
        emoji: "📏",
        value: "440",
        unit: "公里",
        label: "最长直径",
        tip: "形状不规则，像个大土豆",
      },
      {
        emoji: "🚀",
        value: "11.8",
        unit: "万公里",
        label: "距海王星",
        tip: "海王星第二大卫星",
      },
      {
        emoji: "🌑",
        value: "0.1",
        unit: "反照率",
        label: "反射率",
        tip: "几乎和煤炭一样黑！",
      },
      {
        emoji: "⏱️",
        value: "1.1",
        unit: "天",
        label: "公转周期",
        tip: "绕海王星一圈只要一天多",
      },
    ],
    flipCards: [
      {
        front: {
          emoji: "🌑",
          question: "海卫八为什么叫'隐形'卫星？",
          hint: "它很难被发现...",
        },
        back: {
          emoji: "🎭",
          answer: "因为它太暗了！",
          explanation:
            "海卫八的反照率只有10%，像一块黑炭一样暗。而且它离海王星太近，被海王星的强光淹没了。直到1989年旅行者2号飞过，它才被发现。",
          wowFactor: "≈ 像一颗躲在聚光灯阴影里的黑石头！",
        },
      },
      {
        front: {
          emoji: "🥔",
          question: "海卫八为什么不是圆的？",
          hint: "大卫星都是圆的，但它不是...",
        },
        back: {
          emoji: "⚖️",
          answer: "因为它不够大！",
          explanation:
            "天体要变成球形，需要足够的引力把自己'捏'圆。海卫八只有440公里大，引力太弱，所以它保持不规则的形状，像个大土豆。",
          wowFactor: "≈ 像一块在太空中飘浮的巨型太空岩石！",
        },
      },
    ],
    comparisons: [
      {
        emoji: "🌑",
        question: "海卫八有多暗？",
        comparison: "只反射10%的光",
        relatable: "≈ 像一块煤炭或沥青，在夜空中几乎看不见！",
        reaction: "🌑",
      },
      {
        emoji: "🥔",
        question: "海卫八有多大？",
        comparison: "最长440公里",
        relatable: "≈ 从北京到济南的距离，但形状像个不规则的土豆！",
        reaction: "🤔",
      },
    ],
    funFacts: [
      {
        emoji: "🏛️",
        fact: "海卫八的名字来自希腊神话中的海神普罗透斯，他能随意变换形状，和这颗不规则卫星很配。",
      },
      {
        emoji: "🌑",
        fact: "海卫八是海王星系统中最大的不规则卫星，比它大的海卫一是球形，比它小的都是不规则形状。",
      },
      {
        emoji: "🚀",
        fact: "海卫八是1989年由旅行者2号探测器首次发现的，之前因为太暗而一直躲过了望远镜的观测。",
      },
      {
        emoji: "🪨",
        fact: "海卫八表面有一个巨大的撞击坑，直径超过它直径的一半，差点把它撞碎。",
      },
    ],
    imagine: {
      scenario: "假如你在海卫八上...",
      effects: [
        { emoji: "🥔", text: "脚下是凹凸不平的黑色岩石，像走在一块巨大的煤块上" },
        { emoji: "🪶", text: "引力非常小，轻轻一跳就能飞上高空，像在一个微型星球上" },
        { emoji: "🔵", text: "海王星在天上巨大而明亮，深蓝色的光芒是你唯一的光源" },
        { emoji: "🌑", text: "周围一片漆黑，因为地面太黑了，几乎不反射任何光线" },
      ],
    },
  },
};

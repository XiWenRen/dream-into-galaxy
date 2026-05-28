/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { translations } from '../i18n';
import { PLANET_ORBITAL_DATA, CELESTIAL_PHYSICS } from '../engine/OrbitEngine';
import { SATELLITE_DATA } from './UniverseViewer';
import { CELESTIAL_PROFILES, CelestialProfile, StatCard, FlipCard, ComparisonCard, FunFact, ImagineCard } from '../data/celestialProfiles';

interface PlanetInfoPanelProps {
  planetId: string;
  crossSectionActive: boolean;
  onToggleCrossSection: (active: boolean) => void;
  lang: 'zh' | 'en';
  onClose?: () => void;
  landed?: boolean;
  onToggleLanding?: () => void;
  isLandable?: boolean;
  textureOffset?: { u: number; v: number };
  onChangeTextureOffset?: (offset: { u: number; v: number }) => void;
  cloudsVisible?: boolean;
  onToggleClouds?: () => void;
  activeLayer?: 'core' | 'mantle' | 'crust' | 'atmosphere' | 'ring' | null;
  onLayerHover?: (layer: 'core' | 'mantle' | 'crust' | 'atmosphere' | 'ring' | null) => void;
}

interface SatellitePhysics {
  radius: number; // km
  distance: number; // km from parent
  period: number; // orbital period in Earth days or hours
  obliquity: number; // axial tilt
}

const SATELLITE_PHYSICS_DB: Record<string, SatellitePhysics> = {
  phobos: { radius: 11.2, distance: 9377, period: 0.3189, obliquity: 0.01 },
  deimos: { radius: 6.2, distance: 23460, period: 1.263, obliquity: 0.93 },
  io: { radius: 1821.6, distance: 421700, period: 1.769, obliquity: 0.0 },
  europa: { radius: 1560.8, distance: 670900, period: 3.551, obliquity: 0.1 },
  ganymede: { radius: 2634.1, distance: 1070400, period: 7.155, obliquity: 0.2 },
  callisto: { radius: 2410.3, distance: 1882700, period: 16.689, obliquity: 0.0 },
  titan: { radius: 2575.5, distance: 1221870, period: 15.945, obliquity: 0.0 },
  rhea: { radius: 763.5, distance: 527040, period: 4.518, obliquity: 0.0 },
  enceladus: { radius: 252.1, distance: 238000, period: 1.370, obliquity: 0.0 },
  titania: { radius: 788.4, distance: 435910, period: 8.706, obliquity: 0.05 },
  oberon: { radius: 761.4, distance: 583520, period: 13.463, obliquity: 0.1 },
  ariel: { radius: 578.9, distance: 191020, period: 2.520, obliquity: 0.04 },
  triton: { radius: 1353.4, distance: 354760, period: -5.877, obliquity: 0.0 },
  proteus: { radius: 210.0, distance: 117640, period: 1.122, obliquity: 0.0 }
};

function getSatelliteDescriptionZh(id: string): string {
  const name = id.toLowerCase();
  switch (name) {
    case 'phobos': return '火卫一（Phobos）是火星最大的天然卫星，呈不规则椰子状。其轨道非常接近火星表面，正在不断因潮汐力拉扯而靠近火星，预计在数千万年后将解体为火星环。';
    case 'deimos': return '火卫二（Deimos）是火星较小且较远的卫星。其表面覆盖着厚厚的尘埃与微流星体碎屑，撞击坑较少，显得十分平滑，可能是一颗被火星引力捕获的小行星。';
    case 'io': return '木卫一（Io）是太阳系中火山活动最剧烈的天体，表面分布着数百座活跃火山。受木星极强引力和潮汐力拉伸，其内部不断摩擦生热并喷射出大量硫磺和二氧化硫。';
    case 'europa': return '木卫二（Europa）表面覆盖着极其光滑和年轻的冰层，冰盖下方隐藏着一个全球性的温暖液态水海洋，被认为是最有可能存在外星生命的星球之一。';
    case 'ganymede': return '木卫三（Ganymede）是太阳系中最大的卫星，其直径甚至大于水星。它是唯一一颗已知拥有自己独立磁层的卫星，内部主要由硅酸盐和冰晶混合构成。';
    case 'callisto': return '木卫四（Callisto）是太阳系中遭到陨石撞击最密集的星体之一，表面极为古老且地质活跃度极低，几乎完整保留了数十亿年前的原始风貌。';
    case 'titan': return '土卫六（Titan）是太阳系中唯一拥有浓厚大气层和液态地表的卫星。其表面有液态甲烷和乙烷组成的湖泊，具有极为丰富的有机物和复杂的有机化学反应。';
    case 'rhea': return '土卫五（Rhea）是土星第二大卫星，是一个富含冰晶的世界。其表面布满密密麻麻的古老撞击坑，并带有极其微弱的二氧化碳和氧气外大气圈。';
    case 'enceladus': return '土卫二（Enceladus）是著名的"喷泉之星"，其南极冰裂缝中不断喷射出巨大的冰晶和水蒸气柱，地下拥有全球性温暖海洋和海底热液喷口。';
    case 'titania': return '天卫三（Titania）是天王星最大的卫星，表面由等量的冰与岩石混合构成，具有巨大的峡谷系统和断裂悬崖，暗示了早期曾发生过地质板块运动。';
    case 'oberon': return '天卫四（Oberon）是天王星最外侧的大卫星，表面极为古老且饱经沧桑。它布满了大大小小的撞击坑，其中许多陨石坑底部覆盖着神秘的暗色碳质物质。';
    case 'ariel': return '天卫一（Ariel）是天王星最亮的卫星，表面地质年龄最年轻，分布着错综复杂的深谷和盆地系统，展现了过去活跃的冰火山和地壳构造活动。';
    case 'triton': return '海卫一（Triton）是太阳系中唯一具有逆行轨道的超大卫星。其表面温度极低（-235 °C），拥有喷射氮气流的冰火山和极其稀薄的氮气大气层。';
    case 'proteus': return '海卫八（Proteus）是海王星第二大卫星，也是太阳系中未形成球体的最大、最怪异的不规则天体之一，表面因巨大陨星坑和构造脊而高度扭曲。';
    default: return `${id} 是一颗神秘的天然卫星。`;
  }
}

function getSatelliteDescriptionEn(id: string): string {
  const name = id.toLowerCase();
  switch (name) {
    case 'phobos': return 'Phobos is Mars\'s largest satellite, shaped irregularly like a coconut. Its orbit is extremely close to Mars, dropping due to tidal drag, and it is expected to break apart into a Martian ring in millions of years.';
    case 'deimos': return 'Deimos is the smaller, outer moon of Mars. Covered by a thick mantle of dusty regolith, it has a surprisingly smooth appearance and is likely a captured asteroid from the outer belt.';
    case 'io': return 'Io is the most volcanically active body in the Solar System, with hundreds of active volcanoes driven by intense tidal heating, stretching and squeezing its interior as it orbits giant Jupiter.';
    case 'europa': return 'Europa features an extremely smooth ice shell covering a global subsurface liquid water ocean, making it one of the most promising candidates in the search for extraterrestrial life.';
    case 'ganymede': return 'Ganymede is the largest moon in the Solar System, even larger than Mercury. It is the only moon known to possess its own magnetosphere, with an interior of liquid iron and silicate rock.';
    case 'callisto': return 'Callisto is the most heavily cratered object in our Solar System, with an ancient surface showing almost no signs of geological activity, preserving a history spanning billions of years.';
    case 'titan': return 'Titan is the only moon with a dense atmosphere and stable bodies of liquid on its surface (methane/ethane lakes), revealing a complex planetary-scale organic chemistry.';
    case 'rhea': return 'Rhea is Saturn\'s second-largest moon, an icy world saturated with impact craters. It features a tenuous, ultra-thin atmosphere composed of oxygen and carbon dioxide.';
    case 'enceladus': return 'Enceladus is famous for its cryovolcanic geysers erupting water vapor and ice crystals from its global subsurface ocean near the south pole, indicating geothermal activity.';
    case 'titania': return 'Titania is Uranus\'s largest moon, composed of mixed rock and ice. It is marked by massive trench networks and grabens, pointing to powerful past endogenic activity.';
    case 'oberon': return 'Oberon is the outermost major moon of Uranus, heavily cratered and extremely ancient. Many of its crater floors are covered by a mysterious dark-colored organic residue.';
    case 'ariel': return 'Ariel is Uranus\'s brightest moon, displaying a complex, relatively young surface grid of deep grabens and fault scraps carved by past cryovolcanism and extensional tectonics.';
    case 'triton': return 'Triton is Neptune\'s largest moon and the only large moon in a retrograde orbit. It features active nitrogen-spewing geysers on a frozen surface of nitrogen and methane ice.';
    case 'proteus': return 'Proteus is Neptune\'s second-largest moon. It is one of the largest non-spherical irregular bodies in the Solar System, heavily distorted by deep impact craters.';
    default: return `${id} is a celestial satellite orbiting its parent planet.`;
  }
}

// ============================================================================
// 子组件：关键数字卡片区域
// ============================================================================
function StatCardsSection({ stats, lang }: { stats: StatCard[]; lang: 'zh' | 'en' }) {
  if (!stats || stats.length === 0) return null;

  const gradients = [
    'from-rose-500/20 to-orange-500/20 border-rose-500/20',
    'from-sky-500/20 to-cyan-500/20 border-sky-500/20',
    'from-amber-500/20 to-yellow-500/20 border-amber-500/20',
    'from-emerald-500/20 to-teal-500/20 border-emerald-500/20',
    'from-violet-500/20 to-fuchsia-500/20 border-violet-500/20',
    'from-blue-500/20 to-indigo-500/20 border-blue-500/20',
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-1.5">
        <span className="text-sm">📊</span>
        <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
          {lang === 'zh' ? '关键数字' : 'Key Numbers'}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 pb-1">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl border bg-gradient-to-br ${gradients[idx % gradients.length]} backdrop-blur-md relative overflow-hidden group`}
            title={stat.tip || ''}
          >
            <span className="text-lg leading-none mb-1">{stat.emoji}</span>
            <span className="text-sm font-bold text-white leading-tight">{stat.value}</span>
            <span className="text-[9px] text-white/60 font-mono leading-tight">{stat.unit}</span>
            <span className="text-[9px] text-white/40 mt-0.5 leading-tight">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 子组件：翻转知识卡
// ============================================================================
function FlipCardsSection({ cards, lang }: { cards: FlipCard[]; lang: 'zh' | 'en' }) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());

  const toggleFlip = useCallback((idx: number) => {
    setFlipped(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  if (!cards || cards.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-1.5">
        <span className="text-sm">🃏</span>
        <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
          {lang === 'zh' ? '翻转知识卡' : 'Flip Cards'}
        </span>
        <span className="text-[9px] text-white/30 ml-auto">
          {lang === 'zh' ? '点击卡片翻转' : 'Tap to flip'}
        </span>
      </div>
      <div className="space-y-2">
        {cards.map((card, idx) => {
          const isFlipped = flipped.has(idx);
          return (
            <div
              key={idx}
              className="relative h-[88px] cursor-pointer group"
              style={{ perspective: '800px' }}
              onClick={() => toggleFlip(idx)}
            >
              <div
                className="relative w-full h-full transition-transform duration-500"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* 正面 */}
                <div
                  className="absolute inset-0 backface-hidden bg-white/[0.04] border border-white/10 rounded-xl p-3 flex items-center space-x-3 hover:border-cyan-500/30 hover:bg-white/[0.06] transition-colors"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="text-2xl flex-shrink-0">{card.front.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium leading-snug">{card.front.question}</p>
                    {card.front.hint && (
                      <p className="text-[10px] text-white/40 mt-0.5">{card.front.hint}</p>
                    )}
                  </div>
                  <span className="text-white/20 text-lg flex-shrink-0">↻</span>
                </div>
                {/* 背面 */}
                <div
                  className="absolute inset-0 backface-hidden bg-gradient-to-br from-cyan-950/40 to-blue-950/40 border border-cyan-500/20 rounded-xl p-3 flex items-center space-x-3"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <span className="text-2xl flex-shrink-0">{card.back.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-cyan-200 font-semibold leading-snug">{card.back.answer}</p>
                    <p className="text-[10px] text-white/60 mt-0.5 leading-snug">{card.back.explanation}</p>
                    <p className="text-[10px] text-amber-400/80 mt-0.5 font-medium">{card.back.wowFactor}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 子组件：生活对比卡片
// ============================================================================
function ComparisonCardsSection({ cards, lang }: { cards: ComparisonCard[]; lang: 'zh' | 'en' }) {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-1.5">
        <span className="text-sm">🌍</span>
        <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
          {lang === 'zh' ? '生活对比' : 'Life Comparison'}
        </span>
      </div>
      <div className="space-y-2">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="bg-white/[0.03] border border-white/10 rounded-xl p-3 hover:border-white/20 transition-colors"
          >
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="text-lg">{card.emoji}</span>
              <span className="text-xs text-white/80 font-medium">{card.question}</span>
            </div>
            <div className="bg-white/[0.04] rounded-lg p-2 text-center">
              <span className="text-sm font-bold text-amber-400">{card.comparison}</span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-white/50">{card.relatable}</span>
              <span className="text-sm">{card.reaction}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 子组件：冷知识轮播
// ============================================================================
function FunFactsSection({ facts, lang }: { facts: FunFact[]; lang: 'zh' | 'en' }) {
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!facts || facts.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setIndex(prev => (prev + 1) % facts.length);
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [facts]);

  const goPrev = useCallback(() => {
    setIndex(prev => (prev - 1 + facts.length) % facts.length);
  }, [facts.length]);

  const goNext = useCallback(() => {
    setIndex(prev => (prev + 1) % facts.length);
  }, [facts.length]);

  if (!facts || facts.length === 0) return null;

  const fact = facts[index];

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-1.5">
        <span className="text-sm">✨</span>
        <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
          {lang === 'zh' ? '趣味冷知识' : 'Fun Facts'}
        </span>
      </div>
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 relative">
        <div className="flex items-start space-x-2">
          <span className="text-xl flex-shrink-0">{fact.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/90 leading-relaxed">{fact.fact}</p>
            {fact.extra && (
              <p className="text-[10px] text-white/50 mt-1 leading-relaxed">{fact.extra}</p>
            )}
          </div>
        </div>

        {facts.length > 1 && (
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
            <button
              onClick={goPrev}
              className="p-1 text-white/30 hover:text-white/70 hover:bg-white/5 rounded transition-colors cursor-pointer"
              aria-label="Previous fact"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex space-x-1">
              {facts.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === index ? 'bg-cyan-400' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={goNext}
              className="p-1 text-white/30 hover:text-white/70 hover:bg-white/5 rounded transition-colors cursor-pointer"
              aria-label="Next fact"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 子组件：情景想象卡片
// ============================================================================
function ImagineSection({ imagine, lang }: { imagine: ImagineCard; lang: 'zh' | 'en' }) {
  if (!imagine || !imagine.effects || imagine.effects.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-1.5">
        <span className="text-sm">🚀</span>
        <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
          {lang === 'zh' ? '假如你在上面...' : 'Imagine You Were There...'}
        </span>
      </div>
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 space-y-2">
        <p className="text-xs text-cyan-300/80 font-medium">{imagine.scenario}</p>
        <div className="space-y-1.5">
          {imagine.effects.map((effect, idx) => (
            <div key={idx} className="flex items-start space-x-2">
              <span className="text-sm flex-shrink-0">{effect.emoji}</span>
              <span className="text-xs text-white/70 leading-relaxed">{effect.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================
export default function PlanetInfoPanel({
  planetId,
  crossSectionActive,
  onToggleCrossSection,
  lang,
  onClose,
  landed = false,
  onToggleLanding,
  isLandable = false,
  textureOffset = { u: 0, v: 0 },
  onChangeTextureOffset,
  cloudsVisible = true,
  onToggleClouds,
  activeLayer,
  onLayerHover,
}: PlanetInfoPanelProps) {
  if (!planetId) return null;

  const isZh = lang === 'zh';
  const isSatellite = !['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'moon'].includes(planetId.toLowerCase());

  // 获取科普数据
  const profile: CelestialProfile | undefined = CELESTIAL_PROFILES[planetId.toLowerCase()];
  const hasProfile = !!profile;

  // Find satellite definition in SATELLITE_DATA
  const satRecord = isSatellite
    ? Object.values(SATELLITE_DATA).flat().find(m => m.nameEn.toLowerCase() === planetId.toLowerCase())
    : null;

  const name = isSatellite
    ? (satRecord ? (isZh ? satRecord.nameZh : satRecord.nameEn) : planetId)
    : translations[lang][`${planetId}_name` as keyof typeof translations['zh']];

  const info = isSatellite
    ? (isZh ? getSatelliteDescriptionZh(planetId) : getSatelliteDescriptionEn(planetId))
    : translations[lang][`${planetId}_info` as keyof typeof translations['zh']];

  // 物理与轨道常数
  const orbit = isSatellite ? null : PLANET_ORBITAL_DATA[planetId];
  const physics = isSatellite ? null : CELESTIAL_PHYSICS[planetId as keyof typeof CELESTIAL_PHYSICS];
  const satPhys = isSatellite ? SATELLITE_PHYSICS_DB[planetId.toLowerCase()] : null;

  // 计算剖面分层卡片展示
  const getLayers = () => {
    switch (planetId) {
      case 'sun':
        return [
          { type: 'core', key: 'sun_core', color: 'from-yellow-400 to-orange-500', name: isZh ? '日核 (热核反应区)' : 'Sun Core (Fusion Zone)', temp: '15,000,000 °C', comp: isZh ? '电离氢、氦核聚变高能粒子体' : 'Ionized hydrogen & helium plasma' },
          { type: 'mantle', key: 'sun_mantle', color: 'from-amber-600 to-red-600', name: isZh ? '辐射与对流区' : 'Radiative & Convective Zone', temp: '2,000,000 °C', comp: isZh ? '对流传递与高能带电等离子流' : 'Radiative & convective loops' },
          { type: 'crust', key: 'sun_crust', color: 'from-orange-500 to-yellow-300', name: isZh ? '光球与色球层' : 'Photosphere & Corona', temp: '5,500 °C', comp: isZh ? '色球表面、热斑及耀斑喷射面' : 'Visual surface with sunspots' }
        ];
      case 'mercury':
        return [
          { type: 'core', key: 'mercury_core', color: 'from-orange-700 to-zinc-600', name: isZh ? '水星核' : 'Mercury Core', temp: '900 °C', comp: isZh ? '超大富铁固态/液态核心' : 'High density iron metal core' },
          { type: 'mantle', key: 'mercury_mantle', color: 'from-yellow-700 to-stone-500', name: isZh ? '水星地幔' : 'Mercury Mantle', temp: '400 °C', comp: isZh ? '坚硬岩石质硅酸盐地幔圈' : 'Rocky silicate mantle' },
          { type: 'crust', key: 'mercury_crust', color: 'from-stone-500 to-stone-600', name: isZh ? '水星地壳' : 'Mercury Crust', temp: '-180 ~ 430 °C', comp: isZh ? '高硬玄武岩撞击风化地表壳' : 'Basalt scarred crust' }
        ];
      case 'venus':
        return [
          { type: 'core', key: 'venus_core', color: 'from-yellow-600 to-amber-700', name: isZh ? '金星核' : 'Venus Core', temp: '5,000 °C', comp: isZh ? '熔融态铁镍重金属核心' : 'Molten iron-nickel core' },
          { type: 'mantle', key: 'venus_mantle', color: 'from-amber-800 to-stone-600', name: isZh ? '金星地幔' : 'Venus Mantle', temp: '3,000 °C', comp: isZh ? '高压粘稠硅酸盐地幔对流带' : 'Silicates viscous mantle' },
          { type: 'crust', key: 'venus_crust', color: 'from-orange-850 to-amber-900', name: isZh ? '金星地壳' : 'Venus Crust', temp: '460 °C', comp: isZh ? '干燥无水玄武岩活火山地层' : 'Dry volcanic basalt lithosphere' },
          { type: 'atmosphere', key: 'venus_atmosphere', color: 'from-yellow-100 to-yellow-400', name: isZh ? '金星大气层' : 'Venus Atmosphere', temp: '470 °C', comp: '96.5% CO2, 强酸腐性硫酸浓雾' }
        ];
      case 'earth':
        return [
          { type: 'core', key: 'earth_core', color: 'from-rose-500 to-yellow-400', name: isZh ? '地核 (内固外液)' : 'Earth Core (Dual State)', temp: '6,000 °C', comp: isZh ? '液态流体外核 + 结晶固态铁镍内核' : 'Liquid outer & solid inner core' },
          { type: 'mantle', key: 'earth_mantle', color: 'from-amber-600 to-stone-600', name: isZh ? '地幔 (熔融下幔/软流圈)' : 'Earth Mantle (Viscous)', temp: '3,500 °C', comp: isZh ? '富硅、镁高粘稠超基性橄榄岩质圈' : 'Viscous silicate minerals' },
          { type: 'crust', key: 'earth_crust', color: 'from-emerald-700 to-blue-700', name: isZh ? '地壳 (陆壳/洋壳)' : 'Earth Crust', temp: '15 °C', comp: isZh ? '含盐分海洋、大陆架花岗岩与丰富有机层' : 'Granites, basalts & water basins' },
          { type: 'atmosphere', key: 'earth_atmosphere', color: 'from-sky-400 to-sky-200 border border-sky-400/20', name: isZh ? '大气圈 (活性气体)' : 'Atmosphere (Active Gases)', temp: '-50 ~ 20 °C', comp: '78% 氮、21% 氧、以及适宜的水温云雾' }
        ];
      case 'moon':
        return [
          { type: 'core', key: 'moon_core', color: 'from-stone-600 to-neutral-400', name: isZh ? '月核' : 'Lunar Core', temp: '1,300 °C', comp: isZh ? '已完全冷却凝固的小型金属铁核' : 'Small solid dormant iron core' },
          { type: 'mantle', key: 'moon_mantle', color: 'from-stone-500 to-stone-400', name: isZh ? '月慢' : 'Lunar Mantle', temp: '800 °C', comp: isZh ? '富橄榄石、辉石的坚硬月地幔' : 'Pyroxene & olivine rocky mantle' },
          { type: 'crust', key: 'moon_crust', color: 'from-stone-300 to-stone-400', name: isZh ? '月壳' : 'Lunar Crust', temp: '-150 ~ 120 °C', comp: isZh ? '粗糙长石斜长岩月壳，上敷灰色月壤' : 'Anorthosite crust with loose regolith' }
        ];
      case 'mars':
        return [
          { type: 'core', key: 'mars_core', color: 'from-orange-800 to-red-950', name: isZh ? '火星核' : 'Mars Core', temp: '2,000 °C', comp: isZh ? '固态铁镍与高度结合硫化物壳核心' : 'Iron, nickel & sulfur alloy core' },
          { type: 'mantle', key: 'mars_mantle', color: 'from-amber-900 to-orange-700', name: isZh ? '火星地幔' : 'Mars Mantle', temp: '1,500 °C', comp: isZh ? '静止不动的长石硅酸盐硬地幔圈' : 'Dormant silicate rocky mantle' },
          { type: 'crust', key: 'mars_crust', color: 'from-red-600 to-orange-600', name: isZh ? '火星地壳' : 'Mars Crust', temp: '-60 °C', comp: isZh ? '富含三氧化二铁红尘砂土层，干燥断裂' : 'Iron oxide sand & basalt bedrock' },
          { type: 'atmosphere', key: 'mars_atmosphere', color: 'from-rose-900/30 to-rose-400/20', name: isZh ? '火星稀薄大气' : 'Mars Thin Atmosphere', temp: '-70 °C', comp: '95% CO2, 极度干冷与稀薄' }
        ];
      case 'jupiter':
        return [
          { type: 'core', key: 'jupiter_core', color: 'from-violet-800 to-fuchsia-900', name: isZh ? '木星超重核' : 'Jupiter Heavy Core', temp: '20,000 °C', comp: isZh ? '十几倍地球质量的超压重岩石与冰晶聚合物' : 'Super-compressed rock & ice kernel' },
          { type: 'mantle', key: 'jupiter_mantle', color: 'from-blue-900 to-purple-800', name: isZh ? '液态金属氢幔层' : 'Metallic Hydrogen Mantle', temp: '9,000 °C', comp: isZh ? '极强导电性质的超高压流动液态金属氢海洋' : 'Fluid superconductive metallic hydrogen' },
          { type: 'atmosphere', key: 'jupiter_atmosphere', color: 'from-orange-200 to-amber-400', name: isZh ? '木星气态大气' : 'Jupiter Gaseous Envelope', temp: '-110 °C', comp: '89% H2, 10% He, 极速流转风暴云带' }
        ];
      case 'saturn':
        return [
          { type: 'core', key: 'saturn_core', color: 'from-stone-600 to-yellow-950', name: isZh ? '土星固态核' : 'Saturn Core', temp: '11,000 °C', comp: isZh ? '高热压缩的硅酸盐與岩石核，外包冰质物' : 'Rocky Core surrounded by chemical ice' },
          { type: 'mantle', key: 'saturn_mantle', color: 'from-yellow-800 to-amber-700', name: isZh ? '金属氢及氦雨幔' : 'Metallic Hydrogen & Helium Rain', temp: '6,000 °C', comp: isZh ? '高压流动金属氢，因温差出现氦雨沉降释放潜热' : 'Turbulent liquid hydrogen with precipitating helium' },
          { type: 'atmosphere', key: 'saturn_atmosphere', color: 'from-yellow-100 to-yellow-400', name: isZh ? '土星大气圈' : 'Saturn Atmosphere', temp: '-140 °C', comp: '96% 氢气以及微量结晶甲烷，极速喷射流' },
          { type: 'ring', key: 'saturn_rings', color: 'from-amber-200 to-amber-600', name: isZh ? '土星环系' : 'Saturn Rings', temp: '-200 °C', comp: isZh ? '主要由冰晶碎片与少量岩石尘埃构成' : 'Ice crystals & rocky dust debris' }
        ];
      case 'uranus':
        return [
          { type: 'core', key: 'uranus_core', color: 'from-sky-800 to-cyan-950', name: isZh ? '天王星金属原子核' : 'Uranus Core', temp: '5,000 °C', comp: isZh ? '重金属、铁镍与冰质种子核' : 'Iron-nickel & silicate rock' },
          { type: 'mantle', key: 'uranus_mantle', color: 'from-cyan-600 to-blue-700', name: isZh ? '超临界热冰地幔' : 'Supercritical Fluid Ice Mantle', temp: '2,500 °C', comp: isZh ? '高导电率的超高压稠密甲烷、氨水极性热流体' : 'Water, ammonia & methane hot fluid ice' },
          { type: 'atmosphere', key: 'uranus_atmosphere', color: 'from-cyan-300 to-cyan-100', name: isZh ? '天王星青绿大气' : 'Uranus Green-Cyan Atmosphere', temp: '-224 °C', comp: '气体氢氦及甲烷分子层，吸收红色可见光' },
          { type: 'ring', key: 'uranus_rings', color: 'from-cyan-200 to-sky-400', name: isZh ? '天王星微弱环系' : 'Uranus Rings', temp: '-210 °C', comp: isZh ? '极暗的碳质有机物与细小岩石颗粒' : 'Dark macroscopic particles & organic matter' }
        ];
      case 'neptune':
        return [
          { type: 'core', key: 'neptune_core', color: 'from-blue-800 to-indigo-950', name: isZh ? '海王星重核' : 'Neptune Heavier Core', temp: '5,400 °C', comp: isZh ? '致密重质硅酸盐岩石与冰层核' : 'Viscous rock & metal heavier core' },
          { type: 'mantle', key: 'neptune_mantle', color: 'from-blue-600 to-indigo-700', name: isZh ? '电离水冰热极性洋' : 'Ionized Slushy Mantle', temp: '3,000 °C', comp: isZh ? '极高盐度与导电率的水、氨超高压超临界质地' : 'Hot ammonia-water sea under extreme pressure' },
          { type: 'atmosphere', key: 'neptune_atmosphere', color: 'from-indigo-400 to-blue-300', name: isZh ? '海王星蔚蓝大气' : 'Neptune Deep Blue Atmosphere', temp: '-218 °C', comp: '富含甲烷超音速狂风层，吸光呈现完美宝石蓝' }
        ];
      default:
        return [];
    }
  };

  const layers = getLayers();

  const [lockedLayer, setLockedLayer] = React.useState<'core' | 'mantle' | 'crust' | 'atmosphere' | 'ring' | null>(null);

  React.useEffect(() => {
    if (activeLayer !== lockedLayer && activeLayer !== null) {
      setLockedLayer(null);
    }
  }, [activeLayer]);

  return (
    <div
      className="bg-black/85 border border-white/10 backdrop-blur-md rounded-2xl p-5 shadow-2xl flex flex-col space-y-4 max-h-[80vh] overflow-y-auto select-none transition-all duration-300 scrollbar"
      id="planet-biography-panel"
    >
      {/* 头部：星体面板与关闭、剖切控件、登录按钮 */}
      <div className="flex justify-between items-start border-b border-white/10 pb-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center space-x-2">
            {hasProfile && (
              <span className="text-xl">{profile.iconEmoji}</span>
            )}
            <span>{name}</span>
          </h2>
          {hasProfile && (
            <p className="text-xs text-cyan-400/80 mt-0.5 italic">
              {profile.tagline[lang]}
            </p>
          )}
          {!hasProfile && (
            <p className="text-[10px] text-cyan-400 tracking-widest uppercase mt-0.5 font-mono">
              {isSatellite ? 'SATELLITE ORBITAL PROFILE' : `${planetId} SYSTEM COORDS`}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* 登录星球按钮 */}
          {isLandable && onToggleLanding && (
            <button
              onClick={onToggleLanding}
              title={landed ? translations[lang].leaveBtn : translations[lang].landBtn}
              className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer border transition-all duration-300 hover:scale-105 active:scale-95 ${
                landed
                  ? 'border-red-500/40 bg-red-950/30 text-red-400 hover:bg-red-950/45'
                  : 'border-cyan-500/40 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-950/45'
              }`}
              id="btn-login-land-planet"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {landed ? (
                  <>
                    <path d="M12 19V5" /><path d="m5 12 7-7 7 7" /><path d="M19 12H5" />
                  </>
                ) : (
                  <>
                    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
                  </>
                )}
              </svg>
            </button>
          )}

          {/* 云层开关仅地球 */}
          {planetId.toLowerCase() === 'earth' && onToggleClouds && (
            <button
              onClick={onToggleClouds}
              disabled={crossSectionActive}
              title={cloudsVisible ? (isZh ? '关闭云层' : 'Hide Clouds') : (isZh ? '显示云层' : 'Show Clouds')}
              className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all ${
                crossSectionActive
                  ? 'opacity-30 cursor-not-allowed bg-white/5 text-white/30 border border-white/10'
                  : cloudsVisible
                    ? 'bg-sky-500/25 border border-sky-400 text-sky-300 shadow-md shadow-sky-950/20'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
              }`}
              id="btn-cloud-toggle"
            >
              <span className="text-sm">{cloudsVisible ? '☁️' : '🌫️'}</span>
            </button>
          )}

          {/* 剖面开合模式开关仅对标准大行星开放 */}
          {!isSatellite && (
            <button
              onClick={() => onToggleCrossSection(!crossSectionActive)}
              title={crossSectionActive ? translations[lang].normalView : translations[lang].crossSection}
              className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all ${
                crossSectionActive
                  ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-300 shadow-md shadow-cyan-950/20'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
              }`}
              id="btn-slice-toggle"
            >
              <span className="text-sm">{crossSectionActive ? '🛡️' : '🔬'}</span>
            </button>
          )}

          {/* 右侧关闭面板按钮 */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer border border-transparent hover:border-white/10"
              title={isZh ? '关闭介绍面板' : 'Close biography panel'}
              id="planet-info-panel-close-btn"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ==================== 新增：丰富互动科普内容 ==================== */}
      {hasProfile && (() => {
        // ── 扫描 profile.stats 已有的概念标签，避免重复 ──
        const existingLabels = profile.stats.map(s => s.label);
        const hasSize   = existingLabels.some(l => /直径|半径|diameter|radius/i.test(l));
        const hasSpin   = existingLabels.some(l => /自转|rotation|spin/i.test(l));
        const hasOrbit  = existingLabels.some(l => /公转|orbital period|revolution/i.test(l));
        const hasDist   = existingLabels.some(l => /距太阳|距地球|距火星|dist/i.test(l));

        // ── 工具函数：AU → 光行时间的直观字符串 ──
        // 光速 ≈ 499.0 秒/AU
        const auToLightTime = (au: number): { value: string; unit: string; tip: string } => {
          const secs = Math.round(au * 499.0);
          if (secs < 90) {
            return {
              value: String(secs),
              unit: isZh ? '光秒' : 'light-sec',
              tip: isZh ? `光从太阳出发 ${secs} 秒后抵达这里` : `Light from the Sun takes ${secs}s to arrive here`,
            };
          }
          const mins = (secs / 60);
          if (mins < 90) {
            return {
              value: mins.toFixed(1),
              unit: isZh ? '光分' : 'light-min',
              tip: isZh ? `光从太阳出发约 ${mins.toFixed(1)} 分钟后才能到达！` : `It takes ${mins.toFixed(1)} min for sunlight to arrive!`,
            };
          }
          const hrs = (secs / 3600);
          return {
            value: hrs.toFixed(1),
            unit: isZh ? '光小时' : 'light-hr',
            tip: isZh ? `太阳光要飞行 ${hrs.toFixed(1)} 小时才能照到这里！` : `Sunlight takes ${hrs.toFixed(1)} hours to reach here!`,
          };
        };

        // ── 工具函数：半径 → "N 个地球并排" 的直观描述 ──
        const EARTH_RADIUS_KM = 6371;
        const radiusToEarthCompare = (r: number): { value: string; unit: string; tip: string } => {
          const ratio = r / EARTH_RADIUS_KM;
          if (ratio >= 2) {
            return {
              value: ratio.toFixed(1),
              unit: isZh ? '倍地球半径' : '× Earth',
              tip: isZh ? `半径约是地球的 ${ratio.toFixed(1)} 倍，可以并排放 ${(ratio * 2).toFixed(0)} 个地球！`
                        : `Radius is ${ratio.toFixed(1)}× Earth's; ${(ratio * 2).toFixed(0)} Earths side by side!`,
            };
          }
          if (ratio < 0.5) {
            const pct = Math.round(ratio * 100);
            return {
              value: `${pct}%`,
              unit: isZh ? '地球半径' : 'Earth radius',
              tip: isZh ? `半径只有地球的 ${pct}%，比一个大洲还小！` : `Radius is only ${pct}% of Earth's`,
            };
          }
          return {
            value: ratio.toFixed(2),
            unit: isZh ? '倍地球半径' : '× Earth R',
            tip: isZh ? `半径约是地球的 ${ratio.toFixed(2)} 倍` : `Radius ~${ratio.toFixed(2)}× Earth`,
          };
        };

        // ── 工具函数：自转周期 → 直观字符串 ──
        const spinToReadable = (hrs: number): { value: string; unit: string; tip: string } => {
          const absHrs = Math.abs(hrs);
          const isRetro = hrs < 0;
          const retroNote = isRetro ? (isZh ? '（逆向自转）' : ' (retrograde)') : '';
          if (absHrs < 48) {
            return {
              value: absHrs.toFixed(1),
              unit: isZh ? '小时/圈' : 'hrs/rev',
              tip: isZh ? `自转一圈需 ${absHrs.toFixed(1)} 小时${retroNote}` : `One full rotation takes ${absHrs.toFixed(1)} h${retroNote}`,
            };
          }
          const days = absHrs / 24;
          return {
            value: days.toFixed(1),
            unit: isZh ? '天/圈' : 'days/rev',
            tip: isZh ? `自转极慢，转一圈需 ${days.toFixed(1)} 天${retroNote}，比公转还慢！`
                      : `Rotates once every ${days.toFixed(1)} days${retroNote} — slower than its year!`,
          };
        };

        // ── 工具函数：轴倾角 → 比喻文字 ──
        const obliquityToDesc = (deg: number): { value: string; unit: string; tip: string } => {
          const absDeg = Math.abs(deg);
          let desc: string;
          let tip: string;
          if (absDeg < 5) {
            desc = isZh ? '近直立' : 'Upright';
            tip = isZh ? `轴倾角仅 ${absDeg.toFixed(1)}°，像陀螺一样直立旋转，几乎无四季变化！` : `Only ${absDeg.toFixed(1)}° tilt — spins nearly upright, almost no seasons!`;
          } else if (absDeg < 30) {
            desc = isZh ? `${absDeg.toFixed(0)}° 微倾` : `${absDeg.toFixed(0)}° tilt`;
            tip = isZh ? `轴倾角 ${absDeg.toFixed(1)}°，四季分明，和地球类似！` : `${absDeg.toFixed(1)}° tilt produces distinct seasons, similar to Earth!`;
          } else if (absDeg < 70) {
            desc = isZh ? `${absDeg.toFixed(0)}° 大倾` : `${absDeg.toFixed(0)}° tilted`;
            tip = isZh ? `轴倾角高达 ${absDeg.toFixed(1)}°，季节极度夸张！` : `A steep ${absDeg.toFixed(1)}° tilt creates extreme seasons!`;
          } else if (absDeg < 110) {
            desc = isZh ? '横躺自转' : 'Rolling';
            tip = isZh ? `轴倾角 ${absDeg.toFixed(1)}°，几乎横躺在轨道平面上滚动前进！` : `${absDeg.toFixed(1)}° tilt — rolls through space on its side like a bowling ball!`;
          } else {
            desc = isZh ? '倒转自转' : 'Inverted';
            tip = isZh ? `轴倾角 ${absDeg.toFixed(1)}°，相当于上下颠倒自转，太阳从西边升起！` : `${absDeg.toFixed(1)}° tilt — spins upside-down; the Sun rises in the west!`;
          }
          return { value: `${absDeg.toFixed(0)}°`, unit: '', tip };
        };

        // ── 工具函数：卫星到母星距离 km → 光行时间（秒/分钟）──
        const kmToLightTime = (km: number): { value: string; unit: string; tip: string } => {
          const secs = km / 299792; // 光速约 299,792 km/s
          if (secs < 5) {
            return {
              value: secs.toFixed(2),
              unit: isZh ? '光秒' : 'light-sec',
              tip: isZh ? `光从母星飞到这里只需 ${secs.toFixed(2)} 秒，近得出乎意料！` : `Light from its planet arrives in just ${secs.toFixed(2)} s!`,
            };
          }
          if (secs < 120) {
            return {
              value: secs.toFixed(1),
              unit: isZh ? '光秒' : 'light-sec',
              tip: isZh ? `光从母星出发 ${secs.toFixed(1)} 秒后到达` : `Light takes ${secs.toFixed(1)} s to travel from its planet`,
            };
          }
          const mins = secs / 60;
          return {
            value: mins.toFixed(1),
            unit: isZh ? '光分' : 'light-min',
            tip: isZh ? `光从母星出发 ${mins.toFixed(1)} 分钟后才能到达` : `Light takes ${mins.toFixed(1)} min to arrive`,
          };
        };

        const physicsStatCards: import('../data/celestialProfiles').StatCard[] = [];

        // ── 大行星 / 太阳 物理参数卡 ──
        if (!isSatellite && physics) {
          // 尺寸：只在 profile 未展示过尺寸时才加
          if (!hasSize) {
            const earthCmp = radiusToEarthCompare(physics.radius);
            physicsStatCards.push({
              emoji: '📐',
              value: earthCmp.value,
              unit: earthCmp.unit,
              label: isZh ? '体积大小' : 'Size',
              tip: earthCmp.tip,
            });
          }
          // 自转周期：只在 profile 未展示过自转时才加
          if (!hasSpin) {
            const spinInfo = spinToReadable(physics.rotationPeriod);
            physicsStatCards.push({
              emoji: '🔄',
              value: spinInfo.value,
              unit: spinInfo.unit,
              label: isZh ? '自转周期' : 'Day Length',
              tip: spinInfo.tip,
            });
          }
          // 轴倾角：始终显示，用直观描述
          const oblInfo = obliquityToDesc(physics.obliquity);
          physicsStatCards.push({
            emoji: '🌐',
            value: oblInfo.value,
            unit: oblInfo.unit,
            label: isZh ? '自转轴倾角' : 'Axial Tilt',
            tip: oblInfo.tip,
          });
        }

        // ── 大行星轨道参数卡 ──
        if (!isSatellite && orbit) {
          // 到太阳的距离：只在 profile 未展示过距离时才加，且换成光行时间
          if (!hasDist) {
            const lt = auToLightTime(orbit.a);
            physicsStatCards.push({
              emoji: '💡',
              value: lt.value,
              unit: lt.unit,
              label: isZh ? '距太阳光程' : 'Sunlight Travel',
              tip: lt.tip,
            });
          }
          // 公转周期：只在 profile 未展示过公转时才加
          if (!hasOrbit) {
            const years = orbit.period / 365.25;
            physicsStatCards.push({
              emoji: '🔭',
              value: years >= 1 ? `${years.toFixed(1)} 年` : `${Math.round(orbit.period)} 天`,
              unit: '',
              label: isZh ? '公转周期' : 'Orbital Period',
              tip: isZh
                ? `绕太阳一圈需 ${orbit.period.toLocaleString()} 地球日（${years.toFixed(2)} 地球年）`
                : `One orbit = ${orbit.period.toLocaleString()} Earth days (${years.toFixed(2)} Earth years)`,
            });
          }
        }

        // ── 卫星物理参数卡 ──
        if (isSatellite && satPhys) {
          // 卫星尺寸（profile 未有时才加）
          if (!hasSize) {
            const earthCmp = radiusToEarthCompare(satPhys.radius);
            physicsStatCards.push({
              emoji: '📐',
              value: earthCmp.value,
              unit: earthCmp.unit,
              label: isZh ? '体积大小' : 'Size',
              tip: earthCmp.tip,
            });
          }
          // 到母星的距离 → 光行时间
          if (!hasDist) {
            const lt = kmToLightTime(satPhys.distance);
            physicsStatCards.push({
              emoji: '💡',
              value: lt.value,
              unit: lt.unit,
              label: isZh ? '离母星光程' : 'Light Travel',
              tip: lt.tip,
            });
          }
          // 公转周期（未有时才加，逆行信息合并进 tip）
          if (!hasOrbit) {
            const isRetro = satPhys.period < 0;
            const absPeriod = Math.abs(satPhys.period);
            const periodStr = absPeriod < 1
              ? `${(absPeriod * 24).toFixed(1)} ${isZh ? '小时' : 'hrs'}`
              : `${absPeriod.toFixed(2)} ${isZh ? '天' : 'd'}`;
            physicsStatCards.push({
              emoji: isRetro ? '↺' : '🔭',
              value: periodStr,
              unit: '',
              label: isZh ? (isRetro ? '逆行公转' : '公转周期') : (isRetro ? 'Retrograde' : 'Orbital Period'),
              tip: isRetro
                ? (isZh ? `逆行轨道，绕母星一圈需 ${absPeriod.toFixed(3)} 天！太阳系中极为罕见。` : `Retrograde orbit — takes ${absPeriod.toFixed(3)} days. Extremely rare in the solar system!`)
                : (isZh ? `绕母星一圈需 ${absPeriod.toFixed(3)} 天` : `Orbits its planet every ${absPeriod.toFixed(3)} days`),
            });
          }
        }

        const mergedStats = [...profile.stats, ...physicsStatCards];
        return (
          <div className="space-y-4">
            <StatCardsSection stats={mergedStats} lang={lang} />
            <FlipCardsSection cards={profile.flipCards} lang={lang} />
            <ComparisonCardsSection cards={profile.comparisons} lang={lang} />
            <FunFactsSection facts={profile.funFacts} lang={lang} />
            <ImagineSection imagine={profile.imagine} lang={lang} />
          </div>
        );
      })()}

      {/* ==================== 原有：描述与物性参数卡片 ==================== */}
      <div className="space-y-3">
        {hasProfile && (
          <div className="flex items-center space-x-1.5 pt-1">
            <span className="text-sm">📖</span>
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
              {lang === 'zh' ? '正经科普' : 'Description'}
            </span>
          </div>
        )}
        <div className="text-xs text-white/80 leading-relaxed bg-white/[0.03] p-3 rounded-xl border border-white/5">
          {info}
        </div>

        {/* 剖面详情或物理参数 */}
        {crossSectionActive && !isSatellite ? (
          <div className="space-y-3 pt-1 border-t border-white/10">
            <p className="text-[10px] text-white/40 tracking-wider uppercase font-mono">
              ✨ {translations[lang].crossSectionInfo}
            </p>
            {/* 3D 类似折叠层 */}
            <div className="space-y-2">
              {layers.map((layer, idx) => {
                const isActive = activeLayer === layer.type || lockedLayer === layer.type;
                return (
                  <div
                    key={idx}
                    className={`bg-white/[0.02] border rounded-xl p-2.5 flex items-start space-x-3 transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'border-cyan-500/50 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.15)] -translate-x-2 scale-[1.02]'
                        : 'border-white/5 hover:bg-white/[0.05]'
                    }`}
                    onMouseEnter={() => {
                      if (!lockedLayer) onLayerHover?.(layer.type as any);
                    }}
                    onMouseLeave={() => {
                      if (!lockedLayer) onLayerHover?.(null);
                    }}
                    onClick={() => {
                      if (lockedLayer === layer.type) {
                        setLockedLayer(null);
                        onLayerHover?.(null);
                      } else {
                        setLockedLayer(layer.type as any);
                        onLayerHover?.(layer.type as any);
                      }
                    }}
                  >
                    <div className={`w-3 h-10 rounded-full bg-gradient-to-b ${layer.color} shrink-0 mt-0.5 ${isActive ? 'shadow-[0_0_8px_currentColor]' : ''}`} />
                    <div className="flex-1 space-y-0.5 min-w-0">
                      <div className="flex justify-between text-xs font-semibold text-white">
                        <span className={isActive ? 'text-cyan-300' : ''}>{layer.name}</span>
                        <span className={`${isActive ? 'text-cyan-400' : 'text-amber-400'} font-mono text-[10px]`}>{layer.temp}</span>
                      </div>
                      <p className={`text-[10.5px] ${isActive ? 'text-cyan-100/90' : 'text-white/70'} leading-normal truncate-2-lines`}>
                        {translations[lang][layer.key as keyof typeof translations['zh']] || layer.comp}
                      </p>
                      <p className={`text-[9.5px] ${isActive ? 'text-cyan-500/60' : 'text-white/40'} font-mono truncate`}>
                        {translations[lang].composition}: {layer.comp}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : hasProfile ? null : (
          // 无科普档案时，在底部保留原始物理参数网格
          <div className="space-y-2 border-t border-white/10 pt-3">
            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">
              📋 {translations[lang].parameters}
            </h3>

            <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono">
              {!isSatellite && physics && (
                <>
                  <div className="bg-white/[0.02] p-2 border border-white/5 rounded-lg">
                    <div className="text-white/40 text-[9px] uppercase font-sans mb-0.5">{translations[lang].realRadius}</div>
                    <div className="text-white font-semibold">{physics.radius.toLocaleString()} km</div>
                  </div>
                  <div className="bg-white/[0.02] p-2 border border-white/5 rounded-lg">
                    <div className="text-white/40 text-[9px] uppercase font-sans mb-0.5">{translations[lang].rotationPeriod}</div>
                    <div className="text-white font-semibold">{Math.abs(physics.rotationPeriod).toLocaleString()} hrs</div>
                  </div>
                  <div className="bg-white/[0.02] p-2 border border-white/5 rounded-lg col-span-2">
                    <div className="text-white/40 text-[9px] uppercase font-sans mb-0.5">{translations[lang].obliquity}</div>
                    <div className="text-white font-semibold">{physics.obliquity.toFixed(2)}°</div>
                  </div>
                </>
              )}
              {!isSatellite && orbit && (
                <>
                  <div className="bg-white/[0.02] p-2 border border-white/5 rounded-lg col-span-2">
                    <div className="text-white/40 text-[9px] uppercase font-sans mb-0.5">{translations[lang].realDistance}</div>
                    <div className="text-white font-semibold">{orbit.a.toFixed(4)} AU</div>
                  </div>
                  <div className="bg-white/[0.02] p-2 border border-white/5 rounded-lg col-span-2">
                    <div className="text-white/40 text-[9px] uppercase font-sans mb-0.5">{translations[lang].orbitalPeriod}</div>
                    <div className="text-white font-semibold">{orbit.period.toLocaleString()} {isZh ? "地球日" : "Days"}</div>
                  </div>
                </>
              )}

              {isSatellite && satPhys && (
                <>
                  <div className="bg-white/[0.02] p-2 border border-white/5 rounded-lg">
                    <div className="text-white/40 text-[9px] uppercase font-sans mb-0.5">{translations[lang].realRadius}</div>
                    <div className="text-white font-semibold">{satPhys.radius.toLocaleString()} km</div>
                  </div>
                  <div className="bg-white/[0.02] p-2 border border-white/5 rounded-lg">
                    <div className="text-white/40 text-[9px] uppercase font-sans mb-0.5">{isZh ? "轨道运行方向" : "Orbit Direction"}</div>
                    <div className="text-white font-semibold">{satPhys.period < 0 ? (isZh ? "逆行" : "Retrograde") : (isZh ? "顺行" : "Prograde")}</div>
                  </div>
                  <div className="bg-white/[0.02] p-2 border border-white/5 rounded-lg col-span-2">
                    <div className="text-white/40 text-[9px] uppercase font-sans mb-0.5">{isZh ? "平均轨道半径" : "Average Orbital Distance"}</div>
                    <div className="text-white font-semibold">{satPhys.distance.toLocaleString()} km</div>
                  </div>
                  <div className="bg-white/[0.02] p-2 border border-white/5 rounded-lg col-span-2">
                    <div className="text-white/40 text-[9px] uppercase font-sans mb-0.5">{translations[lang].orbitalPeriod}</div>
                    <div className="text-white font-semibold">
                      {Math.abs(satPhys.period).toLocaleString()} {isZh ? "地球日" : "Days"}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 贴图 UV 偏移校准工具 */}
      {onChangeTextureOffset && (!isSatellite || planetId.toLowerCase() === 'moon') && (
        <div className="border-t border-white/10 pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">
              🎨 {isZh ? '贴图偏移校准' : 'Texture Offset'}
            </h3>
            <span className="text-[9px] text-cyan-500/60 font-mono">UV OFFSET</span>
          </div>

          <div className="space-y-2.5">
            {/* U offset slider — 仅校准经度方向 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-white/50">U (longitude)</span>
                <span className="text-cyan-400">{textureOffset.u.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={-0.5}
                max={0.5}
                step={0.01}
                value={textureOffset.u}
                onChange={(e) =>
                  onChangeTextureOffset({ u: parseFloat(e.target.value), v: 0 })
                }
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
              />
            </div>
          </div>

          <button
            onClick={async () => {
              const payload = JSON.stringify({ planetId, u: textureOffset.u });
              try {
                await navigator.clipboard.writeText(payload);
                alert(isZh ? `已复制: ${payload}` : `Copied: ${payload}`);
              } catch {
                alert(isZh ? '复制失败，请手动复制' : 'Copy failed, please copy manually');
              }
            }}
            className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-lg text-[11px] font-semibold cursor-pointer border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-950/40 hover:border-cyan-500/50 active:scale-95 transition-all"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>{isZh ? '复制结果' : 'Copy Result'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

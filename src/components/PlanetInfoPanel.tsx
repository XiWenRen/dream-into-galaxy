/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { translations } from '../i18n';
import { PLANET_ORBITAL_DATA, CELESTIAL_PHYSICS } from '../engine/OrbitEngine';
import { SATELLITE_DATA } from './UniverseViewer';

interface PlanetInfoPanelProps {
  planetId: string;
  crossSectionActive: boolean;
  onToggleCrossSection: (active: boolean) => void;
  lang: 'zh' | 'en';
  onClose?: () => void;
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
  triton: { radius: 1353.4, distance: 354760, period: -5.877, obliquity: 0.0 }, // negative for retrograde
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
    case 'enceladus': return '土卫二（Enceladus）是著名的“喷泉之星”，其南极冰裂缝中不断喷射出巨大的冰晶和水蒸气柱，地下拥有全球性温暖海洋和海底热液喷口。';
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
    case 'phobos': return 'Phobos is Mars’s largest satellite, shaped irregularly like a coconut. Its orbit is extremely close to Mars, dropping due to tidal drag, and it is expected to break apart into a Martian ring in millions of years.';
    case 'deimos': return 'Deimos is the smaller, outer moon of Mars. Covered by a thick mantle of dusty regolith, it has a surprisingly smooth appearance and is likely a captured asteroid from the outer belt.';
    case 'io': return 'Io is the most volcanically active body in the Solar System, with hundreds of active volcanoes driven by intense tidal heating, stretching and squeezing its interior as it orbits giant Jupiter.';
    case 'europa': return 'Europa features an extremely smooth ice shell covering a global subsurface liquid water ocean, making it one of the most promising candidates in the search for extraterrestrial life.';
    case 'ganymede': return 'Ganymede is the largest moon in the Solar System, even larger than Mercury. It is the only moon known to possess its own magnetosphere, with an interior of liquid iron and silicate rock.';
    case 'callisto': return 'Callisto is the most heavily cratered object in our Solar System, with an ancient surface showing almost no signs of geological activity, preserving a history spanning billions of years.';
    case 'titan': return 'Titan is the only moon with a dense atmosphere and stable bodies of liquid on its surface (methane/ethane lakes), revealing a complex planetary-scale organic chemistry.';
    case 'rhea': return 'Rhea is Saturn’s second-largest moon, an icy world saturated with impact craters. It features a tenuous, ultra-thin atmosphere composed of oxygen and carbon dioxide.';
    case 'enceladus': return 'Enceladus is famous for its cryovolcanic geysers erupting water vapor and ice crystals from its global subsurface ocean near the south pole, indicating geothermal activity.';
    case 'titania': return 'Titania is Uranus’s largest moon, composed of mixed rock and ice. It is marked by massive trench networks and grabens, pointing to powerful past endogenic activity.';
    case 'oberon': return 'Oberon is the outermost major moon of Uranus, heavily cratered and extremely ancient. Many of its crater floors are covered by a mysterious dark-colored organic residue.';
    case 'ariel': return 'Ariel is Uranus’s brightest moon, displaying a complex, relatively young surface grid of deep grabens and fault scraps carved by past cryovolcanism and extensional tectonics.';
    case 'triton': return 'Triton is Neptune’s largest moon and the only large moon in a retrograde orbit. It features active nitrogen-spewing geysers on a frozen surface of nitrogen and methane ice.';
    case 'proteus': return 'Proteus is Neptune’s second-largest moon. It is one of the largest non-spherical irregular bodies in the Solar System, heavily distorted by deep impact craters.';
    default: return `${id} is a celestial satellite orbiting its parent planet.`;
  }
}

export default function PlanetInfoPanel({
  planetId,
  crossSectionActive,
  onToggleCrossSection,
  lang,
  onClose
}: PlanetInfoPanelProps) {
  if (!planetId) return null;

  const isZh = lang === 'zh';
  const isSatellite = !['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'moon'].includes(planetId.toLowerCase());

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

  // 计算剖面分层卡片展示 (重构，支持高精度个性化学术命名，防止统一“星核/星幔”)
  const getLayers = () => {
    switch (planetId) {
      case 'sun':
        return [
          { key: 'sun_core', color: 'from-yellow-400 to-orange-500', name: isZh ? '日核 (热核反应区)' : 'Sun Core (Fusion Zone)', temp: '15,000,000 °C', comp: isZh ? '电离氢、氦核聚变高能粒子体' : 'Ionized hydrogen & helium plasma' },
          { key: 'sun_mantle', color: 'from-amber-600 to-red-600', name: isZh ? '辐射与对流区' : 'Radiative & Convective Zone', temp: '2,000,000 °C', comp: isZh ? '对流传递与高能带电等离子流' : 'Radiative & convective loops' },
          { key: 'sun_crust', color: 'from-orange-500 to-yellow-300', name: isZh ? '光球与色球层' : 'Photosphere & Corona', temp: '5,500 °C', comp: isZh ? '色球表面、热斑及耀斑喷射面' : 'Visual surface with sunspots' }
        ];
      case 'mercury':
        return [
          { key: 'mercury_core', color: 'from-orange-700 to-zinc-600', name: isZh ? '水星核' : 'Mercury Core', temp: '900 °C', comp: isZh ? '超大富铁固态/液态核心' : 'High density iron metal core' },
          { key: 'mercury_mantle', color: 'from-yellow-700 to-stone-500', name: isZh ? '水星地幔' : 'Mercury Mantle', temp: '400 °C', comp: isZh ? '坚硬岩石质硅酸盐地幔圈' : 'Rocky silicate mantle' },
          { key: 'mercury_crust', color: 'from-stone-500 to-stone-600', name: isZh ? '水星地壳' : 'Mercury Crust', temp: '-180 ~ 430 °C', comp: isZh ? '高硬玄武岩撞击风化地表壳' : 'Basalt scarred crust' }
        ];
      case 'venus':
        return [
          { key: 'venus_core', color: 'from-yellow-600 to-amber-700', name: isZh ? '金星核' : 'Venus Core', temp: '5,000 °C', comp: isZh ? '熔融态铁镍重金属核心' : 'Molten iron-nickel core' },
          { key: 'venus_mantle', color: 'from-amber-800 to-stone-600', name: isZh ? '金星地幔' : 'Venus Mantle', temp: '3,000 °C', comp: isZh ? '高压粘稠硅酸盐地幔对流带' : 'Silicates viscous mantle' },
          { key: 'venus_crust', color: 'from-orange-850 to-amber-900', name: isZh ? '金星地壳' : 'Venus Crust', temp: '460 °C', comp: isZh ? '干燥无水玄武岩活火山地层' : 'Dry volcanic basalt lithosphere' },
          { key: 'venus_atmosphere', color: 'from-yellow-100 to-yellow-400', name: isZh ? '金星大气层' : 'Venus Atmosphere', temp: '470 °C', comp: '96.5% CO2, 强酸腐性硫酸浓雾' }
        ];
      case 'earth':
        return [
          { key: 'earth_core', color: 'from-rose-500 to-yellow-400', name: isZh ? '地核 (内固外液)' : 'Earth Core (Dual State)', temp: '6,000 °C', comp: isZh ? '液态流体外核 + 结晶固态铁镍内核' : 'Liquid outer & solid inner core' },
          { key: 'earth_mantle', color: 'from-amber-600 to-stone-600', name: isZh ? '地幔 (熔融下幔/软流圈)' : 'Earth Mantle (Viscous)', temp: '3,500 °C', comp: isZh ? '富硅、镁高粘稠超基性橄榄岩质圈' : 'Viscous silicate minerals' },
          { key: 'earth_crust', color: 'from-emerald-700 to-blue-700', name: isZh ? '地壳 (陆壳/洋壳)' : 'Earth Crust', temp: '15 °C', comp: isZh ? '含盐分海洋、大陆架花岗岩与丰富有机层' : 'Granites, basalts & water basins' },
          { key: 'earth_atmosphere', color: 'from-sky-400 to-sky-200 border border-sky-400/20', name: isZh ? '大气圈 (活性气体)' : 'Atmosphere (Active Gases)', temp: '-50 ~ 20 °C', comp: '78% 氮、21% 氧、以及适宜的水温云雾' }
        ];
      case 'moon':
        return [
          { key: 'moon_core', color: 'from-stone-600 to-neutral-400', name: isZh ? '月核' : 'Lunar Core', temp: '1,300 °C', comp: isZh ? '已完全冷却凝固的小型金属铁核' : 'Small solid dormant iron core' },
          { key: 'moon_mantle', color: 'from-stone-500 to-stone-400', name: isZh ? '月慢' : 'Lunar Mantle', temp: '800 °C', comp: isZh ? '富橄榄石、辉石的坚硬月地幔' : 'Pyroxene & olivine rocky mantle' },
          { key: 'moon_crust', color: 'from-stone-300 to-stone-400', name: isZh ? '月壳' : 'Lunar Crust', temp: '-150 ~ 120 °C', comp: isZh ? '粗糙长石斜长岩月壳，上敷灰色月壤' : 'Anorthosite crust with loose regolith' }
        ];
      case 'mars':
        return [
          { key: 'mars_core', color: 'from-orange-800 to-red-950', name: isZh ? '火星核' : 'Mars Core', temp: '2,000 °C', comp: isZh ? '固态铁镍与高度结合硫化物壳核心' : 'Iron, nickel & sulfur alloy core' },
          { key: 'mars_mantle', color: 'from-amber-900 to-orange-700', name: isZh ? '火星地幔' : 'Mars Mantle', temp: '1,500 °C', comp: isZh ? '静止不动的长石硅酸盐硬地幔圈' : 'Dormant silicate rocky mantle' },
          { key: 'mars_crust', color: 'from-red-600 to-orange-600', name: isZh ? '火星地壳' : 'Mars Crust', temp: '-60 °C', comp: isZh ? '富含三氧化二铁红尘砂土层，干燥断裂' : 'Iron oxide sand & basalt bedrock' },
          { key: 'mars_atmosphere', color: 'from-rose-900/30 to-rose-400/20', name: isZh ? '火星稀薄大气' : 'Mars Thin Atmosphere', temp: '-70 °C', comp: '95% CO2, 极度干冷与稀薄' }
        ];
      case 'jupiter':
        return [
          { key: 'jupiter_core', color: 'from-violet-800 to-fuchsia-900', name: isZh ? '木星超重核' : 'Jupiter Heavy Core', temp: '20,000 °C', comp: isZh ? '十几倍地球质量的超压重岩石与冰晶聚合物' : 'Super-compressed rock & ice kernel' },
          { key: 'jupiter_mantle', color: 'from-blue-900 to-purple-800', name: isZh ? '液态金属氢幔层' : 'Metallic Hydrogen Mantle', temp: '9,000 °C', comp: isZh ? '极强导电性质的超高压流动液态金属氢海洋' : 'Fluid superconductive metallic hydrogen' },
          { key: 'jupiter_atmosphere', color: 'from-orange-200 to-amber-400', name: isZh ? '木星气态大气' : 'Jupiter Gaseous Envelope', temp: '-110 °C', comp: '89% H2, 10% He, 极速流转风暴云带' }
        ];
      case 'saturn':
        return [
          { key: 'saturn_core', color: 'from-stone-600 to-yellow-950', name: isZh ? '土星固态核' : 'Saturn Core', temp: '11,000 °C', comp: isZh ? '高热压缩的硅酸盐與岩石核，外包冰质物' : 'Rocky Core surrounded by chemical ice' },
          { key: 'saturn_mantle', color: 'from-yellow-800 to-amber-700', name: isZh ? '金属氢及氦雨幔' : 'Metallic Hydrogen & Helium Rain', temp: '6,000 °C', comp: isZh ? '高压流动金属氢，因温差出现氦雨沉降释放潜热' : 'Turbulent liquid hydrogen with precipitating helium' },
          { key: 'saturn_atmosphere', color: 'from-yellow-100 to-yellow-400', name: isZh ? '土星大气圈' : 'Saturn Atmosphere', temp: '-140 °C', comp: '96% 氢气以及微量结晶甲烷，极速喷射流' }
        ];
      case 'uranus':
        return [
          { key: 'uranus_core', color: 'from-sky-800 to-cyan-950', name: isZh ? '天王星金属原子核' : 'Uranus Core', temp: '5,000 °C', comp: isZh ? '重金属、铁镍与冰质种子核' : 'Iron-nickel & silicate rock' },
          { key: 'uranus_mantle', color: 'from-cyan-600 to-blue-700', name: isZh ? '超临界热冰地幔' : 'Supercritical Fluid Ice Mantle', temp: '2,500 °C', comp: isZh ? '高导电率的超高压稠密甲烷、氨水极性热流体' : 'Water, ammonia & methane hot fluid ice' },
          { key: 'uranus_atmosphere', color: 'from-cyan-300 to-cyan-100', name: isZh ? '天王星青绿大气' : 'Uranus Green-Cyan Atmosphere', temp: '-224 °C', comp: '气体氢氦及甲烷分子层，吸收红色可见光' }
        ];
      case 'neptune':
        return [
          { key: 'neptune_core', color: 'from-blue-800 to-indigo-950', name: isZh ? '海王星重核' : 'Neptune Heavier Core', temp: '5,400 °C', comp: isZh ? '致密重质硅酸盐岩石与冰层核' : 'Viscous rock & metal heavier core' },
          { key: 'neptune_mantle', color: 'from-blue-600 to-indigo-700', name: isZh ? '电离水冰热极性洋' : 'Ionized Slushy Mantle', temp: '3,000 °C', comp: isZh ? '极高盐度与导电率的水、氨超高压超临界质地' : 'Hot ammonia-water sea under extreme pressure' },
          { key: 'neptune_atmosphere', color: 'from-indigo-400 to-blue-300', name: isZh ? '海王星蔚蓝大气' : 'Neptune Deep Blue Atmosphere', temp: '-218 °C', comp: '富含甲烷超音速狂风层，吸光呈现完美宝石蓝' }
        ];
      default:
        return [];
    }
  };

  const layers = getLayers();

  return (
    <div 
      className="bg-black/85 border border-white/10 backdrop-blur-md rounded-2xl p-5 shadow-2xl flex flex-col space-y-4 max-h-[85vh] overflow-y-auto select-none transition-all duration-300 scrollbar"
      id="planet-biography-panel"
    >
      {/* 头部：星体面板与关闭、剖切控件 */}
      <div className="flex justify-between items-start border-b border-white/10 pb-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center space-x-2">
            <span>{name}</span>
          </h2>
          <p className="text-[10px] text-cyan-400 tracking-widest uppercase mt-0.5 font-mono">
            {isSatellite ? 'SATELLITE ORBITAL PROFILE' : `${planetId} SYSTEM COORDS`}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* 剖面开合模式开关仅对标准大行星开放 */}
          {!isSatellite && (
            <button
              onClick={() => onToggleCrossSection(!crossSectionActive)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                crossSectionActive
                  ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-300 shadow-md shadow-cyan-950/20'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
              }`}
              id="btn-slice-toggle"
            >
              <span>{crossSectionActive ? '🛡️' : '🔬'}</span>
              <span>{crossSectionActive ? translations[lang].normalView : translations[lang].crossSection}</span>
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

      {/* 描述与物性参数卡片 */}
      <div className="space-y-3">
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
              {layers.map((layer, idx) => (
                <div 
                  key={idx} 
                  className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex items-start space-x-3 hover:bg-white/[0.05] transition-colors"
                >
                  <div className={`w-3 h-10 rounded-full bg-gradient-to-b ${layer.color} shrink-0 mt-0.5`} />
                  <div className="flex-1 space-y-0.5 min-w-0">
                    <div className="flex justify-between text-xs font-semibold text-white">
                      <span>{layer.name}</span>
                      <span className="text-amber-400 font-mono text-[10px]">{layer.temp}</span>
                    </div>
                    <p className="text-[10.5px] text-white/70 leading-normal truncate-2-lines">
                      {translations[lang][layer.key as keyof typeof translations['zh']] || layer.comp}
                    </p>
                    <p className="text-[9.5px] text-white/40 font-mono truncate">
                      {translations[lang].composition}: {layer.comp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
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
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TranslationDict {
  // UI Controls
  title: string;
  subtitle: string;
  universeView: string;
  landedView: string;
  zoomLevel: string;
  timeSpeed: string;
  paused: string;
  running: string;
  latitude: string;
  longitude: string;
  landBtn: string;
  leaveBtn: string;
  crossSection: string;
  normalView: string;
  speedUnit: string;
  presetDates: string;
  today: string;
  eclipseSimulation: string;
  solarTerm: string;
  currentSolarTerm: string;
  nextSolarTerm: string;
  eclipseWarning: string;
  noEclipse: string;
  solarEclipseOccurring: string;
  lunarEclipseOccurring: string;
  constellationLines: string;
  starNames: string;
  constellationNames: string;
  observingFrom: string;
  searchPlanet: string;
  allPlanets: string;
  core: string;
  mantle: string;
  crust: string;
  atmosphere: string;
  corona: string;
  temp: string;
  composition: string;
  info: string;
  parameters: string;
  orbitalPeriod: string;
  rotationPeriod: string;
  realRadius: string;
  realDistance: string;
  obliquity: string;
  moonPhase: string;
  landingTitle: string;
  landingInstructions: string;
  calibrationCheck: string;
  calibrationSuccess: string;
  milkyWayScale: string;
  themeSelect: string;
  themeTech: string;
  themeDark: string;
  themeNeon: string;
  themeGold: string;
  crossSectionInfo: string;
  magLimitLabel: string;
  magLimitBrightest: string;
  magLimitAll: string;

  // New immersive cockpit keys
  commandPanel: string;
  timeReal: string;
  timeReverse: string;
  timeAccel: string;
  selectDate: string;
  utcMode: string;
  localMode: string;
  systemInfo: string;
  expand: string;
  collapse: string;
  backToPresent: string;

  // Planet Names & Info
  sun_name: string;
  sun_info: string;
  sun_core: string;
  sun_mantle: string;
  sun_crust: string;
  
  mercury_name: string;
  mercury_info: string;
  mercury_core: string;
  mercury_mantle: string;
  mercury_crust: string;

  venus_name: string;
  venus_info: string;
  venus_core: string;
  venus_mantle: string;
  venus_crust: string;
  venus_atmosphere: string;

  earth_name: string;
  earth_info: string;
  earth_core: string;
  earth_mantle: string;
  earth_crust: string;
  earth_atmosphere: string;

  moon_name: string;
  moon_info: string;
  moon_core: string;
  moon_mantle: string;
  moon_crust: string;

  mars_name: string;
  mars_info: string;
  mars_core: string;
  mars_mantle: string;
  mars_crust: string;
  mars_atmosphere: string;

  jupiter_name: string;
  jupiter_info: string;
  jupiter_core: string;
  jupiter_mantle: string;
  jupiter_atmosphere: string;

  saturn_name: string;
  saturn_info: string;
  saturn_core: string;
  saturn_mantle: string;
  saturn_atmosphere: string;

  uranus_name: string;
  uranus_info: string;
  uranus_core: string;
  uranus_mantle: string;
  uranus_atmosphere: string;

  neptune_name: string;
  neptune_info: string;
  neptune_core: string;
  neptune_mantle: string;
  neptune_atmosphere: string;

  // Solar Terms
  term_lichun: string;
  term_yushui: string;
  term_jingzhe: string;
  term_chunfen: string;
  term_qingming: string;
  term_guyu: string;
  term_lixia: string;
  term_xiaoman: string;
  term_mangzhong: string;
  term_xiazhi: string;
  term_xiaoshu: string;
  term_dashu: string;
  term_liqiu: string;
  term_chushu: string;
  term_bailu: string;
  term_qiufen: string;
  term_hanlu: string;
  term_shuangjiang: string;
  term_lidong: string;
  term_xiaoxue: string;
  term_daxue: string;
  term_dongzhi: string;
  term_xiaohan: string;
  term_dahan: string;

  // Solar terms explanations
  term_desc: string;

  // Moon phases
  phase_new: string;
  phase_waxing_crescent: string;
  phase_first_quarter: string;
  phase_waxing_gibbous: string;
  phase_full: string;
  phase_waning_gibbous: string;
  phase_last_quarter: string;
  phase_waning_crescent: string;
}

export const translations: Record<'zh' | 'en', TranslationDict> = {
  zh: {
    title: "宇宙奥德赛",
    subtitle: "3D 太阳系与星空物理模拟引擎",
    universeView: "3D 空间视角",
    landedView: "模拟地面观星",
    zoomLevel: "缩放级别",
    timeSpeed: "时间流速",
    paused: "暂停模拟",
    running: "运行中",
    latitude: "观察纬度",
    longitude: "观察经度",
    landBtn: "登录星球",
    leaveBtn: "返回太空",
    crossSection: "剖面剖析模式",
    normalView: "星球完整模式",
    speedUnit: "倍速",
    presetDates: "特殊天象时间",
    today: "回归当前时间",
    eclipseSimulation: "日食/月食事件",
    solarTerm: "二十四节气",
    currentSolarTerm: "当前节气",
    nextSolarTerm: "下一节气",
    eclipseWarning: "特殊交食状态",
    noEclipse: "无显著交食现象",
    solarEclipseOccurring: "⚠️ 日偏食 / 日全食发生中！(日月地成一直线)",
    lunarEclipseOccurring: "⚠️ 月偏食 / 月全食发生中！(日地月成一直线)",
    constellationLines: "显示星座连线",
    starNames: "显示恒星名称",
    constellationNames: "显示星座名称",
    observingFrom: "当前观星位置",
    searchPlanet: "查找天体",
    allPlanets: "全天体列表",
    core: "星核 (Core)",
    mantle: "星幔 (Mantle)",
    crust: "星壳 (Crust)",
    atmosphere: "大气层 (Atmosphere)",
    corona: "日冕/光球层 (Corona/Photosphere)",
    temp: "预计温度",
    composition: "物质组成",
    info: "天体简介",
    parameters: "物理参数",
    orbitalPeriod: "公转周期",
    rotationPeriod: "自转周期",
    realRadius: "赤道半径",
    realDistance: "平均距离",
    obliquity: "自转轴倾角",
    moonPhase: "当前月相计算",
    landingTitle: "虚拟星球登录仪",
    landingInstructions: "设定您在地面上的位置。系统将自动调用天文坐标转换矩阵，从该处仰望繁星、观察日出月落。自转周期和方向与时间绝对同步。",
    calibrationCheck: "NASA 轨道数据校准验证",
    calibrationSuccess: "✅ 仿真引擎轨道状态、历元J2000坐标系及黄赤夹角(23.439°)已与 NASA Horizons 计算标准圆满校准！",
    milkyWayScale: "银河系宏观尺度",
    themeSelect: "系统主题样式",
    themeTech: "星耀科技蓝",
    themeDark: "深邃黑金矿",
    themeNeon: "幻彩极光紫",
    themeGold: "烈焰太阳金",
    crossSectionInfo: "通过剖面图层，展示出星体内部结构分布与元素组成结构：",
    magLimitLabel: "星空可见视星等极限",
    magLimitBrightest: "3.0 (仅极亮星)",
    magLimitAll: "7.5 (全部1万颗星)",
    commandPanel: "控制台",
    timeReal: "实时",
    timeReverse: "倒流",
    timeAccel: "加速",
    selectDate: "选择日期",
    utcMode: "UTC",
    localMode: "本地",
    systemInfo: "系统信息",
    expand: "展开",
    collapse: "收起",
    backToPresent: "回到现在",

    // Planet details In Chinese
    sun_name: "太阳 (Sun)",
    sun_info: "太阳是太阳系中心的恒星，几乎占据整个太阳系总质量的99.86%。它的内部通过核聚变产生巨大的能量并向太空辐射，是地球生命的能量源泉。",
    sun_core: "热核反应区 (约1500万°C)。氢元素在极高压力下聚变为氦，释放高能伽马射线。",
    sun_mantle: "辐射层及对流区 (约200万°C)。能量通过电磁辐射和气体巨大对流向上输送。",
    sun_crust: "光球与色球层 (约5500°C)。可观测的太阳表面，布满米粒组织，黑子活动于此产生。",

    mercury_name: "水星 (Mercury)",
    mercury_info: "水星是太阳系中最靠近太阳的行星。它的表面极其荒凉干燥，昼夜温差极大，且没有实质的大气层掩盖物。",
    mercury_core: "巨大富铁固态/液态核。体积占比高达85%，是水星拥有偶极磁场的主因。",
    mercury_mantle: "硅酸盐地幔。深度约500-600公里，成分多为坚硬的岩石硅酸盐。",
    mercury_crust: "玄武岩矿物外壳。满布陨石撞击产生的环形山与盆地。",

    venus_name: "金星 (Venus)",
    venus_info: "金星是温度最高的行星。超高度的温室效应使其表面足以熔化铅，并被浓厚炽热的二氧化碳大气层常年包裹。",
    venus_core: "铁镍金属核心。半径约3000公里，与地球核心成分非常相似。",
    venus_mantle: "硅酸盐岩质地幔。包含丰富的地热活动和玄武岩熔岩斑块。",
    venus_crust: "坚硬玄武岩岩石圈。由于极高表面压力，地表几乎无液态水分存在。",
    venus_atmosphere: "超浓厚有毒大气。96.5%为二氧化碳，夹杂强腐蚀性的硫酸浓雾，气压为主流地表的92倍。",

    earth_name: "地球 (Earth)",
    earth_info: "人类唯一的家园。拥有丰富多样的液态水海洋、稳定的磁层保障以及含有氧气和富氮的厚重保护性大气层。",
    earth_core: "液态外核与固态铁镍内核 (约6000°C)。流体发电机效应形成了巨大的地磁场保护伞。",
    earth_mantle: "含硅、镁的粘稠地幔圈。产生板块漂移的根本机制动力源。",
    earth_crust: "花岗岩与玄武岩陆地壳。承载地表所有的海洋、河流与生命群落系统。",
    earth_atmosphere: "富氧空气活性层。包含78%氮、21%氧和水汽，过滤有害宇宙辐射。",

    moon_name: "月球 (Moon)",
    moon_info: "地球唯一的天然卫星，潮汐锁定使它永远以同一面朝向地球。其引力作用形成了地球上的海水潮汐升落。",
    moon_core: "小型铁核心。半径仅约240公里，早已冷却不具备明显磁场活性。",
    moon_mantle: "橄榄石和辉石地幔。含有微量反射性重金属矿物成分。",
    moon_crust: "长石月壳及月海月壤。覆盖风化层，月海区域主要由黑色冷却玄武岩填充。",

    mars_name: "火星 (Mars)",
    mars_info: "红色的行星。人类未来深空探索的首选目标。表土中丰富的氧化铁使其呈现赤色，两极存有干冰和水冰颗粒覆盖的水盖。",
    mars_core: "铁、镍与硫化铁核。处于半熔融态，目前基本丧失了自激地磁发电功能。",
    mars_mantle: "富硅酸盐地幔。比地球结构更坚硬，孕育了太阳系最高火山——奥林匹斯山。",
    mars_crust: "富含铁质氧化物红尘外壳。高浓度火山碎屑和河道冲刷沉积痕迹层群。",
    mars_atmosphere: "极其稀薄大气。主要由二氧化碳构成，气压仅为地球表面的0.6%。",

    jupiter_name: "木星 (Jupiter)",
    jupiter_info: "气态巨行星。质量是太阳系其他所有行星总和的2.5倍。拥有巨大的大红斑风暴系统和强有力的辐射带保护层。",
    jupiter_core: "岩石与金属凝聚核心。处于极端高压高温状态下，包裹着大片过渡物质态。",
    jupiter_mantle: "超压金属氢海洋。高压使氢呈现出金属导电特性，形成了强悍的行星磁极场。",
    jupiter_atmosphere: "厚重气态氢氦带。充满强烈风暴云带，主要成分为89%的氢与10%的氦气体。",

    saturn_name: "土星 (Saturn)",
    saturn_info: "拥有太阳系中最宏伟绚丽星环的巨行星，主要由冰、尘埃和碎石组成。土星平均密度比水还要小。",
    saturn_core: "富铁與岩石固态核。外包高密度的冰和气体浓缩物结构层。",
    saturn_mantle: "固液态金属氢与氦过渡带。因热损失导致内部存在氦雨下落沉降释放热量。",
    saturn_atmosphere: "氢氦混合大气雾层。温度低达-180°C，拥有神秘的六角形北极风暴圈系统。",

    uranus_name: "天王星 (Uranus)",
    uranus_info: "冰巨星。其最特别之处在于几乎是“横躺着”围绕太阳旋转（自转轴倾角高达97.77度），散发淡蓝绿色的清冷光芒。",
    uranus_core: "硅酸盐与铁镍金属核心。占总质量大约20%，温度较低。",
    uranus_mantle: "高浓度水、氨、甲烷“冰幔”。虽然被称为冰，但实际上是超临界态的热稠密流体。",
    uranus_atmosphere: "富含甲烷的浅绿色大气。甲烷吸收红色光谱，使得整颗星球折射出迷人的青蓝色。",

    neptune_name: "海王星 (Neptune)",
    neptune_info: "冰巨星。离太阳最遥远的行星。表面狂风呼啸，最大风速可达超音速的2100公里/小时。深蓝色的外观尤为梦幻。",
    neptune_core: "硅酸盐和金属矿核心。质量约为地球的1.2倍，富含地热辐射。",
    neptune_mantle: "超高压水、氨和冰流体深海。形成复杂的非中心偏移多极磁偏角场系统。",
    neptune_atmosphere: "深邃蔚蓝甲烷混合气。高空充满白色羽状甲烷冰晶云，动态风暴肆虐。",

    // 24 Solar Terms In Chinese
    term_lichun: "立春 (Beginning of Spring)",
    term_yushui: "雨水 (Rain Water)",
    term_jingzhe: "惊蛰 (Awakening of Insects)",
    term_chunfen: "春分 (Spring Equinox)",
    term_qingming: "清明 (Pure Brightness)",
    term_guyu: "谷雨 (Grain Rain)",
    term_lixia: "立夏 (Beginning of Summer)",
    term_xiaoman: "小满 (Grain Buds)",
    term_mangzhong: "芒种 (Grain in Ear)",
    term_xiazhi: "夏至 (Summer Solstice)",
    term_xiaoshu: "小暑 (Slight Heat)",
    term_dashu: "大暑 (Great Heat)",
    term_liqiu: "立秋 (Beginning of Autumn)",
    term_chushu: "处暑 (End of Heat)",
    term_bailu: "白露 (White Dew)",
    term_qiufen: "秋分 (Autumnal Equinox)",
    term_hanlu: "寒露 (Cold Dew)",
    term_shuangjiang: "霜降 (First Frost)",
    term_lidong: "立冬 (Beginning of Winter)",
    term_xiaoxue: "小雪 (Light Snow)",
    term_daxue: "大雪 (Heavy Snow)",
    term_dongzhi: "冬至 (Winter Solstice)",
    term_xiaohan: "小寒 (Slight Cold)",
    term_dahan: "大寒 (Great Cold)",

    term_desc: "24节气基于太阳 ecliptic 视黄经（Sun's ecliptic longitude）进行严密数学代数划分。从春分（赤道升交点0°）起，太阳每沿黄道运行15°即完成一个新节气的转换。它是古人对地球轨道公转状态的精确归纳，与农业天气、昼夜长短完全统一关系。",

    // Moon phases in Chinese
    phase_new: "新月 (朔 - New Moon)",
    phase_waxing_crescent: "峨眉月 (Waxing Crescent)",
    phase_first_quarter: "上弦月 (First Quarter)",
    phase_waxing_gibbous: "盈凸月 (Waxing Gibbous)",
    phase_full: "满月 (望 - Full Moon)",
    phase_waning_gibbous: "亏凸月 (Waning Gibbous)",
    phase_last_quarter: "下弦月 (Last Quarter)",
    phase_waning_crescent: "残月 (Waning Crescent)",
  },
  en: {
    title: "Cosmic Odyssey",
    subtitle: "3D Solar System & Astrophyiscs Engine",
    universeView: "3D Universe View",
    landedView: "Landed Observatory",
    zoomLevel: "Zoom Scale",
    timeSpeed: "Time Warp Speed",
    paused: "Simulation Paused",
    running: "Running",
    latitude: "Observer Latitude",
    longitude: "Observer Longitude",
    landBtn: "Land on Planet",
    leaveBtn: "Return to Orbit",
    crossSection: "Cross-Section Mode",
    normalView: "Solid Body Mode",
    speedUnit: "x Speed",
    presetDates: "Celestial Presets",
    today: "Back to Present",
    eclipseSimulation: "Eclipses Estimator",
    solarTerm: "24 Solar Terms",
    currentSolarTerm: "Current Term",
    nextSolarTerm: "Next Term",
    eclipseWarning: "Eclipse Conjunction",
    noEclipse: "No significant eclipse alignment",
    solarEclipseOccurring: "⚠️ Solar Eclipse occurring! (S-M-E Alignment)",
    lunarEclipseOccurring: "⚠️ Lunar Eclipse occurring! (S-E-M Alignment)",
    constellationLines: "Constellation Lines",
    starNames: "Show Star Names",
    constellationNames: "Show Constellation Names",
    observingFrom: "Landed Observatory Site",
    searchPlanet: "Search Corpse",
    allPlanets: "All Celestial Bodies",
    core: "Core",
    mantle: "Mantle",
    crust: "Crust",
    atmosphere: "Atmosphere",
    corona: "Corona",
    temp: "Est. Temperature",
    composition: "Key Composition",
    info: "Description",
    parameters: "Orbital Data",
    orbitalPeriod: "Orbital Period",
    rotationPeriod: "Rotation Period",
    realRadius: "Equator Radius",
    realDistance: "Mean Orbit Space",
    obliquity: "Axial Obliquity",
    moonPhase: "Current Moon Phase",
    landingTitle: "Planet Landing Simulator",
    landingInstructions: "Planetary landing sets horizontal dome viewer. Time is completely synchronous with Keplerian and obliquity rotation. Look up to see standard alignments.",
    calibrationCheck: "NASA Horizons Calibration Verification",
    calibrationSuccess: "✅ J2000 Ephemeris, obliquity tilts and elliptic transformations fully calibrated against JPL Horizons specifications!",
    milkyWayScale: "Milky Way Galaxy Hub",
    themeSelect: "Color Interface Theme",
    themeTech: "Astro Tech Cyan",
    themeDark: "Metallic Gold Dark",
    themeNeon: "Aura Aurora Violet",
    themeGold: "Helios Radiant Gold",
    crossSectionInfo: "By slicing the planetary sphere along its equator, we can model the inner mantle and thermodynamic iron core of the celestial body:",
    magLimitLabel: "Star Visibility Magnitude Limit",
    magLimitBrightest: "3.0 (Brightest)",
    magLimitAll: "7.5 (All 10k stars)",
    commandPanel: "Command",
    timeReal: "Real-time",
    timeReverse: "Reverse",
    timeAccel: "Accelerate",
    selectDate: "Select Date",
    utcMode: "UTC",
    localMode: "Local",
    systemInfo: "System Info",
    expand: "Expand",
    collapse: "Collapse",
    backToPresent: "Back to Present",

    // English details
    sun_name: "The Sun",
    sun_info: "The star at the center of our Solar System, possessing 99.86% of the system's total mass. Powered by constant nuclear fusion.",
    sun_core: "Thermonuclear Zone (~15,000,000 °C). Extreme pressure fuses hydrogen to helium, releasing raw electromagnetic spectrums.",
    sun_mantle: "Radiative & Convection Core (~2,000,000 °C). Energy is transferred out via dynamic radiation and gas plume structures.",
    sun_crust: "Photosphere & Chromosphere (~5,500 °C). Visually vibrant outer shield with dynamic sunspots and granulation.",

    mercury_name: "Mercury",
    mercury_info: "The closest planet to the Sun. A scarred and scorched rocky world without a substantial air atmosphere to shield intense solar flares.",
    mercury_core: "Enormous iron metallic core occupying 85% of planet volume, generating a dipole magnetic shield.",
    mercury_mantle: "Silicate deep mantle. Rigid stone layers that hold intense volcanic stresses.",
    mercury_crust: "Basalt rock crust, deeply impacted with endless craters, basins, and deep valleys.",

    venus_name: "Venus",
    venus_info: "The hottest rocky planet in the solar system. Extreme runaway greenhouse heating creates temperatures hot enough to melt lead.",
    venus_core: "Metallic iron-nickel sphere of ~3,000 km radius, highly resembling Earth's interior layout.",
    venus_mantle: "Dense rocky silicate mantle triggering massive surface volcanic activity and continental plates.",
    venus_crust: "Brittle basalt lithosphere without any liquid oceans, subject to crushing 92 Bar gas pressure.",
    venus_atmosphere: "Oppressive greenhouse layer. 96.5% CO2 mixed with thick clouds of highly corrosive sulfuric acid.",

    earth_name: "Earth",
    earth_info: "The blue cradle of mankind. Possesses stable climate ranges, magnetosphere shell and a protective nitrogen-oxygen ambient blanket.",
    earth_core: "Liquid outer and solid iron inner spheres (~6,000 °C) producing powerful geomagnetic dynamo shield.",
    earth_mantle: "Viscoelastic rock convective magma carrying continents in constant planetary plate tectonic drift.",
    earth_crust: "Felsic granitic continents and mafic ocean beds home to all water reservoirs and biospheres.",
    earth_atmosphere: "Active life-support. 78% nitrogen, 21% oxygen and rich cloud moisture block hazardous cosmic space rays.",

    moon_name: "The Moon",
    moon_info: "Earth's tidal locked satellite. Triggers physical gravity ocean tide waves on Earth surface.",
    moon_core: "Small iron core of ~240 km, completely cooled down to static solid configuration.",
    moon_mantle: "Olivine-rich lithosphere layer containing heavy refractory elements and solid crystals.",
    moon_crust: "Regolith and mare basalt. Large basaltic impact basins (maria) filled by primordial lava flows.",

    mars_name: "Mars",
    mars_info: "The rusty desert planet. Contains extensive dry polar ice caps and holds Olympus Mons, the tallest volcano in the solar system.",
    mars_core: "Half-molten iron, nickel and sulfur mixture core, mostly dormant with tiny residual magnetic properties.",
    mars_mantle: "Stiff silicate mantle supporting high-volumetric dormant shield volcanoes.",
    mars_crust: "Iron-oxide dust surface giving Mars its distinctive rusty red hue, loaded with deep rift canyons.",
    mars_atmosphere: "Ultra-thin carbon dioxide vacuum. Atmospheric surface pressure is just 0.6% of Earth.",

    jupiter_name: "Jupiter",
    jupiter_info: "Massive gas giant planet. Outweighs all other solar planets combined by 2.5 times. Home to the rotating Great Red Spot.",
    jupiter_core: "Extreme high-pressure rocky metal seed sphere at central position.",
    jupiter_mantle: "Enormous deep ocean of metallic hydrogen forming a super-conductive dynamo that powers intense magnetospheres.",
    jupiter_atmosphere: "Gaseous hydrogen-helium bands. Furious weather systems of 89% H2 and 10% He with ammonia clouds.",

    saturn_name: "Saturn",
    saturn_info: "A gas giant famous for its extensive, reflective planetary ring system made of infinite ice crystals and cosmic debris chunks.",
    saturn_core: "Dense solid iron and stone bedrock enveloped by compressed ice shell layers.",
    saturn_mantle: "Metallic hydrogen layer with liquid helium rain precipitating towards central core.",
    saturn_atmosphere: "Frigid gas bands at -180 °C, showing a distinct stable hexagon jet-stream vortex over north pole.",

    uranus_name: "Uranus",
    uranus_info: "An icy gas giant that features extreme axial rotation. Rotates practically on its side at 97.8 degrees, reflecting a soft teal color.",
    uranus_core: "Silicate rock and iron composite core representing about 20% of planetary bulk.",
    uranus_mantle: "Hot fluid ice mantle composed of ionized water, ammonia and methane slush.",
    uranus_atmosphere: "Methane rich blue-green fog. Methane molecules absorb red light and reflect high-frequency indigo-teal spectra.",

    neptune_name: "Neptune",
    neptune_info: "The outermost icy gas giant. Swept by supersonic windstorms up to 2,100 km/h, boasting deep cosmic indigo tones.",
    neptune_core: "Rocky and metallic core about 1.2 times Earth's mass, emitting considerable internal heat.",
    neptune_mantle: "Highly pressurized water-ammonia superheated ocean forming a complex displaced magnetic fields.",
    neptune_atmosphere: "Dazzling deep indigo gas mix. High-altitude methane cirrus clouds swirl dynamically across storm centers.",

    term_lichun: "Lichun (Spring Commences)",
    term_yushui: "Yushui (Rain Water)",
    term_jingzhe: "Jingzhe (Awakening of Insects)",
    term_chunfen: "Chunfen (Vernal Equinox)",
    term_qingming: "Qingming (Pure Brightness)",
    term_guyu: "Guyu (Grain Rain)",
    term_lixia: "Lixia (Summer Commences)",
    term_xiaoman: "Xiaoman (Lesser Fullness)",
    term_mangzhong: "Mangzhong (Spiky Grain)",
    term_xiazhi: "Xiazhi (Summer Solstice)",
    term_xiaoshu: "Xiaoshu (Lesser Heat)",
    term_dashu: "Dashu (Greater Heat)",
    term_liqiu: "Liqiu (Autumn Commences)",
    term_chushu: "Chushu (End of Heat)",
    term_bailu: "Bailu (White Dew)",
    term_qiufen: "Qiufen (Autumnal Equinox)",
    term_hanlu: "Hanlu (Cold Dew)",
    term_shuangjiang: "Shuangjiang (Frost Descends)",
    term_lidong: "Lidong (Winter Commences)",
    term_xiaoxue: "Xiaoxue (Lesser Snow)",
    term_daxue: "Daxue (Greater Snow)",
    term_dongzhi: "Dongzhi (Winter Solstice)",
    term_xiaohan: "Xiaohan (Lesser Cold)",
    term_dahan: "Dahan (Greater Cold)",

    term_desc: "24 Solar Terms are based on the solar longitude of the Earth. Beginning from Spring Equinox (0°), every 15° step marks a new solar term representing physical transitions synchronized with the seasons.",

    phase_new: "New Moon",
    phase_waxing_crescent: "Waxing Crescent",
    phase_first_quarter: "First Quarter",
    phase_waxing_gibbous: "Waxing Gibbous",
    phase_full: "Full Moon",
    phase_waning_gibbous: "Waning Gibbous",
    phase_last_quarter: "Last Quarter",
    phase_waning_crescent: "Waning Crescent",
  }
};

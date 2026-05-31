with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '''      {/* ═══════════════════════════════════════════════════════════════
           TOP: Unified Panel Toolbar
         ═══════════════════════════════════════════════════════════════ */}
      {/* ═══════════════════════════════════════════════════════════════
           TOP: Unified Panel Toolbar with Dropdown Panels
         ═══════════════════════════════════════════════════════════════ */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[45] flex items-center gap-1 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl px-2 py-1.5 shadow-2xl transition-all duration-300 opacity-40 hover:opacity-100">'''

end_marker = '''      {/* ═══════════════════════════════════════════════════════════════
           MAIN VIEWPORT
         ═══════════════════════════════════════════════════════════════ */}'''

start_idx = content.find(start_marker)
if start_idx == -1:
    print("ERROR: Could not find start marker")
    exit(1)

end_idx = content.find(end_marker, start_idx)
if end_idx == -1:
    print("ERROR: Could not find end marker")
    exit(1)

print(f"Found section from {start_idx} to {end_idx}")

new_section = '''      {/* ═══════════════════════════════════════════════════════════════
           TOP-LEFT: Settings Button + Left Drawer
         ═══════════════════════════════════════════════════════════════ */}
      <div className="fixed top-3 left-3 z-[45]">
        <button
          onClick={() => setSettingsOpen(v => !v)}
          className={`flex items-center gap-1.5 h-8 rounded-xl px-2 transition-all duration-200 bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl ${
            settingsOpen
              ? 'bg-cyan-500/20 text-cyan-300'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span className={`overflow-hidden transition-all duration-200 text-[11px] font-medium whitespace-nowrap ${settingsOpen ? 'max-w-20' : 'max-w-0'}`}>
            {lang === 'zh' ? '设置' : 'Settings'}
          </span>
        </button>
      </div>
      <div className={`fixed top-14 left-3 z-50 w-72 max-h-[calc(100vh-80px)] transition-all duration-300 ${settingsOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-full opacity-0 pointer-events-none'}`}>
        <CommandPanel
          lang={lang}
          onChangeLang={setLang}
          landed={landed}
          theme={theme}
          onChangeTheme={setTheme}
          showConstellLines={showConstellLines}
          onToggleConstellLines={(show) => {
            setShowConstellLines(show);
            if (!show) setShowConstellNames(false);
          }}
          showStarNames={showStarNames}
          onToggleStarNames={setShowStarNames}
          showConstellNames={showConstellNames}
          onToggleConstellNames={setShowConstellNames}
          magLimit={magLimit}
          onChangeMagLimit={setMagLimit}
          telescopeActive={telescopeActive}
          onToggleTelescope={setTelescopeActive}
          selectedPlanetId={selectedPlanetId}
          onSelectPlanet={handleSelectPlanet}
          onFocusPlanet={handleFocusPlanet}
          showPlanetLabels={showPlanetLabels}
          onTogglePlanetLabels={setShowPlanetLabels}
          onJumpDate={(ts) => setTimeState(prev => ({ ...prev, currentTimestamp: ts }))}
          helioX={helioPos.x}
          helioY={helioPos.y}
          helioZ={helioPos.z}
          latitude={latitude}
          longitude={longitude}
          onChangeLatitude={setLatitude}
          onChangeLongitude={setLongitude}
          validationPairKey={validationPairKey}
          onChangeValidationPairKey={setValidationPairKey}
          panelTab={panelTab}
          onChangePanelTab={setPanelTab}
          packingActive={packingActive}
          onTogglePackingActive={setPackingActive}
          packingProgressDone={packingProgressDone}
          packingMode={packingMode}
          onChangePackingMode={setPackingMode}
          strictPhysics={strictPhysics}
          onToggleStrictPhysics={setStrictPhysics}
          exposure={exposure}
          onChangeExposure={setExposure}
          showOrbits={showOrbits}
          onToggleOrbits={setShowOrbits}
          useExponentialSpeed={useExponentialSpeed}
          onToggleExponentialSpeed={setUseExponentialSpeed}
          customSpeedPreset={customSpeedPreset}
          onChangeCustomSpeedPreset={setCustomSpeedPreset}
          showAxes={showAxes}
          onToggleAxes={setShowAxes}
          showLatLonGrid={showLatLonGrid}
          onToggleLatLonGrid={setShowLatLonGrid}
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
           TOP-CENTER: Astro Phenomena Button + Dropdown
         ═══════════════════════════════════════════════════════════════ */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[45]">
        <button
          onClick={() => setPhenomenaPanelOpen(v => !v)}
          className={`flex items-center gap-1.5 h-8 rounded-xl px-2 transition-all duration-200 bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl ${
            phenomenaPanelOpen
              ? 'bg-cyan-500/20 text-cyan-300'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <span className="text-sm shrink-0">🔭</span>
          <span className={`overflow-hidden transition-all duration-200 text-[11px] font-medium whitespace-nowrap ${phenomenaPanelOpen ? 'max-w-20' : 'max-w-0'}`}>
            {lang === 'zh' ? '天文' : 'Astro'}
          </span>
        </button>
      </div>
      <div className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-[600px] max-h-[calc(100vh-80px)] transition-all duration-300 origin-top ${phenomenaPanelOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-4 opacity-0 pointer-events-none'}`}>
        <AstroPhenomenaPanel
          lang={lang}
          theme={theme}
          isOpen={true}
          onToggle={() => setPhenomenaPanelOpen(prev => !prev)}
          onSelectPhenomenon={handleSelectPhenomenon}
          activePhenomenon={demoState.activePhenomenon}
          onSwitchView={handleSwitchView}
          viewMode={demoState.viewMode}
          onExitDemo={handleExitDemo}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
           TOP-RIGHT: Planet Info / Guide Button + Right Drawer
         ═══════════════════════════════════════════════════════════════ */}
      <div className="fixed top-3 right-3 z-[45]">
        <button
          onClick={() => {
            if (isDemoActive) {
              setDemoState(prev => ({ ...prev, showGuidePanel: !prev.showGuidePanel }));
            } else {
              setShowPlanetInfo(v => !v);
            }
          }}
          className={`flex items-center gap-1.5 h-8 rounded-xl px-2 transition-all duration-200 bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl ${
            (isDemoActive ? demoState.showGuidePanel : showPlanetInfo)
              ? 'bg-cyan-500/20 text-cyan-300'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          {isDemoActive ? (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
          )}
          <span className={`overflow-hidden transition-all duration-200 text-[11px] font-medium whitespace-nowrap ${(isDemoActive ? demoState.showGuidePanel : showPlanetInfo) ? 'max-w-20' : 'max-w-0'}`}>
            {isDemoActive ? (lang === 'zh' ? '指南' : 'Guide') : (lang === 'zh' ? '星体' : 'Planet')}
          </span>
        </button>
      </div>
      <div className={`fixed top-14 right-3 z-50 w-72 max-h-[calc(100vh-80px)] transition-all duration-300 ${(isDemoActive ? demoState.showGuidePanel : showPlanetInfo) ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-full opacity-0 pointer-events-none'}`}>
        {isDemoActive ? (
          <PhenomenaGuidePanel
            lang={lang}
            theme={theme}
            demoState={demoState}
            onNextStep={handleNextStep}
            onPrevStep={handlePrevStep}
            onSwitchView={handleSwitchView}
            onExitDemo={handleExitDemo}
            onTogglePlay={handleTogglePlay}
            onChangeSpeed={handleChangeSpeed}
            onSelectPhase={handleSelectPhase}
            selectedMoonPhaseIndex={selectedMoonPhaseIndex}
            onClearMoonPhaseSelection={() => setSelectedMoonPhaseIndex(null)}
            selectedPlanetId={selectedPlanetId}
            onSelectPlanet={setSelectedPlanetId}
            eclipseEventTs={eclipseEventTs}
            eclipseEventType={eclipseEventType}
            eclipseProgress={eclipseProgress}
            eclipseWindow={eclipseWindow}
            onSelectEclipseEvent={(ts, type) => {
              setEclipseEventTs(ts);
              setEclipseEventType(type);
              if (type) {
                const win = AstrophenomenaEngine.getEclipseWindow(ts, type);
                setEclipseWindow(win);
                setTimeState(prev => ({ ...prev, currentTimestamp: win.start }));
              } else {
                setEclipseWindow(null);
                setTimeState(prev => ({ ...prev, currentTimestamp: ts - 3 * 3600000 }));
              }
            }}
            onChangeEclipseProgress={(progress) => {
              if (eclipseEventTs) {
                if (eclipseWindow) {
                  const ts = eclipseWindow.start + progress * (eclipseWindow.end - eclipseWindow.start);
                  setTimeState(prev => ({ ...prev, currentTimestamp: ts }));
                } else {
                  const offsetMs = (progress - 0.5) * 6 * 3600000;
                  setTimeState(prev => ({ ...prev, currentTimestamp: eclipseEventTs + offsetMs }));
                }
              }
            }}
          />
        ) : (
          <PlanetInfoPanel
            planetId={selectedPlanetId}
            crossSectionActive={crossSectionActive}
            onToggleCrossSection={(active) => {
              setCrossSectionActive(active);
              if (active) setCloudsVisible(false);
            }}
            cloudsVisible={cloudsVisible}
            onToggleClouds={() => setCloudsVisible(v => !v)}
            lang={lang}
            onClose={() => setShowPlanetInfo(false)}
            landed={landed}
            onToggleLanding={handleToggleLanding}
            isLandable={LANDABLE_PLANETS.includes(selectedPlanetId)}
            textureOffset={textureOffsets[selectedPlanetId] ?? { u: 0, v: 0 }}
            onChangeTextureOffset={(offset) => setTextureOffsets(prev => ({ ...prev, [selectedPlanetId]: offset }))}
            activeLayer={activeLayer}
            onLayerHover={setActiveLayer}
          />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
           MAIN VIEWPORT
         ═══════════════════════════════════════════════════════════════ */}'''

new_content = content[:start_idx] + new_section + content[end_idx + len(end_marker):]

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done! Replaced toolbar section.")

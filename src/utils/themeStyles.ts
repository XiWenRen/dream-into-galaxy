/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ThemeType } from '../types/astronomy';

export const getThemeAccent = (theme: ThemeType) => {
  switch (theme) {
    case 'space-tech': return 'text-cyan-400';
    case 'cosmic-dark': return 'text-amber-400';
    case 'neon-hologram': return 'text-fuchsia-400';
    case 'solar-gold': return 'text-orange-400';
  }
};

export const getThemeBtn = (theme: ThemeType) => {
  switch (theme) {
    case 'space-tech': return 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25';
    case 'cosmic-dark': return 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25';
    case 'neon-hologram': return 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-300 hover:bg-fuchsia-500/25';
    case 'solar-gold': return 'bg-orange-500/15 border-orange-500/40 text-orange-300 hover:bg-orange-500/25';
  }
};

export const getThemeBtnSolid = (theme: ThemeType) => {
  switch (theme) {
    case 'space-tech': return 'bg-cyan-500/80 text-black hover:bg-cyan-400';
    case 'cosmic-dark': return 'bg-amber-500/80 text-black hover:bg-amber-400';
    case 'neon-hologram': return 'bg-fuchsia-500/80 text-black hover:bg-fuchsia-400';
    case 'solar-gold': return 'bg-orange-500/80 text-black hover:bg-orange-400';
  }
};

export const getThemeTrack = (theme: ThemeType) => {
  switch (theme) {
    case 'space-tech': return 'accent-cyan-400';
    case 'cosmic-dark': return 'accent-amber-400';
    case 'neon-hologram': return 'accent-fuchsia-400';
    case 'solar-gold': return 'accent-orange-400';
  }
};

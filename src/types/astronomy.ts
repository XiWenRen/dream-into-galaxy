/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PlanetLayer {
  nameKey: string; // e.g. "core", "mantle", "crust", "atmosphere", "corona"
  color: string;
  thickness: number; // relative ratio or description
  temp: string;
  compositionKey: string;
}

export interface PlanetData {
  id: string;
  nameKey: string;
  color: string;
  radius: number; // in relative units for visualization
  realRadius: number; // in km
  distanceToSun: number; // inside visualization scale
  realDistance: number; // in AU
  orbitalPeriod: number; // in Earth days
  rotationPeriod: number; // hours around axis
  obliquity: number; // axial tilt in degrees
  layers: PlanetLayer[];
  infoKey: string;
}

export interface TimeState {
  currentTimestamp: number; // Milliseconds since epoch
  speedMultiplier: number;  // 0 is paused, otherwise multiplier
  isPaused: boolean;
}

export interface LandedLocation {
  latitude: number;
  longitude: number;
  planetId: string;
}

export type ThemeType = 'space-tech' | 'cosmic-dark' | 'neon-hologram' | 'solar-gold';

export interface Constellation {
  id: string;
  nameKey: string;
  stars: number[][]; // Line pairs connecting star indices
}

export interface Star {
  id: number;
  ra: number; // Right ascension (hours)
  dec: number; // Declination (degrees)
  magnitude: number;
  color: string;
  nameKey?: string;
}

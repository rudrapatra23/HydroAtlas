/**
 * Map-related TypeScript types shared by map components and stores.
 * Kept narrow: only what the landing page actually uses.
 */

export type ViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
};

export type MapLayer = {
  id: string;
  variableId: string;
  visible: boolean;
  opacity: number;
};

export type ClimateStation = {
  lon: number;
  lat: number;
  label: string;
};

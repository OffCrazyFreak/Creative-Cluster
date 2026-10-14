import proj4 from "proj4";

// ETRS89 / LAEA Europe (EPSG:3035). proj4js has no EPSG registry, so the definition is spelled out.
const LAEA =
  "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";

export interface ILonLat {
  lon: number;
  lat: number;
}

// EPSG:3035 lists northing before easting and GML keeps that order, but proj4js wants easting first.
export function laeaPosToLonLat(pos: string): ILonLat {
  const [northing, easting] = pos.trim().split(/\s+/).map(Number);
  if (northing === undefined || easting === undefined)
    throw new Error(`Bad gml:pos "${pos}"`);
  const [lon, lat] = proj4(LAEA, "WGS84", [easting, northing]);
  return { lon: lon, lat: lat };
}

// Countries the sites can list: EU, EFTA, the Western Balkans and neighbours. The GeoNames build
// writes one town file for each, so adding a code here needs `pnpm geonames:build`.
export const LOCATION_COUNTRIES =
  "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO CH GB BA RS ME MK AL XK MD UA TR".split(
    " ",
  );

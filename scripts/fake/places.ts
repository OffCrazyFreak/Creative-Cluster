export interface IFakePlace {
  city: string;
  country: string;
  lat: number;
  lng: number;
}

// Real town centres (public coordinates); only the entries placed on them are fake.
export const EU_PLACES: IFakePlace[] = [
  { city: "Lisbon", country: "PT", lat: 38.7223, lng: -9.1393 },
  { city: "Porto", country: "PT", lat: 41.1579, lng: -8.6291 },
  { city: "Barcelona", country: "ES", lat: 41.3874, lng: 2.1686 },
  { city: "Valencia", country: "ES", lat: 39.4699, lng: -0.3763 },
  { city: "Marseille", country: "FR", lat: 43.2965, lng: 5.3698 },
  { city: "Lyon", country: "FR", lat: 45.764, lng: 4.8357 },
  { city: "Berlin", country: "DE", lat: 52.52, lng: 13.405 },
  { city: "Leipzig", country: "DE", lat: 51.3397, lng: 12.3731 },
  { city: "Turin", country: "IT", lat: 45.0703, lng: 7.6869 },
  { city: "Naples", country: "IT", lat: 40.8518, lng: 14.2681 },
  { city: "Rotterdam", country: "NL", lat: 51.9225, lng: 4.4792 },
  { city: "Ghent", country: "BE", lat: 51.0543, lng: 3.7174 },
  { city: "Zagreb", country: "HR", lat: 45.815, lng: 15.9819 },
  { city: "Split", country: "HR", lat: 43.5081, lng: 16.4402 },
  { city: "Ljubljana", country: "SI", lat: 46.0569, lng: 14.5058 },
  { city: "Graz", country: "AT", lat: 47.0707, lng: 15.4395 },
  { city: "Krakow", country: "PL", lat: 50.0647, lng: 19.945 },
  { city: "Brno", country: "CZ", lat: 49.1951, lng: 16.6068 },
  { city: "Pecs", country: "HU", lat: 46.0727, lng: 18.2323 },
  { city: "Cluj-Napoca", country: "RO", lat: 46.7712, lng: 23.6236 },
  { city: "Plovdiv", country: "BG", lat: 42.1354, lng: 24.7453 },
  { city: "Thessaloniki", country: "GR", lat: 40.6401, lng: 22.9444 },
  { city: "Gothenburg", country: "SE", lat: 57.7089, lng: 11.9746 },
  { city: "Aarhus", country: "DK", lat: 56.1629, lng: 10.2039 },
  { city: "Tampere", country: "FI", lat: 61.4978, lng: 23.761 },
  { city: "Tartu", country: "EE", lat: 58.378, lng: 26.729 },
  { city: "Riga", country: "LV", lat: 56.9496, lng: 24.1052 },
  { city: "Kaunas", country: "LT", lat: 54.8985, lng: 23.9036 },
  { city: "Cork", country: "IE", lat: 51.8985, lng: -8.4756 },
  { city: "Kosice", country: "SK", lat: 48.7164, lng: 21.2611 },
];

export const DNZ_PLACES: IFakePlace[] = [
  { city: "Dubrovnik", country: "HR", lat: 42.6507, lng: 18.0944 },
  { city: "Korčula", country: "HR", lat: 42.9597, lng: 17.1357 },
  { city: "Metković", country: "HR", lat: 43.0539, lng: 17.6486 },
  { city: "Ploče", country: "HR", lat: 43.0561, lng: 17.4328 },
  { city: "Ston", country: "HR", lat: 42.8403, lng: 17.6961 },
  { city: "Blato", country: "HR", lat: 42.9319, lng: 16.7945 },
  { city: "Orebić", country: "HR", lat: 42.9758, lng: 17.1783 },
  { city: "Opuzen", country: "HR", lat: 43.0178, lng: 17.5681 },
  { city: "Slano", country: "HR", lat: 42.7833, lng: 17.8917 },
  { city: "Cavtat", country: "HR", lat: 42.5811, lng: 18.2178 },
  { city: "Vela Luka", country: "HR", lat: 42.9606, lng: 16.716 },
  { city: "Trpanj", country: "HR", lat: 43.0003, lng: 17.2475 },
  { city: "Lumbarda", country: "HR", lat: 42.9136, lng: 17.1458 },
  { city: "Mljet", country: "HR", lat: 42.7864, lng: 17.3844 },
  { city: "Župa dubrovačka", country: "HR", lat: 42.6225, lng: 18.1933 },
];

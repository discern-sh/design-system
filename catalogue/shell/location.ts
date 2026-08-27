export const catalogueLocationChangeEvent = "discern-catalogue-location-change";

export function announceCatalogueLocationChange(): void {
  globalThis.dispatchEvent(new Event(catalogueLocationChangeEvent));
}



export type PageState = {
  window: spjs.luxon.Interval,
  network: string,
  station: string,
  location: string,
  heliChannel: string,
  heliWindow: spjs.luxon.Interval,
};

export function clearContent(div: HTMLDivElement) {
  while(div.firstChild) {
    // @ts-ignore
    div.removeChild(div.lastChild);
  }
}



export type PageState = {
  window: spjs.luxon.Interval,
  network: string,
  station: string,
  location: string,
  chanList: Array<string>,
  heliChannel: string,
  heliWindow: spjs.luxon.Interval,
  datalink: spjs.datalink.DataLinkConnection | null,
};

export function clearContent(div: HTMLDivElement) {
  while(div.firstChild) {
    // @ts-ignore
    div.removeChild(div.lastChild);
  }
}

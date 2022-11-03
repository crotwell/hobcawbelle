import * as spjs from 'seisplotjs';

export const DEF_WINDOW_SEC = 300;

export type PageState = {
  window: spjs.luxon.Interval | null,
  network: string,
  station: string,
  location: string,
  channelCodeList: Array<string>,
  heliChannel: string,
  heliWindow: spjs.luxon.Interval,
  datalink: spjs.datalink.DataLinkConnection | null,
  quakeList: Array<Quake>,
  channelList: Array<Channel>,
};

export function loadChannels(pageStatus: PageState): Promise<Array<Channel>> {
  let stationQuery = new spjs.fdsnstation.StationQuery()
    .networkCode(pageStatus.network)
    .stationCode(pageStatus.station)
    .locationCode(pageStatus.location)
    .channelCode(pageStatus.channelCodeList.join(","));
  return stationQuery.queryChannels().then(netList => {
    let allChans = Array.from(spjs.stationxml.allChannels(netList));
    pageStatus.channelList = allChans;
    return allChans;
  })
}

export function clearContent(div: HTMLDivElement) {
  while(div.firstChild) {
    // @ts-ignore
    div.removeChild(div.lastChild);
  }
}

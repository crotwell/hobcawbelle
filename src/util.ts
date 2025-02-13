import * as spjs from 'seisplotjs';

export const DEF_WINDOW_SEC = 300;
import { stop_realtime } from './do_realtime'


export type PageState = {
  window: spjs.luxon.Interval | null,
  network: string,
  station: string,
  location: string,
  channelCodeList: Array<string>,
  stationCodeList: Array<string>,
  heliChannel: FDSNSourceId,
  heliWindow: spjs.luxon.Interval,
  datalink: spjs.datalink.DataLinkConnection | null,
  quakeList: Array<Quake>,
  channelList: Array<Channel>,
};

export function loadChannels(pageStatus: PageState): Promise<Array<Channel>> {
  let stationQuery = new spjs.fdsnstation.StationQuery()
    .networkCode(pageStatus.network)
    .stationCode(pageStatus.stationCodeList.join(","))
    .locationCode(pageStatus.location)
    .channelCode(pageStatus.channelCodeList.join(","));
  return stationQuery.queryChannels().then(netList => {
    let allChans = Array.from(spjs.stationxml.allChannels(netList));
    pageStatus.networkList = netList;
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

export function clearMessage() {
  let msgP = document.querySelector<HTMLDivElement>('#message');
  msgP.innerHTML = ``;
}

export function setMessage(m: string) {
  let msgP = document.querySelector<HTMLDivElement>('#message');
  msgP.innerHTML = `<h5>${m}</h5>`;
}

export function updateButtonSelection(buttonId: string, pageState: PageState) {
  let eButton = document.querySelector<HTMLButtonElement>('#earthquakes');
  eButton.classList.remove("selected");

  let sButton = document.querySelector<HTMLButtonElement>('#seismograph');
  if (sButton) {
    sButton.classList.remove("selected");
  }

  let heliButton = document.querySelector<HTMLButtonElement>('#helicorder');
  heliButton.classList.remove("selected");

  let rtButton = document.querySelector<HTMLButtonElement>('#realtime');
  rtButton.classList.remove("selected");

  let helpButton = document.querySelector<HTMLButtonElement>('#help');
  helpButton.classList.remove("selected");

  let selectedButton = document.querySelector<HTMLButtonElement>(buttonId);
  if (selectedButton) {
    selectedButton.classList.add("selected");
  }

  if (selectedButton !== '#realtime') {
    stop_realtime(pageState);
  }
}

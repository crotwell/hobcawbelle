
/// <reference types="vite/client" />

import * as sp from 'seisplotjs';
import {DateTime, Interval} from 'luxon';
export const DEF_WINDOW_SEC = 300;
import { stop_realtime } from './do_realtime'


export type PageState = {
  window: sp.luxon.Interval | null,
  network: string,
  station: string,
  location: string,
  channelCodeList: Array<string>,
  stationCodeList: Array<string>,
  heliChannel: sp.fdsnsourceid.FDSNSourceId,
  heliWindow: Interval,
  datalink: sp.datalink.DataLinkConnection | null,
  quakeList: Array<sp.quakeml.Quake>,
  networkList: Array<sp.stationxml.Network>,
  channelList: Array<sp.stationxml.Channel>,
  selectedQuakeList: Array<sp.quakeml.Quake>,
};

export function loadChannelsFDSN(pageStatus: PageState): Promise<Array<sp.stationxml.Channel>> {
  let stationQuery = new sp.fdsnstation.StationQuery()
    .networkCode(pageStatus.network)
    .stationCode(pageStatus.stationCodeList.join(","))
    .locationCode(pageStatus.location)
    .channelCode(pageStatus.channelCodeList.join(","));
  return stationQuery.queryChannels()
  .then((netList: Array<sp.stationxml.Network>) => {
    let allChans = Array.from(sp.stationxml.allChannels(netList));
    pageStatus.networkList = netList;
    pageStatus.channelList = allChans;
    return allChans;
  });
}

import belleStationxmlUrl from './belle_stationxml.xml?url';

export function loadChannels(pageStatus: PageState): Promise<Array<sp.stationxml.Channel>> {
  return sp.stationxml.fetchStationXml(belleStationxmlUrl)
  .then((netList: Array<sp.stationxml.Network>) => {
    let allChans = Array.from(sp.stationxml.allChannels(netList));
    pageStatus.networkList = netList;
    pageStatus.channelList = allChans;
    return allChans;
  });
}

export function clearContent(div: HTMLDivElement | null) {
  while(div?.firstChild) {
    // @ts-ignore
    div.removeChild(div.lastChild);
  }
}

export function clearMessage() {
  let msgP = document.querySelector<HTMLDivElement>('#message');
  if (msgP) {
    msgP.innerHTML = ``;
  }
}

export function setMessage(m: string) {
  let msgP = document.querySelector<HTMLDivElement>('#message');
  if (msgP) {
    msgP.innerHTML = `<h5>${m}</h5>`;
  }
}

export function updateButtonSelection(buttonId: string, pageState: PageState) {
  let eButton = document.querySelector<HTMLButtonElement>('#earthquakes');
  eButton?.classList.remove("selected");

  let sButton = document.querySelector<HTMLButtonElement>('#seismograph');
  if (sButton) {
    sButton.classList.remove("selected");
  }

  let heliButton = document.querySelector<HTMLButtonElement>('#helicorder');
  heliButton?.classList.remove("selected");

  let rtButton = document.querySelector<HTMLButtonElement>('#realtime');
  rtButton?.classList.remove("selected");

  let helpButton = document.querySelector<HTMLButtonElement>('#help');
  helpButton?.classList.remove("selected");

  let selectedButton = document.querySelector<HTMLButtonElement>(buttonId);
  if (selectedButton) {
    selectedButton.classList.add("selected");
  }

  if (buttonId !== '#realtime') {
    stop_realtime(pageState);
  }
}

export function formatTimeToMin(datetime: DateTime | null): string {
  if (datetime == null) { return "";}
  return datetime.toLocal().toFormat('yyyy LLL dd HH:mm')
}

export const EASTERN_TIMEZONE = new sp.luxon.IANAZone("America/New_York");

export function formatTimeEastern(datetime: DateTime): string {
  return datetime.setZone(EASTERN_TIMEZONE).toFormat('yyyy LLL dd HH:mm')
}

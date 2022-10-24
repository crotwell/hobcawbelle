
import * as seisplotjs from 'seisplotjs';
const spjs = seisplotjs;
import {clearContent} from './util';
import type {PageState} from './util';
const SeismogramDisplayData = seisplotjs.seismogram.SeismogramDisplayData;
const Quake = seisplotjs.quakeml.Quake;

const EQ_URL = "https://eeyore.seis.sc.edu/scsn/sc_quakes/sc_quakes.xml"


export function do_earthquakes(pageState: PageState) {
  let div = document.querySelector<HTMLDivElement>('#content');
  clearContent(div);
  let innerDiv = document.createElement("div");
  innerDiv.setAttribute("class", "maptable");
  div.appendChild(innerDiv);
  let quakeTable = new spjs.infotable.QuakeTable();
  let quakeMap = new spjs.leafletutil.QuakeStationMap();
  setupSelectable(quakeTable, quakeMap);
  quakeMap.zoomLevel = 12;
  if (pageState.channelList.length > 0) {
    quakeMap.centerLat = pageState.channelList[0].latitude;
    quakeMap.centerLon = pageState.channelList[0].longitude;
  } else {
    quakeMap.centerLat = 34;
    quakeMap.centerLon = -80.7;
  }
  innerDiv.appendChild(quakeMap);
  innerDiv.appendChild(quakeTable);
  if (pageState.quakeList.length === 0) {
    Promise.all([loadChannels(pageState), loadEarthquakes(pageState)])
    .then(([chanList, quakeList]) => {
      pageState.quakeList = quakeList;
      quakeMap.addQuake(quakeList);
      quakeMap.addStation(chanList[0].station);
      quakeMap.centerLat = chanList[0].latitude;
      quakeMap.centerLon = chanList[0].longitude;
      quakeMap.draw();
      quakeTable.quakeList = quakeList;
      quakeTable.draw();
    });
  } else {
    quakeTable.quakeList = pageState.quakeList;
    quakeMap.addQuake(pageState.quakeList);
    quakeMap.addStation(pageState.channelList[0].station);
    quakeMap.centerLat = pageState.channelList[0].latitude;
    quakeMap.centerLon = pageState.channelList[0].longitude;
    quakeMap.draw();
  }
}


export function loadEarthquakes(pageState: PageState): Promise<Array<Quake>> {
  let fetchInit = spjs.util.defaultFetchInitObj(spjs.util.XML_MIME);
  return spjs.util.doFetchWithTimeout(EQ_URL, fetchInit)
    .then(response => {
      if (response.status === 200) {
        return response.text();
      } else if (
        response.status === 204 ||
        (isDef(mythis._nodata) && response.status === mythis._nodata)
      ) {
        // 204 is nodata, so successful but empty
        return spjs.fdsnevent.FAKE_EMPTY_XML;
      } else {
        throw new Error(`Status not successful: ${response.status}`);
      }
    })
    .then(function (rawXmlText) {
      return new DOMParser().parseFromString(rawXmlText, spjs.util.XML_MIME);
    })
    .then(rawXml => {
          return spjs.quakeml.parseQuakeML(rawXml);
    })
    .then(quakeList => {
      const start = spjs.util.isoToDateTime('2021-12-01T00:00:00Z');
      return quakeList.filter(q => q.time > start)
        .filter(q => q.latitude > 34 && q.latitude < 34.4 && q.longitude > -80.9 && q.longitude < -80.5);
    });
}

export function loadChannels(pageStatus: PageStatus): Promise<Array<Channel>> {
  let stationQuery = new spjs.fdsnstation.StationQuery()
    .networkCode(pageStatus.network)
    .stationCode(pageStatus.station)
    .locationCode(pageStatus.location)
    .channelCode('HH?');
  return stationQuery.queryChannels().then(netList => {
    let allChans = Array.from(spjs.stationxml.allChannels(netList));
    pageStatus.channelList = allChans;
    return allChans;
  })
}


export const SELECTED_ROW = "selectedRow";
export function setupSelectable(quakeTable, quakeMap) {
  quakeTable.addStyle(`
      table tbody tr.${SELECTED_ROW} td {
        color: green;
      }
    `);
  quakeTable.addEventListener("quakeclick", ce => {
      quakeMap.quakeList.forEach(q => {
        quakeMap.removeColorClass(seisplotjs.leafletutil.cssClassForQuake(q));
      });
      quakeMap.colorClass(seisplotjs.leafletutil.cssClassForQuake(ce.detail.quake), "green");
      let quakeRow = quakeTable.findRowForQuake(ce.detail.quake);
      let allRows= quakeRow.parentNode.querySelectorAll(`tbody tr`);
      allRows.forEach(r => {
        r.classList.remove(SELECTED_ROW);
      });
      quakeRow.classList.add(SELECTED_ROW);
  });

}

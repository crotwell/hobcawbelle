
import * as sp from 'seisplotjs';
import { DateTime, Duration} from 'luxon';

import {loadSeismoData} from './do_seismograph';
import {clearContent, loadChannels, clearMessage, setMessage,
  updateButtonSelection, EASTERN_TIMEZONE} from './util';
import type {PageState} from './util';

const EQ_URL = "https://eeyore.seis.sc.edu/scsn/sc_quakes/sc_quakes.xml"


export function do_earthquakes(pageState: PageState) {
  clearMessage();
  updateButtonSelection('#earthquakes', pageState);
  let div = document.querySelector<HTMLDivElement>('#content');
  if (div == null) { return; }
  clearContent(div);
  let innerDiv = document.createElement("div");
  innerDiv.setAttribute("class", "maptable");
  div.appendChild(innerDiv);

  let orgDisplay = new sp.organizeddisplay.OrganizedDisplay();
  orgDisplay.setAttribute(sp.organizeddisplay.WITH_TOOLS, "false");
  orgDisplay.tools = "false";
  div.appendChild(orgDisplay);

  let colDefaultLabels = sp.infotable.QuakeTable.createDefaultColumnLabels();
  colDefaultLabels.delete(sp.infotable.QUAKE_COLUMN.TIME);
  let colLabels = new Map();
  colLabels.set(sp.infotable.QUAKE_COLUMN.LOCALTIME, "Time");
  for (let k of colDefaultLabels.keys()) {
    colLabels.set(k, colDefaultLabels.get(k));
  }

  colLabels.delete(sp.infotable.QUAKE_COLUMN.MAGTYPE);
  let quakeTable = new sp.infotable.QuakeTable([], colLabels);
  quakeTable.timeZone = EASTERN_TIMEZONE;
  let quakeMap = new sp.leafletutil.QuakeStationMap();
  quakeMap.setAttribute(sp.leafletutil.TILE_TEMPLATE,
    'https://www.seis.sc.edu/tilecache/WorldOceanBase/{z}/{y}/{x}'
  );
  quakeMap.setAttribute(sp.leafletutil.TILE_ATTRIBUTION,
    'Tiles &copy; Esri, Garmin, GEBCO, NOAA NGDC, and other contributors'
  );
  quakeMap.zoomLevel = 11;
  if (pageState.channelList.length > 0) {
    quakeMap.centerLat = pageState.channelList[0].latitude;
    quakeMap.centerLon = pageState.channelList[0].longitude;
  } else {
    quakeMap.centerLat = 33;
    quakeMap.centerLon = -80.0;
  }
  innerDiv.appendChild(quakeMap);
  innerDiv.appendChild(quakeTable);
  setupSelectable(quakeTable, quakeMap, pageState);
  if (pageState.quakeList.length === 0 || pageState.channelList.length === 0) {
    setMessage("Loading earthquakes...");
    Promise.all([loadChannels(pageState), loadEarthquakes(pageState)])
    .then(([chanList, quakeList]) => {
      clearMessage();
      pageState.quakeList = quakeList;
      pageState.selectedQuakeList = [];
      pageState.channelList = chanList;
      // draw in reversed order so recent is on top
      const reversedQuakeList = quakeList.slice().reverse();
      quakeMap.addQuake(reversedQuakeList);
      quakeMap.addStation(sp.stationxml.uniqueStations(chanList));
      if (chanList.length > 0) {
        quakeMap.centerLat = chanList[0].latitude;
        quakeMap.centerLon = chanList[0].longitude;
      }
      quakeMap.draw();
      quakeTable.quakeList = quakeList;
      quakeTable.draw();
      //doSelectQuake(quakeList[0], quakeTable, quakeMap, pageState);
    });
  } else {
    quakeTable.quakeList = pageState.quakeList;
    quakeMap.addQuake(pageState.quakeList);
    quakeMap.addStation(sp.stationxml.uniqueStations(pageState.channelList));
    quakeMap.centerLat = pageState.channelList[0].latitude;
    quakeMap.centerLon = pageState.channelList[0].longitude;
    quakeMap.draw();
    if (pageState.selectedQuakeList[0]) {
      doSelectQuake(pageState.selectedQuakeList[0], quakeTable, quakeMap, pageState);
    }
  }
}


export function loadEarthquakes(pageState: PageState): Promise<Array<sp.quakeml.Quake>> {
  return sp.quakeml.fetchQuakeML(EQ_URL)
    .then((eventParams: sp.quakeml.EventParameters) => {
      return eventParams.eventList;
    })
    .then((quakeList: Array<sp.quakeml.Quake>) => {
      console.log(`quakeList: ${quakeList}`)
      const quakeDur = Duration.fromISO("P90D");
      const start = DateTime.utc().minus(quakeDur);
      return quakeList.filter(q => q.time > start);
      //  .filter(q => q.latitude > 34 && q.latitude < 34.4 && q.longitude > -80.9 && q.longitude < -80.5);
    })
    .then((quakeList: Array<sp.quakeml.Quake>) => {
      pageState.quakeList = quakeList;
      return quakeList;
    });
}

export const SELECTED_ROW = "selectedRow";
export function setupSelectable(quakeTable: sp.infotable.QuakeTable,
                                quakeMap: sp.leafletutil.QuakeStationMap,
                                pageState: PageState) {
  quakeTable.addStyle(`
      td {
        padding-left: 5px;
        padding-right: 5px;
      }
      table tbody tr.${SELECTED_ROW} td {
        background-color: green;
        color: white;
      }
    `);
  quakeTable.addEventListener("quakeclick", (ce: sp.quakeml.Quake) => {
    doSelectQuake(ce.detail.quake, quakeTable, quakeMap, pageState);
  });
  quakeMap.addEventListener("quakeclick", (ce: sp.quakeml.Quake) => {
    doSelectQuake(ce.detail.quake, quakeTable, quakeMap, pageState);
  });
  quakeMap.addEventListener("stationclick", (ce: sp.quakeml.Quake) => {
    console.log(`stationclick: ${ce.detail.station}`);
  });
  if (pageState.selectedQuakeList.length > 0) {
    doSelectQuake(pageState.selectedQuakeList[0], quakeTable, quakeMap, pageState);
  }
}
export function doSelectQuake(quake: sp.quakeml.Quake,
                              quakeTable: sp.infotable.QuakeTable,
                              quakeMap: sp.leafletutil.StationEventMap,
                              pageState: PageState) {
  let quakeRow = quakeTable.findRowForQuake(quake);
  if (!quakeRow) {
    console.log(`row for quake not found: ${quake}: rows: ${quakeTable._rowToQuake.size}`)
  }
  const idx = pageState.selectedQuakeList.indexOf(quake);
  if (idx !== -1) {
    // quake already in list, remove
    pageState.selectedQuakeList.splice(idx,1);
    quakeMap.removeColorClass(sp.leafletutil.cssClassForQuake(quake));
    if (quakeRow) {
      quakeRow.classList.remove(SELECTED_ROW);
    }
    return;
  } else {
    pageState.selectedQuakeList = [quake];
    quakeMap.quakeList.forEach((q: sp.quakeml.Quake) => {
      quakeMap.removeColorClass(sp.leafletutil.cssClassForQuake(q));
    });
    quakeMap.colorClass(sp.leafletutil.cssClassForQuake(quake), "green");
    if (quakeRow) {
      let allRows = quakeRow.parentNode.querySelectorAll(`tbody tr`);
      allRows.forEach((r: HTMLElement) => {
        r.classList.remove(SELECTED_ROW);
      });
      quakeRow.classList.add(SELECTED_ROW);
    }
    if (pageState.doSeismograph) {
      loadSeismoData(pageState).then(sddList => {
        let orgDisplay = document.querySelector("sp-organized-display");
        orgDisplay.seisData = sddList;
      });
    }
  }
}


import * as seisplotjs from 'seisplotjs';
const spjs = seisplotjs;
import {clearContent, loadChannels} from './util';
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
  quakeMap.setAttribute(spjs.leafletutil.TILE_TEMPLATE,
    'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}'
  );
  quakeMap.setAttribute(spjs.leafletutil.TILE_ATTRIBUTION,
    'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC'
  );
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
  setupSelectable(quakeTable, quakeMap, pageState);
  if (pageState.quakeList.length === 0 || pageState.channelList.length === 0) {
    Promise.all([loadChannels(pageState), loadEarthquakes(pageState)])
    .then(([chanList, quakeList]) => {
      pageState.quakeList = quakeList;
      pageState.selectedQuakeList = [];
      pageState.channelList = chanList;
      // draw in reversed order so recent is on top
      const reversedQuakeList = quakeList.slice().reverse();
      quakeMap.addQuake(reversedQuakeList);
      quakeMap.addStation(spjs.stationxml.uniqueStations(chanList));
      if (chanList.length > 0) {
        quakeMap.centerLat = chanList[0].latitude;
        quakeMap.centerLon = chanList[0].longitude;
      }
      quakeMap.draw();
      quakeTable.quakeList = quakeList;
      quakeTable.draw();
      setupSelectable(quakeTable, quakeMap, pageState);
    });
  } else {
    quakeTable.quakeList = pageState.quakeList;
    quakeMap.addQuake(pageState.quakeList);
    quakeMap.addStation(spjs.stationxml.uniqueStations(pageState.channelList));
    quakeMap.centerLat = pageState.channelList[0].latitude;
    quakeMap.centerLon = pageState.channelList[0].longitude;
    quakeMap.draw();
    setupSelectable(quakeTable, quakeMap, pageState);
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

export const SELECTED_ROW = "selectedRow";
export function setupSelectable(quakeTable, quakeMap, pageState: PageState) {
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
  quakeTable.addEventListener("quakeclick", ce => {
    doSelectQuake(ce.detail.quake, quakeTable, quakeMap, pageState);
  });
  quakeMap.addEventListener("quakeclick", ce => {
    doSelectQuake(ce.detail.quake, quakeTable, quakeMap, pageState);
  });
  quakeMap.addEventListener("stationclick", ce => {
    console.log(`stationclick: ${ce.detail.station}`);
  });
  if (pageState.selectedQuakeList.length > 0) {
    doSelectQuake(pageState.selectedQuakeList[0], quakeTable, quakeMap, pageState);
  }
}
export function doSelectQuake(quake: Quake,
                              quakeTable: spjs.infotable.QuakeTable,
                              quakeMap: spjs.leafletutil.StationEventMap,
                              pageState: PageState) {
  if (pageState) {pageState.selectedQuakeList = [quake];}
  quakeMap.quakeList.forEach(q => {
    quakeMap.removeColorClass(seisplotjs.leafletutil.cssClassForQuake(q));
  });
  quakeMap.colorClass(seisplotjs.leafletutil.cssClassForQuake(quake), "green");
  let quakeRow = quakeTable.findRowForQuake(quake);
  if (!quakeRow) {
    console.log(`row for quake not found: ${quake}: rows: ${quakeTable._rowToQuake.size}`)
  } else {
    let allRows= quakeRow.parentNode.querySelectorAll(`tbody tr`);
    allRows.forEach(r => {
      r.classList.remove(SELECTED_ROW);
    });
    quakeRow.classList.add(SELECTED_ROW);
  }

}

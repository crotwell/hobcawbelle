
import * as seisplotjs from 'seisplotjs';
const spjs = seisplotjs;

import { do_seismograph } from './do_seismograph'
import {clearContent, DEF_WINDOW_SEC, loadChannels, clearMessage, setMessage} from './util';
import type {PageState} from './util';

const DEFAULT_DURATION = "P1D";
const SeismogramDisplayData = seisplotjs.seismogram.SeismogramDisplayData;
const HelicorderConfig = seisplotjs.helicorder.HelicorderConfig;
const Helicorder = seisplotjs.helicorder.Helicorder;

const MINMAX_URL = "https://eeyore.seis.sc.edu/minmax";

export function do_helicorder(pageState: PageState) {
  let div = document.querySelector<HTMLDivElement>('#content');
  clearContent(div);
  setMessage("Loading helicorder...");

  let timeChooser = new spjs.datechooser.TimeRangeChooser();
  timeChooser.end = pageState.heliWindow.end;
  timeChooser.start = pageState.heliWindow.start;
  timeChooser.updateCallback = (interval) => {
    const in_heli = document.querySelector("sp-helicorder");
    in_heli.heliConfig.fixedTimeScale = interval
    pageState.heliWindow = interval;
    loadHeli(pageState).then(sddList => {
      in_heli.seisData = sddList;
    });
  }
  div.appendChild(timeChooser);
  let timeDiv = div.appendChild(document.createElement("div"));
  timeDiv.innerHTML = `
<button id="loadToday">Today</button>
<button id="loadNow">Now</button>
<button id="loadPrev">Previous</button>
<button id="loadNext">Next</button>
  `;
  initTimeButtons(pageState);
  let chanListDiv = div.appendChild(document.createElement("details"));
  chanListDiv.classList.add("helichannel");
  let summary = chanListDiv.appendChild(document.createElement("summary"));
  summary.textContent = "Channels";
  let chanChooser = new spjs.components.SourceIdListChooser();
  chanChooser.type = "radio";
  chanListDiv.appendChild(chanChooser);
  if (pageState.channelList.length > 0) {
    let sidList = spjs.stationxml.uniqueSourceIds(pageState.channelList);
    chanChooser.setSourceIds(sidList);
  } else {
    loadChannels(pageState).then(chanList => {
      let sidList = spjs.stationxml.uniqueSourceIds(pageState.channelList);
      chanChooser.setSourceIds(sidList);
    });
  }

  const heliConfig = new HelicorderConfig(pageState.heliWindow);
  const heli = new spjs.helicorder.Helicorder([], heliConfig);
  heli.addEventListener("heliclick", hEvent => {
      const centerTime = hEvent.detail.time;
      //const hwValue = document.querySelector("#clickinterval").value;
      const hwValue = DEF_WINDOW_SEC;
      let dur;
      if ( ! Number.isNaN(Number.parseFloat(hwValue))) {
        // assume seconds
        dur = spjs.luxon.Duration.fromMillis(1000*Number.parseFloat(hwValue));
      } else {
        dur = spjs.luxon.Duration.fromISO(hwValue);
      }
      let halfWidth;
      if (dur.toMillis() > 0 ) {
        halfWidth = spjs.luxon.Duration.fromMillis(dur.toMillis()/2);
      } else {
        halfWidth = spjs.luxon.Duration.fromMillis(-1*dur.toMillis()/2);
      }
      pageState.selectedQuakeList = [];
      pageState.window = spjs.util.startEnd(centerTime.minus(halfWidth),
                                            centerTime.plus(halfWidth));
      do_seismograph(pageState);
    });
  div.appendChild(heli);
  chanChooser.addEventListener("change", evt => {
    if (chanChooser.selectedSourceIds().length > 0) {
      pageState.heliChannel = chanChooser.selectedSourceIds()[0];
      loadHeli(pageState).then(sddList => {
        heli.seisData = sddList;
      });
    }
  });
  loadHeli(pageState).then(sddList => {
    heli.seisData = sddList;
  });
}

export function loadHeli(pageState: PageState): Promise<SeismogramDisplayData> {
  let minMaxQ = new seisplotjs.mseedarchive.MSeedArchive(
    MINMAX_URL, "%n/%s/%Y/%j/%n.%s.%l.%c.%Y.%j.%H");
  let heliSDD = SeismogramDisplayData.fromSourceIdAndTimes(pageState.heliChannel,
                                                        pageState.heliWindow.start,
                                                        pageState.heliWindow.end);

  let minMaxSourceCode = pageState.heliChannel.sourceCode;
  let minMaxBandCode = pageState.heliChannel.bandCode;
  if (pageState.heliChannel.sourceCode === "H") {
    minMaxBandCode = "L";
    minMaxSourceCode = "X";
  } else if (pageState.heliChannel.sourceCode === "N") {
    minMaxBandCode = "L";
    minMaxSourceCode = "Y";
  }
  let minmaxChan = new spjs.fdsnsourceid.FDSNSourceId(pageState.heliChannel.networkCode,
                            pageState.heliChannel.stationCode,
                            pageState.heliChannel.locationCode,
                            "L", minMaxSourceCode, pageState.heliChannel.subsourceCode);
  let minMaxSDD = SeismogramDisplayData.fromSourceIdAndTimes(minmaxChan,
                                                        pageState.heliWindow.start,
                                                        pageState.heliWindow.end);
  return minMaxQ.loadSeismograms([minMaxSDD]).then(sddArr => {
    clearMessage();
    return sddArr;
  });
}


export const HOURS_PER_LINE = 2;

export function getHeliNowTime() {
  let e = spjs.luxon.DateTime.utc().endOf('hour').plus({milliseconds: 1});
  console.log(`getHeliNowTime ${e}  ${e.hour % HOURS_PER_LINE}`)
  e = e.plus({hours: e.hour % HOURS_PER_LINE});
  return e;
}

export function initTimeButtons(pageState: PageState) {
  document.querySelector("button#loadNow")
  .addEventListener("click", function(d) {
    let trChooser = document.querySelector("sp-timerange");
    trChooser.duration = trChooser.duration;
    trChooser.end = getHeliNowTime();
  });

  document.querySelector("button#loadToday")
  .addEventListener("click", function(d) {
    let trChooser = document.querySelector("sp-timerange");
    trChooser.duration = trChooser.duration;
    trChooser.end = spjs.luxon.DateTime.utc().endOf('day').plus({millisecond: 1});
  });

  document.querySelector("button#loadPrev")
  .addEventListener("click", function(d) {
    let trChooser = document.querySelector("sp-timerange");
    trChooser.duration = trChooser.duration;
    trChooser.end = trChooser.start;
  });

  document.querySelector("button#loadNext")
  .addEventListener("click", function(d) {
    let trChooser = document.querySelector("sp-timerange");
    trChooser.duration = trChooser.duration;
    trChooser.start = trChooser.end;
  });

}

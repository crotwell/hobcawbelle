
import * as sp from 'seisplotjs';
import { Interval } from 'luxon';

import { do_seismograph } from './do_seismograph'
import {clearContent, DEF_WINDOW_SEC, loadChannels, clearMessage, setMessage,
  updateButtonSelection, formatTimeToMin } from './util';
import type {PageState} from './util';

const SeismogramDisplayData = sp.seismogram.SeismogramDisplayData;
const HelicorderConfig = sp.helicorder.HelicorderConfig;

const MINMAX_URL = "https://eeyore.seis.sc.edu/minmax";

export function do_helicorder(pageState: PageState) {
  clearMessage();
  updateButtonSelection('#helicorder', pageState);
  let div = document.querySelector<HTMLDivElement>('#content');
  if (div == null) {return;}
  clearContent(div);
  setMessage("Loading helicorder...");

  const fromToTime = document.createElement("h5");
  fromToTime.classList.add("fromtotime");
  fromToTime.textContent = `From  to `;
  div.append(fromToTime);
  let timeChooser = new sp.datechooser.TimeRangeChooser();
  timeChooser.end = pageState.heliWindow.end;
  timeChooser.start = pageState.heliWindow.start;
  timeChooser.resyncValues(sp.datechooser.DURATION_CHANGED);
  timeChooser.updateCallback = (interval: Interval) => {
    if (!interval) {return;}
    const in_heli = document.querySelector("sp-helicorder") as sp.helicorder.Helicorder;
    in_heli.heliConfig.fixedTimeScale = interval
    pageState.heliWindow = interval;
    fromToTime.textContent = `From ${formatTimeToMin(interval.start)} to ${formatTimeToMin(interval.end)}`;
    loadHeli(pageState).then(sddList => {
      in_heli.seisData = sddList;
    });
  }
  timeChooser.classList.add("helicorder");
  div.appendChild(timeChooser);
  let timeDiv = div.appendChild(document.createElement("div"));
  timeDiv.innerHTML = `
<button id="loadToday">Today</button>
<button id="loadNow">Now</button>
<button id="loadPrev">Previous</button>
<button id="loadNext">Next</button>
  `;
  initTimeButtons();
  let chanListDiv = div.appendChild(document.createElement("details"));
  chanListDiv.classList.add("helichannel");
  let summary = chanListDiv.appendChild(document.createElement("summary"));
  summary.textContent = "Channels";
  let chanChooser = new sp.components.SourceIdListChooser();
  chanChooser.type = "radio";
  chanListDiv.appendChild(chanChooser);
  if (pageState.channelList.length > 0) {
    let sidList = sp.stationxml.uniqueSourceIds(pageState.channelList);
    chanChooser.setSourceIds(sidList);
  } else {
    loadChannels(pageState).then(() => {
      let sidList = sp.stationxml.uniqueSourceIds(pageState.channelList);
      chanChooser.setSourceIds(sidList);
    });
  }

  const heliConfig = new HelicorderConfig(pageState.heliWindow);
  const heli = new sp.helicorder.Helicorder([], heliConfig);

  heli.heliConfig.yLabelRightTimeZone = sp.luxon.IANAZone.create("America/New_York");
  heli.heliConfig.yLabelTimeZone = heli.heliConfig.yLabelRightTimeZone;
  heli.addEventListener("heliclick", (hEvent: sp.helicorder.HeliMouseEventType) => {
      const centerTime = hEvent.detail.time;
      //const hwValue = document.querySelector("#clickinterval").value;
      const hwValue = DEF_WINDOW_SEC;
      let dur;
      if ( ! Number.isNaN(hwValue)) {
        // assume seconds
        dur = sp.luxon.Duration.fromMillis(1000*hwValue);
      } else {
        dur = sp.luxon.Duration.fromISO(hwValue);
      }
      let halfWidth;
      if (dur.toMillis() > 0 ) {
        halfWidth = sp.luxon.Duration.fromMillis(dur.toMillis()/2);
      } else {
        halfWidth = sp.luxon.Duration.fromMillis(-1*dur.toMillis()/2);
      }
      pageState.selectedQuakeList = [];
      pageState.window = sp.util.startEnd(centerTime.minus(halfWidth),
                                            centerTime.plus(halfWidth));
      do_seismograph(pageState);
    });
  div.appendChild(heli);
  chanChooser.addEventListener("change", () => {
    if (chanChooser.selectedSourceIds().length > 0) {
      pageState.heliChannel = chanChooser.selectedSourceIds()[0];
      loadHeli(pageState).then(sddList => {
        heli.seisData = sddList;
      });
    }
  });
  loadHeli(pageState).then(sddList => {
    heli.seisData = sddList;
    if (pageState.heliWindow?.start) {
      const startHeli = formatTimeToMin(pageState.heliWindow.start);
      const endHeli = formatTimeToMin(pageState.heliWindow.end);
      const zoneHeli = heli.heliConfig.yLabelTimeZone.offsetName(pageState.heliWindow.start.toMillis(), {format: "short"});
      fromToTime.textContent = `From ${startHeli} to ${endHeli} ${zoneHeli}`;
    }
  });
}

export function loadHeli(pageState: PageState): Promise<sp.seismogram.SeismogramDisplayData> {
  let minMaxQ = new sp.mseedarchive.MSeedArchive(
    MINMAX_URL, "%n/%s/%Y/%j/%n.%s.%l.%c.%Y.%j.%H");

  let minMaxSourceCode = pageState.heliChannel.sourceCode;
  let minMaxBandCode = pageState.heliChannel.bandCode;
  if (pageState.heliChannel.sourceCode === "H") {
    minMaxBandCode = "L";
    minMaxSourceCode = "X";
  } else if (pageState.heliChannel.sourceCode === "N") {
    minMaxBandCode = "L";
    minMaxSourceCode = "Y";
  }
  let minmaxChan = new sp.fdsnsourceid.FDSNSourceId(pageState.heliChannel.networkCode,
                            pageState.heliChannel.stationCode,
                            pageState.heliChannel.locationCode,
                            minMaxBandCode, minMaxSourceCode, pageState.heliChannel.subsourceCode);
  let minMaxSDD = SeismogramDisplayData.fromSourceIdAndTimes(minmaxChan,
                                                        pageState.heliWindow.start,
                                                        pageState.heliWindow.end);
  return minMaxQ.loadSeismograms([minMaxSDD])
  .then((sddArr: Array<sp.seismogram.SeismogramDisplayData>) => {
    clearMessage();
    return sddArr;
  });
}


export const HOURS_PER_LINE = 2;

export function getHeliNowTime() {
  let e = sp.luxon.DateTime.utc().endOf('hour').plus({milliseconds: 1});
  console.log(`getHeliNowTime ${e}  ${e.hour % HOURS_PER_LINE}`)
  e = e.plus({hours: e.hour % HOURS_PER_LINE});
  return e;
}

export function initTimeButtons() {
  document.querySelector("button#loadNow")
  ?.addEventListener("click", function() {
    let trChooser = document.querySelector("sp-timerange") as sp.datechooser.TimeRangeChooser;
    if (trChooser) {
      trChooser.resyncValues(sp.datechooser.DURATION_CHANGED);
      trChooser.duration = trChooser.duration;
      trChooser.end = getHeliNowTime();
    }
  });

  document.querySelector("button#loadToday")
  ?.addEventListener("click", () => {
    let trChooser = document.querySelector("sp-timerange") as sp.datechooser.TimeRangeChooser;
    if (trChooser) {
      trChooser.resyncValues(sp.datechooser.DURATION_CHANGED);
      trChooser.end = sp.luxon.DateTime.now().endOf('day').plus({millisecond: 1});
      trChooser.duration = sp.luxon.Duration.fromISO("P1D");
    }
  });

  document.querySelector("button#loadPrev")
  ?.addEventListener("click", () => {
    let trChooser = document.querySelector("sp-timerange") as sp.datechooser.TimeRangeChooser;
    if (trChooser) {
      trChooser.resyncValues(sp.datechooser.DURATION_CHANGED);
      trChooser.duration = trChooser.duration;
      trChooser.end = trChooser.start;
    }
  });

  document.querySelector("button#loadNext")
  ?.addEventListener("click", () => {
    let trChooser = document.querySelector("sp-timerange") as sp.datechooser.TimeRangeChooser;
    if (trChooser) {
      trChooser.resyncValues(sp.datechooser.DURATION_CHANGED);
      trChooser.duration = trChooser.duration;
      trChooser.start = trChooser.end;
    }
  });

}

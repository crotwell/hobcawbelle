
import * as seisplotjs from 'seisplotjs';
const spjs = seisplotjs;

import { do_seismograph } from './do_seismograph'
import {clearContent} from './util';
import type {PageState} from './util';

const DEFAULT_DURATION = "P1D";
const SeismogramDisplayData = seisplotjs.seismogram.SeismogramDisplayData;
const HelicorderConfig = seisplotjs.helicorder.HelicorderConfig;
const Helicorder = seisplotjs.helicorder.Helicorder;

const MINMAX_URL = "http://eeyore.seis.sc.edu/minmax";

export function do_helicorder(pageState: PageState) {
  let div = document.querySelector<HTMLDivElement>('#content');
  clearContent(div);


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

  const heliConfig = new HelicorderConfig(pageState.heliWindow);
  const heli = new spjs.helicorder.Helicorder([], heliConfig);
  heli.addEventListener("heliclick", hEvent => {
      const centerTime = hEvent.detail.time;
      //const hwValue = document.querySelector("#clickinterval").value;
      const hwValue = 120;
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
      pageState.window = spjs.util.startEnd(centerTime.minus(halfWidth),
                                            centerTime.plus(halfWidth));
      do_seismograph(pageState);
    });
  div.appendChild(heli);
  loadHeli(pageState).then(sddList => {
    heli.seisData = sddList;
  })
}

export function loadHeli(pageState: PageState): Promise<SeismogramDisplayData> {
  let minMaxQ = new seisplotjs.mseedarchive.MSeedArchive(
    MINMAX_URL, "%n/%s/%Y/%j/%n.%s.%l.%c.%Y.%j.%H");
  let heliSDD = SeismogramDisplayData.fromCodesAndTimes(pageState.network,
                                                        pageState.station,
                                                        pageState.location,
                                                        pageState.heliChannel,
                                                        pageState.heliWindow.start,
                                                        pageState.heliWindow.end);

  let minmaxChan = "LX"+pageState.heliChannel.charAt(2);
  let minMaxSDD = SeismogramDisplayData.fromCodesAndTimes(pageState.network,
                                                        pageState.station,
                                                        pageState.location,
                                                        minmaxChan,
                                                        pageState.heliWindow.start,
                                                        pageState.heliWindow.end);
  return minMaxQ.loadSeismograms([minMaxSDD]);
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
    trChooser.end = luxon.DateTime.utc().endOf('day').plus({millisecond: 1}).toISO();
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


import * as seisplotjs from 'seisplotjs';
const spjs = seisplotjs;
import {clearContent} from './util';
import type {PageState} from './util';
const SeismogramDisplayData = seisplotjs.seismogram.SeismogramDisplayData;

const MSEED_URL = "https://eeyore.seis.sc.edu/mseed";

export function do_seismograph(pageState: PageState) {
  let div = document.querySelector<HTMLDivElement>('#content');
  clearContent(div);
  let timeChooser = new spjs.datechooser.TimeRangeChooser();
  if (pageState.window) {
    // update times without trigger notify
    timeChooser.updateTimeRange(pageState.window);
  }
  timeChooser.updateCallback = (interval) => {
    const in_graph = document.querySelector("sp-organized-display");
    pageState.window = interval;
    loadSeismoData(pageState).then(sddList => {
      in_graph.seisData = sddList;
    });
  }
  div.appendChild(timeChooser);
  let graph = new spjs.displayorganize.OrganizedDisplay();
  div.appendChild(graph);
  loadSeismoData(pageState).then(sddList => {
    timeChooser.updateTimeRange(pageState.window);
    graph.seisData = sddList;
  });
}


export function loadSeismoData(pageState: PageState): Promise<SeismogramDisplayData> {
  let minMaxQ = new seisplotjs.mseedarchive.MSeedArchive(
    MSEED_URL, "%n/%s/%Y/%j/%n.%s.%l.%c.%Y.%j.%H");
  if (pageState.selectedQuakeList.length > 0) {
    let chanPromise;
    if (pageState.channelList.length === 0) {
      chanPromise = loadChannels(pageState);
    } else {
      chanPromise = Promise.resolve(pageState.channelList);
    }
    return chanPromise.then(chanList => {
      let sddList = [];
      const preDur = spjs.luxon.Duration.fromISO("PT30S");
      const postDur = spjs.luxon.Duration.fromISO("PT60S");
      pageState.selectedQuakeList.forEach(q => {
        let timeWindow = spjs.luxon.Interval.fromDateTimes(q.time.minus(preDur),
                                                q.time.plus(postDur));
        pageState.window = timeWindow;
        chanList.forEach(c => {
          let sdd = SeismogramDisplayData.fromChannelAndTimeWindow(c, timeWindow);
          sdd.addQuake(q);
          sdd.addMarkers(spjs.seismograph.createMarkerForOriginTime(q));
          sdd.addMarkers(spjs.seismograph.createMarkerForPicks(q.preferredOrigin, c));
          sddList.push(sdd);
        });
      });
      return minMaxQ.loadSeismograms(sddList);
    });
  } else {
    let window = pageState.window ? pageState.window : spjs.util.durationEnd(300, "now");
    pageState.window = window;
    let sddList = pageState.channelCodeList.map(c => SeismogramDisplayData.fromCodesAndTimes(pageState.network,
                                                          pageState.station,
                                                          pageState.location,
                                                          c,
                                                          window.start,
                                                          window.end));
    return minMaxQ.loadSeismograms(sddList);
  }
}

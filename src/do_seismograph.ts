
import * as sp from 'seisplotjs';
import {Interval} from 'luxon';
import {clearContent, loadChannels, clearMessage, setMessage,
  updateButtonSelection } from './util';
import type {PageState} from './util';
const SeismogramDisplayData = sp.seismogram.SeismogramDisplayData;

const MSEED_URL = "https://eeyore.seis.sc.edu/mseed";

export function do_seismograph(pageState: PageState) {
  let div = document.querySelector<HTMLDivElement>('#content');
  if (!div) { return; }
  clearContent(div);
  updateButtonSelection('#seismograph', pageState);
  setMessage("Loading seismograms...");
  let timeChooser = new sp.datechooser.TimeRangeChooser();
  timeChooser.setAttribute("prev-next", "true")
  if (pageState.window) {
    // update times without trigger notify
    timeChooser.updateTimeRange(pageState.window);
  }
  timeChooser.updateCallback = (interval: Interval) => {
    const in_graph = document.querySelector("sp-organized-display") as sp.organizeddisplay.OrganizedDisplay;
    pageState.window = interval;
    loadSeismoData(pageState).then(sddList => {
      in_graph.seisData = sddList;
    });
  }
  div.appendChild(timeChooser);
  let graph = new sp.organizeddisplay.OrganizedDisplay();
  div.appendChild(graph);
  loadSeismoData(pageState).then(sddList => {
    if (pageState.window) {
      // update times without trigger notify
      timeChooser.updateTimeRange(pageState.window);
    }
    const in_graph = document.querySelector("sp-organized-display") as sp.organizeddisplay.OrganizedDisplay;
    in_graph.seisData = sddList;
    if (sddList.length > 0) {
      clearMessage();
    } else {
      console.log(`set no seis messages`)
      setMessage(`No seismograms for this earthquake were recorded at ${pageState.station}.`);
    }
  });
}


export function loadSeismoData(pageState: PageState): Promise<sp.seismogram.SeismogramDisplayData> {
  let minMaxQ = new sp.mseedarchive.MSeedArchive(
    MSEED_URL, "%n/%s/%Y/%j/%n.%s.%l.%c.%Y.%j.%H");
  let chanPromise;
  if (pageState.channelList.length === 0) {
    chanPromise = loadChannels(pageState);
  } else {
    chanPromise = Promise.resolve(pageState.channelList);
  }
  return chanPromise.then(chanList => {
    if (pageState.selectedQuakeList.length > 0) {
      let sddList: Array<sp.seismogram.SeismogramDisplayData> = [];
      const preDur = sp.luxon.Duration.fromISO("PT30S");
      const postDur = sp.luxon.Duration.fromISO("PT60S");
      pageState.selectedQuakeList.forEach(q => {
        let timeWindow = sp.luxon.Interval.fromDateTimes(q.time.minus(preDur),
                                                q.time.plus(postDur));
        pageState.window = timeWindow;
        chanList
        .filter(c => c.timeRange.overlaps(timeWindow))
        .forEach(c => {
          let sdd = SeismogramDisplayData.fromChannelAndTimeWindow(c, timeWindow);
          sdd.addQuake(q);
          sdd.addMarkers(sp.seismograph.createMarkerForOriginTime(q));
          sdd.addMarkers(sp.seismograph.createMarkerForPicks(q.preferredOrigin, c));
          sddList.push(sdd);
        });
      });
      return minMaxQ.loadSeismograms(sddList)
      .then(sddList => {
        if (pageState.filter) {
          sddList.forEach(sdd => {
            let butterworth = sp.filter.createButterworth(
              2, // poles
              pageState.filter.style,
              pageState.filter.lowCorner, // low corner
              pageState.filter.highCorner, // high corner
              1 / sdd.seismogram.sampleRate, // delta (period)
            );
            let rmeanSeis = sp.filter.rMean(sdd.seismogram);
            let filteredSeis = sp.filter.applyFilter(butterworth, rmeanSeis);
            sdd.seismogram = filteredSeis;
          });
        }
        return sddList;
      })
      .then(sddList => {
        let promiseList = [];
        sddList.forEach(sdd => {
          const taupQuery = new sp.traveltime.TraveltimeQuery();
          taupQuery.latLonFromQuake(sdd.quake);
          taupQuery.latLonFromStation(sdd.channel.station);
          promiseList.push(taupQuery.queryJson().then(ttimes => {
            if (ttimes) {
              sdd.addMarkers(sp.seismographmarker.createMarkersForTravelTimes(sdd.quake, ttimes));
            } else {
              console.log("no ttimes");
            }
          }));
        })
        return Promise.all(promiseList).then( () => { return sddList;});
      }).then((sddList) => {
        return sddList;
      });
    } else {
      let timeWindow;
      if (pageState.window) {
        timeWindow = pageState.window;
      } else {
        timeWindow = sp.util.durationEnd(300, "now");
      }
      let sddList: Array<sp.seismogram.SeismogramDisplayData> = [];
      chanList
      .filter(c => c.timeRange.overlaps(timeWindow))
      .forEach(c => {
        let sdd = SeismogramDisplayData.fromChannelAndTimeWindow(c, timeWindow);
        sddList.push(sdd);
      });
      return minMaxQ.loadSeismograms(sddList);
    }
  }).then(sddList => {
    return sddList;
  });
}

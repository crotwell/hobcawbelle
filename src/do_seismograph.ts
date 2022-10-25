
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
  timeChooser.end = pageState.window.end;
  timeChooser.start = pageState.window.start;
  timeChooser.updateCallback = (interval) => {
    const in_graph = document.querySelector("sp-organized-display");
    pageState.window = interval;
    // in_graph.time_scalable.drawDuration = interval.toDuration();
    // in_graph.time_scalable.drawAlignmentTimeOffset = spjs.seismograph.ZERO_DURATION;
    // in_graph.redraw();
    loadSeismoData(pageState).then(sddList => {
      in_graph.seisData = sddList;
    });
  }
  div.appendChild(timeChooser);
  let graph = new spjs.displayorganize.OrganizedDisplay();
  div.appendChild(graph);
  loadSeismoData(pageState).then(sddList => {
    graph.seisData = sddList;
  });
}


export function loadSeismoData(pageState: PageState): Promise<SeismogramDisplayData> {
  let minMaxQ = new seisplotjs.mseedarchive.MSeedArchive(
    MSEED_URL, "%n/%s/%Y/%j/%n.%s.%l.%c.%Y.%j.%H");
  let sddList = pageState.chanList.map(c => SeismogramDisplayData.fromCodesAndTimes(pageState.network,
                                                        pageState.station,
                                                        pageState.location,
                                                        c,
                                                        pageState.window.start,
                                                        pageState.window.end));
  return minMaxQ.loadSeismograms(sddList);
}


import * as seisplotjs from 'seisplotjs';
const spjs = seisplotjs;
import {clearContent} from './util';
import type {PageState} from './util';

const DEFAULT_DURATION = "P1D";
const SeismogramDisplayData = seisplotjs.seismogram.SeismogramDisplayData;
const HelicorderConfig = seisplotjs.helicorder.HelicorderConfig;
const Helicorder = seisplotjs.helicorder.Helicorder;

const MINMAX_URL = "http://eeyore.seis.sc.edu/minmax";
const MSEED_URL = "http://eeyore.seis.sc.edu/mseed";

export function do_helicorder(pageState: PageState) {
  let div = document.querySelector<HTMLDivElement>('#content');
  clearContent(div);
  let dateChooser = new spjs.datechooser.DateTimeChooser();
  div.appendChild(dateChooser);
  let heli = new spjs.helicorder.Helicorder();
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

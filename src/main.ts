import './style.css';
import { do_earthquakes } from './do_earthquakes';
import { do_helicorder, getHeliNowTime } from './do_helicorder';
import { do_realtime } from './do_realtime';
import { do_seismograph } from './do_seismograph';
import { do_help } from './do_help';
import {loadChannels} from './util';
import type { PageState } from './util';
import * as sp from 'seisplotjs';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div id="content">
    </div>
`
console.log(`SeisPlotJS: ${sp.version}`)
sp.util.updateVersionText('#sp-version');
let heliEnd = getHeliNowTime();

let pageState: PageState = {
  window: null,
  network: "CO",
  station: "BELLE",
  location: "00",
  channelCodeList: ["HHZ", "HHN", "HHE", "HNZ", "HNN", "HNE"],
  stationCodeList: ["BELLE"],
  heliChannel: sp.fdsnsourceid.FDSNSourceId.parse("FDSN:CO_BELLE_00_H_N_Z"),
  heliWindow: sp.util.durationEnd("P1D", heliEnd),
  datalink: null,
  quakeList: [],
  networkList: [],
  channelList: [],
  selectedQuakeList: [],
  filter: null,
  doSeismograph: false,
};
/*
pageState.filter = {
  style: sp.filter.BAND_PASS,
  lowCorner: 1,
  highCorner: 10
};
pageState.doSeismograph = true;
*/

function setupButtons(pageState: PageState) {

  let rtButton = document.querySelector<HTMLButtonElement>('#realtime');
  if (rtButton) {
    rtButton.addEventListener('click', () => {
      do_realtime(pageState);
    });
    rtButton.classList.remove("selected");
  }

  let heliButton = document.querySelector<HTMLButtonElement>('#helicorder');
  if (heliButton) {
    heliButton.addEventListener('click', () => {
      do_helicorder(pageState);
    });
    heliButton.classList.remove("selected");
  }

  let eButton = document.querySelector<HTMLButtonElement>('#earthquakes');
  if (eButton) {
    eButton.addEventListener('click', () => {
      do_earthquakes(pageState);
    });
    eButton.classList.remove("selected");
  }

  let sButton = document.querySelector<HTMLButtonElement>('#seismograph');
  if (sButton) {
    sButton.addEventListener('click', () => {
      do_seismograph(pageState);
    });
    sButton.classList.remove("selected");
  }

  let helpButton = document.querySelector<HTMLButtonElement>('#help');
  if (helpButton) {
    helpButton.addEventListener('click', () => {
      do_help(pageState);
    });
  }
}

setupButtons(pageState);
loadChannels(pageState).then( () => {
  do_realtime(pageState);
});

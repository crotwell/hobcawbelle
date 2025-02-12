import './style.css'
import typescriptLogo from './typescript.svg'
import { do_earthquakes } from './do_earthquakes'
import { do_helicorder, getHeliNowTime } from './do_helicorder'
import { do_realtime } from './do_realtime'
import { do_seismograph } from './do_seismograph'
import { do_help } from './do_help'
import type { PageState } from './util'
import * as spjs from 'seisplotjs'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div id="content">
    </div>
`
console.log(`SeisPlotJS: ${spjs.version}`)
document.querySelector<HTMLSpanElement>('#spjsversion')!.innerHTML = spjs.version;
let heliEnd = getHeliNowTime();
let pageState: PageState = {
  window: null,
  network: "CO",
  station: "BELLE",
  location: "00",
  channelCodeList: ["HHZ", "HHN", "HHE", "HNZ", "HNN", "HNE"],
  stationCodeList: ["BELLE"],
  heliChannel: spjs.fdsnsourceid.FDSNSourceId.parse("FDSN:CO_BELLE_00_H_N_Z"),
  heliWindow: spjs.util.durationEnd("P1D", heliEnd),
  datalink: null,
  quakeList: [],
  networkList: [],
  channelList: [],
  selectedQuakeList: [],
};



function setupButtons(pageState) {
  let ebutton = document.querySelector<HTMLButtonElement>('#earthquakes');
  ebutton.addEventListener('click', () => {
    do_earthquakes(pageState);
  });

  let sbutton = document.querySelector<HTMLButtonElement>('#seismograph');
  sbutton.addEventListener('click', () => {
    do_seismograph(pageState);
  });


  let heliButton = document.querySelector<HTMLButtonElement>('#helicorder');
  heliButton.addEventListener('click', () => {
    do_helicorder(pageState);
  });

  let rtButton = document.querySelector<HTMLButtonElement>('#realtime');
  rtButton.addEventListener('click', () => {
    do_realtime(pageState);
  });

  let helpButton = document.querySelector<HTMLButtonElement>('#help');
  helpButton.addEventListener('click', () => {
    do_help(pageState);
  });
}

setupButtons(pageState);
do_earthquakes(pageState);

import './style.css'
import typescriptLogo from './typescript.svg'
import { setupCounter } from './counter'
import { do_helicorder } from './do_helicorder'
import { do_realtime } from './do_realtime'
import { do_seismograph } from './do_seismograph'
import type { PageState } from './util'
import * as spjs from 'seisplotjs'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>Junkyard Seismology</h1>
    <div class="card">
      <button id="seismograph" type="button">Seismograph</button>
      <button id="helicorder" type="button">Helicorder</button>
      <button id="realtime" type="button">Realtime</button>
    </div>
    <div id="content">
    </div>
  </div>
`

let heliEnd = spjs.luxon.DateTime.utc().plus({hour: 1}).startOf("hour");
if (heliEnd.hour % 2 === 1) {
  heliEnd = heliEnd.plus({hour: 1});
}
let pageState: PageState = {
  window: spjs.util.durationEnd(300, "now"),
  network: "CO",
  station: "JKYD",
  location: "00",
  chanList: ["HHZ", "HHN", "HHE"],
  heliChannel: "HHZ",
  heliWindow: spjs.util.durationEnd("P1D", heliEnd),
  datalink: null,
};



function setupButtons(pageState) {
  let button = document.querySelector<HTMLButtonElement>('#seismograph');
  button.addEventListener('click', () => {
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


}

setupButtons(pageState);

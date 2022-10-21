import './style.css'
import typescriptLogo from './typescript.svg'
import { setupCounter } from './counter'
import { do_helicorder } from './do_helicorder'
import { do_seismograph } from './do_seismograph'
import type { PageState } from './util'
import * as spjs from 'seisplotjs'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>Junkyard Seismo</h1>
    <div class="card">
      <button id="seismograph" type="button">Seismograph</button>
      <button id="helicorder" type="button">Helicorder</button>
      <button id="realtime" type="button">Realtime</button>
    </div>
    <div id="content">
    </div>
  </div>
`

let pageState: PageState = {
  window: spjs.util.durationEnd(300, "now"),
  network: "CO",
  station: "JKYD",
  location: "00",
  heliChannel: "HHZ",
  heliWindow: spjs.util.durationEnd("P1D", "now"),
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
    let div = document.querySelector<HTMLDivElement>('#content');
    clearContent(div);
    let graph = new spjs.seismograph.Seismograph();
    div.appendChild(graph);
  });


}

setupButtons(pageState);

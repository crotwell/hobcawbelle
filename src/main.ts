import './style.css'
import typescriptLogo from './typescript.svg'
import { setupCounter } from './counter'
import * as spjs from 'seisplotjs'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>Junkyard Seismo</h1>
    <div class="card">
      <button id="seismograph" type="button">Seismograph</button>
      <button id="helicorder" type="button">Helicorder</button>
      <button id="realtime" type="button">Realtime</button>
    </div>
    <div class="content">
    </div>
  </div>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)

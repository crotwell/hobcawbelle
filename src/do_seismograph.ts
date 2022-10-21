
import * as spjs from 'seisplotjs';
import {clearContent} from './util';
import type {PageState} from './util';

export function do_seismograph(pageState: PageState) {
  let div = document.querySelector<HTMLDivElement>('#content');
  clearContent(div);
  let timeChooser = new spjs.datechooser.TimeRangeChooser();
  timeChooser.end = pageState.window.end;
  timeChooser.start = pageState.window.start;
  div.appendChild(timeChooser);
  let graph = new spjs.seismograph.Seismograph();
  div.appendChild(graph);
}

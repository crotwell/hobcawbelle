
import * as seisplotjs from 'seisplotjs';
const spjs = seisplotjs;

import { do_seismograph } from './do_seismograph'
import {clearContent, clearMessage, setMessage} from './util';
import type {PageState} from './util';

const DEFAULT_DURATION = "P1D";
const SeismogramDisplayData = seisplotjs.seismogram.SeismogramDisplayData;


export function do_realtime(pageState: PageState) {
  let div = document.querySelector<HTMLDivElement>('#content');
  clearContent(div);
  let waiting = div.appendChild(document.createElement("p"));
  waiting.setAttribute("class", "waitingmessage");
  waiting.textContent = "Waiting on data to arrive...";
  setMessage("Waiting on data to arrive...");
  let rtDiv = div.appendChild(document.createElement("div"));
  rtDiv.setAttribute("class", "realtime")
  console.log("realtime")
  const matchPattern = formDataLinkMatch(pageState);
  const duration = seisplotjs.luxon.Duration.fromISO('PT5M');
  const timeWindow = new seisplotjs.util.durationEnd(duration, seisplotjs.luxon.DateTime.utc());
  const seisPlotConfig = new seisplotjs.seismographconfig.SeismographConfig();
  seisPlotConfig.wheelZoom = false;
  seisPlotConfig.isYAxisNice = false;
  seisPlotConfig.linkedTimeScale.offset = seisplotjs.luxon.Duration.fromMillis(-1*duration.toMillis());
  seisPlotConfig.linkedTimeScale.duration = duration;
  seisPlotConfig.linkedAmplitudeScale = new seisplotjs.scale.LinkedAmplitudeScale();
  let graphList = new Map();
  let numPackets = 0;
  let paused = false;
  let stopped = true;
  let redrawInProgress = false;
  let rect = div.getBoundingClientRect();
  let timerInterval = duration.toMillis()/
                      (rect.width-seisPlotConfig.margin.left-seisPlotConfig.margin.right);
  while (timerInterval < 100) { timerInterval *= 2;}

  const errorFn = function(error) {
    console.assert(false, error);
    if (pageState.datalink) {pageState.datalink.close();}
    seisplotjs.d3.select("p#error").text("Error: "+error);
  };

  let firstData = true;
  const packetHandler = function(packet) {
    const div = document.querySelector<HTMLDivElement>('div.realtime');
    if (firstData) {
      firstData = false;
      clearMessage();
      let p = document.querySelector("p.waitingmessage");
      if (p) {
        p.parentElement.removeChild(p);
      }
    }
    if ( ! div && pageState.datalink) {
      console.log("div not connected, closing datalink")
      pageState.datalink.endStream();
      pageState.datalink.close();
      pageState.datalink = null;
      return;
    }
    if (packet.isMiniseed()) {
      numPackets++;
      let seisSegment = seisplotjs.miniseed.createSeismogramSegment(packet.asMiniseed());
      const codes = seisSegment.codes();
      let seisPlot = graphList.get(codes);
      if ( ! seisPlot) {
          let seismogram = new seisplotjs.seismogram.Seismogram( [ seisSegment ]);
          let seisData = seisplotjs.seismogram.SeismogramDisplayData.fromSeismogram(seismogram);
          seisData.alignmentTime = seisplotjs.luxon.DateTime.utc();
          seisPlot = new seisplotjs.seismograph.Seismograph([seisData], seisPlotConfig);

          div.appendChild(seisPlot);
          graphList.set(codes, seisPlot);
        } else {
          seisPlot.seisData[0].append(seisSegment);
          seisPlot.recheckAmpScaleDomain();
        }
        seisPlot.draw();
    } else {
      console.log(`not a mseed packet: ${packet.streamId}`)
    }
  };
  // snip start datalink
  pageState.datalink = new seisplotjs.datalink.DataLinkConnection(
      "wss://thecloud.seis.sc.edu/ringserver/datalink",
      packetHandler,
      errorFn);

  // snip start timer
  let timer = seisplotjs.d3.interval(function(elapsed) {
    if ( paused || redrawInProgress) {
      return;
    }
    if (graphList.size === 0 || ! graphList.values().next().value.isConnected) {
      return;
    }
    redrawInProgress = true;
    window.requestAnimationFrame(timestamp => {
      try {
        const now = seisplotjs.luxon.DateTime.utc();
        graphList.forEach(function(graph, key) {
          graph.seisData.forEach(sdd => {
            sdd.alignmentTime = now;
          });
          graph.calcTimeScaleDomain();
          graph.recheckAmpScaleDomain();
          graph.draw();
        });
      } catch(err) {
        console.assert(false, err);
      }
      redrawInProgress = false;
    });

    }, timerInterval);

  pageState.datalink.connect()
        .then(serverId => {
          console.log(`id response: ${serverId}`);
          console.log(`send match: ${matchPattern}`)
          return pageState.datalink.match(matchPattern);
        }).then(response => {
          console.log(`match response: ${response}`)
          if (response.isError()) {
            console.log(`response is not OK, ignore... ${response}`);
          }
          return pageState.datalink.positionAfter(timeWindow.start);
        }).then(response => {
          console.log(`positionAfter response: ${response}`)
          return pageState.datalink.stream();
        });
}

export function formDataLinkMatch(pageState: PageState) {
  let chanRE = `(${pageState.channelCodeList.join("|")})`;
  return `${pageState.network}_${pageState.station}_${pageState.location}_${chanRE}/MSEED`
}

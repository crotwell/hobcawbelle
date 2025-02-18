
import * as sp from 'seisplotjs';
import { DateTime, Duration} from 'luxon';


import {clearContent, clearMessage, setMessage, updateButtonSelection} from './util';
import type {PageState} from './util';

export let minAnimationInterval = 100; // default to once a tenth of a second

let reconnectTimeout: null | number = null;

let mostRecentPacket: null | sp.datalink.DataLinkPacket = null;

let pageStateCache: PageState;

export function do_realtime(pageState: PageState) {
  pageStateCache = pageState;
  clearMessage();
  updateButtonSelection('#realtime', pageState);
  let div = document.querySelector<HTMLDivElement>('#content');
  if (div == null) { return; }
  clearContent(div);
  let waiting = div.appendChild(document.createElement("p"));
  waiting.setAttribute("class", "waitingmessage");
  waiting.textContent = "Waiting on data to arrive...";
  setMessage("Waiting on realtime data to arrive...");
  let realtimeDiv = div.appendChild(document.createElement("div"));
  realtimeDiv.setAttribute("class", "realtime")
  const matchPattern = formDataLinkMatch(pageState);

  const rtConfig = {
    duration: Duration.fromISO("PT5M"),
    alignmentTime: DateTime.utc(),
    offset: Duration.fromMillis(0),
    minRedrawMillis: 100,
    networkList: pageState.networkList,
    removeTrend: true
  };

  const rtDisp = sp.animatedseismograph.createRealtimeDisplay(rtConfig);
  rtDisp.organizedDisplay.tools = false;

  const seisPlotConfig = rtDisp.organizedDisplay.seismographConfig;
  //seisPlotConfig.linkedAmplitudeScale = new sp.scale.FixedHalfWidthAmplitudeScale(1e-4);
  seisPlotConfig.yLabel = null;
  seisPlotConfig.ySublabelIsUnits = true;
  seisPlotConfig.doGain = true;
  seisPlotConfig.margin.left = 80;
  seisPlotConfig.margin.bottom = 40;
  rtDisp.organizedDisplay.addStyle(`
    sp-organized-display-item {
      height: 100%;
    }
    `);

  realtimeDiv.appendChild(rtDisp.organizedDisplay);

  rtDisp.organizedDisplay.draw();
  rtDisp.animationScaler.animate();

  // give time for display to draw, then use pixels to get optimal redraw time
  setTimeout(() => {
    let animationIntervalMillis =
      sp.animatedseismograph.calcOnePixelDuration(rtDisp.organizedDisplay).toMillis();
    while (animationIntervalMillis > 0 && animationIntervalMillis < minAnimationInterval) {
      animationIntervalMillis *= 2;
    }
    rtDisp.animationScaler.minRedrawMillis = animationIntervalMillis;
    console.log(`min redraw millis= ${rtDisp.animationScaler.minRedrawMillis}`);
  }, 1000);



  let firstData = true;

  const errorFn = function(error: Error) {
    console.assert(false, error);
    setMessage(`Error: ${error}`);
    if (pageState.datalink) {pageState.datalink.close();}
  };

  // snip start datalink
  pageState.datalink = new sp.datalink.DataLinkConnection(
      "wss://eeyore.seis.sc.edu/ringserver/datalink",
      (packet: sp.datalink.DataLinkPacket) => {
          if (firstData) {
            firstData = false;
            clearMessage();
            let p = document.querySelector("p.waitingmessage");
            if (p) {
              p.parentElement?.removeChild(p);
            }
          }
          mostRecentPacket = packet;
          rtDisp.packetHandler(packet);
        },
      errorFn);

  pageState.datalink.connect()
        .then((serverId: string) => {
          console.log(`id response: ${serverId}`);
          console.log(`send match: ${matchPattern}`)
          return pageState.datalink.match(matchPattern);
        }).then((response: sp.datalink.DataLinkResponse) => {
          console.log(`match response: ${response}`)
          if (response.isError()) {
            console.log(`response is not OK, ignore... ${response}`);
          }
          const displayStart = DateTime.utc().minus(rtConfig.duration);
          return pageState.datalink.positionAfter(displayStart);
        }).then((response: sp.datalink.DataLinkResponse) => {
          console.log(`positionAfter response: ${response}`)
          return pageState.datalink.stream();
        });

  createReconnectTimeout(pageState);
}

const RECONNECT_TIMEOUT_SEC = 10;

function createReconnectTimeout(pageState: PageState) {
  reconnectTimeout = setTimeout(() => {
    if (mostRecentPacket == null ||
      mostRecentPacket.packetEnd.toMillis() < DateTime.utc().toMillis()-3*1000*RECONNECT_TIMEOUT_SEC) {
        if (document.hidden) {
          if (pageState?.datalink) { pageState.datalink.close();}
          createReconnectTimeout(pageState);
        } else {
          do_realtime(pageState);
        }
      }
  }, RECONNECT_TIMEOUT_SEC*1000);
}


export function stop_realtime(pageState: PageState) {
  if (reconnectTimeout) {clearTimeout(reconnectTimeout);}
  if (pageState?.datalink) {pageState.datalink.close();}
}

export function formDataLinkMatch(pageState: PageState) {
  let chanRE = `(${pageState.channelCodeList.join("|")})`;
  return `${pageState.network}_${pageState.station}_${pageState.location}_${chanRE}/MSEED`
}

function visibilitychangeListener() {
  if (document.hidden) {
    if (pageStateCache?.datalink) { pageStateCache.datalink.close();}
  } else {
    do_realtime(pageStateCache);
  }
}
// only do this once at page load, not every time reset to realtime
document.addEventListener("visibilitychange", visibilitychangeListener);

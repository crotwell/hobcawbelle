
import {clearContent, updateButtonSelection} from './util';

export function do_help(pageState: PageState) {
  updateButtonSelection('#help', pageState);
  let div = document.querySelector<HTMLDivElement>('#content');
  clearContent(div);
  div.innerHTML = `
  <article class="help">
    <h3>So you need some help?</h3>
    <h5>Earthquakes</h5>
    <p>
    Lists all earthquakes near South Carolina in the last 90 days. Clicking an earthquake
    in the table highlights it on the map and vice versa. Once an earthquake
    has been selected, clicking the Seismograph button will display
    the seismograms for that earthquake at the BELLE station.
    Note that BELLE was installed on 2025-02-11 so any earthquakes prior
    to that date will not have any data from BELLE.
    </p>
    <!--
    <h5>Seismograph</h5>
    <p>
    Displays seismograms either for a selected earthquake, or for the most recent
    5 minutes of data. By default it shows seismograms from BELLE.
    The Tools toggle allows showing a map, information table, overlaying of seismograms
    and sorting. Note that most of the sorting options have no effect unless
    there is a selected earthquake. Double click zooms in, shift-double click
    zooms out.
    </p>
    -->
    <h5>24 Hour Seismograph</h5>
    <p>
    Shows a 24 hour "helicorder" style view of the data from one channel.
    Because an actual display of a HN? channel at 200 samples per second
    would be too much data, these channels display a "min-max" per second
    channel that should be visibly equivalent.
    Clicking within the display will show the seismograph for a small
    window around the click, which is useful to zoom in on something
    interesting.
    The default is the vertical Z component at BELLE, but other channels, north and east,
    can be selected in the Channels toggle. Previous and Next move the helicorder
    backwards or forwards by 24 hours. Now puts the current time on the last
    line while Today shows the current day, starting at midnight. 
    </p>
    <h5>Realtime Seismograph</h5>
    <p>
    A updating display of the most recent 5 minutes of data. Packets are added
    to the display as they arrive. In the case of a communications
    outage, it is possible no data will be displayed.
    </p>
    <h5>Help</h5>
    <p>
    Displays this help page, but you already knew that, right?
    </p>
  `;
}

import type { Component } from "solid-js";

import styles from "./App.module.css";
import SimulationCanvas from "./simulation/Simulation";

const App: Component = () => {
  return (
    <div class={styles.App}>
      {/* <SimulationCanvas tapeSize={16} dimensions={256} /> */}
      <SimulationCanvas tapeSize={36} dimensions={170} />
      {/* <SimulationCanvas tapeSize={64} dimensions={128} /> */}
      {/* <SimulationCanvas tapeSize={144} dimensions={85} /> */}
      {/* <SimulationCanvas tapeSize={256} dimensions={64} /> */}
    </div>
  );
};

export default App;

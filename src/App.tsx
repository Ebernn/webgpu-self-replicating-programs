import type { Component } from "solid-js";

import styles from "./App.module.css";
import SimulationCanvas from "./simulation/Simulation";

const App: Component = () => {
  return (
    <div class={styles.App}>
      {/* <SimulationCanvas tapeSize={16} dimensions={400} /> */}
      <SimulationCanvas tapeSize={64} dimensions={160} />
      {/* <SimulationCanvas tapeSize={144} dimensions={120} /> */}
      {/* <SimulationCanvas tapeSize={256} dimensions={80} /> */}
    </div>
  );
};

export default App;

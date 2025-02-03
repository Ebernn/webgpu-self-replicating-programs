import type { Component } from "solid-js";

import styles from "./App.module.css";
import SimulationCanvas from "./simulation/Simulation";

const App: Component = () => {
  return (
    <div class={styles.App}>
      <SimulationCanvas tapeSize={256} dimensions={100} />
    </div>
  );
};

export default App;

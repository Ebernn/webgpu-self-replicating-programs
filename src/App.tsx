import type { Component } from "solid-js";
import styles from "./App.module.css";
import SimulationCanvas from "./simulation/SimulationCanvas";

const App: Component = () => (
  <div class={styles.App}>
    <SimulationCanvas tapeSize={4} dimensions={256} />
    {/* <SimulationCanvas tapeSize={6} dimensions={170} /> */}
    {/* <SimulationCanvas tapeSize={8} dimensions={128} /> */}
    {/* <SimulationCanvas tapeSize={12} dimensions={85} /> */}
    {/* <SimulationCanvas tapeSize={16} dimensions={64} /> */}
  </div>
);

export default App;

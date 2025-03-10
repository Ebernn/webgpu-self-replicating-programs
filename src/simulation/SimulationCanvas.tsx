import { Component, createSignal, onCleanup, onMount } from "solid-js";
import createSimulation from ".";
import { writeUint32ArrayToBuffer } from "../utils/webgpu/buffers";

export type SimulationCanvasProps = {
  tapeSize: number;
  dimensions: number;
};

const SimulationCanvas: Component<SimulationCanvasProps> = (props) => {
  const [getCanvasRef, setCanvasRef] = createSignal<HTMLCanvasElement>();
  let device: GPUDevice;

  onMount(async () => {
    // ⚙️ WebGPU setup
    const adapter = await navigator.gpu?.requestAdapter();
    if (!adapter) throw new Error("No WebGPU adapter found");

    device = await adapter.requestDevice();
    const context = getCanvasRef()!.getContext("webgpu")!;
    if (!context) throw new Error("No WebGPU context found");

    const format = navigator.gpu?.getPreferredCanvasFormat();
    context.configure({ device, format });

    // ⚙️ Create the render pipeline
    const tapeLength = props.tapeSize ** 2;
    const module = device.createShaderModule({
      code: `
@group(0) @binding(0) var<storage, read> tapeBuffer: array<u32>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  let positions = array<vec2<f32>, 4>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, 1.0)
  );
  let uvs = array<vec2<f32>, 4>(
    vec2<f32>(0.0, 0.0), vec2<f32>(1.0, 0.0), vec2<f32>(0.0, 1.0), vec2<f32>(1.0, 1.0)
  );
  let indices = array<u32, 6>(0, 1, 2, 2, 1, 3);
  var out: VertexOutput;
  out.position = vec4<f32>(positions[indices[vertexIndex]], 0.0, 1.0);
  out.uv = uvs[indices[vertexIndex]];
  return out;
}

@fragment
fn fs_main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
  let x = u32(fragCoord.x);
  let y = u32(fragCoord.y);
  let cellX = x / ${props.tapeSize};
  let cellY = y / ${props.tapeSize};
  let subX = x % ${props.tapeSize};
  let subY = y % ${props.tapeSize};
  let cellIndex = cellY * ${props.dimensions} + cellX;
  let tapeIndex = cellIndex * ${tapeLength} + subY * ${props.tapeSize} + subX;
  let instruction = tapeBuffer[tapeIndex];
  let colorShift = 64.;
  switch (instruction) {
    // '<' (Move head0 left)
    case 60u: {return vec4<f32>(0. / 255., 64. / 255., 255. / 255., 1.0);}
    // '>' (Move head0 right)
    case 62u: {return vec4<f32>(colorShift / 255., 64. / 255., 255. / 255., 1.0);}
    // '{' (Move head1 left)
    case 123u: {return vec4<f32>(0. / 255., 64. / 255., 255. / 255., 1.0);}
    // '}' (Move head1 right)
    case 125u: {return vec4<f32>(0. / 255., (64. + colorShift) / 255., 255. / 255., 1.0);}
    // '+' (Increment value at head0)
    case 43u: {return vec4<f32>((192. + colorShift) / 255., 0. / 255., 192. / 255., 1.0);}
    // '-' (Decrement value at head0)
    case 45u: {return vec4<f32>(192. / 255., 0. / 255., 192. / 255., 1.0);}
    // ',' (Copy head1 to head0)
    case 44u: {return vec4<f32>((192. + colorShift) / 255., 0. / 255., 192. / 255., 1.0);}
    // '.' (Copy head0 to head1)
    case 46u: {return vec4<f32>(192. / 255., colorShift / 255., 192. / 255., 1.0);}
    // '[' Jump forward if tape[head0] == 0
    case 91u: {return vec4<f32>(0. / 255., 192. / 255., 0. / 255., 1.0);}
    // ']' Jump backward if tape[head0] != 0
    case 93u: {return vec4<f32>(colorShift / 255., 192. / 255., 0. / 255., 1.0);}
    default: {return vec4<f32>(f32(instruction) / 1024., f32(instruction) / 1024., f32(instruction) / 1024., 1.0);}
  }
}`,
    });

    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module, entryPoint: "vs_main" },
      fragment: {
        module,
        entryPoint: "fs_main",
        targets: [{ format }],
      },
      primitive: { topology: "triangle-list" },
    });

    // Create the simulationn, initialize the tape with random values
    const {
      pipeline: simulationPipeline,
      bindGroup: simulationBindGroup,
      tapeBuffer,
    } = await createSimulation(device, {
      tapeSize: props.tapeSize,
      universeSize: props.dimensions,
    });
    const commandEncoder = device.createCommandEncoder();
    const initialTape = new Uint32Array(
      Array.from({ length: 4 * tapeLength * props.dimensions ** 2 }, () =>
        Math.floor(Math.random() * 256)
      )
    );

    // Generously add extra symbols (TODO: replace this by mutations??)
    const extraSymbols = [60, 62, 123, 125, 43, 45, 44, 46, 91, 93];
    for (let i = 0; i < props.dimensions ** 2; i++)
      for (let j = 0; j < tapeLength; j++) {
        // if (Math.random() < 0.8) continue;
        const randomIndex = Math.floor(Math.random() * tapeLength);
        initialTape[i * tapeLength + randomIndex] =
          extraSymbols[Math.floor(Math.random() * extraSymbols.length)];
      }

    commandEncoder.copyBufferToBuffer(
      writeUint32ArrayToBuffer(device, initialTape),
      0,
      tapeBuffer,
      0,
      tapeBuffer.size
    );
    device.queue.submit([commandEncoder.finish()]);
    await device.queue.onSubmittedWorkDone();

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: tapeBuffer } }],
    });

    const simulate = (batch = 1) => {
      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(simulationPipeline);
      passEncoder.setBindGroup(0, simulationBindGroup);
      for (let i = 0; i < batch; i++)
        passEncoder.dispatchWorkgroups(props.dimensions ** 2 / 16);
      passEncoder.end();
      device.queue.submit([commandEncoder.finish()]);
    };

    const render = () => {
      const commandEncoder = device.createCommandEncoder();
      const textureView = context.getCurrentTexture().createView();
      const passEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: textureView,
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.draw(6);
      passEncoder.end();
      device.queue.submit([commandEncoder.finish()]);
    };

    const frame = () => {
      simulate();
      render();
      requestAnimationFrame(frame);
    };
    frame();
  });

  onCleanup(() => device?.destroy());

  const size = props.tapeSize * props.dimensions;
  return (
    <canvas
      ref={setCanvasRef}
      style={{
        width: `${size / devicePixelRatio}px`,
        height: `${size / devicePixelRatio}px`,
      }}
      width={size}
      height={size}
      class="pixelated"
    />
  );
};

export default SimulationCanvas;

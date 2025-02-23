import { Component, onCleanup, onMount } from "solid-js";
import createSimulation from ".";
import { writeUint32ArrayToBuffer } from "../utils/webgpu/buffers";

export type SimulationCanvasProps = {
  tapeSize: number;
  dimensions: number;
};

const SimulationCanvas: Component<SimulationCanvasProps> = (props) => {
  let canvasRef: HTMLCanvasElement;
  let device: GPUDevice;
  let context: GPUCanvasContext;
  let pipeline: GPURenderPipeline;
  let bindGroup: GPUBindGroup;

  onMount(async () => {
    if (!navigator.gpu) {
      console.error("WebGPU not supported");
      return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    device = await adapter.requestDevice();

    context = canvasRef.getContext("webgpu");
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format });

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
          let cellX = x / ${Math.sqrt(props.tapeSize)};
          let cellY = y / ${Math.sqrt(props.tapeSize)};
          let subX = x % ${Math.sqrt(props.tapeSize)};
          let subY = y % ${Math.sqrt(props.tapeSize)};
          let cellIndex = cellY * ${props.dimensions} + cellX;
          let tapeIndex = cellIndex * ${props.tapeSize} + subY * ${Math.sqrt(
        props.tapeSize
      )} + subX;
          let instruction = tapeBuffer[tapeIndex];
          let colorShift = 2.;
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
        }
      `,
    });

    pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module, entryPoint: "vs_main" },
      fragment: {
        module,
        entryPoint: "fs_main",
        targets: [{ format }],
      },
      primitive: { topology: "triangle-list" },
    });

    // create the simulation
    const {
      pipeline: simulationPipeline,
      bindGroup: simulationBindGroup,
      tapeBuffer,
    } = await createSimulation(device, {
      tapeSize: props.tapeSize,
      programs: props.dimensions ** 2,
    });
    const commandEncoder = device.createCommandEncoder();
    const initialTape = new Uint32Array(
      Array.from({ length: 4 * props.tapeSize * props.dimensions ** 2 }, () =>
        Math.floor(Math.random() * 256)
      )
    );

    // const offset = 0;
    // for (let i = 0; i < 1000; i++) {
    //   initialTape[i * props.tapeSize + offset] = 91;
    //   initialTape[i * props.tapeSize + offset + 1] = 91;
    //   initialTape[i * props.tapeSize + offset + 2] = 123;
    //   initialTape[i * props.tapeSize + offset + 3] = 46;
    //   initialTape[i * props.tapeSize + offset + 4] = 62;
    //   initialTape[i * props.tapeSize + offset + 5] = 93;
    //   initialTape[i * props.tapeSize + offset + 6] = 45;
    //   initialTape[i * props.tapeSize + offset + 7] = 93;

    //   initialTape[i * props.tapeSize + offset + 10] = 91;
    //   initialTape[i * props.tapeSize + offset + 11] = 91;
    //   initialTape[i * props.tapeSize + offset + 12] = 123;
    //   initialTape[i * props.tapeSize + offset + 13] = 46;
    //   initialTape[i * props.tapeSize + offset + 14] = 62;
    //   initialTape[i * props.tapeSize + offset + 15] = 93;
    //   initialTape[i * props.tapeSize + offset + 16] = 45;
    //   initialTape[i * props.tapeSize + offset + 17] = 93;
    // }

    // add extra symbols, random
    const extraSymbols = [91, 123, 46, 62, 93, 45, 94];
    for (let i = 0; i < props.dimensions ** 2; i++) {
      for (let j = 0; j < props.tapeSize; j++) {
        const randomIndex = Math.floor(Math.random() * props.tapeSize);
        initialTape[i * props.tapeSize + randomIndex] =
          extraSymbols[Math.floor(Math.random() * extraSymbols.length)];
      }
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

    bindGroup = device.createBindGroup({
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
    requestAnimationFrame(frame);
  });

  onCleanup(() => {
    device?.destroy();
  });

  return (
    <canvas
      ref={canvasRef}
      width={Math.sqrt(props.tapeSize) * props.dimensions}
      height={Math.sqrt(props.tapeSize) * props.dimensions}
      class="w-full h-full pixelated"
    />
  );
};

export default SimulationCanvas;

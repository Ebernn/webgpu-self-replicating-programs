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
          switch (instruction) {
            case 60u: {return vec4<f32>(180. / 255., 22. / 255., 22. / 255., 1.0);}
            case 62u: {return vec4<f32>(22. / 255., 180. / 255., 22. / 255., 1.0);}
            case 123u: {return vec4<f32>(115. / 255., 22. / 255., 22. / 255., 1.0);}
            case 125u: {return vec4<f32>(22. / 255., 115. / 255., 22. / 255., 1.0);}
            case 43u: {return vec4<f32>(22. / 255., 80. / 255., 180. / 255., 1.0);}
            case 45u: {return vec4<f32>(22. / 255., 22. / 255., 22. / 255., 1.0);}
            case 44u: {return vec4<f32>(180. / 255., 180. / 255., 22. / 255., 1.0);}
            case 46u: {return vec4<f32>(140. / 255., 180. / 255., 22. / 255., 1.0);}
            case 91u: {return vec4<f32>(200. / 255., 22. / 255., 200. / 255., 1.0);}
            case 93u: {return vec4<f32>(180. / 255., 22. / 255., 200. / 255., 1.0);}
            default: {return vec4<f32>(f32(instruction) / 255., f32(instruction) / 255., f32(instruction) / 255., 1.0);}
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
    commandEncoder.copyBufferToBuffer(
      writeUint32ArrayToBuffer(
        device,
        // initial tape
        new Uint32Array(
          Array.from(
            { length: 4 * props.tapeSize * props.dimensions ** 2 },
            () => Math.floor(Math.random() * 128)
          )
        )
      ),
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

    const simulate = () => {
      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(simulationPipeline);
      passEncoder.setBindGroup(0, simulationBindGroup);
      passEncoder.dispatchWorkgroups(props.dimensions ** 2);
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
      class="w-full h-full"
    />
  );
};

export default SimulationCanvas;

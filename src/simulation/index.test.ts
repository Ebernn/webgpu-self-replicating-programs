import { beforeAll, describe, expect, it } from "vitest";
import createSimulation from ".";
import {
  readUint32ArrayFromBuffer,
  writeUint32ArrayToBuffer,
} from "../utils/webgpu/buffers";

describe("WebGPU Brainfuck Instructions", () => {
  let device: GPUDevice;
  let tapeBuffer: GPUBuffer;
  let pipeline: GPUComputePipeline;
  let bindGroup: GPUBindGroup;

  const tapeSize = 2;
  const universeSize = 2;
  const numberOfPrograms = universeSize ** 2;
  beforeAll(async () => {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("WebGPU not supported");
    device = await adapter.requestDevice();
    if (!device) throw new Error("Couldn't create WebGPU device");

    // prepare the simulation
    ({ tapeBuffer, bindGroup, pipeline } = await createSimulation(device, {
      tapeSize,
      universeSize,
    }));
  });

  async function testProgramExecution(
    inputTape: Uint32Array,
    expectedTape: Uint32Array
  ) {
    const commandEncoder = device.createCommandEncoder();

    commandEncoder.copyBufferToBuffer(
      writeUint32ArrayToBuffer(device, inputTape),
      0,
      tapeBuffer,
      0,
      tapeBuffer.size
    );

    // execute the simulation
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(numberOfPrograms);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
    await device.queue.onSubmittedWorkDone();

    // read the final state
    expect(await readUint32ArrayFromBuffer(device, tapeBuffer)).toEqual(
      expectedTape
    );
  }

  describe("Head Movement", () => {
    it("should decrement head0 and increment value at head0", async () => {
      await testProgramExecution(
        // initial state
        new Uint32Array([
          // program 0
          255, 60, 43, 0,
          // program 1
          0, 0, 0, 0,
          // program 2
          0, 0, 0, 0,
          // program 3
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          255, 60, 43, 1,
          // program 1
          0, 0, 0, 0,
          // program 2
          0, 0, 0, 0,
          // program 3
          0, 0, 0, 0,
        ])
      );
    });

    it("should increment head0 and increment value at head0", async () => {
      await testProgramExecution(
        // initial state
        new Uint32Array([
          // program 0
          255, 62, 43, 0,
          // program 1
          0, 0, 0, 0,
          // program 2
          0, 0, 0, 0,
          // program 3
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          255, 63, 43, 0,
          // program 1
          0, 0, 0, 0,
          // program 2
          0, 0, 0, 0,
          // program 3
          0, 0, 0, 0,
        ])
      );
    });

    it("should decrement head0 and decrement value at head0", async () => {
      await testProgramExecution(
        // initial state
        new Uint32Array([
          // program 0
          255, 60, 45, 0,
          // program 1
          0, 0, 0, 0,
          // program 2
          0, 0, 0, 0,
          // program 3
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          255, 60, 45, 255,
          // program 1
          0, 0, 0, 0,
          // program 2
          0, 0, 0, 0,
          // program 3
          0, 0, 0, 0,
        ])
      );
    });

    it("should increment head0 and decrement value at head0", async () => {
      await testProgramExecution(
        // initial state
        new Uint32Array([
          // program 0
          255, 62, 45, 0,
          // program 1
          0, 0, 0, 0,
          // program 2
          0, 0, 0, 0,
          // program 3
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          255, 61, 45, 0,
          // program 1
          0, 0, 0, 0,
          // program 2
          0, 0, 0, 0,
          // program 3
          0, 0, 0, 0,
        ])
      );
    });

    it("should decrement head1 and copy value from head0 to head1", async () => {
      await testProgramExecution(
        // initial state
        new Uint32Array([
          // program 0
          255, 123, 46, 0,
          // program 1
          0, 0, 0, 0,
          // program 2
          0, 0, 0, 0,
          // program 3
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          255, 123, 46, 0,
          // program 1
          0, 0, 0, 255,
          // program 2
          0, 0, 0, 0,
          // program 3
          0, 0, 0, 0,
        ])
      );
    });

    it("should increment head1 and copy value from head0 to head1", async () => {
      await testProgramExecution(
        // initial state
        new Uint32Array([
          // program 0
          255, 125, 46, 0,
          // program 1
          0, 0, 0, 0,
          // program 2
          0, 0, 0, 0,
          // program 3
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          255, 125, 46, 0,
          // program 1
          0, 255, 0, 0,
          // program 2
          0, 0, 0, 0,
          // program 3
          0, 0, 0, 0,
        ])
      );
    });

    it("should decrement head1 and copy value from head1 to head0", async () => {
      await testProgramExecution(
        // initial state
        new Uint32Array([
          // program 0
          255, 123, 44, 0,
          // program 1
          0, 0, 0, 99,
          // program 2
          0, 0, 0, 0,
          // program 3
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          99, 123, 44, 0,
          // program 1
          0, 0, 0, 99,
          // program 2
          0, 0, 0, 0,
          // program 3
          0, 0, 0, 0,
        ])
      );
    });

    it("should increment head1 and copy value from head1 to head0", async () => {
      await testProgramExecution(
        // initial state
        new Uint32Array([
          // program 0
          255, 125, 44, 0,
          // program 1
          0, 99, 0, 0,
          // program 2
          0, 0, 0, 0,
          // program 3
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          99, 125, 44, 0,
          // program 1
          0, 99, 0, 0,
          // program 2
          0, 0, 0, 0,
          // program 3
          0, 0, 0, 0,
        ])
      );
    });
  });

  describe("Jump Forward and Backward", () => {
    it("should jump forward to `]` when `tape[head0]` is 0", async () => {
      await testProgramExecution(
        new Uint32Array([
          // program 0
          0, 91, 45, 93,
          // other programs
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ]),
        // Final tape: unchanged
        new Uint32Array([
          0, 91, 45, 93,
          // other programs
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ])
      );
    });

    it("should not jump forward if `tape[head0]` is not 0", async () => {
      await testProgramExecution(
        new Uint32Array([
          // program 0
          1, 91, 45, 93,
          // other programs
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ]),
        // Final tape: it has changed
        new Uint32Array([
          0, 91, 45, 93,
          // other programs
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ])
      );
    });
  });
});

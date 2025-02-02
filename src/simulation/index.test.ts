import { beforeAll, describe, expect, it } from "vitest";
import createSimulation from ".";
import {
  readUint32ArrayFromBuffer,
  writeUint32ArrayToBuffer,
} from "../utils/webgpu/buffers";

describe("WebGPU Brainfuck Instructions", () => {
  let device: GPUDevice;
  let tapeBuffer: GPUBuffer;
  let headBuffer: GPUBuffer;
  let pipeline: GPUComputePipeline;
  let bindGroup: GPUBindGroup;

  const tapeSize = 4;
  const programs = 2;
  const LAST_INDEX = tapeSize - 1;
  beforeAll(async () => {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("WebGPU not supported");
    device = await adapter.requestDevice();
    if (!device) throw new Error("Couldn't create WebGPU device");

    // prepare the simulation
    ({ tapeBuffer, headBuffer, bindGroup, pipeline } = await createSimulation(
      device,
      { programs, tapeSize }
    ));
  });

  async function testBufferExecution(
    inputTape: Uint32Array,
    inputHead: Uint32Array,
    expectedTape: Uint32Array,
    expectedHead: Uint32Array
  ) {
    const commandEncoder = device.createCommandEncoder();

    commandEncoder.copyBufferToBuffer(
      writeUint32ArrayToBuffer(device, inputTape),
      0,
      tapeBuffer,
      0,
      tapeBuffer.size
    );
    commandEncoder.copyBufferToBuffer(
      writeUint32ArrayToBuffer(device, inputHead),
      0,
      headBuffer,
      0,
      headBuffer.size
    );

    // execute the simulation
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(programs);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
    await device.queue.onSubmittedWorkDone();

    // read the final state
    expect(await readUint32ArrayFromBuffer(device, tapeBuffer)).toEqual(
      expectedTape
    );
    expect(await readUint32ArrayFromBuffer(device, headBuffer)).toEqual(
      expectedHead
    );
  }

  describe("Head Movement", () => {
    it("should decrement head0", async () => {
      await testBufferExecution(
        // initial state
        new Uint32Array([
          // program 0
          255, 255, 60, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          2, 1, 0,
          // program 1
          0, 0, 0,
        ]),
        // final state
        new Uint32Array([
          // program 0
          255, 255, 60, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          3, 0, 0,
          // program 1
          1, 0, 0,
        ])
      );
      await testBufferExecution(
        // initial state
        new Uint32Array([
          // program 0
          255, 255, 60, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          2, 0, 0,
          // program 1
          0, 0, 0,
        ]),
        // final state
        new Uint32Array([
          // program 0
          255, 255, 60, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          3,
          LAST_INDEX,
          0,
          // program 1
          1,
          0,
          0,
        ])
      );
    });

    it("should increment head0", async () => {
      await testBufferExecution(
        // initial state
        new Uint32Array([
          // program 0
          255, 255, 62, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          2, 0, 0,
          // program 1
          0, 0, 0,
        ]),
        // final state
        new Uint32Array([
          // program 0
          255, 255, 62, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          3, 1, 0,
          // program 1
          1, 0, 0,
        ])
      );
      await testBufferExecution(
        // initial state
        new Uint32Array([
          // program 0
          255, 255, 62, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          2,
          LAST_INDEX,
          0,
          // program 1
          0,
          0,
          0,
        ]),
        // final state
        new Uint32Array([
          // program 0
          255, 255, 62, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          3, 0, 0,
          // program 1
          1, 0, 0,
        ])
      );
    });

    it("should decrement head1", async () => {
      await testBufferExecution(
        // initial state
        new Uint32Array([
          // program 0
          0, 0, 123, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          2, 0, 1,
          // program 1
          0, 0, 0,
        ]),
        // final state
        new Uint32Array([
          // program 0
          0, 0, 123, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          3, 0, 0,
          // program 1
          1, 0, 0,
        ])
      );
      await testBufferExecution(
        // initial state
        new Uint32Array([
          // program 0
          0, 0, 123, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          2, 0, 0,
          // program 1
          0, 0, 0,
        ]),
        // final state
        new Uint32Array([
          // program 0
          0, 0, 123, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          3,
          0,
          LAST_INDEX,
          // program 1
          1,
          0,
          0,
        ])
      );
    });

    it("should increment head1", async () => {
      await testBufferExecution(
        // initial state
        new Uint32Array([
          // program 0
          0, 0, 125, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          2, 0, 0,
          // program 1
          0, 0, 0,
        ]),
        // final state
        new Uint32Array([
          // program 0
          0, 0, 125, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          3, 0, 1,
          // program 1
          1, 0, 0,
        ])
      );
      await testBufferExecution(
        // initial state
        new Uint32Array([
          // program 0
          0, 0, 125, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          2,
          0,
          LAST_INDEX,
          // program 1
          0,
          0,
          0,
        ]),
        // final state
        new Uint32Array([
          // program 0
          0, 0, 125, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          3, 0, 0,
          // program 1
          1, 0, 0,
        ])
      );
    });
  });

  describe("Tape Values", () => {
    it("should decrement value at head0", async () => {
      await testBufferExecution(
        // initial state
        new Uint32Array([
          // program 0
          45, 10, 0, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          0, 1, 0,
          // program 1
          0, 0, 0,
        ]),
        // final state
        new Uint32Array([
          // program 0
          45, 9, 0, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          1, 1, 0,
          // program 1
          1, 0, 0,
        ])
      );
      await testBufferExecution(
        // initial state
        new Uint32Array([
          // program 0
          45, 0, 0, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          0, 1, 0,
          // program 1
          0, 0, 0,
        ]),
        // final state
        new Uint32Array([
          // program 0
          45, 255, 0, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          1, 1, 0,
          // program 1
          1, 0, 0,
        ])
      );
    });

    it("should increment value at head0", async () => {
      await testBufferExecution(
        // initial state
        new Uint32Array([
          // program 0
          43, 10, 0, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          0, 1, 0,
          // program 1
          0, 0, 0,
        ]),
        // final state
        new Uint32Array([
          // program 0
          43, 11, 0, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          1, 1, 0,
          // program 1
          1, 0, 0,
        ])
      );
      await testBufferExecution(
        // initial state
        new Uint32Array([
          // program 0
          43, 255, 0, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          0, 1, 0,
          // program 1
          0, 0, 0,
        ]),
        // final state
        new Uint32Array([
          // program 0
          43, 0, 0, 0,
          // program 1
          0, 0, 0, 0,
        ]),
        new Uint32Array([
          // program 0
          1, 1, 0,
          // program 1
          1, 0, 0,
        ])
      );
    });
  });

  describe("Tape Copies", () => {
    it("should copy value from head0 to head1", async () => {
      await testBufferExecution(
        // initial state
        new Uint32Array([
          // program 0
          46, 5, 6, 0,
          // program 1
          0, 6, 7, 0,
        ]),
        new Uint32Array([
          // program 0
          0, 1, 2,
          // program 1
          0, 0, 0,
        ]),
        // final state
        new Uint32Array([
          // program 0
          46, 5, 6, 0,
          // program 1
          0, 6, 5, 0,
        ]),
        new Uint32Array([
          // program 0
          1, 1, 2,
          // program 1
          1, 0, 0,
        ])
      );
    });
    it("should copy value from head1 to head0", async () => {
      await testBufferExecution(
        // initial state
        new Uint32Array([
          // program 0
          44, 5, 6, 0,
          // program 1
          0, 6, 7, 0,
        ]),
        new Uint32Array([
          // program 0
          0, 1, 2,
          // program 1
          0, 0, 0,
        ]),
        // final state
        new Uint32Array([
          // program 0
          44, 7, 6, 0,
          // program 1
          0, 6, 7, 0,
        ]),
        new Uint32Array([
          // program 0
          1, 1, 2,
          // program 1
          1, 0, 0,
        ])
      );
    });
  });

  describe("Jump Forward (`[`)", () => {
    it("should jump forward to `]` when `tape[head0]` is 0", async () => {
      await testBufferExecution(
        // Initial tape: [ 91, 43, 93, 0, 0, 0, 0, 0 ] (`[+]`)
        new Uint32Array([91, 43, 93, 0, 0, 0, 0, 0]),
        new Uint32Array([
          0, // IP = 0 (`[`)
          3, // head0 = 3
          0, // head1 = 0
          0,
          0,
          0,
        ]),
        // Final tape: Unchanged
        new Uint32Array([91, 43, 93, 0, 0, 0, 0, 0]),
        // Expected head: Instruction pointer jumps past `]`
        new Uint32Array([
          3, // IP = 3 (past `]`)
          3, // head0 = 3
          0, // head1 = 0
          1,
          0,
          0,
        ])
      );
    });

    it("should not jump forward if `tape[head0]` is not 0", async () => {
      await testBufferExecution(
        // Initial tape: [ 91, 43, 93, 0, 0, 0, 0, 0 ] (`[+]`)
        new Uint32Array([91, 43, 93, 1, 0, 0, 0, 0]),
        new Uint32Array([
          0, // IP = 0 (`[`)
          3, // head0 = 3
          0, // head1 = 0
          0,
          0,
          0,
        ]),
        // Final tape: Unchanged
        new Uint32Array([91, 43, 93, 1, 0, 0, 0, 0]),
        // Expected head: Instruction pointer just moves to next instruction
        new Uint32Array([
          1, // IP = 1 (inside loop)
          3, // head0 = 3
          0, // head1 = 0
          1,
          0,
          0,
        ])
      );
    });
  });

  describe("Jump Backward (`]`)", () => {
    it("should jump back to `[` when tape[head0] is not 0", async () => {
      await testBufferExecution(
        // Initial tape: [ 91, 43, 93, 1, 0, 0, 0, 0 ] (`[+]`)
        new Uint32Array([91, 43, 93, 1, 0, 0, 0, 0]),
        new Uint32Array([
          2, // IP = 2 (`]`)
          3, // head0 = 3 (tape[head0] = 1)
          0, // head1 = 0
          0,
          0,
          0,
        ]),
        // Final tape: Unchanged
        new Uint32Array([91, 43, 93, 1, 0, 0, 0, 0]),
        // Expected head: IP jumps back to `[`
        new Uint32Array([1, 3, 0, 1, 0, 0]) // IP = 1 (past `[`)
      );
    });

    it("should not jump backward if tape[head0] is 0", async () => {
      await testBufferExecution(
        // Initial tape: [ 91, 43, 93, 0, 0, 0, 0, 0 ] (`[+]`)
        new Uint32Array([91, 43, 93, 0, 0, 0, 0, 0]),
        new Uint32Array([
          2, // IP = 2 (`]`)
          3, // head0 = 3 (tape[head0] = 0)
          0, // head1 = 0
          0,
          0,
          0,
        ]),
        // Final tape: Unchanged
        new Uint32Array([91, 43, 93, 0, 0, 0, 0, 0]),
        // Expected head: Instruction pointer just moves to next instruction
        new Uint32Array([3, 3, 0, 1, 0, 0]) // IP = 3 (past `]`)
      );
    });
  });
});

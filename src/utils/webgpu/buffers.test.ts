import { describe, beforeAll, test, expect, afterAll } from "vitest";
import {
  writeFloat32ArrayToBuffer,
  readFloat32ArrayFromBuffer,
  writeUint32ArrayToBuffer,
  readUint32ArrayFromBuffer,
} from "./buffers";

describe("WebGPU Buffer Operations", () => {
  let device: GPUDevice;

  beforeAll(async () => {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("WebGPU not supported");
    device = await adapter.requestDevice();
    if (!device) throw new Error("Couldn't create WebGPU device");
  });

  test("should write and read Float32Array from buffer", async () => {
    const inputData = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    const buffer = writeFloat32ArrayToBuffer(device, inputData);

    const result = await readFloat32ArrayFromBuffer(
      device,
      buffer,
      inputData.byteLength
    );
    expect(result).toEqual(inputData);
  });

  test("should write and read Uint32Array from buffer", async () => {
    const inputData = new Uint32Array([1, 2, 3, 4]);
    const buffer = writeUint32ArrayToBuffer(device, inputData);

    const result = await readUint32ArrayFromBuffer(
      device,
      buffer,
      inputData.byteLength
    );
    expect(result).toEqual(inputData);
  });

  afterAll(() => device.destroy());
});

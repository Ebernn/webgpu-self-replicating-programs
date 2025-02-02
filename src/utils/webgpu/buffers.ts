/**
 * Helper function to create a GPU buffer from an array buffer. The buffer is
 * mapped at creation, the data is copied into it, and then it is unmapped.
 * @param device
 * @param data
 * @param usage
 */
export const writeFloat32ArrayToBuffer = (
  device: GPUDevice,
  data: Float32Array,
  usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
) => {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage,
    mappedAtCreation: true,
  });
  new Float32Array(buffer.getMappedRange()).set(data);
  buffer.unmap();
  return buffer;
};

/**
 * Helper function to create a GPU buffer from an array buffer. The buffer is
 * mapped at creation, the data is copied into it, and then it is unmapped.
 * @param device
 * @param data
 * @param usage
 */
export const writeUint32ArrayToBuffer = (
  device: GPUDevice,
  data: Uint32Array,
  usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
) => {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage,
    mappedAtCreation: true,
  });
  new Uint32Array(buffer.getMappedRange()).set(data);
  buffer.unmap();
  return buffer;
};

/**
 * Read buffer data back from the GPU. The buffer is copied to a new buffer that
 * is mapped for reading, the data is read, and then it is unmapped.
 * @param device
 * @param buffer
 * @param size
 */
export const readFloat32ArrayFromBuffer = async (
  device: GPUDevice,
  buffer: GPUBuffer,
  size: number = buffer.size
) => {
  const readBuffer = device.createBuffer({
    size: size,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  const commandEncoder = device.createCommandEncoder();
  commandEncoder.copyBufferToBuffer(buffer, 0, readBuffer, 0, size);
  device.queue.submit([commandEncoder.finish()]);

  // Ensure all GPU work is completed before reading back results
  await device.queue.onSubmittedWorkDone();
  await readBuffer.mapAsync(GPUMapMode.READ);

  const mappedRange = readBuffer.getMappedRange();
  const result = new Float32Array(mappedRange.slice(0)); // copy before unmap
  readBuffer.unmap();

  return result;
};

/**
 * Read buffer data back from the GPU. The buffer is copied to a new buffer that
 * is mapped for reading, the data is read, and then it is unmapped.
 * @param device
 * @param buffer
 * @param size
 */
export const readUint32ArrayFromBuffer = async (
  device: GPUDevice,
  buffer: GPUBuffer,
  size: number = buffer.size
) => {
  const readBuffer = device.createBuffer({
    size: size,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  const commandEncoder = device.createCommandEncoder();
  commandEncoder.copyBufferToBuffer(buffer, 0, readBuffer, 0, size);
  device.queue.submit([commandEncoder.finish()]);

  await device.queue.onSubmittedWorkDone();
  await readBuffer.mapAsync(GPUMapMode.READ);

  const mappedRange = readBuffer.getMappedRange();
  const result = new Uint32Array(mappedRange.slice(0)); // copy before unmap
  readBuffer.unmap();

  return result;
};

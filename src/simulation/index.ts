export type SimulationOptions = {
  /**
   * Tape is arranged within a square grid. This is the length of a cell side.
   */
  tapeSize: number;
  /**
   * Number of cells along one side of the universe.
   */
  universeSize: number;
};

// Default options for the simulation
export const defaultOptions: SimulationOptions = {
  tapeSize: 4,
  universeSize: 256,
};

/**
 * This parts handle the logic of the simulation. It creates the tape buffer,
 * bind group, pipeline layout, and compute pipeline. Cells are updated based on
 * the Brainfuck instructions and the current state of the tape. Lively! :D
 * @param device
 * @param simulationOptions
 */
async function createSimulation(
  device: GPUDevice,
  { tapeSize, universeSize } = defaultOptions
) {
  const tapeLength = tapeSize ** 2;
  const numberOfPrograms = universeSize ** 2;

  // ✅ Create Tape Data Buffer
  const tapeBuffer = device.createBuffer({
    size: tapeLength * numberOfPrograms * 4,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });

  const bufferLayouts = [
    {
      binding: 0,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "storage" as GPUBufferBindingType },
    },
  ];

  // ✅ Create Bind Group Layout
  const bindGroupLayout = device.createBindGroupLayout({
    entries: bufferLayouts,
  });

  // ✅ Create Bind Group
  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: tapeBuffer } }, // Tape data
    ],
  });

  // ✅ Create Pipeline Layout
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  const shaderModule = device.createShaderModule({
    code: `
struct Tape {
  data: array<u32>,
};

@group(0) @binding(0) var<storage, read_write> tapes: Tape;

@compute @workgroup_size(16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let idx = id.x;
  if (idx >= ${numberOfPrograms}u) { return; }

  var instructionPointer = 0u;
  var head0 = 0u;
  var head1 = 0u;
  
  let maxIterations = ${Math.max(256, 4 * tapeLength)}u;
  var iteration = 0u;

  while (iteration < maxIterations) {
    iteration++;
    let instruction = tapes.data[idx * ${tapeLength}u + instructionPointer];

    switch (instruction) {
      case 60u: { // '<' (Move head0 left)
        if (head0 > 0u) { head0 -= 1u; }
        else { head0 = ${tapeLength - 1}u; }
        break;
      }
      case 62u: { // '>' (Move head0 right)
        if (head0 < ${tapeLength - 1}u) { head0 += 1u; }
        else { head0 = 0u; }
        break;
      }
      case 123u: { // '{' (Move head1 left)
        if (head1 > 0u) { head1 -= 1u; }
        else { head1 = ${tapeLength - 1}u; }
        break;
      }
      case 125u: { // '}' (Move head1 right)
        if (head1 < ${tapeLength - 1}u) { head1 += 1u; }
        else { head1 = 0u; }
        break;
      }
      case 45u: { // '-' (Decrement value at head0)
        let value = tapes.data[idx * ${tapeLength}u + head0];
        if (value > 0u) { tapes.data[idx * ${tapeLength}u + head0] -= 1u; }
        else { tapes.data[idx * ${tapeLength}u + head0] = 255u; }
        break;
      }
      case 43u: { // '+' (Increment value at head0)
        let value = tapes.data[idx * ${tapeLength}u + head0];
        if (value < 255u) { tapes.data[idx * ${tapeLength}u + head0] += 1u; }
        else { tapes.data[idx * ${tapeLength}u + head0] = 0u; }
        break;
      }
      case 46u: { // '.' (Copy head0 to head1)
        // -> Neighbor cell is determined by the last value on the tape <-
        let direction = tapes.data[(idx + 1u) * ${tapeLength}u - 1u] % 4u;
        var neighbor = 0u;
        switch (direction) {
          case 0u: {
            if (idx % ${universeSize}u == ${
      universeSize - 1
    }u) { neighbor = idx - ${universeSize - 1}u; }
            else { neighbor = idx + 1u; }
            break;
          }
          case 1u: {
            if (idx % ${universeSize}u == 0u) { neighbor = idx + ${
      universeSize - 1
    }u; }
            else { neighbor = idx - 1u; }
            break;
          }
          case 2u: {
            if (idx < ${universeSize}u) { neighbor = idx + ${
      numberOfPrograms - universeSize
    }u; }
            else { neighbor = idx - ${universeSize}u; }
            break;
          }
          case 3u: {
            if (idx >= ${
              numberOfPrograms - universeSize
            }u) { neighbor = idx - ${numberOfPrograms - universeSize}u; }
            else { neighbor = idx + ${universeSize}u; }
            break;
          }
          default: {}
        }

        tapes.data[neighbor * ${tapeLength}u + head1] = tapes.data[idx * ${tapeLength}u + head0];
        break;
      }
      case 44u: { // ',' (Copy head1 to head0)
        // -> Neighbor cell is determined by the last value on the tape <-
        let direction = tapes.data[(idx + 1u) * ${tapeLength}u - 1u] % 4u;
        var neighbor = 0u;
        switch (direction) {
          case 0u: {
            if (idx % ${universeSize}u == ${
      universeSize - 1
    }u) { neighbor = idx - ${universeSize - 1}u; }
            else { neighbor = idx + 1u; }
            break;
          }
          case 1u: {
            if (idx % ${universeSize}u == 0u) { neighbor = idx + ${
      universeSize - 1
    }u; }
            else { neighbor = idx - 1u; }
            break;
          }
          case 2u: {
            if (idx < ${universeSize}u) { neighbor = idx + ${
      numberOfPrograms - universeSize
    }u; }
            else { neighbor = idx - ${universeSize}u; }
            break;
          }
          case 3u: {
            if (idx >= ${
              numberOfPrograms - universeSize
            }u) { neighbor = idx - ${numberOfPrograms - universeSize}u; }
            else { neighbor = idx + ${universeSize}u; }
            break;
          }
          default: {}
        }

        tapes.data[idx * ${tapeLength}u + head0] = tapes.data[neighbor * ${tapeLength}u + head1];
        break;
      }
      case 91u: { // '[' Jump forward if tape[head0] == 0
        if (tapes.data[idx * ${tapeLength}u + head0] == 0u) {
          var depth: u32 = 1u;
          while (depth > 0u) {
            if(instructionPointer >= ${tapeLength}u - 1u) {
              // -> HALT <-
              return;
            }
            instructionPointer++;
            let nextInstruction = tapes.data[idx * ${tapeLength}u + instructionPointer];
            if (nextInstruction == 91u) { depth += 1u; }
            if (nextInstruction == 93u) { depth -= 1u; }
          }
        }
        break;
      }
      case 93u: { // ']' Jump backward if tape[head0] != 0
        if (tapes.data[idx * ${tapeLength}u + head0] != 0u) {
          var depth: u32 = 1u;
          while (depth > 0u) {
            if(instructionPointer == 0u) {
                // -> HALT <-
                return;
            }
            instructionPointer--;
            let prevInstruction = tapes.data[idx * ${tapeLength}u + instructionPointer];
            if (prevInstruction == 93u) { depth += 1u; }
            if (prevInstruction == 91u) { depth -= 1u; }
          }
        }
        break;
      }
      default: {}
    }
    instructionPointer++;
    if(instructionPointer >= ${tapeLength}u) {
      // -> HALT <-
      return;
    }
  }
}`,
  });

  // ✅ Create Compute Pipeline with the Correct Layout
  const pipeline = device.createComputePipeline({
    layout: pipelineLayout,
    compute: { module: shaderModule, entryPoint: "main" },
  });

  return { tapeBuffer, bindGroup, pipeline };
}

export default createSimulation;

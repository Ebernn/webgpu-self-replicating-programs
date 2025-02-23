export type SimulationOptions = {
  tapeSize: number;
  programs: number;
};

export const defaultOptions: SimulationOptions = {
  tapeSize: 256,
  programs: 1,
};

async function createSimulation(
  device: GPUDevice,
  { tapeSize, programs } = defaultOptions
) {
  // ✅ Create Tape Data Buffer
  const tapeBuffer = device.createBuffer({
    size: tapeSize * programs * 4,
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

  const worldSize = Math.sqrt(programs);
  const shaderModule = device.createShaderModule({
    code: `
        struct Tape {
            data: array<u32>,
        };

        @group(0) @binding(0) var<storage, read_write> tapes: Tape;

        @compute @workgroup_size(16)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
            let idx = id.x;
            if (idx >= ${programs}u) { return; }

            var instructionPointer = 0u;
            var head0 = 0u;
            var head1 = 0u;
            
            let maxIterations = ${Math.max(256, 4 * tapeSize)}u;
            var iteration = 0u;

            while (iteration < maxIterations) {
                iteration++;
                let instruction = tapes.data[idx * ${tapeSize}u + instructionPointer];
                if (instruction == 0u) {
                    // -> HALT <-
                    return;
                }

                switch (instruction) {
                    case 60u: { // '<' (Move head0 left)
                        if (head0 > 0u) { head0 -= 1u; }
                        else { head0 = ${tapeSize - 1}u; }
                        break;
                    }
                    case 62u: { // '>' (Move head0 right)
                        if (head0 < ${tapeSize - 1}u) { head0 += 1u; }
                        else { head0 = 0u; }
                        break;
                    }
                    case 123u: { // '{' (Move head1 left)
                        if (head1 > 0u) { head1 -= 1u; }
                        else { head1 = ${tapeSize - 1}u; }
                        break;
                    }
                    case 125u: { // '}' (Move head1 right)
                        if (head1 < ${tapeSize - 1}u) { head1 += 1u; }
                        else { head1 = 0u; }
                        break;
                    }
                    case 45u: { // '-' (Decrement value at head0)
                        let value = tapes.data[idx * ${tapeSize}u + head0];
                        if (value > 0u) { tapes.data[idx * ${tapeSize}u + head0] -= 1u; }
                        else { tapes.data[idx * ${tapeSize}u + head0] = 255u; }
                        break;
                    }
                    case 43u: { // '+' (Increment value at head0)
                        let value = tapes.data[idx * ${tapeSize}u + head0];
                        if (value < 255u) { tapes.data[idx * ${tapeSize}u + head0] += 1u; }
                        else { tapes.data[idx * ${tapeSize}u + head0] = 0u; }
                        break;
                    }
                    case 46u: { // '.' (Copy head0 to head1)
                        let direction = tapes.data[(idx + 1u) * ${tapeSize}u - 1u] % 4u;
                        var neighbor = 0u;
                        switch (direction) {
                          case 0u: {
                            if (idx % ${worldSize}u == ${
      worldSize - 1
    }u) { neighbor = idx - ${worldSize - 1}u; }
                            else { neighbor = idx + 1u; }
                            break;
                          }
                          case 1u: {
                            if (idx % ${worldSize}u == 0u) { neighbor = idx + ${
      worldSize - 1
    }u; }
                            else { neighbor = idx - 1u; }
                            break;
                          }
                          case 2u: {
                            if (idx < ${worldSize}u) { neighbor = idx + ${
      programs - worldSize
    }u; }
                            else { neighbor = idx - ${worldSize}u; }
                            break;
                          }
                          case 3u: {
                            if (idx >= ${
                              programs - worldSize
                            }u) { neighbor = idx - ${programs - worldSize}u; }
                            else { neighbor = idx + ${worldSize}u; }
                            break;
                          }
                          default: {}
                        }
                        // let value = tapes.data[neighbor * ${tapeSize}u + head1];
                        // if (value > 0u) { tapes.data[neighbor * ${tapeSize}u + head1] -= 1u; }
                        // else { tapes.data[neighbor * ${tapeSize}u + head1] = 255u; }

                        tapes.data[neighbor * ${tapeSize}u + head1] = tapes.data[idx * ${tapeSize}u + head0];
                        break;
                    }
                    case 44u: { // ',' (Copy head1 to head0)
                        let direction = tapes.data[(idx + 1u) * ${tapeSize}u - 1u] % 4u;
                        var neighbor = 0u;
                        switch (direction) {
                          case 0u: {
                            if (idx % ${worldSize}u == ${
      worldSize - 1
    }u) { neighbor = idx - ${worldSize - 1}u; }
                            else { neighbor = idx + 1u; }
                            break;
                          }
                          case 1u: {
                            if (idx % ${worldSize}u == 0u) { neighbor = idx + ${
      worldSize - 1
    }u; }
                            else { neighbor = idx - 1u; }
                            break;
                          }
                          case 2u: {
                            if (idx < ${worldSize}u) { neighbor = idx + ${
      programs - worldSize
    }u; }
                            else { neighbor = idx - ${worldSize}u; }
                            break;
                          }
                          case 3u: {
                            if (idx >= ${
                              programs - worldSize
                            }u) { neighbor = idx - ${programs - worldSize}u; }
                            else { neighbor = idx + ${worldSize}u; }
                            break;
                          }
                          default: {}
                        }
                        // let value = tapes.data[neighbor * ${tapeSize}u + head1];
                        // if (value < 255u) { tapes.data[neighbor * ${tapeSize}u + head1] += 1u; }
                        // else { tapes.data[neighbor * ${tapeSize}u + head1] = 0u; }

                        tapes.data[idx * ${tapeSize}u + head0] = tapes.data[neighbor * ${tapeSize}u + head1];
                        break;
                    }
                    case 91u: { // '[' Jump forward if tape[head0] == 0
                        if (tapes.data[idx * ${tapeSize}u + head0] == 0u) {
                            var depth: u32 = 1u;
                            while (depth > 0u) {
                                if(instructionPointer >= ${tapeSize}u - 1u) {
                                    // -> HALT <-
                                    return;
                                }
                                instructionPointer++;
                                let nextInstruction = tapes.data[idx * ${tapeSize}u + instructionPointer];
                                if (nextInstruction == 91u) { depth += 1u; }
                                if (nextInstruction == 93u) { depth -= 1u; }
                            }
                        }
                        break;
                    }
                    case 93u: { // ']' Jump backward if tape[head0] != 0
                        if (tapes.data[idx * ${tapeSize}u + head0] != 0u) {
                            var depth: u32 = 1u;
                            while (depth > 0u) {
                                if(instructionPointer == 0u) {
                                    // -> HALT <-
                                    return;
                                }
                                instructionPointer--;
                                let prevInstruction = tapes.data[idx * ${tapeSize}u + instructionPointer];
                                if (prevInstruction == 93u) { depth += 1u; }
                                if (prevInstruction == 91u) { depth -= 1u; }
                            }
                        }
                        break;
                    }
                    default: {}
                }
                instructionPointer++;
                if(instructionPointer >= ${tapeSize}u) {
                    // -> HALT <-
                    return;
                }
            }
        }
        `,
  });

  // ✅ Create Compute Pipeline with the Correct Layout
  const pipeline = device.createComputePipeline({
    layout: pipelineLayout,
    compute: { module: shaderModule, entryPoint: "main" },
  });

  return { tapeBuffer, bindGroup, pipeline };
}

export default createSimulation;
